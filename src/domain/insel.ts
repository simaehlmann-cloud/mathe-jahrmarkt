import { BLOCKARTEN, MAX_HOEHE } from './bau';

/**
 * Bauinsel (Zusatzpaket): begrenzte offene Welt zum Herumlaufen und Bauen.
 * Landschaft (Wiese, Sand, See, Hügel, Bäume) ist fest; gebaut wird mit denselben Blöcken wie auf dem Bauplatz.
 * Je Feld ein Stapel über dem Gelände: Blockarten (0–7), Einrichtung (ab 100) und Luft (−1), damit Dächer
 * über leeren Räumen möglich sind. Gesetzt wird wie in Bauspielen an die angetippte Fläche.
 * Die Figur läuft auf „Böden“: ein Feld mit festem Grund darunter und zwei freien Ebenen darüber.
 * Hoch geht es nur über Treppen (eine Ebene), hinunter darf man eine Ebene springen.
 */

export const INSEL = 24;
export const INSEL_MAX = MAX_HOEHE;

export type Gelaende = 'gras' | 'sand' | 'wasser' | 'weg';

/** Einrichtung: Kennung (im Stapel ab 100), Name, Preis in Talern, Eigenschaften. */
export interface Einrichtung {
  id: number;
  name: string;
  preis: number;
  /** Kann man hindurch- bzw. daraufgehen? 'durch' (Tür), 'stufe' (Treppe: man steigt hinauf), 'nein'. */
  begehbar: 'durch' | 'stufe' | 'nein';
  /** Wie viele Ebenen hoch (Tür 2). */
  hoehe: 1 | 2;
}
export const TUER_OBEN = 199;
export const LUFT = -1;
export const EINRICHTUNG: readonly Einrichtung[] = [
  { id: 101, name: 'Tür', preis: 15, begehbar: 'durch', hoehe: 2 },
  { id: 102, name: 'Fenster', preis: 10, begehbar: 'nein', hoehe: 1 },
  { id: 103, name: 'Treppe', preis: 10, begehbar: 'stufe', hoehe: 1 },
  { id: 110, name: 'Bett', preis: 25, begehbar: 'nein', hoehe: 1 },
  { id: 111, name: 'Schrank', preis: 20, begehbar: 'nein', hoehe: 1 },
  { id: 112, name: 'Tisch', preis: 15, begehbar: 'nein', hoehe: 1 },
  { id: 113, name: 'Lampe', preis: 10, begehbar: 'nein', hoehe: 1 },
  { id: 114, name: 'Pflanze', preis: 8, begehbar: 'nein', hoehe: 1 },
  { id: 115, name: 'Zaun', preis: 5, begehbar: 'nein', hoehe: 1 },
];
export const einrichtung = (id: number): Einrichtung | undefined => EINRICHTUNG.find((e) => e.id === id);
export const istBlock = (art: number): boolean => BLOCKARTEN.some((b) => b.id === art);

export interface InselStand {
  /** INSEL² Stapel über dem Gelände, Index y · INSEL + x. */
  stapel: number[][];
  /** Gekaufte, noch nicht verbaute Einrichtung: Kennung → Anzahl. */
  inventar: Record<string, number>;
  /** Wo die Figur steht. */
  figur: { x: number; y: number; z: number };
}

/* ---------- Feste Landschaft ---------- */

/** Geländehöhe und Art je Feld, Bäume als feste Hindernisse. Immer gleich (kein Zufall). */
export interface Landschaft {
  art: Gelaende[];
  hoehe: number[];
  baum: boolean[];
}

const idx = (x: number, y: number): number => y * INSEL + x;
export const imFeld = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < INSEL && y < INSEL;

