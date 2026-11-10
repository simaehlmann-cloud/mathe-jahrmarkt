import { BLOCKARTEN, MAX_HOEHE } from './bau';

/**
 * Bauinsel (Zusatzpaket): begrenzte offene Welt zum Herumlaufen und Bauen.
 * Landschaft (Wiese, Sand, See, Hügel, Bäume) ist fest; gebaut wird mit denselben Blöcken wie auf dem Bauplatz.
 * Je Feld ein Stapel über dem Gelände: Blockarten (0–7), Einrichtung (ab 100) und Luft (−1), damit Dächer
 * über leeren Räumen möglich sind. Gesetzt wird wie in Bauspielen an die angetippte Fläche.
 * Die Figur läuft auf „Böden“: ein Feld mit festem Grund darunter und zwei freien Ebenen darüber.
 * Hoch geht es nur über Treppen (eine Ebene), hinunter darf man eine Ebene springen.
 */

/** Höhe des Bauplans (Felder von oben nach unten). Die erste Insel ist INSEL × INSEL groß. */
export const INSEL = 24;
/** Breite des Bauplans: erste Insel, Wasserstraße mit Brücke, zweite Insel. */
export const BREITE = 44;
/** Höhe des Bauplans: oben die beiden ersten Inseln, darunter (seit 0.11.1) Steg und Strandinsel. */
export const HOEHE = 40;
/** Frühere Höhe (bis 0.11.0), für das Umrechnen alter Spielstände. */
const HOEHE_ALT = INSEL;
export const INSEL_MAX = MAX_HOEHE;

export type Gelaende = 'gras' | 'sand' | 'wasser' | 'weg' | 'bruecke' | 'blumen';
export type Kategorie = 'bauen' | 'wohnen' | 'garten' | 'tiere';
export const KATEGORIE_NAME: Record<Kategorie, string> = { bauen: 'Bauen', wohnen: 'Wohnen', garten: 'Garten', tiere: 'Tiere' };

/** Einrichtung: Kennung (im Stapel ab 100), Name, Preis in Talern, Eigenschaften. */
export interface Einrichtung {
  id: number;
  name: string;
  preis: number;
  /** Kann man hindurch- bzw. daraufgehen? 'durch' (Tür), 'stufe' (Treppe: man steigt hinauf), 'nein'. */
  begehbar: 'durch' | 'stufe' | 'nein';
  /** Wie viele Ebenen hoch (Tür 2). */
  hoehe: 1 | 2;
  kategorie: Kategorie;
}
export const TUER_OBEN = 199;
export const LUFT = -1;
const E = (id: number, name: string, preis: number, kategorie: Kategorie, begehbar: Einrichtung['begehbar'] = 'nein', hoehe: 1 | 2 = 1): Einrichtung => ({ id, name, preis, kategorie, begehbar, hoehe });
export const EINRICHTUNG: readonly Einrichtung[] = [
  E(101, 'Tür', 15, 'bauen', 'durch', 2),
  E(102, 'Fenster', 10, 'bauen'),
  E(103, 'Treppe', 10, 'bauen', 'stufe'),
  E(115, 'Zaun', 5, 'bauen'),
  E(110, 'Bett', 25, 'wohnen'),
  E(111, 'Schrank', 20, 'wohnen'),
  E(112, 'Tisch', 15, 'wohnen'),
  E(113, 'Lampe', 10, 'wohnen'),
  E(116, 'Sofa', 25, 'wohnen'),
  E(117, 'Stuhl', 8, 'wohnen'),
  E(118, 'Regal', 15, 'wohnen'),
  E(114, 'Topfpflanze', 8, 'garten'),
  E(120, 'Rote Blume', 3, 'garten'),
  E(121, 'Gelbe Blume', 3, 'garten'),
  E(122, 'Blaue Blume', 3, 'garten'),
  E(123, 'Hecke', 6, 'garten'),
  E(124, 'Bank', 12, 'garten'),
  E(125, 'Brunnen', 30, 'garten'),
  E(126, 'Gartenlaterne', 10, 'garten'),
  E(127, 'Beet', 6, 'garten'),
];
export const BLUMEN = [120, 121, 122] as const;

