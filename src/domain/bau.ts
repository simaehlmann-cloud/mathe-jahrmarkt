import type { Rng } from './rng';

/**
 * Bauplatz: Mit Blöcken, die das Kind beim Rechnen verdient, baut es auf einem Raster.
 * Die Welt ist ein Bauplan: Je Feld ein Stapel von Blöcken (Farbindex von unten nach oben).
 * Bauaufträge sind Mathematik zum Anfassen (KC Raum und Form): nach Bauplan bauen,
 * Würfelgebäude nachbauen, Quader mit vorgegebenen Maßen, symmetrisch ergänzen.
 */

export const WELT = 8;
export const MAX_HOEHE = 8;

export const BLOCKARTEN: readonly { id: number; name: string; oben: string; links: string; rechts: string }[] = [
  { id: 0, name: 'Wiese', oben: '#7cc96b', links: '#8a5a3b', rechts: '#a06b47' },
  { id: 1, name: 'Stein', oben: '#b7bccb', links: '#8b90a3', rechts: '#9ca1b4' },
  { id: 2, name: 'Holz', oben: '#d9a066', links: '#9c6634', rechts: '#b57a42' },
  { id: 3, name: 'Ziegel', oben: '#e2725b', links: '#a8402f', rechts: '#c2533f' },
  { id: 4, name: 'Glas', oben: '#c9ecff', links: '#86c4e8', rechts: '#a3d6f2' },
  { id: 5, name: 'Sand', oben: '#f3dc9a', links: '#c9ad60', rechts: '#dcc177' },
  { id: 6, name: 'Gold', oben: '#ffd54a', links: '#c99a0e', rechts: '#e3b222' },
  { id: 7, name: 'Nacht', oben: '#5b5f97', links: '#33366a', rechts: '#44487f' },
];

export interface BauStand {
  /** Verfügbare Blöcke. */
  bloecke: number;
  /** WELT · WELT Stapel, Index y · WELT + x. */
  welt: number[][];
  /** Erledigte Bauaufträge (Kennungen), für die Belohnung nur einmal. */
  erledigt: string[];
}

export const leererBau = (): BauStand => ({ bloecke: 12, welt: Array.from({ length: WELT * WELT }, () => []), erledigt: [] });

/** Blöcke für eine Runde: einer pro richtige Antwort, fünf extra für eine neu geschaffte Stufe. */
export const bloeckeFuerRunde = (richtig: number, neuGeschafft: boolean): number => richtig + (neuGeschafft ? 5 : 0);

export function setzeBlock(b: BauStand, x: number, y: number, art: number): BauStand {
  const i = y * WELT + x;
  const stapel = b.welt[i];
  if (!stapel || b.bloecke <= 0 || stapel.length >= MAX_HOEHE) return b;
  const welt = b.welt.slice();
  welt[i] = [...stapel, art];
  return { ...b, welt, bloecke: b.bloecke - 1 };
}

/** Obersten Block abbauen: Er kommt zurück ins Lager. */
export function nimmBlock(b: BauStand, x: number, y: number): BauStand {
  const i = y * WELT + x;
  const stapel = b.welt[i];
  if (!stapel || stapel.length === 0) return b;
  const welt = b.welt.slice();
  welt[i] = stapel.slice(0, -1);
  return { ...b, welt, bloecke: b.bloecke + 1 };
}

export const verbaut = (welt: readonly (readonly number[])[]): number => welt.reduce((n, s) => n + s.length, 0);

