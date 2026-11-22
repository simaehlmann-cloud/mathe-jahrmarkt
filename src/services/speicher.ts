import { alleAenderungen, keineAenderung, vereinige, type Aenderung } from './aenderung';
import { leererBestand, migriere, type Datenbestand } from './datenbestand';

/** Schlüssel-Wert-Speicher. In der App: Capacitor Preferences. In Tests: Speicher im Arbeitsspeicher. */
export interface KeyValue {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class MemoryKV implements KeyValue {
  readonly daten = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.daten.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.daten.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.daten.delete(key);
  }
}

/**
 * Capacitor Preferences: auf iOS UserDefaults, auf Android SharedPreferences.
 * Beides übersteht das Leeren des WebView-Speichers und ist Teil der Gerätesicherung.
 */
export async function preferencesKV(): Promise<KeyValue> {
  const { Preferences } = await import('@capacitor/preferences');
  return {
    get: async (key) => (await Preferences.get({ key })).value,
    set: (key, value) => Preferences.set({ key, value }),
    remove: (key) => Preferences.remove({ key }),
  };
}

export const SCHLUESSEL = 'mathe-jahrmarkt.daten';
export const SCHLUESSEL_KAPUTT = 'mathe-jahrmarkt.kaputt';

export interface Ladeergebnis {
  bestand: Datenbestand;
  /** Gespeicherte Daten waren nicht lesbar und wurden beiseitegelegt. */
  wiederhergestellt: boolean;
}

/**
 * Lädt und migriert. Unlesbare Daten werden nie gelöscht, sondern unter eigenem Schlüssel
 * aufbewahrt, damit sie sich später noch retten lassen. Die App startet dann mit leerem Bestand.
 */
export async function laden(kv: KeyValue): Promise<Ladeergebnis> {
  const roh = await kv.get(SCHLUESSEL);
  if (roh === null) return { bestand: leererBestand(), wiederhergestellt: false };
  try {
    return { bestand: migriere(JSON.parse(roh)), wiederhergestellt: false };
  } catch {
    await kv.set(SCHLUESSEL_KAPUTT, roh);
    return { bestand: leererBestand(), wiederhergestellt: true };
  }
}

export async function speichern(kv: KeyValue, bestand: Datenbestand): Promise<void> {
  await kv.set(SCHLUESSEL, JSON.stringify(bestand));
}

/** Wohin der Speicherplan schreibt: ein Schlüssel (Familien-App) oder einzelne Dateien (Schulversion, services/ablage.ts). */
export interface Ablage {
  schreiben(bestand: Datenbestand, aenderung: Aenderung): Promise<void>;
}

const istKeyValue = (x: KeyValue | Ablage): x is KeyValue => 'get' in x && 'set' in x;

/**
 * Bündelt schnelle Folgen von Änderungen zu einem Schreibvorgang.
 * `sofort()` schreibt ausstehende Änderungen sofort, z. B. wenn die App in den Hintergrund geht.
 * Statt eines Bestands kann `vormerken` eine Funktion bekommen, die ihn erst beim Schreiben liefert
 * (so wird bei vielen schnellen Änderungen nur einmal kopiert). Sie bekommt alle Änderungen seit dem letzten Schreiben.
 */
export class Speicherplan {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ausstehend: Datenbestand | ((aenderung: Aenderung) => Datenbestand) | undefined;
  private aenderung: Aenderung = keineAenderung();
  private laufend: Promise<void> = Promise.resolve();
  private readonly ablage: Ablage;

  constructor(
    ziel: KeyValue | Ablage,
    private readonly verzoegerungMs = 400,
    private readonly beiFehler: (e: unknown) => void = () => {},
  ) {
    this.ablage = istKeyValue(ziel) ? { schreiben: (b) => speichern(ziel, b) } : ziel;
  }

  vormerken(bestand: Datenbestand | ((aenderung: Aenderung) => Datenbestand), aenderung: Aenderung = alleAenderungen()): void {
    this.ausstehend = bestand;
    this.aenderung = vereinige(this.aenderung, aenderung);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sofort(), this.verzoegerungMs);
  }

  sofort(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const quelle = this.ausstehend;
    const aenderung = this.aenderung;
    this.ausstehend = undefined;
    this.aenderung = keineAenderung();
    if (!quelle) return this.laufend;
    const daten = typeof quelle === 'function' ? quelle(aenderung) : quelle;
    this.laufend = this.laufend
      .then(() => this.ablage.schreiben(daten, aenderung))
      .catch((e: unknown) => {
        // Beim nächsten Mal alles schreiben, damit nichts verloren geht
        this.aenderung = vereinige(this.aenderung, alleAenderungen());
        this.beiFehler(e);
      });
    return this.laufend;
  }
}
