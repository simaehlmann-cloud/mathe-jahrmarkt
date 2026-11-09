import { STUFEN, type Stufe } from './buden';
import { istGeschafft } from './fortschritt/fortschritt';
import { stufeFreigabe } from './fortschritt/kaufgrenze';
import type { Profil } from './profil';

/**
 * Jahrmarkt-Check: zwölf Aufgaben aus allen Bereichen, ohne Zeitdruck und ohne Hilfe.
 * Ergebnis je Bereich und bis zu drei Buden als Empfehlung (auch für die Tagesaufträge).
 */
export type Bereich = 'zahlen' | 'rechnen' | 'groessen' | 'raum' | 'muster' | 'daten';

export const BEREICH_NAME: Readonly<Record<Bereich, string>> = {
  zahlen: 'Zahlen und Stellenwerte',
  rechnen: 'Rechnen',
  groessen: 'Größen und Messen',
  raum: 'Raum und Form',
  muster: 'Muster und Strukturen',
  daten: 'Daten und Zufall',
};

export const BEREICH_BUDEN: Readonly<Record<Bereich, readonly string[]>> = {
  zahlen: ['dosenwerfen', 'seilbahn', 'tresor'],
  rechnen: ['dartbude', 'einmaleins-turbo', 'rechendomino', 'waage', 'rechenwerkstatt', 'fehlerdetektiv'],
  groessen: ['kasse', 'schaetzbude', 'uhrkarussell', 'umrechnungsmemory', 'achterbahn'],
  raum: ['spiegelkabinett', 'wuerfelnetz', 'labyrinth', 'formensortierer', 'zeltdekorateur'],
  muster: ['zahlenfolgenzug', 'rechenmauer', 'riesenradtechniker'],
  daten: ['murmellabor', 'diagrammreporter'],
};

/** Aufgaben des Checks: alle aus Buden, deren Aufgaben ohne eigene Bedienung als Auswahl funktionieren. */
export const CHECK_PLAN: readonly { bude: string; stufe: Stufe; bereich: Bereich }[] = [
  { bude: 'dosenwerfen', stufe: 'bronze', bereich: 'zahlen' },
  { bude: 'dosenwerfen', stufe: 'silber', bereich: 'zahlen' },
  { bude: 'dartbude', stufe: 'silber', bereich: 'rechnen' },
  { bude: 'rechendomino', stufe: 'bronze', bereich: 'rechnen' },
  { bude: 'waage', stufe: 'bronze', bereich: 'rechnen' },
  { bude: 'schaetzbude', stufe: 'bronze', bereich: 'groessen' },
  { bude: 'umrechnungsmemory', stufe: 'silber', bereich: 'groessen' },
  { bude: 'formensortierer', stufe: 'silber', bereich: 'raum' },
  { bude: 'wuerfelnetz', stufe: 'bronze', bereich: 'raum' },
  { bude: 'zahlenfolgenzug', stufe: 'silber', bereich: 'muster' },
  { bude: 'zahlenfolgenzug', stufe: 'bronze', bereich: 'muster' },
  { bude: 'diagrammreporter', stufe: 'silber', bereich: 'daten' },
];

export interface CheckErgebnis {
  am: number;
  bereiche: Partial<Record<Bereich, [number, number]>>;
  empfehlung: string[];
}

export type Einschaetzung = 'sicher' | 'fastSicher' | 'ueben';
export function einschaetzung([r, g]: readonly [number, number]): Einschaetzung {
  if (g === 0) return 'ueben';
  const q = r / g;
  return q >= 0.99 ? 'sicher' : q >= 0.5 ? 'fastSicher' : 'ueben';
}

export function werteCheckAus(antworten: readonly { bereich: Bereich; richtig: boolean }[], p: Profil, paket: boolean, am: number): CheckErgebnis {
  const bereiche: Partial<Record<Bereich, [number, number]>> = {};
  for (const a of antworten) {
    const [r, g] = bereiche[a.bereich] ?? [0, 0];
    bereiche[a.bereich] = [r + (a.richtig ? 1 : 0), g + 1];
  }
  const schwach = (Object.entries(bereiche) as [Bereich, [number, number]][])
    .filter(([, [r, g]]) => r < g)
    .sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1]);
  const empfehlung: string[] = [];
  const passend = (id: string): boolean => STUFEN.some((s) => stufeFreigabe(p, id, s, paket).frei && !istGeschafft(p, id, s));
  for (const [b] of schwach) {
    const bude = BEREICH_BUDEN[b].find((id) => passend(id) && !empfehlung.includes(id));
    if (bude) empfehlung.push(bude);
    if (empfehlung.length >= 3) break;
  }
  // Alles sicher: Buden zum Weitermachen vorschlagen
  for (const b of Object.keys(BEREICH_BUDEN) as Bereich[]) {
    if (empfehlung.length >= 3) break;
    const bude = BEREICH_BUDEN[b].find((id) => passend(id) && !empfehlung.includes(id));
    if (bude) empfehlung.push(bude);
  }
  return { am, bereiche, empfehlung };
}

export function pruefeCheck(x: unknown): CheckErgebnis | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (typeof o.am !== 'number' || typeof o.bereiche !== 'object' || o.bereiche === null) return null;
  const bereiche: Partial<Record<Bereich, [number, number]>> = {};
  for (const k of Object.keys(BEREICH_NAME) as Bereich[]) {
    const v = (o.bereiche as Record<string, unknown>)[k];
    if (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && n >= 0)) bereiche[k] = [v[0] as number, v[1] as number];
  }
  const empfehlung = Array.isArray(o.empfehlung) ? o.empfehlung.filter((e): e is string => typeof e === 'string').slice(0, 3) : [];
  return { am: o.am, bereiche, empfehlung };
}
