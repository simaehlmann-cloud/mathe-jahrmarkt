/**
 * Welche Teile des Datenbestands sich seit dem letzten Schreiben geändert haben.
 * Die Familien-App schreibt immer alles (ein Schlüssel); die Ablage der Schulversion schreibt nur Geändertes.
 */
/** Was sich seit dem letzten Schreiben geändert hat. */
export interface Aenderung {
  alle: boolean;
  kopf: boolean;
  sammlung: boolean;
  profile: Set<string>;
}

export const keineAenderung = (): Aenderung => ({ alle: false, kopf: false, sammlung: false, profile: new Set() });
export const alleAenderungen = (): Aenderung => ({ alle: true, kopf: true, sammlung: true, profile: new Set() });

export function vereinige(a: Aenderung, b: Aenderung): Aenderung {
  return { alle: a.alle || b.alle, kopf: a.kopf || b.kopf, sammlung: a.sammlung || b.sammlung, profile: new Set([...a.profile, ...b.profile]) };
}
