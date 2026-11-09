import { BUDEN, STUFEN } from './buden';
import { istGeschafft } from './fortschritt/fortschritt';
import type { Profil } from './profil';

/**
 * Ränge statt Lobsätzen: Jede geschaffte Stufe einer Bude zählt einen Stern (höchstens 27 · 3 = 81).
 * Die Schwellen werden nach hinten weiter, damit es lange etwas zu erreichen gibt.
 */
export const RAENGE: readonly { name: string; ab: number }[] = [
  { name: 'Neuling', ab: 0 },
  { name: 'Budenhelfer', ab: 3 },
  { name: 'Budenprofi', ab: 10 },
  { name: 'Budenchef', ab: 22 },
  { name: 'Jahrmarkt-Manager', ab: 40 },
  { name: 'Jahrmarkt-Direktor', ab: 62 },
  { name: 'Mathe-Legende', ab: 81 },
];

export const sterne = (p: Profil): number => BUDEN.reduce((n, b) => n + STUFEN.filter((s) => istGeschafft(p, b.id, s)).length, 0);

export interface RangStand {
  name: string;
  stufe: number;
  sterne: number;
  /** Sterne bis zum nächsten Rang (0 beim höchsten). */
  fehlen: number;
  naechster?: string;
}

export function rang(p: Profil): RangStand {
  const n = sterne(p);
  let i = 0;
  RAENGE.forEach((r, j) => {
    if (n >= r.ab) i = j;
  });
  const naechster = RAENGE[i + 1];
  return { name: RAENGE[i]?.name ?? 'Neuling', stufe: i, sterne: n, fehlen: naechster ? naechster.ab - n : 0, ...(naechster ? { naechster: naechster.name } : {}) };
}
