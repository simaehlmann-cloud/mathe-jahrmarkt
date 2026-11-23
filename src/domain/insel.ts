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
/**
 * Höhe des Bauplans: oben die beiden ersten Inseln, darunter (seit 0.11.1) Steg und Strandinsel,
 * darunter (seit 0.12) das große, flache Bauland, darunter (seit 0.14) die Wüsteninsel und ganz unten
 * (seit 0.19) die kleinen Auftragsinseln. Die liegen außerhalb der Hauptwelt und haben je eine eigene Ansicht.
 */
export const HOEHE = 100;
/** Reihen der Hauptwelt (alle Inseln, zu denen man laufen kann); darunter liegen die Auftragsinseln. */
export const HAUPT_HOEHE = 76;
/** Frühere Höhen (0.10/0.11.0: 24 Reihen, 0.11.1: 40 Reihen, 0.12/0.13: 58 Reihen, 0.14–0.18: 76 Reihen), für das Umrechnen alter Spielstände. */
const FRUEHERE_HOEHEN = [INSEL, 40, 58, 76];
/** Bis zu dieser Höhe darf auf der Insel gebaut werden (höher als auf dem Bauplatz). */
export const INSEL_MAX = Math.max(MAX_HOEHE, 12);

export type Gelaende = 'gras' | 'sand' | 'wasser' | 'weg' | 'bruecke' | 'blumen' | 'wueste';
export type Kategorie = 'bauen' | 'wohnen' | 'garten' | 'spielen' | 'tiere';
export const KATEGORIE_NAME: Record<Kategorie, string> = { bauen: 'Bauen', wohnen: 'Wohnen', garten: 'Garten', spielen: 'Spielplatz', tiere: 'Tiere' };

/** Einrichtung: Kennung (im Stapel ab 100), Name, Preis in Talern, Eigenschaften. */
export interface Einrichtung {
  id: number;
  name: string;
  preis: number;
  /**
   * Kann man hindurch- bzw. daraufgehen? 'durch' (Tür, Tor), 'flach' (Teppich, Sandkasten: man steht darin),
   * 'stufe' (Treppe: man steigt hinauf), 'nein'.
   */
  begehbar: 'durch' | 'flach' | 'stufe' | 'nein';
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
  // Seit 0.12: mehr zum Einrichten
  E(104, 'Säule', 8, 'bauen'),
  E(105, 'Gartentor', 10, 'bauen', 'durch'),
  E(106, 'Laterne', 8, 'bauen'),
  E(130, 'Badewanne', 25, 'wohnen'),
  E(131, 'Teppich', 10, 'wohnen', 'flach'),
  E(132, 'Kamin', 30, 'wohnen'),
  E(133, 'Herd', 20, 'wohnen'),
  E(134, 'Kühlschrank', 20, 'wohnen'),
  E(135, 'Fernseher', 25, 'wohnen'),
  E(136, 'Sessel', 15, 'wohnen'),
  E(137, 'Standuhr', 20, 'wohnen'),
  E(138, 'Schreibtisch', 15, 'wohnen'),
  E(150, 'Sonnenblume', 4, 'garten'),
  E(151, 'Kürbis', 5, 'garten'),
  E(152, 'Gartenzwerg', 8, 'garten'),
  E(153, 'Vogelhaus', 10, 'garten'),
  E(154, 'Teich', 20, 'garten'),
  E(155, 'Apfelbäumchen', 15, 'garten'),
  E(156, 'Sonnenschirm', 12, 'garten'),
  // Seit 0.14
  E(157, 'Kaktus', 6, 'garten'),
  E(160, 'Schaukel', 25, 'spielen'),
  E(161, 'Rutsche', 25, 'spielen'),
  E(162, 'Sandkasten', 15, 'spielen', 'flach'),
  E(163, 'Trampolin', 20, 'spielen'),
  E(164, 'Wippe', 15, 'spielen'),
];
/** Hier kann sich die Figur hinsetzen (Sitzhöhe in Ebenen) bzw. hinlegen. */
export const SITZEN: Readonly<Record<number, number>> = { 116: 0.36, 117: 0.4, 124: 0.42, 136: 0.36 };
/** Kurze Spielplatz-Aktionen der Figur (nur Anzeige): schaukeln, springen, rutschen, buddeln. */
export type Aktion = 'schaukeln' | 'springen' | 'rutschen' | 'buddeln';
/**
 * Spielgeräte: Die Figur läuft hin (beim Sandkasten hinein), macht eine kurze Aktion und hört dann von selbst auf.
 * hoehe: Höhe in Ebenen, auf der die Figur steht oder sitzt; ms: Dauer. Schaukel seit 0.14, der Rest seit 0.18.1.
 */