export const LANDSCHAFT: Landschaft = (() => {
  const art: Gelaende[] = Array(INSEL * INSEL).fill('gras');
  const hoehe: number[] = Array(INSEL * INSEL).fill(0);
  const baum: boolean[] = Array(INSEL * INSEL).fill(false);
  for (let y = 0; y < INSEL; y++)
    for (let x = 0; x < INSEL; x++) {
      const i = idx(x, y);
      // See oben rechts, mit Sandstrand drumherum
      const dSee = Math.hypot((x - 18.5) / 3.4, (y - 5) / 2.6);
      if (dSee < 1) art[i] = 'wasser';
      else if (dSee < 1.45) art[i] = 'sand';
      // Hügel links oben: zwei Stufen
      const dHuegel = Math.hypot((x - 4) / 3.6, (y - 4) / 3.2);
      if (dHuegel < 0.6) hoehe[i] = 2;
      else if (dHuegel < 1) hoehe[i] = 1;
      // Weg vom Ankunftsplatz (unten Mitte) nach oben
      if ((x === 11 || x === 12) && y >= 9) art[i] = 'weg';
      if (y === 9 && x >= 6 && x <= 15) art[i] = 'weg';
      // Strand am unteren Rand
      if (y >= INSEL - 1) art[i] = 'sand';
    }
  // Bäume (fest), nicht auf Weg, Wasser oder Bauplätzen in der Mitte
  for (const [x, y] of [[1, 9], [2, 14], [1, 19], [7, 1], [10, 2], [14, 1], [22, 12], [21, 16], [22, 20], [8, 22], [16, 22], [3, 22], [20, 9], [6, 7], [15, 12]] as [number, number][]) baum[idx(x, y)] = true;
  // Leichte Erhebung am Steg: Treppenstufen auf den Hügel bei (6..7, 4)
  hoehe[idx(7, 4)] = 1;
  return { art, hoehe, baum };
})();

/** Ankunftsplatz der Figur. */
export const START = { x: 12, y: 21, z: 0 };

export const leereInsel = (): InselStand => ({ stapel: Array.from({ length: INSEL * INSEL }, () => []), inventar: {}, figur: { ...START } });

export const bebaubar = (x: number, y: number): boolean => imFeld(x, y) && LANDSCHAFT.art[idx(x, y)] !== 'wasser' && !LANDSCHAFT.baum[idx(x, y)];

/* ---------- Ebenen und Böden ---------- */

/** Was liegt in Ebene z (absolut, Gelände eingeschlossen)? 'grund' = Gelände, sonst Stapel-Eintrag oder leer. */
export function inEbene(s: InselStand, x: number, y: number, z: number): number | 'grund' | 'baum' | 'wasser' | null {
  if (!imFeld(x, y)) return null;
  const i = idx(x, y);
  const h = LANDSCHAFT.hoehe[i] ?? 0;
  if (z < h) return 'grund';
  if (LANDSCHAFT.baum[i] && z < h + 3) return 'baum';
  if (LANDSCHAFT.art[i] === 'wasser' && z === h) return 'wasser';
  const e = s.stapel[i]?.[z - h];
  return e === undefined || e === LUFT ? null : e;
}

const frei = (e: ReturnType<typeof inEbene>): boolean => e === null || e === 101 || e === TUER_OBEN;

/** Höhe der Stapeloberkante (absolut). */
export const oberkante = (s: InselStand, x: number, y: number): number => (LANDSCHAFT.hoehe[idx(x, y)] ?? 0) + (s.stapel[idx(x, y)]?.length ?? 0);

/** Kann die Figur in Ebene z auf Feld (x, y) stehen? Fester Grund darunter, zwei Ebenen Platz (Türen zählen als frei). */
export function istBoden(s: InselStand, x: number, y: number, z: number): boolean {
  if (!imFeld(x, y) || z < 0 || z > INSEL_MAX + 2) return false;
  const hier = inEbene(s, x, y, z);
  const drueber = inEbene(s, x, y, z + 1);
  if (!frei(hier) || !frei(drueber)) return false;
  const unten = z === 0 ? 'grund' : inEbene(s, x, y, z - 1);
  if (unten === null || unten === 'wasser' || unten === 101 || unten === TUER_OBEN) return false;
  return true;
}

