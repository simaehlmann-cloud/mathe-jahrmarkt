import type { Stufe } from '../domain/buden';
import { verdichten, type Ereignis } from '../domain/lernprofil/lernprofil';
import { wechselNachPause } from '../domain/wechsel';
import type { Aussehen } from '../domain/aussehen';
import { fortschrittZurueckgesetzt, neuesProfil, profilGrenze, type AbzeichenId, type FigurId, type Profil } from '../domain/profil';
import { SCHULE } from '../ausgabe';
import type { SchulDaten } from '../schule/domain/schuldaten';
import type { SchulErweiterung } from './schulschnittstelle';
import { WECHSEL_NACH_PAUSE_MS } from '../domain/wechsel';
import { alleAenderungen, keineAenderung, type Aenderung } from '../services/aenderung';
import { randomSeed } from '../domain/rng';
import { auftraegeFuerTag, tagKennung } from '../domain/auftraege';
import { WOCHENZIEL_BLOECKE, wochenzielBelohnung } from '../domain/belohnungen';
import { leererBestand, type Datenbestand, type Einstellungen } from '../services/datenbestand';
import { erstelleKauf, keinKauf, type KaufService } from '../services/kauf';
import { erstelleKlang, type Klangart } from '../services/klang';
import { erstelleSprache } from '../services/sprache';
import { Speicherplan, laden, preferencesKV, type KeyValue } from '../services/speicher';
import { DOPPELDRUCK_MS, zurueckZiel } from './navigation';
import { leereSpielzeit, mitNachschlag, pauseFaellig, zaehleSpielzeit } from '../domain/spielzeit';
import { START as INSEL_START } from '../domain/insel';

/** Hier zählt keine Spielzeit (kein Kind spielt gerade). */
export const OHNE_SPIELZEIT = new Set<Bildschirm['name']>(['laden', 'start', 'eltern', 'lehrer', 'ueber']);
/** Laufende Runden: der Pausenvorschlag wartet, bis die Runde vorbei ist. */
export const RUNDE_LAEUFT = new Set<Bildschirm['name']>(['spiel', 'duell', 'blitz', 'check']);
const SPIELZEIT_TAKT_MS = 30_000;

export type Bildschirm =
  | { name: 'laden' }
  | { name: 'start' }
  | { name: 'jahrmarkt' }
  | { name: 'bude'; bude: string }
  | { name: 'spiel'; bude: string; stufe: Stufe; n?: number; fortsetzen?: boolean; fundbuero?: boolean }
  | { name: 'profil' }
  | { name: 'andenken'; von?: 'insel' }
  | { name: 'figur'; von?: 'profil' }
  | { name: 'eltern' }
  /** Schulversion: Lehrerbereich hinter der Lehrer-PIN (statt Elternbereich). */
  | { name: 'lehrer' }
  | { name: 'bauplatz'; von?: 'insel' }
  | { name: 'check' }
  | { name: 'album' }
  | { name: 'blitz' }
  | { name: 'knobel' }
  | { name: 'insel'; anreise?: 'teleport' | 'boot' }
  | { name: 'fundbuero' }
  | { name: 'duell' }
  | { name: 'ueber'; abschnitt?: 'impressum' | 'datenschutz' | 'lizenzen'; von?: 'start' };

/** Zentraler Zustand. Jede Änderung am Bestand läuft über `aendere`, damit sie gespeichert wird. */
class AppZustand {
  bestand = $state<Datenbestand>(leererBestand());
  bildschirm = $state<Bildschirm>({ name: 'laden' });
  meldung = $state<string | null>(null);
  ladefehler = $state(false);
  /** Wo die Figur auf dem Jahrmarkt steht (nur für diese Sitzung) und welche Bude zuletzt besucht wurde. */
  karteOrt: { x: number; y: number } | null = null;
  letzteBude: string | null = null;
  /** Sätze, die Flinka beim nächsten Bildschirm sagen soll (z. B. nach einer neuen Stufe). */
  flinka = $state<string[] | null>(null);

  /**
   * Spieler wechseln (seit 0.14): 'knopf' = über den Knopf in der Kopfzeile geöffnet,
   * 'pause' = „Wer spielt jetzt?“ nach längerer Pause (App war im Hintergrund).
   */
  wechsel = $state<null | 'knopf' | 'pause'>(null);
  /** „Neuer Spieler“ im Wechsel-Fenster: Startbildschirm öffnet gleich die Elternsperre für ein neues Profil. */
  neuesProfil = $state(false);
  /** Rundgang mit Flinka auf dem Jahrmarkt starten (Menü). */
  rundgang = $state(false);
  /**
   * Vor einem Spielerwechsel sichert der offene Bildschirm hier noch für das bisherige Kind
   * (Spiel: Zwischenstand merken, Bauinsel: Figur, Tiere und Wachzeit).
   */
  vorWechsel: (() => void) | null = null;
  private verstecktSeit = 0;