/** Tiere: werden gekauft, auf die Insel gesetzt und laufen dann langsam umher. Keine Gegner. */
export interface TierArt {
  id: number;
  name: string;
  preis: number;
}
export const TIERE: readonly TierArt[] = [
  { id: 140, name: 'Schaf', preis: 30 },
  { id: 141, name: 'Hund', preis: 35 },
  { id: 142, name: 'Katze', preis: 30 },
  { id: 143, name: 'Huhn', preis: 15 },
];
export const tierArt = (id: number): TierArt | undefined => TIERE.find((t) => t.id === id);
export interface Tier {
  art: number;
  x: number;
  y: number;
  z: number;
}
/** Höchstens so viele Tiere auf der Insel. */
export const MAX_TIERE = 12;
export const einrichtung = (id: number): Einrichtung | undefined => EINRICHTUNG.find((e) => e.id === id);
export const istBlock = (art: number): boolean => BLOCKARTEN.some((b) => b.id === art);

export interface InselStand {
  /** BREITE · HOEHE Stapel über dem Gelände, Index y · BREITE + x. */
  stapel: number[][];
  /** Gekaufte, noch nicht verbaute Einrichtung und Tiere: Kennung → Anzahl. */
  inventar: Record<string, number>;
  /** Wo die Figur steht. */
  figur: { x: number; y: number; z: number };
  /** Tiere auf der Insel. */
  tiere: Tier[];
  /** Bauaufträge auf den Grundstücken: erledigte Aufträge (Kennungen). */
  erledigt: string[];
}

/* ---------- Feste Landschaft ---------- */

/** Geländehöhe und Art je Feld, Bäume als feste Hindernisse. Immer gleich (kein Zufall). */
export interface Landschaft {
  art: Gelaende[];
  hoehe: number[];
  baum: boolean[];
}

export const idx = (x: number, y: number): number => y * BREITE + x;
export const imFeld = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < BREITE && y < HOEHE;
/** Brücke über die Wasserstraße zwischen den Inseln. */
export const BRUECKE = { x0: 24, x1: 27, y: 11 } as const;
/** Mitte und Halbachsen der zweiten Insel. */
const INSEL2 = { x: 35.5, y: 11.5, rx: 8.2, ry: 9.2 };
export const aufInsel2 = (x: number, y: number): boolean => Math.hypot((x + 0.5 - INSEL2.x) / INSEL2.rx, (y + 0.5 - INSEL2.y) / INSEL2.ry) < 1;
/** Dritte Insel (Strandinsel) unter der zweiten, über eine zweite Brücke erreichbar. */
const INSEL3 = { x: 33.5, y: 31.2, rx: 10.4, ry: 7.4 };
const abstand3 = (x: number, y: number): number => Math.hypot((x + 0.5 - INSEL3.x) / INSEL3.rx, (y + 0.5 - INSEL3.y) / INSEL3.ry);
export const aufInsel3 = (x: number, y: number): boolean => abstand3(x, y) < 1;
/** Zweite Brücke: von der zweiten Insel nach Süden zur Strandinsel (zwei Felder breit). */
export const BRUECKE2 = { x: 34, y0: 21, y1: 23 } as const;
/** Bootssteg am Strand der ersten Insel; am Ende liegt das Boot zurück zum Jahrmarkt. */
export const STEG = { x: 11, y0: 24, y1: 25 } as const;
export const BOOT = { x: 11, y: 26 } as const;