export const AKTIONEN: Readonly<Record<number, { typ: Aktion; hoehe: number; ms: number; hinein?: boolean }>> = {
  160: { typ: 'schaukeln', hoehe: 0.42, ms: 3600 },
  163: { typ: 'springen', hoehe: 0.36, ms: 3200 },
  161: { typ: 'rutschen', hoehe: 1.1, ms: 2400 },
  162: { typ: 'buddeln', hoehe: 0.04, ms: 3200, hinein: true },
};
/** Auf diese Teile setzt sich die Figur und schaukelt eine Runde (Sitzhöhe in Ebenen). */
export const SCHAUKELN: Readonly<Record<number, number>> = { 160: 0.42 };
/** Diese Einrichtung sieht von allen Seiten gleich aus oder bestimmt den Weg (Tür, Treppe) – sie wird nicht gedreht. */
const NICHT_DREHBAR = new Set<number>([101, 102, 103, 104, 106, 113, 114, 120, 121, 122, 125, 126, 127, 131, 150, 151, 153, 155, 156, 157, 162, 163]);
export const drehbar = (art: number): boolean => !!einrichtung(art) && !NICHT_DREHBAR.has(art);
export const LIEGEN: Readonly<Record<number, number>> = { 110: 0.45 };
/** Teile, durch die man hindurchgeht oder in denen man steht (zählen beim Laufen als frei). */
const DURCHGANG = new Set<number>([101, 105, 131, 162]);
export const BLUMEN = [120, 121, 122] as const;

/** Tiere: werden gekauft, auf die Insel gesetzt und laufen dann langsam umher. Keine Gegner. */
export interface TierArt {
  id: number;
  name: string;
  preis: number;
  /** Was das Tier sagt, wenn man es antippt (seit 0.18.1). */
  laut: string;
}
export const TIERE: readonly TierArt[] = [
  { id: 140, name: 'Schaf', preis: 30, laut: 'Mäh!' },
  { id: 141, name: 'Hund', preis: 35, laut: 'Wuff!' },
  { id: 142, name: 'Katze', preis: 30, laut: 'Miau!' },
  { id: 143, name: 'Huhn', preis: 15, laut: 'Gack!' },
  { id: 144, name: 'Kaninchen', preis: 20, laut: 'Schnuffel!' },
  { id: 145, name: 'Pferd', preis: 45, laut: 'Wieher!' },
  { id: 146, name: 'Ente', preis: 15, laut: 'Quak!' },
  { id: 147, name: 'Kuh', preis: 40, laut: 'Muh!' },
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
  /**
   * Seit 0.14: Blickrichtung gedrehter Einrichtung (Viertelumdrehungen 1–3) je „x,y,z“ (z absolut).
   * Fehlt ein Eintrag, steht das Teil wie bisher (0). Ältere Spielstände haben das Feld nicht.
   */
  richtung?: Record<string, number>;
  /** Seit 0.14: Wie lange (ms) seit dem letzten Schlafen auf der Insel gespielt wurde – danach wird es Nacht. */
  wach?: number;
}

/* ---------- Feste Landschaft ---------- */

