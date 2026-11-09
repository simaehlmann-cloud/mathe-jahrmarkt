import { STUFEN, type Stufe } from './buden';
import type { Profil } from './profil';

/**
 * Unterbrochene Runde: Wer eine Runde abbricht, kann später an derselben Stelle weitermachen.
 * Gespeichert werden nur beantwortete Hauptaufgaben; die gerade offene Aufgabe kommt neu.
 * Ein Zwischenstand gilt einen Tag lang.
 */
export interface Zwischenstand {
  /** Beantwortete Hauptaufgaben (1–9). */
  gestellt: number;
  richtig: number;
  serie: number;
  punkte: number;
  durchhalte: number;
}
export interface Pause extends Zwischenstand {
  bude: string;
  stufe: Stufe;
  am: number;
  /** Ergebnis je beantworteter Aufgabe für die Punkteleiste. */
  ergebnisse: boolean[];
}

export const PAUSE_GUELTIG_MS = 24 * 60 * 60 * 1000;

export function pauseFuer(p: Profil, bude: string, stufe: Stufe, jetzt: number): Pause | undefined {
  const x = p.pausen.find((q) => q.bude === bude && q.stufe === stufe);
  return x && jetzt - x.am < PAUSE_GUELTIG_MS && x.am <= jetzt ? x : undefined;
}

/** Zwischenstand merken (ersetzt einen alten derselben Bude und Stufe), abgelaufene fallen weg. */
export function mitPause(p: Profil, pause: Pause): Profil {
  const rest = p.pausen.filter((q) => !(q.bude === pause.bude && q.stufe === pause.stufe) && pause.am - q.am < PAUSE_GUELTIG_MS);
  return { ...p, pausen: [...rest, pause].slice(-20) };
}

export const ohnePause = (p: Profil, bude: string, stufe: Stufe): Profil =>
  p.pausen.some((q) => q.bude === bude && q.stufe === stufe) ? { ...p, pausen: p.pausen.filter((q) => !(q.bude === bude && q.stufe === stufe)) } : p;

export function pruefePausen(x: unknown): Pause[] {
  if (!Array.isArray(x)) return [];
  const n = (v: unknown, max: number): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : -1);
  return x
    .filter((o): o is Record<string, unknown> => typeof o === 'object' && o !== null)
    .map((o) => ({
      bude: typeof o.bude === 'string' ? o.bude : '',
      stufe: o.stufe as Stufe,
      am: typeof o.am === 'number' ? o.am : 0,
      gestellt: n(o.gestellt, 9),
      richtig: n(o.richtig, 9),
      serie: n(o.serie, 9),
      punkte: n(o.punkte, 99999),
      durchhalte: n(o.durchhalte, 99),
      ergebnisse: Array.isArray(o.ergebnisse) ? o.ergebnisse.filter((e): e is boolean => typeof e === 'boolean').slice(0, 9) : [],
    }))
    .filter((q) => q.bude && STUFEN.includes(q.stufe) && q.gestellt >= 1 && q.richtig >= 0 && q.richtig <= q.gestellt && q.serie >= 0 && q.punkte >= 0 && q.durchhalte >= 0)
    .slice(-20);
}
