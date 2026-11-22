/**
 * Ablage des Datenbestands in einzelnen Dateien (Schulversion).
 *
 * Die Familien-App schreibt den ganzen Bestand als einen Text in die Preferences (UserDefaults) – bei vier Profilen
 * ist das klein. Mit 32 Profilen wären es mehrere Megabyte nach jeder Antwort. Deshalb liegt hier jedes Profil
 * in einer eigenen Datei, dazu ein Kopf (Einstellungen, Klassen, Reihenfolge) und die eingesammelten Ergebnisse.
 * Geschrieben wird nur, was sich geändert hat.
 *
 * Gegen halb geschriebene Dateien (Akku leer, App beendet) hat jede Datei zwei Fächer A und B mit fortlaufender Nummer:
 * Geschrieben wird immer ins ältere Fach, gelesen wird das jüngere lesbare. Unlesbare Dateien werden nie gelöscht.
 */
import type { Profil } from '../../domain/profil';
import type { Sammlung } from '../domain/schuldaten';
import { migriere, type Datenbestand } from '../../services/datenbestand';
import type { Aenderung } from '../../services/aenderung';
import type { Ladeergebnis } from '../../services/speicher';
import '../domain/pruefen';

/** Einfache Dateiablage: in der App ein Ordner im Library-Verzeichnis, in Tests der Arbeitsspeicher. */
export interface Dateien {
  lesen(name: string): Promise<string | null>;
  schreiben(name: string, inhalt: string): Promise<void>;
  loeschen(name: string): Promise<void>;
  liste(): Promise<string[]>;
}

export class SpeicherDateien implements Dateien {
  readonly daten = new Map<string, string>();
  async lesen(name: string): Promise<string | null> {
    return this.daten.get(name) ?? null;
  }
  async schreiben(name: string, inhalt: string): Promise<void> {
    this.daten.set(name, inhalt);
  }
  async loeschen(name: string): Promise<void> {
    this.daten.delete(name);
  }
  async liste(): Promise<string[]> {
    return [...this.daten.keys()];
  }
}

const ORDNER = 'spielstand';

/** Capacitor Filesystem: iOS Library/spielstand (nicht in „Dateien“ sichtbar, Teil der Gerätesicherung). */
export async function geraeteDateien(): Promise<Dateien> {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const ort = { directory: Directory.Library };
  try {
    await Filesystem.mkdir({ path: ORDNER, recursive: true, ...ort });
  } catch {
    /* gibt es schon */
  }
  return {
    async lesen(name) {
      try {
        const r = await Filesystem.readFile({ path: `${ORDNER}/${name}`, encoding: Encoding.UTF8, ...ort });
        return typeof r.data === 'string' ? r.data : await r.data.text();
      } catch {
        return null;
      }
    },
    async schreiben(name, inhalt) {
      await Filesystem.writeFile({ path: `${ORDNER}/${name}`, data: inhalt, encoding: Encoding.UTF8, recursive: true, ...ort });
    },
    async loeschen(name) {
      try {
        await Filesystem.deleteFile({ path: `${ORDNER}/${name}`, ...ort });
      } catch {
        /* schon weg */
      }
    },
    async liste() {
      try {
        const r = await Filesystem.readdir({ path: ORDNER, ...ort });
        return r.files.map((f) => f.name);
      } catch {
        return [];
      }
    },
  };
}

/** Profil-Kennung als Dateiname (hex), damit kein Zeichen der Kennung den Pfad verändern kann. */
const hex = (s: string): string => [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, '0')).join('');
const vonHex = (h: string): string => new TextDecoder().decode(new Uint8Array((h.match(/../g) ?? []).map((x) => parseInt(x, 16))));

export const KOPF = 'kopf';
export const SAMMLUNG = 'sammlung';
export const profilDatei = (id: string): string => `p-${hex(id)}`;
const FAECHER = ['a', 'b'] as const;
const dateiname = (basis: string, fach: (typeof FAECHER)[number]): string => `${basis}.${fach}.json`;

interface Fachinhalt {
  nr: number;
  daten: unknown;
}

export class TeilAblage {
  /** Je Datei: Nummer und Fach des zuletzt gelesenen oder geschriebenen Stands. */
  private stand = new Map<string, { nr: number; fach: 'a' | 'b' }>();
  private profileGeschrieben = new Set<string>();
  /** Zuletzt geschriebener Text je Datei: Unveränderte Dateien werden nicht erneut geschrieben. */
  private zuletzt = new Map<string, string>();

  constructor(private readonly dateien: Dateien) {}