/** Alle Böden eines Feldes, von unten nach oben. */
export function boeden(s: InselStand, x: number, y: number): number[] {
  const liste: number[] = [];
  for (let z = 0; z <= oberkante(s, x, y) + 1 && z <= INSEL_MAX + 2; z++) if (istBoden(s, x, y, z)) liste.push(z);
  return liste;
}

/** Ein Schritt zum Nachbarfeld: gleiche Ebene, eine Ebene hinunter, oder eine hinauf auf eine Treppe. */
function schritte(s: InselStand, x: number, y: number, z: number): [number, number, number][] {
  const liste: [number, number, number][] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (!imFeld(nx, ny)) continue;
    if (istBoden(s, nx, ny, z)) liste.push([nx, ny, z]);
    // Hinunter: eine Ebene (über Kopf muss es frei sein)
    else if (z > 0 && istBoden(s, nx, ny, z - 1) && frei(inEbene(s, nx, ny, z + 1))) liste.push([nx, ny, z - 1]);
    // Hinauf: nur, wenn das Ziel auf einer Treppe steht oder man selbst auf einer steht und es nur eine Ebene ist
    if (istBoden(s, nx, ny, z + 1) && frei(inEbene(s, x, y, z + 2)) && (inEbene(s, nx, ny, z) === 103 || inEbene(s, x, y, z - 1) === 103 || stufeImGelaende(nx, ny, z)))
      liste.push([nx, ny, z + 1]);
  }
  return liste;
}

/** Im Gelände (Hügel) darf man eine Ebene hinaufgehen, das ist ein natürlicher Hang. */
function stufeImGelaende(x: number, y: number, z: number): boolean {
  return (LANDSCHAFT.hoehe[idx(x, y)] ?? 0) === z + 1;
}

/** Weg zum Ziel (Breitensuche). Leer, wenn kein Weg existiert. Der erste Punkt ist der Start. */
export function wegAufInsel(s: InselStand, von: { x: number; y: number; z: number }, nach: { x: number; y: number; z: number }): { x: number; y: number; z: number }[] {
  const schluessel = (x: number, y: number, z: number): string => `${x},${y},${z}`;
  const vorher = new Map<string, string | null>([[schluessel(von.x, von.y, von.z), null]]);
  const schlange: [number, number, number][] = [[von.x, von.y, von.z]];
  const ziel = schluessel(nach.x, nach.y, nach.z);
  while (schlange.length) {
    const [x, y, z] = schlange.shift() as [number, number, number];
    const k = schluessel(x, y, z);
    if (k === ziel) {
      const weg: { x: number; y: number; z: number }[] = [];
      let c: string | null | undefined = k;
      while (c) {
        const [a = 0, b = 0, d = 0] = c.split(',').map(Number);
        weg.unshift({ x: a, y: b, z: d });
        c = vorher.get(c);
      }
      return weg;
    }
    for (const [nx, ny, nz] of schritte(s, x, y, z)) {
      const nk = schluessel(nx, ny, nz);
      if (vorher.has(nk)) continue;
      vorher.set(nk, k);
      schlange.push([nx, ny, nz]);
    }
  }
  return [];
}

/** Bestes Ziel auf einem angetippten Feld: der Boden, der von der Figur aus erreichbar ist (höchster zuerst). */
export function zielAufFeld(s: InselStand, x: number, y: number, bevorzugt?: number): { x: number; y: number; z: number } | undefined {
  const b = boeden(s, x, y);
  if (bevorzugt !== undefined && b.includes(bevorzugt)) return { x, y, z: bevorzugt };
  const z = b[b.length - 1];
  return z === undefined ? undefined : { x, y, z };
}

/* ---------- Bauen ---------- */