export const LANDSCHAFT: Landschaft = (() => {
  const n = BREITE * HOEHE;
  const art: Gelaende[] = Array(n).fill('wasser');
  const hoehe: number[] = Array(n).fill(0);
  const baum: boolean[] = Array(n).fill(false);
  // Erste Insel: INSEL × INSEL wie bisher
  for (let y = 0; y < INSEL; y++)
    for (let x = 0; x < INSEL; x++) {
      const i = idx(x, y);
      art[i] = 'gras';
      // See oben rechts, mit Sandstrand drumherum
      const dSee = Math.hypot((x - 18.5) / 3.4, (y - 5) / 2.6);
      if (dSee < 1) art[i] = 'wasser';
      else if (dSee < 1.45) art[i] = 'sand';
      // Hügel links oben: zwei Stufen
      const dHuegel = Math.hypot((x - 4) / 3.6, (y - 4) / 3.2);
      if (dHuegel < 0.6) hoehe[i] = 2;
      else if (dHuegel < 1) hoehe[i] = 1;
      // Weg vom Ankunftsplatz (unten Mitte) nach oben und zur Brücke
      if ((x === 11 || x === 12) && y >= 9) art[i] = 'weg';
      if (y === 9 && x >= 6 && x <= 15) art[i] = 'weg';
      if ((y === BRUECKE.y || y === BRUECKE.y + 1) && x >= 13) art[i] = 'weg';
      // Strand am unteren Rand
      if (y >= INSEL - 1) art[i] = 'sand';
    }
  // Brücke (zwei Felder breit)
  for (let x = BRUECKE.x0; x <= BRUECKE.x1; x++) for (const y of [BRUECKE.y, BRUECKE.y + 1]) art[idx(x, y)] = 'bruecke';
  // Zweite Insel: Blumenwiese, Strand, kleiner Teich, ein Hügel
  for (let y = 0; y < HOEHE; y++)
    for (let x = BRUECKE.x1 + 1; x < BREITE; x++) {
      if (!aufInsel2(x, y)) continue;
      const i = idx(x, y);
      const d = Math.hypot((x + 0.5 - INSEL2.x) / INSEL2.rx, (y + 0.5 - INSEL2.y) / INSEL2.ry);
      art[i] = d > 0.86 ? 'sand' : 'gras';
      if (Math.hypot((x - 38) / 2.4, (y - 17) / 1.8) < 1) art[i] = 'blumen';
      if (Math.hypot((x - 31) / 1.6, (y - 16.5) / 1.3) < 1) art[i] = 'wasser';
      const dHuegel = Math.hypot((x - 39) / 2.2, (y - 6) / 2);
      if (dHuegel < 1) hoehe[i] = 1;
      if ((y === BRUECKE.y || y === BRUECKE.y + 1) && x <= 35) art[i] = 'weg';
    }
  // Zweite Brücke nach Süden und Weg dorthin
  for (let y = BRUECKE.y + 2; y < BRUECKE2.y0; y++) for (const x of [BRUECKE2.x, BRUECKE2.x + 1]) if (aufInsel2(x, y) && art[idx(x, y)] !== 'wasser') art[idx(x, y)] = 'weg';
  for (let y = BRUECKE2.y0; y <= BRUECKE2.y1; y++) for (const x of [BRUECKE2.x, BRUECKE2.x + 1]) art[idx(x, y)] = 'bruecke';
  // Dritte Insel: breiter Sandstrand, Wiese, Lagune, Düne, Blumen
  for (let y = BRUECKE2.y1 + 1; y < HOEHE; y++)
    for (let x = 0; x < BREITE; x++) {
      const d = abstand3(x, y);
      if (d >= 1) continue;
      const i = idx(x, y);
      art[i] = d > 0.74 ? 'sand' : 'gras';
      if (Math.hypot((x - 27) / 2.2, (y - 31.5) / 1.6) < 1) art[i] = 'wasser';
      else if (Math.hypot((x - 27) / 3, (y - 31.5) / 2.3) < 1) art[i] = 'sand';
      if (Math.hypot((x - 31) / 2.2, (y - 35) / 1.4) < 1) art[i] = 'blumen';
      const dDuene = Math.hypot((x - 40) / 2.6, (y - 31) / 2.2);
      if (dDuene < 0.55) hoehe[i] = 2;
      else if (dDuene < 1) hoehe[i] = 1;
      if ((x === BRUECKE2.x || x === BRUECKE2.x + 1) && y <= 30) art[i] = 'weg';
      if (y === 30 && x >= 30 && x <= 36) art[i] = 'weg';
    }
  // Bootssteg auf der ersten Insel (unten am Strand)
  for (let y = STEG.y0; y <= STEG.y1; y++) for (const x of [STEG.x, STEG.x + 1]) art[idx(x, y)] = 'bruecke';
  // Bäume (fest), nicht auf Weg, Wasser oder Bauplätzen
  for (const [x, y] of [[1, 9], [2, 14], [1, 19], [7, 1], [10, 2], [14, 1], [22, 14], [21, 16], [22, 20], [8, 22], [16, 22], [3, 22], [20, 9], [6, 7], [8, 14],
    [33, 4], [41, 11], [36, 20], [30, 19], [42, 15], [29, 8],
    [25, 28], [29, 26], [38, 26], [32, 33], [36, 36], [42, 34], [26, 35]] as [number, number][]) baum[idx(x, y)] = true;
  // Leichte Erhebung am Steg: Treppenstufen auf den Hügel bei (6..7, 4)
  hoehe[idx(7, 4)] = 1;
  return { art, hoehe, baum };
})();

