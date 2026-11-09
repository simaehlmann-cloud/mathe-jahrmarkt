import type { Rng } from './rng';

/**
 * Blitzrechnen: eine Minute Kopfrechnen zum Aufwärmen. Drei Stufen, je ein eigener Rekord.
 * Bewusst getrennt vom Lernprofil: Unter Zeitdruck sagen Fehler wenig darüber, was ein Kind kann.
 */
export type BlitzStufe = 'leicht' | 'mittel' | 'schwer';
export const BLITZ_STUFEN: readonly { id: BlitzStufe; name: string; text: string }[] = [
  { id: 'leicht', name: 'Leicht', text: 'Einmaleins, Plus und Minus bis 100' },
  { id: 'mittel', name: 'Mittel', text: 'Einmaleins mit Zehnern, Plus und Minus bis 1 000' },
  { id: 'schwer', name: 'Schwer', text: 'Geteilt, Verdoppeln, Halbieren, große Zahlen' },
];
export const BLITZ_SEKUNDEN = 60;

export interface BlitzStand {
  rekorde: Partial<Record<BlitzStufe, number>>;
  /** Wann zuletzt gespielt (Zeitstempel), für den Tagesbonus. */
  zuletzt: number;
}
export const leererBlitz = (): BlitzStand => ({ rekorde: {}, zuletzt: 0 });

export interface BlitzAufgabe {
  text: string;
  sprechtext: string;
  antwort: number;
}

const mal = (a: number, b: number): BlitzAufgabe => ({ text: `${a} · ${b}`, sprechtext: `${a} mal ${b}`, antwort: a * b });
const plus = (a: number, b: number): BlitzAufgabe => ({ text: `${a} + ${b}`, sprechtext: `${a} plus ${b}`, antwort: a + b });
const minus = (a: number, b: number): BlitzAufgabe => ({ text: `${a} − ${b}`, sprechtext: `${a} minus ${b}`, antwort: a - b });
const durch = (a: number, b: number): BlitzAufgabe => ({ text: `${a} : ${b}`, sprechtext: `${a} geteilt durch ${b}`, antwort: a / b });

export function blitzAufgabe(stufe: BlitzStufe, rng: Rng): BlitzAufgabe {
  const art = rng.int(0, 3);
  if (stufe === 'leicht') {
    if (art <= 1) return mal(rng.int(2, 10), rng.int(2, 10));
    if (art === 2) return plus(rng.int(11, 69), rng.int(5, 30));
    const a = rng.int(30, 99);
    return minus(a, rng.int(5, a - 10));
  }
  if (stufe === 'mittel') {
    if (art === 0) return mal(rng.int(2, 9), rng.int(2, 9) * 10);
    if (art === 1) return mal(rng.int(3, 9), rng.int(3, 9));
    if (art === 2) return plus(rng.int(12, 60) * 10, rng.int(5, 39) * 10);
    const a = rng.int(30, 99) * 10;
    return minus(a, rng.int(5, a / 10 - 10) * 10);
  }
  if (art === 0) {
    const b = rng.int(3, 9);
    return durch(b * rng.int(3, 12), b);
  }
  if (art === 1) {
    const a = rng.int(13, 49);
    return { text: `Das Doppelte von ${a}`, sprechtext: `das Doppelte von ${a}`, antwort: 2 * a };
  }
  if (art === 2) {
    const a = rng.int(6, 49) * 2;
    return { text: `Die Hälfte von ${a}`, sprechtext: `die Hälfte von ${a}`, antwort: a / 2 };
  }
  return plus(rng.int(101, 899), rng.int(11, 99));
}

/** Blöcke als Belohnung: einer je drei richtige, beim ersten Spiel des Tages fünf extra. */
export const blitzBloecke = (richtig: number, ersteHeute: boolean): number => Math.floor(richtig / 3) + (ersteHeute && richtig > 0 ? 5 : 0);

export function pruefeBlitz(x: unknown): BlitzStand {
  const s = leererBlitz();
  if (typeof x !== 'object' || x === null) return s;
  const o = x as Record<string, unknown>;
  const rekorde: Partial<Record<BlitzStufe, number>> = {};
  if (typeof o.rekorde === 'object' && o.rekorde !== null)
    for (const st of BLITZ_STUFEN) {
      const v = (o.rekorde as Record<string, unknown>)[st.id];
      if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1000) rekorde[st.id] = v;
    }
  return { rekorde, zuletzt: typeof o.zuletzt === 'number' ? o.zuletzt : 0 };
}
