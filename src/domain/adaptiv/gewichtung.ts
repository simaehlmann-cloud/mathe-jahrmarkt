import type { Gewichtung } from '../aufgaben/einmaleins';
import type { Ereignis } from '../lernprofil/lernprofil';

/** Wie viele jüngste Versuche pro Fakt zählen. */
const JUENGSTE = 5;

/**
 * Gilt für jeden Aufgabenschlüssel (Einmaleins-Fakt wie „7x8“, Stellenwert-Art wie „stw:null“).
 * Fakten mit jüngsten Fehlern kommen häufiger, sicher gelöste seltener, neue Fakten etwas häufiger.
 * Das Gewicht bleibt zwischen 0,5 und 4, damit nie ein Fakt ganz verschwindet oder alles dominiert.
 */
export function faktGewichtung(ereignisse: readonly Ereignis[]): Gewichtung {
  const verlauf = new Map<string, boolean[]>();
  for (const e of [...ereignisse].sort((x, y) => x.t - y.t)) {
    if (!e.gewertet || !e.fakt) continue;
    const liste = verlauf.get(e.fakt) ?? [];
    liste.push(e.richtig);
    if (liste.length > JUENGSTE) liste.shift();
    verlauf.set(e.fakt, liste);
  }
  return (schluessel: string): number => {
    const liste = verlauf.get(schluessel);
    if (!liste || liste.length === 0) return 1.5;
    const fehler = liste.filter((r) => !r).length;
    if (fehler === 0) return liste.length >= 3 ? 0.5 : 1;
    return Math.min(4, 1 + fehler * 1.5);
  };
}