/** Ankunftsplatz der Figur. */
export const START = { x: 12, y: 21, z: 0 };

export const leereInsel = (): InselStand => ({ stapel: Array.from({ length: BREITE * HOEHE }, () => []), inventar: {}, figur: { ...START }, tiere: [], erledigt: [] });

export const bebaubar = (x: number, y: number): boolean =>
  imFeld(x, y) && LANDSCHAFT.art[idx(x, y)] !== 'wasser' && LANDSCHAFT.art[idx(x, y)] !== 'bruecke' && !LANDSCHAFT.baum[idx(x, y)];

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
  if (s.tiere.some((t) => t.x === x && t.y === y && t.z <= z + hoehe - 1 && t.z >= z - 1)) return { ok: false, grund: 'besetzt' };
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
  const e = einrichtung(art) ?? tierArt(art);
  if (!e || taler < e.preis) return { ok: false };
  return { ok: true, stand: { ...s, inventar: { ...s.inventar, [String(art)]: (s.inventar[String(art)] ?? 0) + 1 } }, taler: taler - e.preis };
}

/* ---------- Tiere ---------- */

/** Tier aus dem Inventar auf einen Boden setzen. */
export function setzeTier(s: InselStand, x: number, y: number, z: number, art: number): BauErgebnis {
  if (!tierArt(art)) return { ok: false, grund: 'keinTeil' };
  if ((s.inventar[String(art)] ?? 0) <= 0) return { ok: false, grund: 'keinTeil' };
  if (!istBoden(s, x, y, z)) return { ok: false, grund: 'feld' };
  if (s.tiere.length >= MAX_TIERE) return { ok: false, grund: 'hoch' };
  if (s.tiere.some((t) => t.x === x && t.y === y) || (s.figur.x === x && s.figur.y === y)) return { ok: false, grund: 'besetzt' };
  return {
    ok: true,
    stand: { ...s, tiere: [...s.tiere, { art, x, y, z }], inventar: { ...s.inventar, [String(art)]: (s.inventar[String(art)] ?? 0) - 1 } },
    bloecke: 0,
  };
}

/** Tier auf Feld (x, y) zurück ins Inventar nehmen. */
export function nimmTier(s: InselStand, x: number, y: number): InselStand | undefined {
  const i = s.tiere.findIndex((t) => t.x === x && t.y === y);
  if (i < 0) return undefined;
  const t = s.tiere[i]!;
  return { ...s, tiere: s.tiere.filter((_, k) => k !== i), inventar: { ...s.inventar, [String(t.art)]: (s.inventar[String(t.art)] ?? 0) + 1 } };
}

