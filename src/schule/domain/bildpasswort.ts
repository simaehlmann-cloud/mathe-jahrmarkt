import type { Rng } from '../../domain/rng';

/**
 * Bildpasswort der Schulversion: drei Bilder vom Jahrmarkt in fester Reihenfolge.
 * Kinder in Klasse 4 merken sich Bilder leichter als Buchstaben, und auf dem ausgedruckten Kärtchen
 * stehen Bild und Wort nebeneinander.
 *
 * Das Bildpasswort schützt vor Verwechseln und Hineinschauen unter Mitschülern, nicht vor Angriffen:
 * Die Lehrkraft muss es anzeigen und ausdrucken können, deshalb liegt es lesbar im Gerätespeicher.
 */

export interface BildSymbol {
  id: string;
  /** Wort auf dem Kärtchen und für Bildschirmleser. */
  name: string;
}

/** Zwölf gut unterscheidbare Bilder (Form und Farbe). Die Kennungen sind gespeichert – nie umbenennen. */
export const BILDSYMBOLE: readonly BildSymbol[] = [
  { id: 'ballon', name: 'Ballon' },
  { id: 'stern', name: 'Stern' },
  { id: 'herz', name: 'Herz' },
  { id: 'eis', name: 'Eis' },
  { id: 'popcorn', name: 'Popcorn' },
  { id: 'riesenrad', name: 'Riesenrad' },
  { id: 'mond', name: 'Mond' },
  { id: 'fahne', name: 'Fahne' },
  { id: 'krone', name: 'Krone' },
  { id: 'zuckerwatte', name: 'Zuckerwatte' },
  { id: 'apfel', name: 'Apfel' },
  { id: 'ente', name: 'Ente' },
];

export const PASSWORT_LAENGE = 3;

const IDS = new Set(BILDSYMBOLE.map((s) => s.id));
export const symbolName = (id: string): string => BILDSYMBOLE.find((s) => s.id === id)?.name ?? id;

/** Drei Bilder, zwei gleiche nie direkt hintereinander (12 · 11 · 11 = 1 452 Möglichkeiten). */
export function erzeugePasswort(rng: Rng): string[] {
  const aus: string[] = [];
  while (aus.length < PASSWORT_LAENGE) {
    const s = rng.pick(BILDSYMBOLE).id;
    if (s !== aus[aus.length - 1]) aus.push(s);
  }
  return aus;
}

export const passwortGueltig = (x: unknown): x is string[] =>
  Array.isArray(x) && x.length === PASSWORT_LAENGE && x.every((s) => typeof s === 'string' && IDS.has(s));

export const passwortRichtig = (soll: readonly string[] | undefined, ist: readonly string[]): boolean =>
  !!soll && soll.length === ist.length && soll.every((s, i) => s === ist[i]);

export const passwortText = (pw: readonly string[]): string => pw.map(symbolName).join(' – ');

/** Nach so vielen Fehlversuchen an einem Profil kurz warten (gegen Durchprobieren). */
export const PASSWORT_VERSUCHE = 3;
export const PASSWORT_WARTEN_MS = 20_000;
