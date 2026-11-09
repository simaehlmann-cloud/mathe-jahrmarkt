import type { FehlerArt } from '../aufgaben/typen';

/**
 * Mögliche Ursache eines Fehlers. Die Signale sind Hinweise, keine Gewissheit;
 * aussagekräftig wird erst ein Muster über viele Aufgaben.
 */
export type Ursache = 'mechanik' | 'zuSchnell' | 'gelesen' | 'verrechnet' | 'unsicher' | 'konzept';

/** Antworten schneller als diese Zeit gelten als „zu schnell getippt“. */
export const ZU_SCHNELL_MS = 900;

export interface Antwortsignal {
  richtig: boolean;
  fehlerArt?: FehlerArt | undefined;
  /** Zeit vom Erscheinen der Aufgabe bis zur Antwort. */
  ms: number;
  /** Probewurf oder erste Runde in einer neuen Bude. */
  uebung: boolean;
}

export function bestimmeUrsache(s: Antwortsignal): Ursache | undefined {
  if (s.richtig) return undefined;
  if (s.uebung) return 'mechanik';
  if (s.ms < ZU_SCHNELL_MS) return 'zuSchnell';
  switch (s.fehlerArt) {
    case 'operation':
      return 'gelesen';
    case 'zehner':
    case 'ziffern':
    case 'uebertrag':
      return 'verrechnet';
    case 'nachbaraufgabe':
      return 'unsicher';
    case 'umkehr':
    case 'stelle':
    case 'buendel':
    case 'skala':
    case 'runden':
      return 'konzept';
    default:
      return 'unsicher';
  }
}

/** Gewertet wird nur, was etwas über die Mathematik aussagt. */
export const zaehltFuerProfil = (u: Ursache | undefined): boolean => u !== 'mechanik' && u !== 'zuSchnell';

export const URSACHE_HINWEIS: Readonly<Record<Ursache, string>> = {
  mechanik: 'Das war ein Probewurf.',
  zuSchnell: 'Lass dir ruhig Zeit.',
  gelesen: 'Schau noch mal genau auf das Rechenzeichen.',
  verrechnet: 'Fast! Du warst ganz nah dran.',
  unsicher: 'Das schauen wir uns zusammen an.',
  konzept: 'Das schauen wir uns zusammen an.',
};