  /** Flinka schlägt eine Pause vor (Spielzeit-Erinnerung). */
  pauseVorschlag = $state(false);
  private letzterTakt = Date.now();

  kauf: KaufService = keinKauf();
  readonly sprache = erstelleSprache();
  readonly klang = erstelleKlang();
  private plan: Speicherplan | undefined;
  /**
   * Ein Bildschirm kann die Zurück-Taste selbst behandeln (z. B. das Spiel, um die Runde sauber zu verbuchen).
   * Gibt die Funktion true zurück, ist der Druck erledigt.
   */
  zurueckAbfangen: (() => boolean) | null = null;
  private letzterZurueck = 0;

  get profil(): Profil | undefined {
    return this.bestand.profile.find((p) => p.id === this.bestand.aktiv);
  }
  get einstellungen(): Einstellungen {
    return this.bestand.einstellungen;
  }
  /** In der Schulversion ist alles freigeschaltet (Einmalkauf über Apple School Manager, kein In-App-Kauf). */
  get paket(): boolean {
    return SCHULE || this.bestand.paket.gekauft;
  }

  /**
   * Schulversion: Lehrer-PIN, solange der Lehrerbereich offen ist (zum Ver- und Entschlüsseln der Dateien).
   * Steht nur im Arbeitsspeicher und wird beim Verlassen gelöscht.
   */
  lehrerPin: string | null = null;

  /** Schulversion: ihre Umsetzung der Nahtstelle (src/app/schulschnittstelle.ts). In der Familien-App leer. */
  schule: SchulErweiterung | null = null;