/** Steht die Figur in diesem Feld (in den Ebenen, die gebaut würden)? */
const figurImWeg = (s: InselStand, x: number, y: number, zVon: number, zBis: number): boolean =>
  s.figur.x === x && s.figur.y === y && s.figur.z <= zBis && s.figur.z + 1 >= zVon;

export type BauErgebnis = { ok: true; stand: InselStand; bloecke: number } | { ok: false; grund: 'feld' | 'hoch' | 'leer' | 'figur' | 'keineBloecke' | 'keinTeil' | 'besetzt' | 'schwebt' };

/** Stapel so ändern, dass Ebene z (absolut) den Wert `wert` hat; überflüssige Luft am Ende fällt weg. */
function mitEbene(s: InselStand, x: number, y: number, z: number, wert: number): InselStand {
  const i = idx(x, y);
  const h = LANDSCHAFT.hoehe[i] ?? 0;
  const st = (s.stapel[i] ?? []).slice();
  while (st.length <= z - h) st.push(LUFT);
  st[z - h] = wert;
  while (st.length && st[st.length - 1] === LUFT) st.pop();
  const alle = s.stapel.slice();
  alle[i] = st;
  return { ...s, stapel: alle };
}

const fest = (e: ReturnType<typeof inEbene>): boolean => e !== null && e !== 'wasser' && e !== 'baum';

/**
 * Block oder Einrichtung in Ebene z setzen (z = Geländehöhe: auf den Boden). Blöcke brauchen Halt: darunter etwas Festes
 * oder seitlich ein Nachbar (so entstehen Dächer). Einrichtung braucht festen Boden darunter.
 * `bloecke`: verfügbare Blöcke (gemeinsam mit dem Bauplatz).
 */
export function setzeAn(s: InselStand, x: number, y: number, z: number, art: number, bloecke: number): BauErgebnis {
  if (!bebaubar(x, y)) return { ok: false, grund: 'feld' };
  const h = LANDSCHAFT.hoehe[idx(x, y)] ?? 0;
  const e = einrichtung(art);
  const hoehe = e?.hoehe ?? 1;
  if (z < h) return { ok: false, grund: 'besetzt' };
  if (z + hoehe > INSEL_MAX + h || z + hoehe > INSEL_MAX + 2) return { ok: false, grund: 'hoch' };
  for (let k = 0; k < hoehe; k++) if (inEbene(s, x, y, z + k) !== null) return { ok: false, grund: 'besetzt' };
  const unten = z === 0 ? 'grund' : inEbene(s, x, y, z - 1);
  const getragen = z === h || fest(unten);
  const seitlich = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => fest(inEbene(s, x + dx, y + dy, z)));
  if (e ? !getragen : !getragen && !seitlich) return { ok: false, grund: 'schwebt' };
  if (figurImWeg(s, x, y, z, z + hoehe - 1)) return { ok: false, grund: 'figur' };
  if (e) {
    if ((s.inventar[String(art)] ?? 0) <= 0) return { ok: false, grund: 'keinTeil' };
  } else if (!istBlock(art)) return { ok: false, grund: 'keinTeil' };
  else if (bloecke <= 0) return { ok: false, grund: 'keineBloecke' };
  let neu = mitEbene(s, x, y, z, art);
  if (e && e.hoehe === 2) neu = mitEbene(neu, x, y, z + 1, TUER_OBEN);
  const inventar = e ? { ...s.inventar, [String(art)]: (s.inventar[String(art)] ?? 0) - 1 } : s.inventar;
  return { ok: true, stand: { ...neu, inventar }, bloecke: e ? bloecke : bloecke - 1 };
}

/** Oben auf den Stapel setzen (für einfache Fälle und Tests). */
export const setze = (s: InselStand, x: number, y: number, art: number, bloecke: number): BauErgebnis => setzeAn(s, x, y, oberkante(s, x, y), art, bloecke);