/**
 * Ein Bummelschritt: Jedes Tier geht mit `zufall()` < 0.5 ein Feld in eine freie Richtung (gleiche Ebene,
 * nicht ins Wasser, nicht auf andere Tiere oder die Figur). `zufall` liefert Zahlen in [0, 1).
 */
export function tiereBummeln(s: InselStand, zufall: () => number): InselStand {
  if (s.tiere.length === 0) return s;
  const belegt = new Set(s.tiere.map((t) => `${t.x},${t.y}`));
  belegt.add(`${s.figur.x},${s.figur.y}`);
  let geaendert = false;
  const tiere = s.tiere.map((t) => {
    if (zufall() >= 0.5) return t;
    const richtungen: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const [dx, dy] = richtungen[Math.floor(zufall() * 4)] ?? [1, 0];
    const nx = t.x + dx;
    const ny = t.y + dy;
    if (belegt.has(`${nx},${ny}`) || !istBoden(s, nx, ny, t.z) || LANDSCHAFT.art[idx(nx, ny)] === 'bruecke') return t;
    belegt.delete(`${t.x},${t.y}`);
    belegt.add(`${nx},${ny}`);
    geaendert = true;
    return { ...t, x: nx, y: ny };
  });
  return geaendert ? { ...s, tiere } : s;
}

/* ---------- Grundstücke und Bauaufträge ---------- */

export interface Grundstueck {
  id: string;
  name: string;
  x0: number;
  y0: number;
  /** Seitenlänge (quadratisch). */
  n: number;
  /** Wo er liegt, für die Wegbeschreibung im Auftrag. */
  wo: string;
}
/** Drei Bauplätze, je 4 × 4 Felder: A und B auf der zweiten Insel, C (seit 0.11.1) auf der Strandinsel. */
export const GRUNDSTUECKE: readonly Grundstueck[] = [
  { id: 'a', name: 'Bauplatz A', x0: 30, y0: 5, n: 4, wo: 'auf der zweiten Insel hinter der Brücke' },
  { id: 'b', name: 'Bauplatz B', x0: 36, y0: 13, n: 4, wo: 'auf der zweiten Insel, rechts vom Weg' },
  { id: 'c', name: 'Bauplatz C', x0: 30, y0: 26, n: 4, wo: 'auf der Strandinsel, über die zweite Brücke nach unten' },
];
export const imGrundstueck = (g: Grundstueck, x: number, y: number): boolean => x >= g.x0 && y >= g.y0 && x < g.x0 + g.n && y < g.y0 + g.n;

export interface InselAuftrag {
  id: string;
  grundstueck: string;
  titel: string;
  text: string;
  /** Mathematischer Hinweis zur Lösung. */
  tipp: string;
  pruefe: (s: InselStand, g: Grundstueck) => boolean;
}

/** Ebene 0 eines Feldes auf dem Grundstück (absolut z = Geländehöhe). */
const unten = (s: InselStand, x: number, y: number): number | null => {
  const e = s.stapel[idx(x, y)]?.[0];
  return e === undefined || e === LUFT ? null : e;
};
const felder = (g: Grundstueck): [number, number][] => {
  const l: [number, number][] = [];
  for (let y = g.y0; y < g.y0 + g.n; y++) for (let x = g.x0; x < g.x0 + g.n; x++) l.push([x, y]);
  return l;
};
const randFelder = (g: Grundstueck): [number, number][] => felder(g).filter(([x, y]) => x === g.x0 || y === g.y0 || x === g.x0 + g.n - 1 || y === g.y0 + g.n - 1);
const anzahlVon = (s: InselStand, g: Grundstueck, arten: readonly number[]): number =>
  felder(g).reduce((n, [x, y]) => n + (s.stapel[idx(x, y)] ?? []).filter((a) => arten.includes(a)).length, 0);
const gesetzt = (a: number | undefined): boolean => a !== undefined && a !== LUFT && a !== TUER_OBEN;

