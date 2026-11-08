import type { GasseId, Stufe } from '../domain/buden';
import { verdichten, type Ereignis } from '../domain/lernprofil/lernprofil';
import type { Aussehen } from '../domain/aussehen';
import { MAX_PROFILE, neuesProfil, type AbzeichenId, type FigurId, type Profil } from '../domain/profil';
import { randomSeed } from '../domain/rng';
import { leererBestand, type Datenbestand, type Einstellungen } from '../services/datenbestand';
import { erstelleKauf, keinKauf, type KaufService } from '../services/kauf';
import { erstelleKlang, type Klangart } from '../services/klang';
import { erstelleSprache } from '../services/sprache';
import { Speicherplan, laden, preferencesKV, type KeyValue } from '../services/speicher';

export type Bildschirm =
  | { name: 'laden' }
  | { name: 'start' }
  | { name: 'jahrmarkt' }
  | { name: 'gasse'; gasse: GasseId }
  | { name: 'bude'; bude: string }
  | { name: 'spiel'; bude: string; stufe: Stufe; n?: number }
  | { name: 'profil' }
  | { name: 'andenken' }
  | { name: 'figur' }
  | { name: 'eltern' };

/** Zentraler Zustand. Jede Änderung am Bestand läuft über `aendere`, damit sie gespeichert wird. */
class AppZustand {
  bestand = $state<Datenbestand>(leererBestand());
  bildschirm = $state<Bildschirm>({ name: 'laden' });
  meldung = $state<string | null>(null);
  ladefehler = $state(false);
  /** Sätze, die Flinka beim nächsten Bildschirm sagen soll (z. B. nach einer neuen Stufe). */
  flinka = $state<string[] | null>(null);

  kauf: KaufService = keinKauf();
  readonly sprache = erstelleSprache();
  readonly klang = erstelleKlang();
  private plan: Speicherplan | undefined;

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

  profilWaehlen(id: string): void {
    this.aendere((b) => ({ ...b, aktiv: id }));
    this.zeige({ name: 'jahrmarkt' });
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

  sprich(text: string): void {
    void this.sprache.sprich(text, this.einstellungen.lautSprache);
  }

  melde(text: string): void {
    this.meldung = text;
    setTimeout(() => {
      if (this.meldung === text) this.meldung = null;
    }, 4000);
  }
}

export const app = new AppZustand();