/** Prüft gespeicherte Daten. */
export function pruefeBau(x: unknown): BauStand {
  const s = leererBau();
  if (typeof x !== 'object' || x === null) return s;
  const o = x as Record<string, unknown>;
  const bloecke = typeof o.bloecke === 'number' && Number.isInteger(o.bloecke) && o.bloecke >= 0 ? Math.min(o.bloecke, 99999) : s.bloecke;
  const welt = Array.isArray(o.welt) && o.welt.length === WELT * WELT
    ? o.welt.map((st) => (Array.isArray(st) ? st.filter((a): a is number => typeof a === 'number' && BLOCKARTEN.some((b) => b.id === a)).slice(0, MAX_HOEHE) : []))
    : s.welt;
  const erledigt = Array.isArray(o.erledigt) ? o.erledigt.filter((e): e is string => typeof e === 'string').slice(-500) : [];
  return { bloecke, welt, erledigt };
}

/* ---------- Bauaufträge ---------- */

export const AUFTRAG_FELD = 4;

export type BauauftragArt = 'bauplan' | 'nachbauen' | 'quader' | 'symmetrie';

export interface Bauauftrag {
  id: string;
  art: BauauftragArt;
  titel: string;
  text: string;
  /** Zielhöhen je Feld (AUFTRAG_FELD²), Index y · AUFTRAG_FELD + x. Bei 'quader' nur zur Erklärung. */
  ziel: number[];
  /** Feste, vorgegebene Höhen (Symmetrie: die gegebene Hälfte). */
  fest?: number[];
  /** Quader: Länge, Breite, Höhe. */
  masse?: [number, number, number];
  /** Frage nach der Würfelzahl (Antwort = Summe der Zielhöhen). */
  wuerfel: number;
  belohnung: number;
}

const summe = (h: readonly number[]): number => h.reduce((a, b) => a + b, 0);

/**
 * Würfelgebäude, bei dem von vorne-oben (rechts unten im Plan) kein Turm einen anderen verdeckt:
 * Nach hinten (kleineres x oder y) werden die Türme nicht niedriger – wie eine Treppe, die nach hinten ansteigt.
 */
function sichtbaresGebaeude(rng: Rng, maxHoehe: number, felder: number): number[] {
  const n = AUFTRAG_FELD;
  const hoehe = (h: number[], x: number, y: number): number => (x >= 0 && y >= 0 && x < n && y < n ? (h[y * n + x] ?? 0) : 0);
  for (let versuch = 0; versuch < 200; versuch++) {
    const h = Array<number>(n * n).fill(0);
    h[(n - 1 - rng.int(0, 1)) * n + (n - 1 - rng.int(0, 1))] = rng.int(1, Math.max(1, maxHoehe - 2));
    let belegt = 1;
    for (let schritt = 0; schritt < 60 && belegt < felder; schritt++) {
      const kandidaten: { i: number; min: number; max: number }[] = [];
      for (let i = 0; i < n * n; i++) {
        if ((h[i] ?? 0) > 0) continue;
        const x = i % n;
        const y = Math.floor(i / n);
        const nachbarn = [hoehe(h, x + 1, y), hoehe(h, x, y + 1), hoehe(h, x - 1, y), hoehe(h, x, y - 1)];
        if (nachbarn.every((v) => v === 0)) continue;
        const vorne = [hoehe(h, x + 1, y), hoehe(h, x, y + 1)].filter((v) => v > 0);
        const hinten = [hoehe(h, x - 1, y), hoehe(h, x, y - 1)].filter((v) => v > 0);
        const min = Math.max(1, ...vorne);
        const max = Math.min(maxHoehe, ...hinten);
        if (min <= max) kandidaten.push({ i, min, max });
      }
      if (kandidaten.length === 0) break;
      const k = rng.pick(kandidaten);
      h[k.i] = rng.int(k.min, k.max);
      belegt++;
    }
    if (belegt >= felder && istUnverdeckt(h)) return h;
  }
  return [0, 0, 0, 0, 0, 3, 2, 0, 0, 2, 1, 1, 0, 0, 1, 1];
}