export const INSEL_AUFTRAEGE: readonly InselAuftrag[] = [
  {
    id: 'flaeche8',
    grundstueck: 'a',
    titel: 'Fläche: 8 Felder',
    text: 'Belege auf Bauplatz A genau 8 Felder mit Blöcken – eine Lage, alles auf dem Boden.',
    tipp: 'Ein Rechteck aus 2 Reihen mit je 4 Feldern hat 2 · 4 = 8 Felder.',
    pruefe: (s, g) => felder(g).filter(([x, y]) => { const u = unten(s, x, y); return u !== null && istBlock(u); }).length === 8,
  },
  {
    id: 'umfang',
    grundstueck: 'a',
    titel: 'Umfang: ein Zaun rundherum',
    text: 'Baue auf Bauplatz A ganz außen herum einen Zaun oder eine Mauer – jedes Randfeld bekommt ein Teil.',
    tipp: 'Ein Quadrat mit 4 Feldern Seitenlänge hat 12 Randfelder: 4 + 4 + 2 + 2.',
    pruefe: (s, g) => randFelder(g).every(([x, y]) => unten(s, x, y) !== null),
  },
  {
    id: 'turm5',
    grundstueck: 'b',
    titel: 'Turm: 5 Blöcke hoch',
    text: 'Baue auf Bauplatz B einen Turm, der genau 5 Blöcke hoch ist.',
    tipp: 'Zähle beim Bauen mit: 1, 2, 3, 4, 5.',
    pruefe: (s, g) => felder(g).some(([x, y]) => { const st = s.stapel[idx(x, y)] ?? []; return st.length === 5 && st.every((a) => istBlock(a)); }),
  },
  {
    id: 'wuerfel8',
    grundstueck: 'b',
    titel: 'Würfel: 2 · 2 · 2',
    text: 'Baue auf Bauplatz B einen großen Würfel: 2 Blöcke lang, 2 breit und 2 hoch.',
    tipp: '2 · 2 = 4 Blöcke in der unteren Lage, noch einmal 4 darauf: 8 Blöcke.',
    pruefe: (s, g) =>
      felder(g).some(([x, y]) =>
        [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx = 0, dy = 0]) => {
          const st = s.stapel[idx(x + dx, y + dy)] ?? [];
          return imGrundstueck(g, x + dx, y + dy) && istBlock(st[0] ?? LUFT) && istBlock(st[1] ?? LUFT);
        }),
      ),
  },
  {
    id: 'haus',
    grundstueck: 'c',
    titel: 'Haus mit Tür, Fenster und Dach',
    text: 'Baue auf Bauplatz C ein Haus: Wände, eine Tür, mindestens ein Fenster und ein Dach.',
    tipp: 'Das Dach kommt auf die Wände – setze die Blöcke seitlich an, dann halten sie.',
    pruefe: (s, g) =>
      anzahlVon(s, g, [101]) >= 1 &&
      anzahlVon(s, g, [102]) >= 1 &&
      felder(g).filter(([x, y]) => { const st = s.stapel[idx(x, y)] ?? []; return (st[0] ?? LUFT) === LUFT && st.slice(2).some(gesetzt); }).length >= 1,
  },
  {
    id: 'garten6',
    grundstueck: 'c',
    titel: 'Garten mit 6 Blumen',
    text: 'Pflanze auf Bauplatz C 6 Blumen. Blumen gibt es im Andenkenstand unter „Garten“.',
    tipp: 'Zum Beispiel 2 rote, 2 gelbe und 2 blaue: 2 + 2 + 2 = 6.',
    pruefe: (s, g) => anzahlVon(s, g, BLUMEN) >= 6,
  },
];
export const INSEL_AUFTRAG_TALER = 20;
export const INSEL_AUFTRAG_BLOECKE = 15;

