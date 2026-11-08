/**
 * Zufallsgenerator mit Seed (mulberry32).
 * Jeder Generator bekommt einen Rng, damit sich jede Aufgabenfolge exakt nachstellen lässt.
 */
export interface Rng {
  readonly seed: number;
  /** Gleichverteilt in [0, 1). */
  next(): number;
  /** Ganze Zahl in [min, max], beide Grenzen eingeschlossen. */
  int(min: number, max: number): number;
  pick<T>(liste: readonly T[]): T;
  shuffle<T>(liste: readonly T[]): T[];
  /** Wahl nach Gewichten; Gewichte ≤ 0 werden nie gewählt. */
  weighted<T>(liste: readonly T[], gewicht: (x: T) => number): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Ungültiger Bereich ${min}..${max}`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };
  const pick = <T>(liste: readonly T[]): T => {
    if (liste.length === 0) throw new RangeError('Leere Liste');
    return liste[int(0, liste.length - 1)] as T;
  };
  const shuffle = <T>(liste: readonly T[]): T[] => {
    const a = [...liste];
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      const tmp = a[i] as T;
      a[i] = a[j] as T;
      a[j] = tmp;
    }
    return a;
  };
  const weighted = <T>(liste: readonly T[], gewicht: (x: T) => number): T => {
    const g = liste.map((x) => Math.max(0, gewicht(x)));
    const summe = g.reduce((s, x) => s + x, 0);
    if (summe <= 0) return pick(liste);
    let r = next() * summe;
    for (let i = 0; i < liste.length; i++) {
      r -= g[i] as number;
      if (r < 0) return liste[i] as T;
    }
    return liste[liste.length - 1] as T;
  };
  return { seed: seed >>> 0, next, int, pick, shuffle, weighted };
}

/** Neuer Seed aus dem Systemzufall. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] ?? 1;
}