  async starte(kv?: KeyValue): Promise<void> {
    const beiFehler = () => this.melde('Speichern hat nicht geklappt. Der Fortschritt wird beim nächsten Mal erneut gesichert.');
    // __AUSGABE__ steht hier wörtlich (nicht SCHULE): Der Build der Familien-App lässt den Zweig samt Import weg.
    if (__AUSGABE__ === 'schule' && !kv) {
      // Schulversion: jedes Profil in einer eigenen Datei (bis zu 32 Profile), kein Kauf
      const s = await import('../schule/app/start');
      const { bestand, wiederhergestellt, ablage, erweiterung } = await s.schulStart();
      this.bestand = bestand;
      this.schule = erweiterung;
      this.ladefehler = wiederhergestellt;
      this.plan = new Speicherplan(ablage, 400, beiFehler);
      this.bildschirm = { name: 'start' };
      // Mit der App geöffnete .jahrmarkt-Dateien warten im Lehrerbereich auf die PIN
      void s
        .dateiOeffnenVorbereiten(
          () => {
            if (this.bildschirm.name !== 'lehrer') this.abmelden();
            this.zeige({ name: 'lehrer' });
          },
          (text) => this.melde(text),
        )
        .catch(() => {});
    } else {
      const speicher = kv ?? (await preferencesKV());
      const { bestand, wiederhergestellt } = await laden(speicher);
      this.bestand = bestand;
      this.ladefehler = wiederhergestellt;
      this.plan = new Speicherplan(speicher, 400, beiFehler);
      this.kauf = await erstelleKauf();
      // Still im Hintergrund (ohne Anmeldefenster): ein inzwischen bezahlter, ausstehender Kauf oder ein Kauf mit derselben Apple-ID/Google-Konto.
      if (this.kauf.art === 'store' && !this.bestand.paket.gekauft) {
        void this.kauf.pruefen().then((ja) => {
          if (ja) this.aendere((b) => ({ ...b, paket: { gekauft: true, seit: b.paket.seit ?? Date.now() } }));
        });
      }
      this.bildschirm = this.profil ? { name: 'jahrmarkt' } : { name: 'start' };
    }
    // Beim Wechsel in den Hintergrund sofort sichern.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.spielzeitTakt();
        this.verstecktSeit = Date.now();
        void this.plan?.sofort();
      } else {
        this.letzterTakt = Date.now();
        const pause = this.verstecktSeit ? Date.now() - this.verstecktSeit : 0;
        if (SCHULE) {
          // Schul-iPads wandern weiter: Nach einer längeren Pause meldet sich das Kind neu an,
          // und ein offener Lehrerbereich schließt sich.
          if (pause >= WECHSEL_NACH_PAUSE_MS && (this.profil || this.bildschirm.name === 'lehrer')) this.abmelden();
        } else if (this.verstecktSeit && wechselNachPause(pause, this.bestand.profile.length, this.bildschirm.name, !!this.profil)) {
          // Nach einer längeren Pause kurz fragen, wer jetzt spielt (Geschwister an einem Gerät)
          this.wechsel = 'pause';
        }
        this.verstecktSeit = 0;
      }
    });
    this.letzterTakt = Date.now();
    setInterval(() => {
      this.spielzeitTakt();
      this.inselTakt();
    }, SPIELZEIT_TAKT_MS);
  }

  /** Zurück-Taste von Android. Die App schließt nie ungefragt. */
  async zurueck(): Promise<void> {
    if (this.zurueckAbfangen?.()) return;
    const ziel = zurueckZiel(this.bildschirm, !!this.profil);
    if (ziel === 'nichts') return;
    if (ziel === 'jahrmarktVerlassen') {
      const jetzt = Date.now();
      if (jetzt - this.letzterZurueck < DOPPELDRUCK_MS) {
        this.letzterZurueck = 0;
        await this.speichereSofort();
        try {
          const { App } = await import('@capacitor/app');
          await App.minimizeApp();
        } catch {
          /* nur Android */
        }
      } else {
        this.letzterZurueck = jetzt;
        this.melde('Zum Verlassen noch einmal Zurück drücken.');
      }
      return;
    }
    this.zeige(ziel);
  }

  /** Bauinsel ließ sich nicht öffnen: Figur zurück zum Ankunftsplatz (das Gebaute bleibt). */
  inselZumStart(): void {
    if (!this.profil) return;
    this.aendereProfil((q) => ({ ...q, insel: { ...q.insel, figur: { ...INSEL_START } } }));
  }

  zeige(b: Bildschirm): void {
    // Schulversion: Bauinsel und Bauplatz nur, wenn die Lehrkraft sie gerade freigibt
    if (this.schule && (b.name === 'insel' || b.name === 'bauplatz') && this.profil) {
      const z = this.schule.inselZugang(this.bestand, this.profil, Date.now());
      if (!z.offen) {
        this.melde(z.grund);
        return;
      }
      const vonDraussen = this.bildschirm.name !== 'insel' && this.bildschirm.name !== 'bauplatz' && this.bildschirm.name !== 'andenken';
      if (z.bisMs !== null && vonDraussen) this.melde(`Bauzeit: noch ${Math.max(1, Math.round((z.bisMs - Date.now()) / 60000))} Minuten.`);
    }
    void this.sprache.stopp();
    this.spielzeitTakt();
    this.bildschirm = b;
  }

  /** Schulversion: Ist die Bauzeit um, geht es zurück auf den Jahrmarkt (Bauinsel speichert beim Verlassen). */
  inselTakt(jetzt = Date.now()): void {
    const p = this.profil;
    if (!this.schule || !p || (this.bildschirm.name !== 'insel' && this.bildschirm.name !== 'bauplatz')) return;
    const z = this.schule.inselZugang(this.bestand, p, jetzt);
    if (z.offen) return;
    this.melde('Die Bauzeit ist um. Spiel eine Runde an einer Bude, dann geht es weiter!');
    this.bildschirm = { name: 'jahrmarkt' };
  }

  /** Spielzeit des aktiven Kindes weiterzählen und ggf. die Pause vorschlagen. */
  spielzeitTakt(jetzt = Date.now()): void {
    const plus = jetzt - this.letzterTakt;
    this.letzterTakt = jetzt;
    const p = this.profil;
    if (!p || OHNE_SPIELZEIT.has(this.bildschirm.name) || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
    const tag = tagKennung(new Date(jetzt));
    const sz = zaehleSpielzeit(p.spielzeit ?? leereSpielzeit(), tag, plus);
    if (plus >= 1000) this.aendereProfil((q) => ({ ...q, spielzeit: sz }));
    if (pauseFaellig(sz, tag, this.einstellungen.spielzeitMin)) this.pauseVorschlag = true;
  }

  /** „Noch 5 Minuten“ */
  pauseVerschieben(): void {
    const tag = tagKennung(new Date());
    this.aendereProfil((q) => ({ ...q, spielzeit: mitNachschlag(q.spielzeit, tag) }));
    this.pauseVorschlag = false;
  }

  /** „Pause machen“: alles sichern, zurück zum Startbildschirm (Schulversion: abmelden). */
  async pauseMachen(): Promise<void> {
    if (SCHULE) this.abmelden();
    else this.zeige({ name: 'start' });
    this.pauseVorschlag = false;
    await this.speichereSofort();
  }

  /**
   * Ändert den Bestand und merkt das Speichern vor. `aenderung` sagt der Ablage der Schulversion,
   * welche Teile neu geschrieben werden müssen (Standard: alles).
   */
  aendere(fn: (b: Datenbestand) => Datenbestand, aenderung: Aenderung = alleAenderungen()): void {
    this.bestand = fn($state.snapshot(this.bestand) as Datenbestand);
    this.vormerken(aenderung);
  }

  /**
   * Ein bestimmtes Profil ändern (z. B. Taler fürs Geschwisterkind nach einem Duell).
   * Kopiert nur dieses Profil statt des ganzen Bestands – wichtig bei 32 Profilen in der Schulversion.
   */
  aendereProfilVon(id: string, fn: (p: Profil) => Profil): void {
    const i = this.bestand.profile.findIndex((p) => p.id === id);
    if (i < 0) return;
    this.bestand.profile[i] = fn($state.snapshot(this.bestand.profile[i]) as Profil);
    this.vormerken({ ...keineAenderung(), profile: new Set([id]) });
  }

  aendereProfil(fn: (p: Profil) => Profil): void {
    const id = this.bestand.aktiv;
    if (!id) return;
    this.aendereProfilVon(id, fn);
  }

  /** Schulversion: Daten der Schule ändern (PIN, Klassen, Gerät …). `sammlung`: eingesammelte Ergebnisse geändert. */
  aendereSchule(fn: (s: SchulDaten) => SchulDaten, sammlung = false): void {
    this.aendere((b) => (b.schule ? { ...b, schule: fn(b.schule) } : b), { ...keineAenderung(), kopf: true, sammlung });
  }

  aendereEinstellungen(teil: Partial<Einstellungen>): void {
    this.aendere((b) => ({ ...b, einstellungen: { ...b.einstellungen, ...teil } }), { ...keineAenderung(), kopf: true });
  }

  /**
   * Speichern vormerken. Kopiert wird erst beim Schreiben (höchstens alle 400 ms).
   * Schulversion: unveränderte Profile werden nicht kopiert, die Ablage braucht von ihnen nur die Kennung.
   */
  private vormerken(aenderung: Aenderung): void {
    this.plan?.vormerken((alle: Aenderung): Datenbestand => {
      if (!SCHULE) return $state.snapshot(this.bestand) as Datenbestand;
      const { profile, ...rest } = this.bestand;
      return {
        ...($state.snapshot(rest) as Omit<Datenbestand, 'profile'>),
        profile: profile.map((p) => (alle.alle || alle.profile.has(p.id) ? ($state.snapshot(p) as Profil) : p)),
      };
    }, aenderung);
  }

  /** Tagesaufträge für heute bereitstellen (am neuen Tag neue). */
  auftraegeSicherstellen(): void {
    const p = this.profil;
    if (!p) return;
    const tag = tagKennung(new Date());
    if (p.auftraege?.tag === tag) return;
    const neu = auftraegeFuerTag(p, this.paket, tag, p.check?.empfehlung ?? []);
    this.aendereProfil((q) => ({ ...q, auftraege: neu }));
  }

  /** Wochenziel prüfen und einmal pro Woche belohnen. True, wenn es gerade erreicht wurde. */
  wochenzielPruefen(): boolean {
    const p = this.profil;
    if (!p) return false;
    const neu = wochenzielBelohnung(p, new Date());
    if (!neu) return false;
    this.aendereProfil(() => neu);
    this.melde(`Wochenziel geschafft: 3 Spieltage! +${WOCHENZIEL_BLOECKE} Blöcke`);
    return true;
  }

  speichereSofort(): Promise<void> {
    return this.plan?.sofort() ?? Promise.resolve();
  }

  profilAnlegen(name: string, figur: FigurId, aussehen?: Aussehen): boolean {
    if (this.bestand.profile.length >= profilGrenze(SCHULE)) return false;
    const neu = neuesProfil(`p${Date.now().toString(36)}${randomSeed().toString(36)}`, name, figur, Date.now());
    const p = aussehen ? { ...neu, aussehen: { ...aussehen, extra: aussehen.extra === 'strohhut' ? 'keins' as const : aussehen.extra } } : neu;
    if (!p.name) return false;
    this.aendere((b) => ({ ...b, profile: [...b.profile, p], aktiv: p.id }));
    return true;
  }

  profilWaehlen(id: string, ziel: Bildschirm = { name: 'jahrmarkt' }): void {
    this.aendere((b) => ({ ...b, aktiv: id }), { ...keineAenderung(), kopf: true });
    // Der Pausenvorschlag gilt für das Kind, das gerade gespielt hat – der nächste Takt prüft neu
    this.pauseVorschlag = false;
    this.zeige(ziel);
  }

  /**
   * Zu einem anderen Kind wechseln, ohne Umweg über den Startbildschirm. Eine laufende Runde wird vorher
   * gesichert (im Spiel: zum Weiterspielen gemerkt); danach geht es auf den Jahrmarkt.
   */
  wechsleZu(id: string): void {
    // Schulversion: Wechseln heißt abmelden; das nächste Kind meldet sich mit seinem Bildpasswort an
    if (SCHULE) {
      this.abmelden();
      return;
    }
    const ziel = this.bestand.profile.find((p) => p.id === id);
    this.wechsel = null;
    if (!ziel || id === this.bestand.aktiv) return;
    this.vorWechsel?.();
    this.vorWechsel = null;
    // Die bisherige Spielzeit gehört noch zum Kind, das gerade gespielt hat
    this.spielzeitTakt();
    this.karteOrt = null;
    this.profilWaehlen(id, { name: 'jahrmarkt' });
    this.melde(`Jetzt spielt ${ziel.name}.`);
  }

  /**
   * Schulversion: Das Kind meldet sich ab (Knopf oben, „Pause machen“, längere Pause). Eine laufende Runde wird
   * vorher gesichert, die Spielzeit gutgeschrieben; danach kommt der Startbildschirm für das nächste Kind.
   * Schließt auch einen offenen Lehrerbereich.
   */
  abmelden(): void {
    this.wechsel = null;
    this.vorWechsel?.();
    this.vorWechsel = null;
    this.spielzeitTakt();
    this.karteOrt = null;
    this.letzteBude = null;
    this.pauseVorschlag = false;
    this.rundgang = false;
    this.flinka = null;
    this.lehrerPin = null;
    // Meldungen aus dem Lehrerbereich oder vom vorigen Kind nicht stehen lassen
    this.meldung = null;
    if (this.bestand.aktiv !== undefined) this.aendere((b) => ({ ...b, aktiv: undefined }), { ...keineAenderung(), kopf: true });
    this.zeige({ name: 'start' });
  }

  fortschrittZuruecksetzen(id: string): void {
    this.aendere((b) => ({ ...b, profile: b.profile.map((p) => (p.id === id ? fortschrittZurueckgesetzt(p) : p)) }));
    if (this.bestand.aktiv === id) this.karteOrt = null;
  }

  profilLoeschen(id: string): void {
    this.aendere((b) => ({ ...b, profile: b.profile.filter((p) => p.id !== id), aktiv: b.aktiv === id ? undefined : b.aktiv }));
  }

  /** Neue Ereignisse anhängen und alte verdichten, damit der Speicher klein bleibt. */
  ereignisseAnhaengen(neu: readonly Ereignis[]): void {
    if (neu.length === 0) return;
    this.aendereProfil((p) => {
      const v = verdichten([...p.ereignisse, ...neu], p.wochen, Date.now());
      return { ...p, ereignisse: v.ereignisse, wochen: v.wochen };
    });
  }

  abzeichenVergeben(id: AbzeichenId, bezug: string): boolean {
    const p = this.profil;
    if (!p || p.abzeichen.some((a) => a.id === id && a.bezug === bezug)) return false;
    this.aendereProfil((q) => ({ ...q, abzeichen: [...q.abzeichen, { id, bezug, am: Date.now() }] }));
    return true;
  }

  spieleKlang(art: Klangart): void {
    this.klang.spiele(art, this.einstellungen.lautEffekte);
  }

  /** Spricht nur, wenn die Stimme oben eingeschaltet ist. `erbeten`: das Kind hat ausdrücklich auf „Vorlesen“ getippt. */
  sprich(text: string, erbeten = false): void {
    const e = this.einstellungen;
    if (!e.stimmeAn && !erbeten) return;
    void this.sprache.sprich(text, { lautstaerke: e.lautSprache, tempo: e.sprechtempo, stimme: e.stimme });
  }

  melde(text: string): void {
    this.meldung = text;
    setTimeout(() => {
      if (this.meldung === text) this.meldung = null;
    }, 4000);
  }
}

export const app = new AppZustand();