/** Kein belegtes Feld direkt davor (rechts oder unten im Plan) ist höher: Dann verdeckt nichts etwas. */
export function istUnverdeckt(h: readonly number[]): boolean {
  const n = AUFTRAG_FELD;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const v = h[y * n + x] ?? 0;
      if (!v) continue;
      if (x + 1 < n && (h[y * n + x + 1] ?? 0) > v) return false;
      if (y + 1 < n && (h[(y + 1) * n + x] ?? 0) > v) return false;
      if (x + 1 < n && y + 1 < n && (h[(y + 1) * n + x + 1] ?? 0) > v) return false;
    }
  return true;
}

export function baueAuftrag(art: BauauftragArt, rng: Rng, nummer: number): Bauauftrag {
  const n = AUFTRAG_FELD;
  const id = `${art}-${nummer}`;
  if (art === 'quader') {
    const l = rng.int(2, 4);
    const b = rng.int(1, 3);
    const hoch = rng.int(1, 3);
    const ziel = Array<number>(n * n).fill(0);
    for (let y = n - b; y < n; y++) for (let x = n - l; x < n; x++) ziel[y * n + x] = hoch;
    return {
      id, art, titel: 'Quader bauen', text: `Baue einen Quader: ${l} lang, ${b} breit, ${hoch} hoch.`,
      ziel, masse: [l, b, hoch], wuerfel: l * b * hoch, belohnung: 8,
    };
  }
  if (art === 'symmetrie') {
    // Linke Hälfte gegeben, rechte Hälfte gespiegelt an der senkrechten Mittellinie ergänzen
    const ziel = Array<number>(n * n).fill(0);
    const fest = Array<number>(n * n).fill(0);
    let gesetzt = 0;
    while (gesetzt < 3) {
      gesetzt = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n / 2; x++) {
          const v = rng.next() < 0.55 ? rng.int(1, 3) : 0;
          fest[y * n + x] = v;
          ziel[y * n + x] = v;
          ziel[y * n + (n - 1 - x)] = v;
          if (v) gesetzt++;
        }
    }
    return {
      id, art, titel: 'Spiegelbau', text: 'Ergänze die rechte Hälfte spiegelbildlich zur roten Linie.',
      ziel, fest, wuerfel: summe(ziel), belohnung: 10,
    };
  }
  const ziel = sichtbaresGebaeude(rng, art === 'bauplan' ? 4 : 3, rng.int(4, 7));
  return art === 'bauplan'
    ? { id, art, titel: 'Nach Bauplan', text: 'Baue das Gebäude nach dem Bauplan. Die Zahl sagt, wie viele Würfel übereinander stehen.', ziel, wuerfel: summe(ziel), belohnung: 8 }
    : { id, art, titel: 'Nachbauen', text: 'Baue das Würfelgebäude genau nach.', ziel, wuerfel: summe(ziel), belohnung: 8 };
}

/** Ist der Bau gelöst? Quader: irgendwo im Feld ein Quader mit den Maßen (auch gedreht). */
export function istGeloest(a: Bauauftrag, hoehen: readonly number[]): boolean {
  if (a.art !== 'quader') return a.ziel.every((v, i) => (hoehen[i] ?? 0) === v);
  const [l, b, h] = a.masse ?? [0, 0, 0];
  const n = AUFTRAG_FELD;
  const belegt = hoehen.map((v, i) => ({ v, x: i % n, y: Math.floor(i / n) })).filter((z) => z.v > 0);
  if (belegt.length === 0 || belegt.some((z) => z.v !== h)) return false;
  const xs = belegt.map((z) => z.x);
  const ys = belegt.map((z) => z.y);
  const breite = Math.max(...xs) - Math.min(...xs) + 1;
  const tiefe = Math.max(...ys) - Math.min(...ys) + 1;
  return belegt.length === breite * tiefe && ((breite === l && tiefe === b) || (breite === b && tiefe === l));
}

/** Reihenfolge der Aufträge: abwechselnd, damit alle Arten vorkommen. */
export const AUFTRAGSFOLGE: readonly BauauftragArt[] = ['bauplan', 'quader', 'nachbauen', 'symmetrie'];