  /** Liest den jüngeren lesbaren Stand einer Datei. undefined: nicht vorhanden; 'kaputt': vorhanden, aber unlesbar. */
  private async leseBeide(basis: string): Promise<unknown | 'kaputt' | undefined> {
    let best: { nr: number; fach: 'a' | 'b'; daten: unknown } | undefined;
    let vorhanden = false;
    for (const fach of FAECHER) {
      const roh = await this.dateien.lesen(dateiname(basis, fach));
      if (roh === null) continue;
      vorhanden = true;
      try {
        const x = JSON.parse(roh) as Fachinhalt;
        if (typeof x?.nr === 'number' && (!best || x.nr > best.nr)) best = { nr: x.nr, fach, daten: x.daten };
      } catch {
        /* dieses Fach ist halb geschrieben – das andere zählt */
      }
    }
    if (best) {
      this.stand.set(basis, { nr: best.nr, fach: best.fach });
      return best.daten;
    }
    return vorhanden ? 'kaputt' : undefined;
  }

  private async schreibe(basis: string, daten: unknown): Promise<void> {
    const text = JSON.stringify(daten);
    if (this.zuletzt.get(basis) === text) return;
    const alt = this.stand.get(basis);
    const nr = (alt?.nr ?? 0) + 1;
    // Ins Fach, das nicht den jüngsten Stand hält
    const fach: 'a' | 'b' = alt?.fach === 'a' ? 'b' : 'a';
    await this.dateien.schreiben(dateiname(basis, fach), `{"nr":${nr},"daten":${text}}`);
    this.stand.set(basis, { nr, fach });
    this.zuletzt.set(basis, text);
  }

  private async entferne(basis: string): Promise<void> {
    for (const fach of FAECHER) await this.dateien.loeschen(dateiname(basis, fach));
    this.stand.delete(basis);
    this.zuletzt.delete(basis);
  }

  async laden(ersatz: () => Datenbestand): Promise<Ladeergebnis> {
    const kopf = await this.leseBeide(KOPF);
    if (kopf === undefined) {
      // Neues Gerät. Profile ohne Kopf (sehr unwahrscheinlich) bleiben als Dateien liegen.
      return { bestand: ersatz(), wiederhergestellt: (await this.dateien.liste()).some((n) => n.startsWith('p-')) };
    }
    let wiederhergestellt = kopf === 'kaputt';
    let ids: string[];
    let rest: Record<string, unknown> = {};
    if (kopf === 'kaputt' || typeof kopf !== 'object' || kopf === null) {
      // Kopf unlesbar: Profile aus den vorhandenen Dateien zusammensuchen, Einstellungen auf Anfang
      wiederhergestellt = true;
      ids = [...new Set((await this.dateien.liste()).filter((n) => /^p-[0-9a-f]+\.[ab]\.json$/.test(n)).map((n) => vonHex(n.slice(2).split('.')[0] as string)))];
      rest = { ...ersatz() };
      delete rest.profile;
    } else {
      const k = kopf as Record<string, unknown>;
      ids = Array.isArray(k.profile) ? k.profile.filter((x): x is string => typeof x === 'string') : [];
      rest = { ...k };
    }
    const profile: unknown[] = [];
    for (const id of ids) {
      const p = await this.leseBeide(profilDatei(id));
      if (p === undefined) continue;
      if (p === 'kaputt') {
        wiederhergestellt = true;
        continue;
      }
      profile.push(p);
      this.profileGeschrieben.add(id);
    }
    const sammlung = await this.leseBeide(SAMMLUNG);
    if (sammlung === 'kaputt') wiederhergestellt = true;
    const roh: Record<string, unknown> = { ...rest, profile };
    if (Array.isArray(sammlung) && typeof roh.schule === 'object' && roh.schule !== null) roh.schule = { ...(roh.schule as object), gesammelt: sammlung };
    try {
      const bestand = migriere(roh);
      // Was gerade gelesen wurde, muss nicht gleich wieder geschrieben werden
      for (const p of bestand.profile) this.zuletzt.set(profilDatei(p.id), JSON.stringify(p));
      return { bestand, wiederhergestellt };
    } catch {
      return { bestand: ersatz(), wiederhergestellt: true };
    }
  }

  /** Schreibt die geänderten Teile: erst Profile und Sammlung, dann den Kopf, zuletzt werden gelöschte Profile entfernt. */
  async schreiben(b: Datenbestand, aenderung: Aenderung): Promise<void> {
    const ids = new Set(b.profile.map((p) => p.id));
    for (const p of b.profile) {
      if (aenderung.alle || aenderung.profile.has(p.id) || !this.profileGeschrieben.has(p.id)) {
        await this.schreibe(profilDatei(p.id), p satisfies Profil);
        this.profileGeschrieben.add(p.id);
      }
    }
    const gesammelt: Sammlung[] = b.schule?.gesammelt ?? [];
    if (aenderung.alle || aenderung.sammlung) await this.schreibe(SAMMLUNG, gesammelt);
    const kopf = { ...b, profile: b.profile.map((p) => p.id), ...(b.schule ? { schule: { ...b.schule, gesammelt: [] } } : {}) };
    // Der Kopf ist klein; er wird bei jeder Änderung mitgeprüft (unverändert = kein Schreiben)
    await this.schreibe(KOPF, kopf);
    for (const id of [...this.profileGeschrieben]) {
      if (!ids.has(id)) {
        await this.entferne(profilDatei(id));
        this.profileGeschrieben.delete(id);
      }
    }
  }
}
