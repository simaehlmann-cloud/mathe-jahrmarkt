import type { Stufe } from '../domain/buden';
import { verdichten, type Ereignis } from '../domain/lernprofil/lernprofil';
import type { Aussehen } from '../domain/aussehen';
import { MAX_PROFILE, fortschrittZurueckgesetzt, neuesProfil, type AbzeichenId, type FigurId, type Profil } from '../domain/profil';
import { randomSeed } from '../domain/rng';
import { auftraegeFuerTag, tagKennung } from '../domain/auftraege';
import { leererBestand, type Datenbestand, type Einstellungen } from '../services/datenbestand';
import { erstelleKauf, keinKauf, type KaufService } from '../services/kauf';
import { erstelleKlang, type Klangart } from '../services/klang';
import { erstelleSprache } from '../services/sprache';
import { Speicherplan, laden, preferencesKV, type KeyValue } from '../services/speicher';
import { DOPPELDRUCK_MS, zurueckZiel } from './navigation';

export type Bildschirm =
  | { name: 'laden' }
  | { name: 'start' }
  | { name: 'jahrmarkt' }
  | { name: 'bude'; bude: string }
  | { name: 'spiel'; bude: string; stufe: Stufe; n?: number }
  | { name: 'profil' }
  | { name: 'andenken' }
  | { name: 'figur' }
  | { name: 'eltern' }
  | { name: 'bauplatz' }
  | { name: 'check' };

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
    this.bildschirm = this.profil ? { name: 'jahrmarkt' } : { name: 'start' };
    // Beim Wechsel in den Hintergrund sofort sichern.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.plan?.sofort();
    });
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
    this.bildschirm = b;
  }

  aendere(fn: (b: Datenbestand) => Datenbestand): void {
    this.bestand = fn($state.snapshot(this.bestand) as Datenbestand);
    this.plan?.vormerken($state.snapshot(this.bestand) as Datenbestand);
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
