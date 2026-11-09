/** Aussehen jeder Bude: Dachform und Farben. Abwechslung entlang der Gasse, damit keine Bude der anderen gleicht. */
export type Dach = 'markise' | 'zelt' | 'kuppel' | 'giebel';

export interface BudenStil {
  dach: Dach;
  farbe: string;
  /** Zweitfarbe für Streifen und Theke. */
  zweit: string;
}

const ROT = '#e23a4e';
const BLAU = '#3c78d8';
const GRUEN = '#3fae6a';
const LILA = '#7b5ea7';
const ORANGE = '#f07f2a';
const TUERKIS = '#17a398';
const GELB = '#ffc62b';
const PINK = '#d6457f';
const WEISS = '#fffdf7';

export const BUDEN_STIL: Readonly<Record<string, BudenStil>> = {
  dartbude: { dach: 'markise', farbe: ROT, zweit: WEISS },
  'einmaleins-turbo': { dach: 'zelt', farbe: BLAU, zweit: GELB },
  dosenwerfen: { dach: 'giebel', farbe: GRUEN, zweit: WEISS },
  seilbahn: { dach: 'kuppel', farbe: LILA, zweit: GELB },
  waage: { dach: 'markise', farbe: TUERKIS, zweit: WEISS },
  rechendomino: { dach: 'zelt', farbe: ORANGE, zweit: WEISS },
  rechenwerkstatt: { dach: 'giebel', farbe: BLAU, zweit: GELB },
  fehlerdetektiv: { dach: 'kuppel', farbe: PINK, zweit: WEISS },
  tresor: { dach: 'markise', farbe: GELB, zweit: LILA },
  kasse: { dach: 'zelt', farbe: PINK, zweit: WEISS },
  schaetzbude: { dach: 'markise', farbe: TUERKIS, zweit: GELB },
  uhrkarussell: { dach: 'kuppel', farbe: BLAU, zweit: WEISS },
  umrechnungsmemory: { dach: 'giebel', farbe: ORANGE, zweit: WEISS },
  achterbahn: { dach: 'zelt', farbe: ROT, zweit: GELB },
  spiegelkabinett: { dach: 'kuppel', farbe: LILA, zweit: WEISS },
  wuerfelnetz: { dach: 'giebel', farbe: GRUEN, zweit: GELB },
  labyrinth: { dach: 'markise', farbe: BLAU, zweit: WEISS },
  formensortierer: { dach: 'zelt', farbe: TUERKIS, zweit: WEISS },
  zeltdekorateur: { dach: 'zelt', farbe: PINK, zweit: GELB },
  zahlenfolgenzug: { dach: 'giebel', farbe: ROT, zweit: WEISS },
  rechenmauer: { dach: 'markise', farbe: ORANGE, zweit: WEISS },
  riesenradtechniker: { dach: 'kuppel', farbe: GELB, zweit: BLAU },
  murmellabor: { dach: 'kuppel', farbe: GRUEN, zweit: WEISS },
  diagrammreporter: { dach: 'markise', farbe: BLAU, zweit: GELB },
  geisterbahn: { dach: 'giebel', farbe: '#3a3d4f', zweit: LILA },
  pizzabaeckerei: { dach: 'markise', farbe: GRUEN, zweit: ROT },
  hauDenLukas: { dach: 'zelt', farbe: ROT, zweit: WEISS },
};

export const stilFuer = (bude: string): BudenStil => BUDEN_STIL[bude] ?? { dach: 'markise', farbe: ROT, zweit: WEISS };
