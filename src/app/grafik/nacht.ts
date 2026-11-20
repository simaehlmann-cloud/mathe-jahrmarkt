/**
 * Nacht auf der Bauinsel (seit 0.14): Farben werden zur Nacht hin dunkler und bläulicher.
 * Lampen behalten ihr Licht, Fenster leuchten (siehe TeilExtra).
 */

/** Teile, die nachts leuchten: Laterne, Lampe, Gartenlaterne. */
export const LAMPEN: ReadonlySet<number> = new Set([106, 113, 126]);

const NACHT = [24, 34, 82] as const;
const zwischen = new Map<string, string>();

/** Farbe (#rrggbb) bei Tageslicht `licht` (1 = Tag, 0 = Nacht). */
export function dunkel(farbe: string, licht: number): string {
  if (licht >= 1 || !/^#[0-9a-f]{6}$/i.test(farbe)) return farbe;
  const schluessel = `${farbe}|${licht}`;
  const fertig = zwischen.get(schluessel);
  if (fertig) return fertig;
  const n = parseInt(farbe.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  // Nachts: etwa 40 % Helligkeit, dazu ein Schuss Nachtblau
  const t = 1 - Math.max(0, licht);
  const hell = 1 - 0.6 * t;
  const aus = rgb.map((v, i) => Math.round(v * hell * (1 - 0.35 * t) + (NACHT[i] ?? 0) * 0.35 * t));
  const ergebnis = `#${aus.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
  zwischen.set(schluessel, ergebnis);
  return ergebnis;
}