/** Geländehöhe und Art je Feld, Bäume als feste Hindernisse. Immer gleich (kein Zufall). */
export interface Landschaft {
  art: Gelaende[];
  hoehe: number[];
  /** Feste Pflanzen als Hindernis (Bäume, seit 0.14 auch Kakteen und Palmen). */
  baum: boolean[];
  /** Welche Pflanze steht dort (für das Bild); fehlt der Eintrag, ist es ein Laubbaum. */
  pflanze: ('kaktus' | 'palme' | undefined)[];
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
/**
 * Seit 0.19 ist die erste Insel nach unten größer: eine Wiese ohne Bäume zum freien Bauen (WIESE).
 * Der Bootssteg liegt jetzt an ihrem unteren Rand; am Ende das Boot zum Jahrmarkt, daneben das Ruderboot
 * zu den Auftragsinseln.
 */
export const ERWEITERUNG = { x0: 0, x1: 20, y0: INSEL, y1: 36 } as const;
/** Baumfreie Wiese (14 × 14 Felder) auf der ersten Insel. */
export const WIESE = { x0: 2, x1: 17, y0: 23, y1: 36 } as const;
export const aufErweiterung = (x: number, y: number): boolean => {
  const { x0, x1, y0, y1 } = ERWEITERUNG;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  // untere rechte Ecke abgerundet (Radius 3); links ist der Rand des Bauplans, oben die alte Insel
  const r = 3;
  if (x > x1 - r && y > y1 - r) return Math.hypot(x - (x1 - r), y - (y1 - r)) <= r;
  return true;
};
export const STEG = { x: 11, y0: 37, y1: 38 } as const;
export const BOOT = { x: 11, y: 39 } as const;
/** Ruderboot zu den Auftragsinseln, rechts neben dem Ende des Stegs. */
export const RUDERBOOT = { x: 13, y: 38 } as const;

/** Ausschnitt des Bauplans, der in einer Ansicht gezeichnet wird (x1, y1 ausschließlich). */
export interface Bereich {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** Die Hauptwelt: alle Inseln, zwischen denen man laufen kann. */
export const HAUPTWELT: Bereich = { x0: 0, y0: 0, x1: BREITE, y1: HAUPT_HOEHE };

/**
 * Auftragsinseln (seit 0.19): Jeder Bauplatz liegt auf einer eigenen kleinen Insel unterhalb der Hauptwelt,
 * 12 × 12 Felder mit Wasser drumherum. Land: Spalten 1–10, Reihen 1–9; Steg (5–6, 10), Ruderboot (7, 10).
 * Hin und zurück geht es mit dem Ruderboot – zu Fuß kommt man nicht hinüber.
 */
export const AUFTRAGSINSEL_GROESSE = 12;
export interface Auftragsinsel extends Bereich {
  id: string;
}
const auftragsinsel = (id: string, x0: number, y0: number): Auftragsinsel => ({ id, x0, y0, x1: x0 + AUFTRAGSINSEL_GROESSE, y1: y0 + AUFTRAGSINSEL_GROESSE });
export const AUFTRAGSINSELN: readonly Auftragsinsel[] = [
  auftragsinsel('a', 0, HAUPT_HOEHE),
  auftragsinsel('b', 12, HAUPT_HOEHE),
  auftragsinsel('c', 24, HAUPT_HOEHE),
  auftragsinsel('d', 0, HAUPT_HOEHE + 12),
  auftragsinsel('e', 12, HAUPT_HOEHE + 12),
];
/** Landfeld einer Auftragsinsel? (lokale Koordinaten, Ecken abgerundet) */
const landAufAuftragsinsel = (lx: number, ly: number): boolean => {
  if (lx < 1 || lx > 10 || ly < 1 || ly > 9) return false;
  const r = 2;
  const cx = lx < 1 + r ? 1 + r : lx > 10 - r ? 10 - r : lx;
  const cy = ly < 1 + r ? 1 + r : ly > 9 - r ? 9 - r : ly;
  return Math.hypot(lx - cx, ly - cy) <= r;
};
/** Ankunft auf der Auftragsinsel: Ende des Stegs. */
export const ankunftAuf = (a: Auftragsinsel): { x: number; y: number; z: number } => ({ x: a.x0 + 5, y: a.y0 + 10, z: 0 });
/** Ruderboot an der Auftragsinsel (zurück zur ersten Insel). */
export const ruderbootAn = (a: Auftragsinsel): { x: number; y: number } => ({ x: a.x0 + 7, y: a.y0 + 10 });
/** Ankunft auf der ersten Insel, wenn man vom Ruderboot zurückkommt. */
export const ANKUNFT_HAUPT = { x: STEG.x + 1, y: STEG.y1, z: 0 } as const;
export const imBereich = (b: Bereich, x: number, y: number): boolean => x >= b.x0 && y >= b.y0 && x < b.x1 && y < b.y1;
/** In welcher Ansicht liegt ein Feld: Hauptwelt oder eine Auftragsinsel? */
export const bereichVon = (x: number, y: number): Bereich => AUFTRAGSINSELN.find((a) => imBereich(a, x, y)) ?? HAUPTWELT;
/** Dritte Brücke: von der Strandinsel nach Süden ins Bauland. */
export const BRUECKE3 = { x: 34, y0: 39, y1: 41 } as const;
/** Bauland (seit 0.12): große, flache Wiese zum freien Bauen, Ecken abgerundet. */
export const BAULAND = { x0: 3, x1: 40, y0: 42, y1: 56 } as const;
/** Vierte Brücke (seit 0.14): vom Bauland nach Süden in die Wüste. */
export const BRUECKE4 = { x: 24, y0: 57, y1: 60 } as const;
/** Wüsteninsel (seit 0.14, Zusatzpaket): Sand, Dünen, Kakteen und eine Oase mit Palmen. */
const WUESTE = { x: 22, y: 67.6, rx: 17.6, ry: 7.6 };
const abstandWueste = (x: number, y: number): number => Math.hypot((x + 0.5 - WUESTE.x) / WUESTE.rx, (y + 0.5 - WUESTE.y) / WUESTE.ry);
export const aufWueste = (x: number, y: number): boolean => abstandWueste(x, y) < 1;
export const aufBauland = (x: number, y: number): boolean => {
  const { x0, x1, y0, y1 } = BAULAND;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  // abgerundete Ecken (Radius 3)
  const r = 3;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return Math.hypot(x - cx, y - cy) <= r;
};

export const LANDSCHAFT: Landschaft = (() => {
  const n = BREITE * HOEHE;
  const art: Gelaende[] = Array(n).fill('wasser');
  const hoehe: number[] = Array(n).fill(0);
  const baum: boolean[] = Array(n).fill(false);
  const pflanze: ('kaktus' | 'palme' | undefined)[] = Array(n).fill(undefined);
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
      // Strand am unteren Rand (seit 0.19 nur noch rechts der Erweiterung)
      if (y >= INSEL - 1 && x > ERWEITERUNG.x1) art[i] = 'sand';
    }
  // Erweiterung der ersten Insel (seit 0.19): Wiese mit Sandrand
  for (let y = ERWEITERUNG.y0; y <= ERWEITERUNG.y1; y++)
    for (let x = ERWEITERUNG.x0; x <= ERWEITERUNG.x1; x++) {
      if (!aufErweiterung(x, y)) continue;
      const rand = !aufErweiterung(x + 1, y) || !aufErweiterung(x, y + 1);
      art[idx(x, y)] = rand ? 'sand' : 'gras';
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
  // Dritte Brücke und Bauland: flache Wiese mit Sandrand, ein paar Bäume am Rand
  for (let y = BRUECKE3.y0; y <= BRUECKE3.y1; y++) for (const x of [BRUECKE3.x, BRUECKE3.x + 1]) art[idx(x, y)] = 'bruecke';
  for (let y = BAULAND.y0; y <= BAULAND.y1; y++)
    for (let x = BAULAND.x0; x <= BAULAND.x1; x++) {
      if (!aufBauland(x, y)) continue;
      const rand = !aufBauland(x - 1, y) || !aufBauland(x + 1, y) || !aufBauland(x, y - 1) || !aufBauland(x, y + 1);
      art[idx(x, y)] = rand ? 'sand' : 'gras';
    }
  // Vierte Brücke und Wüste: heller Sandrand, Wüstensand, zwei Dünen, Oase mit Wiese und Wasser
  for (let y = BRUECKE4.y0; y <= BRUECKE4.y1; y++) for (const x of [BRUECKE4.x, BRUECKE4.x + 1]) if (!aufBauland(x, y)) art[idx(x, y)] = 'bruecke';
  for (let y = 57; y < HOEHE; y++)
    for (let x = 0; x < BREITE; x++) {
      const d = abstandWueste(x, y);
      if (d >= 1 || art[idx(x, y)] === 'bruecke') continue;
      const i = idx(x, y);
      art[i] = d > 0.86 ? 'sand' : 'wueste';
      const dOase = Math.hypot((x - 30) / 2.2, (y - 65) / 1.5);
      if (dOase < 1) art[i] = 'wasser';
      else if (Math.hypot((x - 30) / 3.4, (y - 65) / 2.5) < 1) art[i] = 'gras';
      for (const [dx, dy, rx, ry] of [[11, 66, 3.2, 2.4], [17, 71, 2.6, 1.8]] as const) {
        const dd = Math.hypot((x - dx) / rx, (y - dy) / ry);
        if (dd < 0.5) hoehe[i] = Math.max(hoehe[i] ?? 0, 2);
        else if (dd < 1) hoehe[i] = Math.max(hoehe[i] ?? 0, 1);
      }
    }
  for (const [x, y] of [[8, 63], [15, 63], [20, 66], [6, 69], [23, 71], [27, 69], [35, 70], [38, 66], [13, 73], [32, 72], [19, 62]] as [number, number][]) {
    baum[idx(x, y)] = true;
    pflanze[idx(x, y)] = 'kaktus';
  }
  for (const [x, y] of [[27, 64], [33, 66], [31, 62], [28, 67]] as [number, number][]) {
    baum[idx(x, y)] = true;
    pflanze[idx(x, y)] = 'palme';
  }
  // Bootssteg auf der ersten Insel (unten am Strand)
  for (let y = STEG.y0; y <= STEG.y1; y++) for (const x of [STEG.x, STEG.x + 1]) art[idx(x, y)] = 'bruecke';
  // Auftragsinseln: Wiese mit Sandrand, Steg und zwei Bäume am Rand (nicht auf dem Bauplatz)
  for (const a of AUFTRAGSINSELN) {
    for (let ly = 0; ly < AUFTRAGSINSEL_GROESSE; ly++)
      for (let lx = 0; lx < AUFTRAGSINSEL_GROESSE; lx++) {
        if (!landAufAuftragsinsel(lx, ly)) continue;
        const rand = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => !landAufAuftragsinsel(lx + dx, ly + dy));
        art[idx(a.x0 + lx, a.y0 + ly)] = rand ? 'sand' : 'gras';
      }
    art[idx(a.x0 + 5, a.y0 + 10)] = 'bruecke';
    art[idx(a.x0 + 6, a.y0 + 10)] = 'bruecke';
    baum[idx(a.x0 + 2, a.y0 + 2)] = true;
    baum[idx(a.x0 + 9, a.y0 + 8)] = true;
  }
  // Bäume (fest), nicht auf Weg, Wasser oder Bauplätzen
  for (const [x, y] of [[1, 9], [2, 14], [1, 19], [7, 1], [10, 2], [14, 1], [22, 14], [21, 16], [22, 20], [8, 22], [16, 22], [3, 22], [20, 9], [6, 7], [8, 14],
    [33, 4], [41, 11], [36, 20], [30, 19], [42, 15], [29, 8],
    [25, 28], [29, 26], [38, 26], [32, 33], [36, 36], [42, 34], [26, 35],
    [19, 26], [19, 31],
    [5, 45], [6, 53], [39, 46], [38, 54], [21, 55]] as [number, number][]) baum[idx(x, y)] = true;
  // Leichte Erhebung am Steg: Treppenstufen auf den Hügel bei (6..7, 4)
  hoehe[idx(7, 4)] = 1;
  return { art, hoehe, baum, pflanze };
})();

/** Ankunftsplatz der Figur. */
export const START = { x: 12, y: 21, z: 0 };

export const leereInsel = (): InselStand => ({ stapel: Array.from({ length: BREITE * HOEHE }, () => []), inventar: {}, figur: { ...START }, tiere: [], erledigt: [], richtung: {}, wach: 0 });

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

const frei = (e: ReturnType<typeof inEbene>): boolean => e === null || e === TUER_OBEN || (typeof e === 'number' && DURCHGANG.has(e));

/** Höhe der Stapeloberkante (absolut). */
export const oberkante = (s: InselStand, x: number, y: number): number => (LANDSCHAFT.hoehe[idx(x, y)] ?? 0) + (s.stapel[idx(x, y)]?.length ?? 0);

/** Kann die Figur in Ebene z auf Feld (x, y) stehen? Fester Grund darunter, zwei Ebenen Platz (Türen zählen als frei). */
export function istBoden(s: InselStand, x: number, y: number, z: number): boolean {
  if (!imFeld(x, y) || z < 0 || z > INSEL_MAX + 2) return false;
  const hier = inEbene(s, x, y, z);
  const drueber = inEbene(s, x, y, z + 1);
  if (!frei(hier) || !frei(drueber)) return false;
  const unten = z === 0 ? 'grund' : inEbene(s, x, y, z - 1);
  if (unten === null || unten === 'wasser' || unten === TUER_OBEN || (typeof unten === 'number' && DURCHGANG.has(unten))) return false;
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
  let neu = ohneRichtung(mitEbene(s, x, y, z, art), x, y, z);
  if (e && e.hoehe === 2) neu = mitEbene(neu, x, y, z + 1, TUER_OBEN);
  const inventar = e ? { ...s.inventar, [String(art)]: (s.inventar[String(art)] ?? 0) - 1 } : s.inventar;
  return { ok: true, stand: { ...neu, inventar }, bloecke: e ? bloecke : bloecke - 1 };
}

/* ---------- Freie Version (seit 0.14) ---------- */

/**
 * Ohne Zusatzpaket gehört die erste Insel (mit Wiese und Steg, seit 0.19 größer) zum Ausprobieren dazu: dort laufen und mit allen Blöcken bauen.
 * Die anderen Inseln, die Bauaufträge, die übrige Einrichtung und die Tiere gehören zum Zusatzpaket.
 */
export const imFreienTeil = (x: number, y: number): boolean =>
  (x >= 0 && y >= 0 && x < INSEL && y < INSEL) || aufErweiterung(x, y) || (x >= STEG.x && x <= STEG.x + 1 && y >= STEG.y0 && y <= STEG.y1);
/** Grundausstattung ohne Zusatzpaket: Tür, Fenster, Treppe, Zaun, Gartentor, Bett, Tisch, Stuhl und Blumen. */
export const FREIE_TEILE: ReadonlySet<number> = new Set([101, 102, 103, 105, 110, 112, 115, 117, 120, 121, 122]);
export const teilFrei = (art: number, paket: boolean): boolean => paket || FREIE_TEILE.has(art);

/* ---------- Tag und Nacht (seit 0.14) ---------- */

/** So lange ist auf der Insel Tag (gespielte Zeit seit dem letzten Schlafen), danach dämmert es. */
export const INSEL_TAG_MS = 8 * 60_000;
export const INSEL_DAEMMERUNG_MS = 2 * 60_000;
/** Tageslicht 1 (Tag) bis 0 (Nacht) nach gespielter Wachzeit. */
export const inselLicht = (wach: number): number =>
  wach <= INSEL_TAG_MS ? 1 : wach >= INSEL_TAG_MS + INSEL_DAEMMERUNG_MS ? 0 : 1 - (wach - INSEL_TAG_MS) / INSEL_DAEMMERUNG_MS;

/* ---------- Drehen (seit 0.14) ---------- */

const richtungsSchluessel = (x: number, y: number, z: number): string => `${x},${y},${z}`;
/** Blickrichtung (0–3 Viertelumdrehungen) des Teils in Ebene z. */
export const richtungVon = (s: InselStand, x: number, y: number, z: number): number => s.richtung?.[richtungsSchluessel(x, y, z)] ?? 0;
/** Eintrag für Ebene z entfernen (beim Setzen und Abbauen: ein neues Teil steht wieder gerade). */
function ohneRichtung(s: InselStand, x: number, y: number, z: number): InselStand {
  const k = richtungsSchluessel(x, y, z);
  if (!s.richtung || !(k in s.richtung)) return s;
  const richtung = { ...s.richtung };
  delete richtung[k];
  return { ...s, richtung };
}
/** Einrichtung in Ebene z eine Viertelumdrehung weiterdrehen. undefined: dort steht nichts Drehbares. */
export function dreheAn(s: InselStand, x: number, y: number, z: number): InselStand | undefined {
  const e = inEbene(s, x, y, z);
  if (typeof e !== 'number' || !drehbar(e)) return undefined;
  const k = richtungsSchluessel(x, y, z);
  const neu = (richtungVon(s, x, y, z) + 1) % 4;
  const richtung = { ...(s.richtung ?? {}) };
  if (neu === 0) delete richtung[k];
  else richtung[k] = neu;
  return { ...s, richtung };
}

/** Blickrichtung (Viertelumdrehungen) direkt setzen; 0 entfernt den Eintrag. Nur für drehbare Teile. */
export function mitRichtung(s: InselStand, x: number, y: number, z: number, r: number): InselStand {
  const e = inEbene(s, x, y, z);
  if (typeof e !== 'number' || !drehbar(e)) return s;
  const k = richtungsSchluessel(x, y, z);
  const richtung = { ...(s.richtung ?? {}) };
  const neu = ((r % 4) + 4) % 4;
  if (neu === 0) delete richtung[k];
  else richtung[k] = neu;
  return { ...s, richtung };
}

const HECKE = 123;
/** Sitzmöbel schauen von selbst zum Tisch (Lehne auf der anderen Seite). */
const SITZMOEBEL = new Set([116, 117, 124, 136]);
const TISCHE = new Set([112, 138]);
/** Richtung, in die ein Teil bei Drehung r schaut: 0 = −y, 1 = +x, 2 = +y, 3 = −x (im Plan). */
const BLICK: readonly [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
/**
 * Richtung beim Setzen ohne eigene Wahl (seit 0.14): Stuhl, Sessel, Sofa und Bank schauen zu einem Tisch daneben,
 * ein Bett stellt sich mit dem Kopfende an eine Wand daneben. Seit 0.18.1: Eine Hecke reiht sich an eine
 * Hecke daneben an (längs zur Nachbarhecke). undefined = nichts Passendes in der Nähe.
 */
export function autoRichtung(s: InselStand, x: number, y: number, z: number, art: number): number | undefined {
  const passt = (r: number, test: (e: ReturnType<typeof inEbene>) => boolean): boolean => {
    const [dx, dy] = BLICK[r] ?? [0, 0];
    return test(inEbene(s, x + dx, y + dy, z));
  };
  if (SITZMOEBEL.has(art)) return [0, 1, 2, 3].find((r) => passt(r, (e) => typeof e === 'number' && TISCHE.has(e)));
  if (art === 110) return [0, 1, 2, 3].find((r) => passt(r, (e) => typeof e === 'number' && istBlock(e)));
  if (art === HECKE) {
    const hecke = (e: ReturnType<typeof inEbene>): boolean => e === HECKE;
    if (passt(1, hecke) || passt(3, hecke)) return 0; // Nachbar in x-Richtung: Hecke liegt längs x
    if (passt(0, hecke) || passt(2, hecke)) return 1;
  }
  return undefined;
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
  let stand = ohneRichtung(mitEbene(s, x, y, zz, LUFT), x, y, zz);
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
 * nicht ins Wasser, nicht auf andere Tiere oder die Figur, nicht durch Türen und Tore). `zufall` liefert Zahlen in [0, 1).
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
    // Durch Türen und Gartentore gehen Tiere nicht (sonst liefen sie aus Haus und Gehege)
    const ziel = inEbene(s, nx, ny, t.z);
    if (belegt.has(`${nx},${ny}`) || !istBoden(s, nx, ny, t.z) || LANDSCHAFT.art[idx(nx, ny)] === 'bruecke' || ziel === 101 || ziel === 105) return t;
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
/**
 * Bauplätze A–E, seit 0.19 je auf einer eigenen Auftragsinsel (vorher auf der zweiten Insel, der Strandinsel und dem
 * Bauland – was dort gebaut wurde, bleibt als normales Land stehen). A, B, C sind 4 × 4, D und E 6 × 6 groß.
 */
const NAMEN: Record<string, [string, number]> = { a: ['Bauplatz A', 4], b: ['Bauplatz B', 4], c: ['Bauplatz C', 4], d: ['Bauplatz D', 6], e: ['Bauplatz E', 6] };
export const GRUNDSTUECKE: readonly Grundstueck[] = AUFTRAGSINSELN.map((a) => {
  const [name, n] = NAMEN[a.id] ?? ['Bauplatz', 4];
  const rand = n === 6 ? 3 : 4;
  return { id: a.id, name, x0: a.x0 + rand, y0: a.y0 + (n === 6 ? 2 : 3), n, wo: 'auf einer eigenen kleinen Insel – fahr mit dem Ruderboot am Steg hinüber' };
});
/** Die Auftragsinsel eines Bauplatzes. */
export const inselVon = (grundstueck: string): Auftragsinsel | undefined => AUFTRAGSINSELN.find((a) => a.id === grundstueck);
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
/** Ein Turm: nur Blöcke, vom Boden an lückenlos. Gibt die Höhe zurück, sonst 0. */
const turmHoehe = (s: InselStand, x: number, y: number): number => {
  const st = s.stapel[idx(x, y)] ?? [];
  return st.length > 0 && st.every((a) => istBlock(a)) ? st.length : 0;
};
/** Alle Reihen und Spalten des Grundstücks, jeweils in beide Richtungen gelesen. */
const linien = (g: Grundstueck): [number, number][][] => {
  const l: [number, number][][] = [];
  for (let i = 0; i < g.n; i++) {
    const reihe: [number, number][] = [];
    const spalte: [number, number][] = [];
    for (let j = 0; j < g.n; j++) {
      reihe.push([g.x0 + j, g.y0 + i]);
      spalte.push([g.x0 + i, g.y0 + j]);
    }
    l.push(reihe, [...reihe].reverse(), spalte, [...spalte].reverse());
  }
  return l;
};
/** Kommen in einer Linie direkt hintereinander Türme dieser Höhen vor? */
const hoehenFolge = (s: InselStand, g: Grundstueck, folge: readonly number[]): boolean =>
  linien(g).some((l) => l.some((_, i) => folge.every((h, k) => { const f = l[i + k]; return !!f && turmHoehe(s, f[0], f[1]) === h; })));
/** Unterste Ebene mit Block (Blockart) oder null. */
const bodenBlock = (s: InselStand, x: number, y: number): number | null => {
  const u = unten(s, x, y);
  return u !== null && istBlock(u) ? u : null;
};
const NACHBARN: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** Ist das Feld auf dem Boden frei (nichts gebaut oder nur Teppich, Sandkasten)? Ein Tor zählt als zu. */
const bodenFrei = (s: InselStand, x: number, y: number): boolean => {
  const u = unten(s, x, y);
  return u === null || u === 131 || u === 162;
};
/**
 * Gehege: Freie Felder, die man von (x, y) aus erreicht, ohne das Grundstück zu verlassen.
 * null, wenn man hinauskommt (dann ist das Gehege nicht zu).
 */
const gehege = (s: InselStand, g: Grundstueck, x: number, y: number): Set<string> | null => {
  const innen = new Set<string>([`${x},${y}`]);
  const offen: [number, number][] = [[x, y]];
  while (offen.length) {
    const [cx, cy] = offen.pop()!;
    for (const [dx, dy] of NACHBARN) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (innen.has(`${nx},${ny}`) || !bodenFrei(s, nx, ny)) continue;
      if (!imGrundstueck(g, nx, ny)) return null;
      innen.add(`${nx},${ny}`);
      offen.push([nx, ny]);
    }
  }
  return innen;
};

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
  // Seit 0.14: Bauplatz D (Formen und Muster) und E (Größen und Rechnen) auf dem Bauland
  {
    id: 'treppe4',
    grundstueck: 'd',
    titel: 'Treppe mit 4 Stufen',
    text: 'Baue auf Bauplatz D eine Treppe aus Blöcken: 1 Block hoch, dann 2, dann 3, dann 4 – direkt nebeneinander in einer Reihe.',
    tipp: 'Jede Stufe ist einen Block höher als die davor. Zusammen brauchst du 1 + 2 + 3 + 4 = 10 Blöcke.',
    pruefe: (s, g) => hoehenFolge(s, g, [1, 2, 3, 4]),
  },
  {
    id: 'doppelt',
    grundstueck: 'd',
    titel: 'Doppelt so hoch',
    text: 'Baue auf Bauplatz D einen Turm, der 3 Blöcke hoch ist. Direkt daneben baust du einen Turm, der doppelt so hoch ist.',
    tipp: 'Doppelt so hoch heißt: 2 · 3 Blöcke. Rechne erst, dann baue.',
    pruefe: (s, g) => hoehenFolge(s, g, [3, 6]),
  },
  {
    id: 'rechteck12',
    grundstueck: 'd',
    titel: 'Rechteck mit 12 Feldern',
    text: 'Lege auf Bauplatz D ein Rechteck aus genau 12 Blöcken auf den Boden – lückenlos, aber kein Quadrat.',
    tipp: '12 = 2 · 6 = 3 · 4. Ein Rechteck mit 3 Reihen zu je 4 Feldern hat 12 Felder.',
    pruefe: (s, g) => {
      const belegt = felder(g).filter(([x, y]) => bodenBlock(s, x, y) !== null);
      if (belegt.length !== 12) return false;
      const xs = belegt.map(([x]) => x);
      const ys = belegt.map(([, y]) => y);
      const b = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      return b * h === 12 && b !== h;
    },
  },
  {
    id: 'muster',
    grundstueck: 'd',
    titel: 'Farbmuster: immer abwechselnd',
    text: 'Lege auf Bauplatz D eine ganze Reihe aus 6 Blöcken auf den Boden, immer abwechselnd in zwei Farben – zum Beispiel Ziegel, Gold, Ziegel, Gold …',
    tipp: 'Das Muster wiederholt sich nach 2 Blöcken. Bei 6 Blöcken kommt jede Farbe 3-mal vor: 6 : 2 = 3.',
    pruefe: (s, g) =>
      linien(g).some((l) => {
        const f = l.map(([x, y]) => bodenBlock(s, x, y));
        const [a, b] = f;
        return a != null && b != null && a !== b && f.every((c, i) => c === (i % 2 === 0 ? a : b));
      }),
  },
  {
    id: 'spiegel',
    grundstueck: 'd',
    titel: 'Spiegelbild',
    text: 'Baue auf Bauplatz D eine Mauer über eine ganze Reihe (6 Felder). Die linke Hälfte soll genau so aussehen wie die rechte, nur gespiegelt – mit verschiedenen Farben oder Höhen.',
    tipp: 'Stell dir in der Mitte einen Spiegel vor: Das 1. und das 6. Feld sind gleich, das 2. und das 5., das 3. und das 4.',
    pruefe: (s, g) =>
      linien(g).some((l) => {
        const t = l.map(([x, y]) => (turmHoehe(s, x, y) ? (s.stapel[idx(x, y)] ?? []).join('-') : ''));
        return t.every((v) => v !== '') && t.every((v, i) => v === t[t.length - 1 - i]) && new Set(t).size > 1;
      }),
  },
  {
    id: 'quader12',
    grundstueck: 'e',
    titel: 'Quader: 3 · 2 · 2',
    text: 'Baue auf Bauplatz E einen Quader: 3 Blöcke lang, 2 Blöcke breit und 2 Blöcke hoch.',
    tipp: 'Unten liegen 3 · 2 = 6 Blöcke, darauf noch einmal 6. Zusammen 12 Blöcke.',
    pruefe: (s, g) =>
      felder(g).some(([x, y]) =>
        [[3, 2], [2, 3]].some(([b = 0, t = 0]) => {
          for (let dy = 0; dy < t; dy++)
            for (let dx = 0; dx < b; dx++) {
              const st = s.stapel[idx(x + dx, y + dy)] ?? [];
              if (!imGrundstueck(g, x + dx, y + dy) || !istBlock(st[0] ?? LUFT) || !istBlock(st[1] ?? LUFT)) return false;
            }
          return true;
        }),
      ),
  },
  {
    id: 'gehege',
    grundstueck: 'e',
    titel: 'Gehege für 2 Tiere',
    text: 'Baue auf Bauplatz E ein Gehege: Zaun oder Mauer rundherum, ein Gartentor und 2 Tiere darin.',
    tipp: 'Für ein Gehege mit 2 · 2 Feldern innen brauchst du 12 Teile rundherum: 4 + 4 + 2 + 2. Eins davon ist das Tor.',
    pruefe: (s, g) =>
      s.tiere.some((t) => {
        if (!imGrundstueck(g, t.x, t.y)) return false;
        const innen = gehege(s, g, t.x, t.y);
        if (!innen) return false;
        const drin = s.tiere.filter((u) => innen.has(`${u.x},${u.y}`)).length;
        const tor = [...innen].some((k) => {
          const [x = 0, y = 0] = k.split(',').map(Number);
          return NACHBARN.some(([dx, dy]) => unten(s, x + dx, y + dy) === 105);
        });
        return drin >= 2 && tor;
      }),
  },
  {
    id: 'sitzgruppe',
    grundstueck: 'e',
    titel: 'Tisch mit 4 Stühlen',
    text: 'Stelle auf Bauplatz E einen Tisch auf und an jede Seite einen Stuhl – 4 Stühle rund um den Tisch.',
    tipp: 'Ein Tisch hat 4 Seiten, also 4 Stühle. Ein Stuhl kostet 8 Taler: 4 · 8 = 32 Taler.',
    pruefe: (s, g) => felder(g).some(([x, y]) => unten(s, x, y) === 112 && NACHBARN.every(([dx, dy]) => unten(s, x + dx, y + dy) === 117)),
  },
  {
    id: 'halbhalb',
    grundstueck: 'e',
    titel: 'Halb und halb',
    text: 'Pflanze auf Bauplatz E 12 Blumen: Die Hälfte davon rot, die andere Hälfte gelb.',
    tipp: 'Die Hälfte von 12 ist 6, denn 6 + 6 = 12. Also 6 rote und 6 gelbe Blumen.',
    pruefe: (s, g) => anzahlVon(s, g, BLUMEN) === 12 && anzahlVon(s, g, [120]) === 6 && anzahlVon(s, g, [121]) === 6,
  },
  {
    id: 'haus2',
    grundstueck: 'e',
    titel: 'Großes Haus: 2 Fenster mehr',
    text: 'Baue auf Bauplatz E ein Haus mit Dach. Es soll 2 Fenster mehr haben als Türen.',
    tipp: 'Mit 1 Tür brauchst du 1 + 2 = 3 Fenster. Mit 2 Türen sind es 4 Fenster.',
    pruefe: (s, g) => {
      const tueren = anzahlVon(s, g, [101]);
      return (
        tueren >= 1 &&
        anzahlVon(s, g, [102]) === tueren + 2 &&
        felder(g).some(([x, y]) => { const st = s.stapel[idx(x, y)] ?? []; return (st[0] ?? LUFT) === LUFT && st.slice(2).some(gesetzt); })
      );
    },
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
  else if (Array.isArray(o.stapel) && FRUEHERE_HOEHEN.some((h) => (o.stapel as unknown[]).length === BREITE * h)) {
    // 0.11.x: gleiche Breite, weniger Reihen – die neuen Reihen kommen unten dazu
    roh = [...o.stapel, ...Array.from({ length: BREITE * HOEHE - o.stapel.length }, () => [])];
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
  // Seit 0.14: gedrehte Einrichtung (nur Einträge, unter denen wirklich ein drehbares Teil steht) und Wachzeit
  const richtung: Record<string, number> = {};
  if (typeof o.richtung === 'object' && o.richtung !== null)
    for (const [k, v] of Object.entries(o.richtung).slice(0, 4000)) {
      const m = /^(\d+),(\d+),(\d+)$/.exec(k);
      if (!m || typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 3) continue;
      const e = inEbene(basis, Number(m[1]), Number(m[2]), Number(m[3]));
      if (typeof e === 'number' && drehbar(e)) richtung[k] = v;
    }
  const wach = typeof o.wach === 'number' && Number.isFinite(o.wach) && o.wach > 0 ? Math.min(o.wach, 24 * 3600_000) : 0;
  return { stapel, inventar, figur, tiere, erledigt, richtung, wach };
}
