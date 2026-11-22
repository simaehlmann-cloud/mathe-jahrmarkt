/**
 * Vorher-nachher-Vergleich (Schulversion): Jeder Jahrmarkt-Check wird zusätzlich im Verlauf des Kindes gemerkt,
 * damit die Lehrkraft z. B. den Stand zu Schuljahresbeginn mit dem nach einigen Wochen vergleichen kann.
 */
import { BEREICH_NAME, type Bereich, type CheckErgebnis } from '../../domain/check';
import type { Profil } from '../../domain/profil';
import { MAX_CHECKVERLAUF } from '../../services/datenbestand';

/** Alle Checks eines Kindes, ältester zuerst, ohne Doppelte (gleicher Zeitpunkt). */
export function alleChecks(p: Pick<Profil, 'check' | 'checkVerlauf'>): CheckErgebnis[] {
  const karte = new Map<number, CheckErgebnis>();
  for (const c of [...(p.checkVerlauf ?? []), ...(p.check ? [p.check] : [])]) karte.set(c.am, c);
  return [...karte.values()].sort((a, b) => a.am - b.am);
}

/** Nach einem Check: den aktuellen in den Verlauf übernehmen (höchstens 8). */
export function mitCheckVerlauf(p: Profil): Profil {
  return { ...p, checkVerlauf: alleChecks(p).slice(-MAX_CHECKVERLAUF) };
}

export const BEREICHE = Object.keys(BEREICH_NAME) as Bereich[];

/** Anteil richtig je Bereich (0..1) oder undefined, wenn der Bereich nicht vorkam. */
export const anteil = (c: CheckErgebnis, b: Bereich): number | undefined => {
  const rg = c.bereiche[b];
  return rg && rg[1] ? rg[0] / rg[1] : undefined;
};

/**
 * Entwicklung je Bereich für eine Gruppe: erster und letzter Check jedes Kindes mit mindestens zwei Checks,
 * gemittelt. Kinder mit nur einem Check zählen nicht mit.
 */
export function entwicklung(kinder: readonly Pick<Profil, 'check' | 'checkVerlauf'>[]): { kinder: number; bereiche: { bereich: Bereich; vorher: number; nachher: number }[] } {
  const paare = kinder.map(alleChecks).filter((l) => l.length >= 2).map((l) => [l[0] as CheckErgebnis, l[l.length - 1] as CheckErgebnis] as const);
  const bereiche = BEREICHE.flatMap((b) => {
    const werte = paare.map(([v, n]) => [anteil(v, b), anteil(n, b)] as const).filter((w): w is readonly [number, number] => w[0] !== undefined && w[1] !== undefined);
    if (!werte.length) return [];
    const mittel = (i: 0 | 1) => werte.reduce((s, w) => s + w[i], 0) / werte.length;
    return [{ bereich: b, vorher: mittel(0), nachher: mittel(1) }];
  });
  return { kinder: paare.length, bereiche };
}
