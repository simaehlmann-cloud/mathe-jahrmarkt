import { euro } from './baukasten';
import type { Aufgabe } from './typen';

/**
 * Wie ein Antwortwert gezeigt wird, auch wenn das Kind ihn frei gebaut hat (Münzen, Uhr, Pizza …)
 * und er deshalb nicht unter den Beschriftungen der Antwortmöglichkeiten steht.
 */
export type Anzeige = 'euro' | 'einheit' | 'mcm' | 'uhr' | 'zehntel' | 'hundertstel' | 'bruch' | 'division';

export const uhrzeit = (min: number): string => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

export function wertText(a: Aufgabe, w: number): string {
  const vorhanden = a.labels?.[w];
  if (vorhanden !== undefined) return vorhanden;
  if (a.art !== 'auswahl') return String(w);
  const d = a.daten;
  switch (d.anzeige as Anzeige | undefined) {
    case 'euro':
      return euro(w);
    case 'einheit':
      return `${w} ${String(d.einheit ?? '')}`.trim();
    case 'mcm':
      return w >= 100 ? `${Math.floor(w / 100)} m${w % 100 ? ` ${w % 100} cm` : ''}` : `${w} cm`;
    case 'uhr':
      return `${uhrzeit(w % 1440)} Uhr`;
    case 'zehntel':
      return `${Math.floor(w / 10)},${w % 10}`;
    case 'hundertstel':
      return `${Math.floor(w / 100)},${String(w % 100).padStart(2, '0')}`.replace(/(,\d)0$/, '$1');
    case 'bruch':
      return `${w % 100}/${Math.floor(w / 100)}`;
    case 'division':
      return `${Math.floor(w / 10)} Rest ${w % 10}`;
    default:
      return String(w);
  }
}
