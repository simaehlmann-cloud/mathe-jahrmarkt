/**
 * Abwechslung: Dieselbe Aufgabe soll nicht zweimal kommen, dasselbe Motiv (die Ameise, der Kreis,
 * dasselbe Würfelnetz) nicht kurz hintereinander – in der Runde und über die letzten Runden hinweg.
 *
 * Die Generatoren bleiben unverändert. Die Runde zieht einfach mehrere Kandidaten und nimmt den ersten,
 * der nicht in jüngster Zeit dran war (sonst den mit der geringsten Wiederholung).
 */
import type { Aufgabe } from './aufgaben/typen';

/** So viele zuletzt gestellte Aufgaben (Schlüssel) merkt sich jede Bude. */
export const MERKE_AUFGABEN = 40;
/** So viele zuletzt gezeigte Motive dürfen nicht sofort wiederkommen. */
export const MOTIV_ABSTAND = 4;
/** Höchstens so viele Versuche pro neuer Aufgabe. */
export const VERSUCHE = 16;

export interface Verlauf {
  /** Kurzschlüssel der zuletzt gestellten Aufgaben, neueste zuletzt. */
  k: string[];
  /** Zuletzt gezeigte Motive, neueste zuletzt. */
  m: string[];
}

export const leererVerlauf = (): Verlauf => ({ k: [], m: [] });

/** Kurzer, stabiler Fingerabdruck (FNV-1a, 32 Bit, hex). */
export function fingerabdruck(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

const datenVon = (a: Aufgabe): Record<string, unknown> | undefined =>
  'daten' in a && a.daten && typeof a.daten === 'object' ? (a.daten as Record<string, unknown>) : undefined;

/** Schlüssel einer Aufgabe: gleicher Text und gleiche Bilddaten = gleiche Aufgabe. */
export function aufgabenSchluessel(a: Aufgabe): string {
  // Alles außer Kennung, Antwortreihenfolge und Erklärung: so zählen auch Zahlen in eigenen Feldern (Detektiv, Werkstatt)
  const inhalt = JSON.stringify(a, (k, w: unknown) => (k === 'id' || k === 'optionen' || k === 'labels' || k === 'erklaerung' ? undefined : w));
  return fingerabdruck(inhalt);
}

/**
 * Das, was ein Kind als „schon wieder“ empfindet: das geschätzte Ding, die Form, die Ware, das Netz,
 * das Diagrammthema. Undefined, wenn eine Aufgabe kein wiedererkennbares Motiv hat (reine Rechnungen).
 */
export function motiv(a: Aufgabe): string | undefined {
  const d = datenVon(a);
  if (!d) return undefined;
  for (const feld of ['motiv', 'ding', 'name', 'ware', 'titel']) {
    const w = d[feld];
    if (typeof w === 'string') return `${feld}:${w}`;
  }
  if (d.netz !== undefined) return `netz:${fingerabdruck(JSON.stringify(d.netz))}`;
  if (Array.isArray(d.folge)) return `folge:${fingerabdruck(JSON.stringify(d.folge))}`;
  return undefined;
}

/** Strafpunkte eines Kandidaten: 0 = frisch. Gleiche Aufgabe wiegt schwerer als gleiches Motiv. */
export function wiederholung(a: Aufgabe, v: Verlauf): number {
  let s = 0;
  if (v.k.includes(aufgabenSchluessel(a))) s += 10;
  const m = motiv(a);
  if (m) {
    const zuletzt = v.m.slice(-MOTIV_ABSTAND);
    const i = zuletzt.lastIndexOf(m);
    // Je kürzer her, desto schlimmer
    if (i >= 0) s += 1 + i;
  }
  return s;
}

/** Zieht bis zu VERSUCHE Kandidaten und nimmt den frischesten. */
export function frischeAufgabe(ziehe: () => Aufgabe, v: Verlauf): Aufgabe {
  let beste = ziehe();
  let wert = wiederholung(beste, v);
  for (let i = 1; i < VERSUCHE && wert > 0; i++) {
    const k = ziehe();
    const w = wiederholung(k, v);
    if (w < wert) {
      beste = k;
      wert = w;
    }
  }
  return beste;
}

/** Trägt eine gestellte Aufgabe in den Verlauf ein (neuer Verlauf, alter bleibt unverändert). */
export function merke(v: Verlauf, a: Aufgabe): Verlauf {
  const m = motiv(a);
  return {
    k: [...v.k, aufgabenSchluessel(a)].slice(-MERKE_AUFGABEN),
    m: m ? [...v.m, m].slice(-MERKE_AUFGABEN) : v.m,
  };
}

export function pruefeVerlauf(x: unknown): Verlauf | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const o = x as Record<string, unknown>;
  const strs = (l: unknown): string[] => (Array.isArray(l) ? l.filter((e): e is string => typeof e === 'string' && e.length <= 80).slice(-MERKE_AUFGABEN) : []);
  return { k: strs(o.k), m: strs(o.m) };
}