/** Teil in Ebene z abbauen: Blöcke ins Lager, Einrichtung ins Inventar. Eine Tür verschwindet ganz. */
export function nimmAn(s: InselStand, x: number, y: number, z: number, bloecke: number): BauErgebnis {
  if (!imFeld(x, y)) return { ok: false, grund: 'feld' };
  let e = inEbene(s, x, y, z);
  let zz = z;
  if (e === TUER_OBEN) {
    zz = z - 1;
    e = inEbene(s, x, y, zz);
  }
  if (typeof e !== 'number') return { ok: false, grund: 'leer' };
  let stand = mitEbene(s, x, y, zz, LUFT);
  if (e === 101) stand = mitEbene(stand, x, y, zz + 1, LUFT);
  // Stand die Figur darauf, fällt sie auf den nächsten Boden darunter
  if (!istBoden(stand, s.figur.x, s.figur.y, s.figur.z)) {
    const b = boeden(stand, s.figur.x, s.figur.y).filter((q) => q <= s.figur.z);
    stand = { ...stand, figur: { x: s.figur.x, y: s.figur.y, z: b[b.length - 1] ?? 0 } };
  }
  if (einrichtung(e)) return { ok: true, stand: { ...stand, inventar: { ...s.inventar, [String(e)]: (s.inventar[String(e)] ?? 0) + 1 } }, bloecke };
  return { ok: true, stand, bloecke: bloecke + 1 };
}

/** Obersten Teil abbauen. */
export function nimm(s: InselStand, x: number, y: number, bloecke: number): BauErgebnis {
  if (!imFeld(x, y)) return { ok: false, grund: 'feld' };
  const st = s.stapel[idx(x, y)] ?? [];
  if (st.length === 0) return { ok: false, grund: 'leer' };
  return nimmAn(s, x, y, oberkante(s, x, y) - 1, bloecke);
}

/** Einrichtung im Andenkenstand kaufen. */
export function kaufeEinrichtung(s: InselStand, taler: number, art: number): { ok: true; stand: InselStand; taler: number } | { ok: false } {
  const e = einrichtung(art);
  if (!e || taler < e.preis) return { ok: false };
  return { ok: true, stand: { ...s, inventar: { ...s.inventar, [String(art)]: (s.inventar[String(art)] ?? 0) + 1 } }, taler: taler - e.preis };
}

/* ---------- Speicher ---------- */

export function pruefeInsel(x: unknown): InselStand {
  const leer = leereInsel();
  if (typeof x !== 'object' || x === null) return leer;
  const o = x as Record<string, unknown>;
  const gueltig = (a: unknown): a is number => typeof a === 'number' && (istBlock(a) || !!einrichtung(a) || a === TUER_OBEN || a === LUFT);
  const stapel =
    Array.isArray(o.stapel) && o.stapel.length === INSEL * INSEL
      ? o.stapel.map((st, i) => {
          if (!Array.isArray(st) || !bebaubar(i % INSEL, Math.floor(i / INSEL))) return [];
          const h = LANDSCHAFT.hoehe[i] ?? 0;
          const sauber = st.map((a) => (gueltig(a) ? a : LUFT)).slice(0, Math.max(0, INSEL_MAX - h));
          while (sauber.length && sauber[sauber.length - 1] === LUFT) sauber.pop();
          return sauber;
        })
      : leer.stapel;
  const inventar: Record<string, number> = {};
  if (typeof o.inventar === 'object' && o.inventar !== null)
    for (const [k, v] of Object.entries(o.inventar)) if (einrichtung(Number(k)) && typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 1000) inventar[k] = v;
  const f = o.figur as Record<string, unknown> | undefined;
  let figur = { ...START };
  const stand: InselStand = { stapel, inventar, figur };
  if (f && typeof f.x === 'number' && typeof f.y === 'number' && typeof f.z === 'number' && istBoden(stand, f.x, f.y, f.z)) figur = { x: f.x, y: f.y, z: f.z };
  return { stapel, inventar, figur };
}