/** Der nächste offene Auftrag (der Reihe nach). */
export const offenerInselAuftrag = (s: InselStand): InselAuftrag | undefined => INSEL_AUFTRAEGE.find((a) => !s.erledigt.includes(a.id));

/** Erfüllt? Dann wird er als erledigt eingetragen. */
export function pruefeInselAuftrag(s: InselStand): { stand: InselStand; auftrag: InselAuftrag } | undefined {
  const a = offenerInselAuftrag(s);
  const g = a && GRUNDSTUECKE.find((x) => x.id === a.grundstueck);
  if (!a || !g || !a.pruefe(s, g)) return undefined;
  return { stand: { ...s, erledigt: [...s.erledigt, a.id] }, auftrag: a };
}

/* ---------- Speicher ---------- */

export function pruefeInsel(x: unknown): InselStand {
  const leer = leereInsel();
  if (typeof x !== 'object' || x === null) return leer;
  const o = x as Record<string, unknown>;
  const gueltig = (a: unknown): a is number => typeof a === 'number' && (istBlock(a) || !!einrichtung(a) || a === TUER_OBEN || a === LUFT);
  // Alte Spielstände (nur eine Insel, 24 × 24) auf den breiteren Bauplan umrechnen
  let roh: unknown[] | undefined;
  if (Array.isArray(o.stapel) && o.stapel.length === BREITE * HOEHE) roh = o.stapel;
  else if (Array.isArray(o.stapel) && o.stapel.length === BREITE * HOEHE_ALT) {
    // 0.11.0: gleiche Breite, weniger Reihen – die neuen Reihen kommen unten dazu
    roh = [...o.stapel, ...Array.from({ length: BREITE * (HOEHE - HOEHE_ALT) }, () => [])];
  } else if (Array.isArray(o.stapel) && o.stapel.length === INSEL * INSEL) {
    roh = Array.from({ length: BREITE * HOEHE }, () => []);
    o.stapel.forEach((st, i) => {
      (roh as unknown[])[idx(i % INSEL, Math.floor(i / INSEL))] = st;
    });
  }
  const stapel = roh
    ? roh.map((st, i) => {
        if (!Array.isArray(st) || !bebaubar(i % BREITE, Math.floor(i / BREITE))) return [];
        const h = LANDSCHAFT.hoehe[i] ?? 0;
        const sauber = st.map((a) => (gueltig(a) ? a : LUFT)).slice(0, Math.max(0, INSEL_MAX - h));
        while (sauber.length && sauber[sauber.length - 1] === LUFT) sauber.pop();
        return sauber;
      })
    : leer.stapel;
  const inventar: Record<string, number> = {};
  if (typeof o.inventar === 'object' && o.inventar !== null)
    for (const [k, v] of Object.entries(o.inventar)) if ((einrichtung(Number(k)) || tierArt(Number(k))) && typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 1000) inventar[k] = v;
  const f = o.figur as Record<string, unknown> | undefined;
  let figur = { ...START };
  const basis: InselStand = { stapel, inventar, figur, tiere: [], erledigt: [] };
  if (f && typeof f.x === 'number' && typeof f.y === 'number' && typeof f.z === 'number' && istBoden(basis, f.x, f.y, f.z)) figur = { x: f.x, y: f.y, z: f.z };
  const tiere: Tier[] = [];
  if (Array.isArray(o.tiere))
    for (const t of o.tiere.slice(0, MAX_TIERE)) {
      if (!t || typeof t !== 'object') continue;
      const q = t as Record<string, unknown>;
      if (typeof q.art === 'number' && tierArt(q.art) && typeof q.x === 'number' && typeof q.y === 'number' && typeof q.z === 'number' && istBoden(basis, q.x, q.y, q.z))
        tiere.push({ art: q.art, x: q.x, y: q.y, z: q.z });
    }
  const erledigt = Array.isArray(o.erledigt) ? o.erledigt.filter((e): e is string => typeof e === 'string' && e.length < 40).slice(0, 200) : [];
  return { stapel, inventar, figur, tiere, erledigt };
}
