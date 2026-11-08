import { budeInfo, type Stufe } from '../buden';
import type { Profil } from '../profil';
import { abendmarktOffen, istGeschafft } from './fortschritt';

export type Sperrgrund = 'nichtSpielbar' | 'paket' | 'vorstufe' | 'abendmarkt';

export interface Freigabe {
  frei: boolean;
  grund?: Sperrgrund;
}

/**
 * Die einzige Stelle, die entscheidet, ob eine Stufe spielbar ist.
 * Bronze ist immer frei. Silber und Gold brauchen das Zusatzpaket und die geschaffte Vorstufe.
 * Der Abendmarkt braucht das Paket und Silber an allen Tagesbuden.
 */
export function stufeFreigabe(p: Profil, budeId: string, stufe: Stufe, paket: boolean): Freigabe {
  const info = budeInfo(budeId);
  if (!info.spielbar) return { frei: false, grund: 'nichtSpielbar' };
  if (info.gasse === 'abendmarkt' && !abendmarktOffen(p, paket)) return { frei: false, grund: 'abendmarkt' };
  if (stufe === 'bronze') return { frei: true };
  if (!paket) return { frei: false, grund: 'paket' };
  const vorstufe: Stufe = stufe === 'silber' ? 'bronze' : 'silber';
  if (!istGeschafft(p, budeId, vorstufe)) return { frei: false, grund: 'vorstufe' };
  return { frei: true };
}

/** Der Jahrmarkt-Check und die ausführliche Elternansicht gehören zum Paket. */
export const checkFrei = (paket: boolean): boolean => paket;
export const ausfuehrlicheElternansicht = (paket: boolean): boolean => paket;
