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

/**
 * Bündelt schnelle Folgen von Änderungen zu einem Schreibvorgang.
 * `sofort()` schreibt ausstehende Änderungen sofort, z. B. wenn die App in den Hintergrund geht.
 */
export class Speicherplan {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ausstehend: Datenbestand | undefined;
  private laufend: Promise<void> = Promise.resolve();

  constructor(
    private readonly kv: KeyValue,
    private readonly verzoegerungMs = 400,
    private readonly beiFehler: (e: unknown) => void = () => {},
  ) {}

  vormerken(bestand: Datenbestand): void {
    this.ausstehend = bestand;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sofort(), this.verzoegerungMs);
  }

  sofort(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    const daten = this.ausstehend;
    this.ausstehend = undefined;
    if (!daten) return this.laufend;
    this.laufend = this.laufend.then(() => speichern(this.kv, daten)).catch(this.beiFehler);
    return this.laufend;
  }
}
