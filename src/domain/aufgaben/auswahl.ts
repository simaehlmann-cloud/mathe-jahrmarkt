import type { Rng } from '../rng';
import type { FehlerArt, Option } from './typen';

export const ANZAHL_OPTIONEN = 4;

export interface Fehler {
  wert: number;
  fehlerArt: FehlerArt;
}

/**
 * Antwortmöglichkeiten: die richtige und bis zu drei typische Fehler (in dieser Reihenfolge bevorzugt),
 * aufgefüllt mit nahen Zahlen im Abstand `schritt`. Alle Werte verschieden, positiv, ganzzahlig.
 */
export function auswahl(antwort: number, fehler: readonly Fehler[], rng: Rng, schritt: number, anzahl = ANZAHL_OPTIONEN): Option[] {
  const gesehen = new Set<number>([antwort]);
  const falsche: Option[] = [];
  for (const f of fehler) {
    if (falsche.length >= anzahl - 1) break;
    if (!Number.isInteger(f.wert) || f.wert <= 0 || gesehen.has(f.wert)) continue;
    gesehen.add(f.wert);
    falsche.push({ wert: f.wert, fehlerArt: f.fehlerArt });
  }
  for (let i = 1; falsche.length < anzahl - 1 && i < 50; i++) {
    const x = antwort + Math.ceil(i / 2) * schritt * (i % 2 ? 1 : -1);
    if (x <= 0 || gesehen.has(x)) continue;
    gesehen.add(x);
    falsche.push({ wert: x, fehlerArt: 'sonstige' });
  }
  return rng.shuffle([{ wert: antwort }, ...falsche]);
}

let zaehler = 0;
export const neueAufgabenId = (vorsilbe: string): string => `${vorsilbe}${++zaehler}`;
