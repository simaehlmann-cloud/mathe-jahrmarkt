/**
 * Geschwister-Duell an einem Gerät: Zwei Kinder rechnen nacheinander dieselben zehn Aufgaben.
 * (Die Familien-Bestenliste je Bude steht im Budenvorplatz.)
 */
import { blitzAufgabe, type BlitzAufgabe, type BlitzStufe } from './blitz';
import { createRng } from './rng';

export const DUELL_AUFGABEN = 10;
/** Taler für jede richtige Aufgabe im Duell, dazu ein kleiner Siegerbonus. */
export const DUELL_SIEG_TALER = 3;
/** Unter dieser Zeitdifferenz zählt gleiche Trefferzahl als Unentschieden. */
export const GLEICHSTAND_MS = 1000;

/** Beide bekommen dieselben Aufgaben: gleicher Startwert, gleiche Reihenfolge. */
export function duellAufgaben(stufe: BlitzStufe, seed: number): BlitzAufgabe[] {
  const rng = createRng(seed);
  const liste: BlitzAufgabe[] = [];
  while (liste.length < DUELL_AUFGABEN) {
    const a = blitzAufgabe(stufe, rng);
    // keine Aufgabe doppelt in einem Duell
    if (!liste.some((x) => x.text === a.text)) liste.push(a);
  }
  return liste;
}

export interface DuellLauf {
  richtig: number;
  ms: number;
}

/** 0: erster gewinnt, 1: zweiter gewinnt, -1: unentschieden. Erst zählen die Treffer, dann die Zeit. */
export function duellSieger(a: DuellLauf, b: DuellLauf): 0 | 1 | -1 {
  if (a.richtig !== b.richtig) return a.richtig > b.richtig ? 0 : 1;
  if (Math.abs(a.ms - b.ms) < GLEICHSTAND_MS) return -1;
  return a.ms < b.ms ? 0 : 1;
}
