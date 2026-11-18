import type { Stufe } from '../domain/buden';
import { verdichten, type Ereignis } from '../domain/lernprofil/lernprofil';
import type { Aussehen } from '../domain/aussehen';
import { MAX_PROFILE, fortschrittZurueckgesetzt, neuesProfil, type AbzeichenId, type FigurId, type Profil } from '../domain/profil';
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

/** Hier zählt keine Spielzeit (kein Kind spielt gerade). */
export const OHNE_SPIELZEIT = new Set<Bildschirm['name']>(['laden', 'start', 'eltern', 'ueber']);
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
  get paket(): boolean {
    return this.bestand.paket.gekauft;
  }

  async starte(kv?: KeyValue): Promise<void> {
    const speicher = kv ?? (await preferencesKV());
    const { bestand, wiederhergestellt } = await laden(speicher);
    this.bestand = bestand;
    this.ladefehler = wiederhergestellt;
    this.plan = new Speicherplan(speicher, 400, () => this.melde('Speichern hat nicht geklappt. Der Fortschritt wird beim nächsten Mal erneut gesichert.'));
    this.kauf = await erstelleKauf();
    // Still im Hintergrund (ohne Anmeldefenster): ein inzwischen bezahlter, ausstehender Kauf oder ein Kauf mit derselben Apple-ID/Google-Konto.
    if (this.kauf.art === 'store' && !this.bestand.paket.gekauft) {
      void this.kauf.pruefen().then((ja) => {
        if (ja) this.aendere((b) => ({ ...b, paket: { gekauft: true, seit: b.paket.seit ?? Date.now() } }));
      });
    }
    this.bildschirm = this.profil ? { name: 'jahrmarkt' } : { name: 'start' };
    // Beim Wechsel in den Hintergrund sofort sichern.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.spielzeitTakt();
        void this.plan?.sofort();
      } else this.letzterTakt = Date.now();
    });
    this.letzterTakt = Date.now();
    setInterval(() => this.spielzeitTakt(), SPIELZEIT_TAKT_MS);
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

  zeige(b: Bildschirm): void {
    void this.sprache.stopp();
    this.spielzeitTakt();
    this.bildschirm = b;
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

  /** „Pause machen“: alles sichern, zurück zum Startbildschirm. */
  async pauseMachen(): Promise<void> {
    this.zeige({ name: 'start' });
    this.pauseVorschlag = false;
    await this.speichereSofort();
  }

  aendere(fn: (b: Datenbestand) => Datenbestand): void {
    this.bestand = fn($state.snapshot(this.bestand) as Datenbestand);
    this.plan?.vormerken($state.snapshot(this.bestand) as Datenbestand);
  }

  /** Ein bestimmtes Profil ändern (z. B. Taler fürs Geschwisterkind nach einem Duell). */
  aendereProfilVon(id: string, fn: (p: Profil) => Profil): void {
    this.aendere((b) => ({ ...b, profile: b.profile.map((p) => (p.id === id ? fn(p) : p)) }));
  }

  aendereProfil(fn: (p: Profil) => Profil): void {
    const id = this.bestand.aktiv;
    if (!id) return;
    this.aendere((b) => ({ ...b, profile: b.profile.map((p) => (p.id === id ? fn(p) : p)) }));
  }

  aendereEinstellungen(teil: Partial<Einstellungen>): void {
    this.aendere((b) => ({ ...b, einstellungen: { ...b.einstellungen, ...teil } }));
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
    if (this.bestand.profile.length >= MAX_PROFILE) return false;
    const neu = neuesProfil(`p${Date.now().toString(36)}${randomSeed().toString(36)}`, name, figur, Date.now());
    const p = aussehen ? { ...neu, aussehen: { ...aussehen, extra: aussehen.extra === 'strohhut' ? 'keins' as const : aussehen.extra } } : neu;
    if (!p.name) return false;
    this.aendere((b) => ({ ...b, profile: [...b.profile, p], aktiv: p.id }));
    return true;
  }

  profilWaehlen(id: string, ziel: Bildschirm = { name: 'jahrmarkt' }): void {
    this.aendere((b) => ({ ...b, aktiv: id }));
    // Der Pausenvorschlag gilt für das Kind, das gerade gespielt hat – der nächste Takt prüft neu
    this.pauseVorschlag = false;
    this.zeige(ziel);
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
