import { BUDEN, GASSEN, type GasseId } from './buden';
/**
 * Begehbarer Jahrmarkt (seit 0.15): Themenplätze statt Reihen, verbunden durch geschwungene Wege.
 * Ganz oben auf einem Hügel der Sternenmarkt (Treppe mit Tor), unten der Festplatz mit Eingang und Riesenrad.
 * Begehbar sind die Plätze (Ellipsen, man läuft frei darüber) und die Wege (Linienzüge).
 * Ein Weg von A nach B führt zur Mitte des eigenen Platzes, über das Wegenetz (kürzester Weg) und zur Mitte des Zielplatzes.
 */
export interface Punkt {
  x: number;
  y: number;
}
export interface BudenOrt {
  id: string;
  gasse: GasseId;
  /** Mitte unten der Bude (Bodenlinie). */
  x: number;
  boden: number;
  /** Hier steht die Figur vor der Bude. */
  vorne: Punkt;
}
export type PlatzId = GasseId | 'festplatz';
export interface Platz {
  id: PlatzId;
  name: string;
  farbe: string;
  /** Gepflasterte Fläche (Ellipse). */
  c: Punkt;
  rx: number;
  ry: number;
  /** Knoten im Wegenetz: Hier kommen die Wege an. */
  mitte: Punkt;
  /** Budenform auf diesem Platz. */
  form: Budenform;
}
export type Budenform = 'huette' | 'markt' | 'zelt' | 'wagen' | 'pavillon' | 'stern';

export const WELT_BREITE = 1640;
export const WELT_HOEHE = 3408;
export const BUDE_BREITE = 172;
export const BUDE_HOEHE = Math.round((BUDE_BREITE * 250) / 216);
/** Breite der Wege (für die Darstellung). */
export const WEG_BREITE = 64;
/** Mittelachse (Eingang, Treppe zum Sternenmarkt). */
export const ALLEE_X = WELT_BREITE / 2;
/** Weg über den Festplatz (Eingang, Riesenrad, Andenkenstand). */
export const FESTPLATZ_Y = 3180;
/** Eingang: hier beginnt die Figur. */
export const EINGANG: Punkt = { x: ALLEE_X, y: FESTPLATZ_Y };
export const ANDENKEN_X = ALLEE_X + 360;
export const RIESENRAD_X = ALLEE_X - 380;
/** Knobelzelt rechts neben dem Andenkenstand. */
export const KNOBEL_X = ALLEE_X + 610;
/** Fähranleger zur Bauinsel links auf dem Festplatz. */
export const FAEHRE_X = ALLEE_X - 650;
/** Tor am Fuß der Treppe zum Sternenmarkt. */
export const TOR: Punkt = { x: ALLEE_X, y: 800 };
/** Der Hügel des Sternenmarkts (für die Darstellung). */
export const HUEGEL = { c: { x: ALLEE_X, y: 470 }, rx: 640, ry: 360, oben: 300 } as const;

const gasse = (id: GasseId) => GASSEN.find((g) => g.id === id) ?? { name: id, farbe: '#888' };
const platz = (id: PlatzId, c: Punkt, rx: number, ry: number, mitte: Punkt, form: Budenform): Platz => ({
  id,
  name: id === 'festplatz' ? 'Festplatz' : gasse(id).name,
  farbe: id === 'festplatz' ? '#c9a96f' : gasse(id).farbe,
  c,
  rx,
  ry,
  mitte,
  form,
});

/**
 * Die Plätze. Der Hauptweg schlängelt sich vom Eingang hinauf zum Sternenmarkt; Zahlengasse, Größenmarkt und
 * Spiegelzelt liegen quer über dem Hauptweg, Musterbahn und Forscherplatz links und rechts davon.
 */
export const PLAETZE: readonly Platz[] = [
  platz('abendmarkt', { x: ALLEE_X, y: 450 }, 470, 150, { x: ALLEE_X, y: 540 }, 'stern'),
  platz('musterbahn', { x: 400, y: 1170 }, 370, 115, { x: 400, y: 1220 }, 'wagen'),
  platz('forschergasse', { x: 1240, y: 1170 }, 370, 115, { x: 1240, y: 1220 }, 'pavillon'),
  platz('spiegelzelt', { x: 640, y: 1640 }, 660, 120, { x: ALLEE_X, y: 1680 }, 'zelt'),
  platz('groessenmarkt', { x: 1000, y: 2120 }, 650, 120, { x: ALLEE_X, y: 2160 }, 'markt'),
  platz('zahlengasse', { x: ALLEE_X, y: 2620 }, 790, 170, { x: ALLEE_X, y: 2660 }, 'huette'),
  platz('festplatz', { x: ALLEE_X, y: FESTPLATZ_Y - 40 }, 770, 300, EINGANG, 'huette'),
];
export const platzVon = (id: PlatzId): Platz => PLAETZE.find((p) => p.id === id) as Platz;

/** Budenplätze je Platz (Mitte unten der Bude), in der Reihenfolge der Buden der Gasse. Hinten im Bogen, Front zum Platz. */
const STELLEN: Readonly<Record<GasseId, readonly [number, number][]>> = {
  abendmarkt: [[470, 440], [ALLEE_X, 370], [1170, 440]],
  musterbahn: [[200, 1090], [400, 1060], [600, 1090]],
  forschergasse: [[1040, 1090], [1240, 1060], [1440, 1090]],
  spiegelzelt: [[110, 1550], [290, 1520], [470, 1510], [650, 1530], [1000, 1530], [1180, 1550]],
  groessenmarkt: [[460, 2030], [650, 2000], [990, 2000], [1170, 1990], [1350, 1990], [1530, 2010]],
  zahlengasse: [[110, 2500], [290, 2480], [470, 2470], [650, 2490], [990, 2490], [1170, 2470], [1350, 2480], [1530, 2500], [110, 2750]],
};

export const BUDEN_ORTE: readonly BudenOrt[] = (Object.keys(STELLEN) as GasseId[]).flatMap((g) => {
  const ids = BUDEN.filter((b) => b.gasse === g).map((b) => b.id);
  const pl = platzVon(g);
  return ids.map((id, i) => {
    const [x, boden] = STELLEN[g][i] ?? [pl.c.x, pl.c.y];
    // Direkt vor der Theke, ein kleines Stück zur Platzmitte hin
    const vorne = { x: Math.round(x + Math.sign(pl.c.x - x) * Math.min(24, Math.abs(pl.c.x - x))), y: boden + 56 };
    return { id, gasse: g, x, boden, vorne };
  });
});
export const budenOrt = (id: string): BudenOrt | undefined => BUDEN_ORTE.find((o) => o.id === id);

/* ---------- Attraktionen: Karussells, Essbuden, Blickfänge ---------- */

export type AttraktionsArt =
  | 'kettenkarussell'
  | 'autoscooter'
  | 'schiffschaukel'
  | 'musikpavillon'
  | 'kinderkarussell'
  | 'zirkuszelt'
  | 'achterbahn'
  | 'brunnen'
  | 'fernrohr'
  | 'zuckerwatte'
  | 'popcorn'
  | 'crepes'
  | 'eis';
export interface Attraktion {
  id: AttraktionsArt;
  name: string;
  /** Mitte unten (Bodenlinie). */
  x: number;
  y: number;
  /** Breite der Grafik in Weltpixeln. */
  breite: number;
  /** Essbude: Preis in Talern. */
  preis?: number;
  /** Was die Figur dazu sagt. */
  lecker?: string;
}
export const ATTRAKTIONEN: readonly Attraktion[] = [
  { id: 'schiffschaukel', name: 'Schiffschaukel', x: 170, y: 780, breite: 220 },
  { id: 'achterbahn', name: 'Achterbahn', x: 1470, y: 800, breite: 320 },
  { id: 'eis', name: 'Eis', x: 1588, y: 1140, breite: 100, preis: 3, lecker: 'Hmm, Eis!' },
  { id: 'fernrohr', name: 'Fernrohr', x: 1600, y: 1290, breite: 80 },
  { id: 'kettenkarussell', name: 'Kettenkarussell', x: 1460, y: 1580, breite: 230 },
  { id: 'autoscooter', name: 'Autoscooter', x: 230, y: 2050, breite: 300 },
  { id: 'zuckerwatte', name: 'Zuckerwatte', x: 1580, y: 2270, breite: 110, preis: 3, lecker: 'Mmh, Zuckerwatte!' },
  { id: 'brunnen', name: 'Brunnen', x: 1260, y: 2240, breite: 130 },
  { id: 'kinderkarussell', name: 'Kinderkarussell', x: 1380, y: 2800, breite: 200 },
  { id: 'crepes', name: 'Crêpes', x: 1570, y: 2760, breite: 110, preis: 4, lecker: 'Lecker, ein Crêpe!' },
  { id: 'popcorn', name: 'Popcorn', x: 990, y: 2930, breite: 110, preis: 2, lecker: 'Knusper, Popcorn!' },
];
export const attraktion = (id: AttraktionsArt): Attraktion | undefined => ATTRAKTIONEN.find((a) => a.id === id);

/* ---------- Wegenetz ---------- */

type Knoten = 'fest' | 'zahl' | 'groesse' | 'spiegel' | 'band' | 'forscher' | 'muster' | 'tor' | 'stern';
const KNOTEN: Readonly<Record<Knoten, Punkt>> = {
  fest: EINGANG,
  zahl: platzVon('zahlengasse').mitte,
  groesse: platzVon('groessenmarkt').mitte,
  spiegel: platzVon('spiegelzelt').mitte,
  band: { x: ALLEE_X, y: 1220 },
  forscher: platzVon('forschergasse').mitte,
  muster: platzVon('musterbahn').mitte,
  tor: TOR,
  stern: platzVon('abendmarkt').mitte,
};
/** Knoten je Platz. */
const PLATZ_KNOTEN: Readonly<Record<PlatzId, Knoten>> = {
  festplatz: 'fest',
  zahlengasse: 'zahl',
  groessenmarkt: 'groesse',
  spiegelzelt: 'spiegel',
  forschergasse: 'forscher',
  musterbahn: 'muster',
  abendmarkt: 'stern',
};

/** Glatte Kurve durch Stützpunkte (Catmull-Rom), als Linienzug mit Punkten etwa alle 24 Weltpixel. */
function kurve(stuetzen: readonly Punkt[]): Punkt[] {
  const p = [stuetzen[0] as Punkt, ...stuetzen, stuetzen[stuetzen.length - 1] as Punkt];
  const aus: Punkt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]] as [Punkt, Punkt, Punkt, Punkt];
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 24));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      aus.push({ x: Math.round(f(p0.x, p1.x, p2.x, p3.x) * 10) / 10, y: Math.round(f(p0.y, p1.y, p2.y, p3.y) * 10) / 10 });
    }
  }
  aus.push(stuetzen[stuetzen.length - 1] as Punkt);
  return aus;
}

export interface Wegstueck {
  a: Knoten;
  b: Knoten;
  punkte: readonly Punkt[];
  /** Treppe hinauf zum Sternenmarkt. */
  treppe?: boolean;
}
const stueck = (a: Knoten, b: Knoten, zwischen: Punkt[] = [], treppe = false): Wegstueck => ({ a, b, punkte: kurve([KNOTEN[a], ...zwischen, KNOTEN[b]]), treppe });
export const WEGE: readonly Wegstueck[] = [
  stueck('fest', 'zahl', [{ x: 850, y: 2920 }]),
  stueck('zahl', 'groesse', [{ x: 790, y: 2430 }]),
  stueck('groesse', 'spiegel', [{ x: 852, y: 1950 }]),
  stueck('spiegel', 'band', [{ x: 790, y: 1470 }]),
  stueck('band', 'muster', [{ x: 610, y: 1250 }]),
  stueck('band', 'forscher', [{ x: 1030, y: 1250 }]),
  stueck('band', 'tor', [{ x: 850, y: 1000 }]),
  stueck('tor', 'stern', [], true),
];

/* ---------- Begehbar: Plätze und Wege ---------- */

/** Punkt in die Ellipse des Platzes ziehen (etwas Rand frei lassen). */
function imPlatz(pl: Platz, p: Punkt): Punkt {
  const dx = (p.x - pl.c.x) / (pl.rx * 0.92);
  const dy = (p.y - pl.c.y) / (pl.ry * 0.85);
  const d = Math.hypot(dx, dy);
  if (d <= 1) return { x: Math.round(p.x), y: Math.round(p.y) };
  const f = 0.97 / d;
  return { x: Math.round(pl.c.x + (p.x - pl.c.x) * f), y: Math.round(pl.c.y + (p.y - pl.c.y) * f) };
}
const imPlatzDrin = (pl: Platz, p: Punkt): boolean => Math.hypot((p.x - pl.c.x) / (pl.rx * 0.92), (p.y - pl.c.y) / (pl.ry * 0.85)) <= 1.0001;
/** Vor jeder Bude gehört ein Streifen zum Platz (dort steht die Figur, wenn sie hineingeht). */
const vorBude = (p: Punkt): Platz | undefined => {
  const o = BUDEN_ORTE.find((b) => Math.abs(p.x - b.x) <= 70 && p.y >= b.boden && p.y <= b.boden + 90);
  return o ? platzVon(o.gasse) : undefined;
};
/** Auf welchem Platz liegt ein Punkt? (Fläche des Platzes oder direkt vor einer seiner Buden) */
export const platzAn = (p: Punkt): Platz | undefined => PLAETZE.find((pl) => imPlatzDrin(pl, p)) ?? vorBude(p);

/** Nächster Punkt auf einem Linienzug: Index des Stücks und Punkt. */
function naechsterAufLinie(punkte: readonly Punkt[], p: Punkt): { i: number; q: Punkt; d: number } {
  let best = { i: 0, q: punkte[0] as Punkt, d: Infinity };
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1] as Punkt;
    const b = punkte[i] as Punkt;
    const lx = b.x - a.x;
    const ly = b.y - a.y;
    const l2 = lx * lx + ly * ly || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * lx + (p.y - a.y) * ly) / l2));
    const q = { x: a.x + lx * t, y: a.y + ly * t };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < best.d) best = { i, q: { x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 }, d };
  }
  return best;
}

/** Nächster begehbarer Punkt zu einem angetippten Punkt (auf einem Platz oder Weg). */
export function aufWeg(p: Punkt): Punkt {
  let best: Punkt = EINGANG;
  let d = Infinity;
  for (const pl of PLAETZE) {
    const q = imPlatz(pl, p);
    const dd = Math.hypot(q.x - p.x, q.y - p.y);
    if (dd < d) {
      d = dd;
      best = q;
    }
  }
  for (const w of WEGE) {
    const n = naechsterAufLinie(w.punkte, p);
    if (n.d < d) {
      d = n.d;
      best = n.q;
    }
  }
  if (vorBude(p)) return { x: Math.round(p.x), y: Math.round(p.y) };
  return best;
}

/** Wo liegt ein Punkt im Netz? Auf einem Platz oder auf einem Wegstück (mit Index). */
type Anker = { art: 'platz'; platz: Platz } | { art: 'weg'; w: Wegstueck; i: number };
function ankerVon(p: Punkt): Anker {
  const pl = platzAn(p);
  if (pl) return { art: 'platz', platz: pl };
  let best: { w: Wegstueck; i: number; d: number } | null = null;
  for (const w of WEGE) {
    const n = naechsterAufLinie(w.punkte, p);
    if (!best || n.d < best.d) best = { w, i: n.i, d: n.d };
  }
  return { art: 'weg', w: (best as { w: Wegstueck }).w, i: (best as { i: number }).i };
}

/** Kürzeste Wege im Netz (Dijkstra) von einem Knoten aus. */
const laenge = (w: readonly Punkt[]): number => w.reduce((s, q, i) => (i === 0 ? 0 : s + Math.hypot(q.x - (w[i - 1] as Punkt).x, q.y - (w[i - 1] as Punkt).y)), 0);
function netzweg(von: Knoten, nach: Knoten): Punkt[] {
  if (von === nach) return [KNOTEN[von]];
  const dist = new Map<Knoten, number>([[von, 0]]);
  const vorher = new Map<Knoten, { k: Knoten; w: Wegstueck }>();
  const offen = new Set<Knoten>(Object.keys(KNOTEN) as Knoten[]);
  while (offen.size) {
    let u: Knoten | undefined;
    for (const k of offen) if (dist.has(k) && (u === undefined || (dist.get(k) as number) < (dist.get(u) as number))) u = k;
    if (u === undefined || u === nach) break;
    offen.delete(u);
    for (const w of WEGE) {
      const v = w.a === u ? w.b : w.b === u ? w.a : undefined;
      if (!v || !offen.has(v)) continue;
      const neu = (dist.get(u) as number) + laenge(w.punkte);
      if (neu < (dist.get(v) ?? Infinity)) {
        dist.set(v, neu);
        vorher.set(v, { k: u, w });
      }
    }
  }
  const stuecke: Punkt[][] = [];
  let k: Knoten = nach;
  while (k !== von) {
    const v = vorher.get(k);
    if (!v) return [KNOTEN[von], KNOTEN[nach]];
    stuecke.unshift(v.w.a === v.k ? [...v.w.punkte] : [...v.w.punkte].reverse());
    k = v.k;
  }
  return stuecke.flatMap((s, i) => (i === 0 ? s : s.slice(1)));
}

/** Vom Punkt zu einem Knoten (über den eigenen Platz bzw. das eigene Wegstück). Mehrere Möglichkeiten mit Länge. */
function zuKnoten(p: Punkt, a: Anker): { k: Knoten; weg: Punkt[] }[] {
  if (a.art === 'platz') {
    const k = PLATZ_KNOTEN[a.platz.id];
    return [{ k, weg: [p, KNOTEN[k]] }];
  }
  const pts = a.w.punkte;
  return [
    { k: a.w.a, weg: [p, ...pts.slice(0, a.i).reverse()] },
    { k: a.w.b, weg: [p, ...pts.slice(a.i)] },
  ];
}

/** Doppelte und fast gleiche Punkte entfernen. */
const glatt = (w: Punkt[]): Punkt[] => w.filter((q, i) => i === 0 || Math.hypot(q.x - (w[i - 1] as Punkt).x, q.y - (w[i - 1] as Punkt).y) > 0.5);

/**
 * Weg von a nach b (beide begehbar). Auf demselben Platz: geradeaus. Sonst über die Wege, kürzeste Möglichkeit.
 */
export function weg(a: Punkt, b: Punkt): Punkt[] {
  if (Math.hypot(a.x - b.x, a.y - b.y) < 1) return [a];
  const aa = ankerVon(a);
  const ab = ankerVon(b);
  if (aa.art === 'platz' && ab.art === 'platz' && aa.platz.id === ab.platz.id) return [a, b];
  if (aa.art === 'weg' && ab.art === 'weg' && aa.w === ab.w) {
    const pts = aa.w.punkte;
    const mitte = aa.i <= ab.i ? pts.slice(aa.i, ab.i) : pts.slice(ab.i, aa.i).reverse();
    return glatt([a, ...mitte, b]);
  }
  let best: Punkt[] | null = null;
  for (const s of zuKnoten(a, aa))
    for (const z of zuKnoten(b, ab)) {
      const kandidat = glatt([...s.weg, ...netzweg(s.k, z.k).slice(1), ...[...z.weg].reverse().slice(1)]);
      if (!best || laenge(kandidat) < laenge(best)) best = kandidat;
    }
  return best ?? [a, b];
}

export const weglaenge = (w: readonly Punkt[]): number => laenge(w);

/** Liegt ein Punkt auf dem Hügel des Sternenmarkts (hinter dem Tor)? */
export const hinterDemTor = (p: Punkt): boolean => p.y < TOR.y - 4;

export type Laufrichtung = 'rechts' | 'links' | 'hoch' | 'runter';

const richtungVon = (a: Punkt, b: Punkt): Laufrichtung =>
  Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x >= a.x ? 'rechts' : 'links') : b.y < a.y ? 'hoch' : 'runter';

/** Position nach `strecke` Weltpixeln entlang des Weges, mit Laufrichtung des aktuellen Stücks. */
export function aufStrecke(w: readonly Punkt[], strecke: number): { p: Punkt; richtung: Laufrichtung } {
  let rest = Math.max(0, strecke);
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1] as Punkt;
    const b = w[i] as Punkt;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= l || i === w.length - 1) {
      const t = l === 0 ? 1 : Math.min(1, rest / l);
      return { p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, richtung: richtungVon(a, b) };
    }
    rest -= l;
  }
  const letzter = w[w.length - 1] ?? { x: 0, y: 0 };
  return { p: letzter, richtung: 'runter' };
}

/** Laufdauer: gemütlich, aber auch lange Wege dauern nie mehr als 4 Sekunden. */
export const laufdauerMs = (laenge: number): number => Math.min(4000, Math.max(350, (laenge / 340) * 1000));

/** Laternen entlang der Wege (alle ~420 Weltpixel), für Tag und Nacht. */
export const LATERNEN: readonly Punkt[] = WEGE.filter((w) => !w.treppe).flatMap((w) => {
  const aus: Punkt[] = [];
  let seit = 200;
  for (let i = 1; i < w.punkte.length; i++) {
    const a = w.punkte[i - 1] as Punkt;
    const b = w.punkte[i] as Punkt;
    seit += Math.hypot(b.x - a.x, b.y - a.y);
    if (seit >= 420 && !platzAn(b)) {
      seit = 0;
      // seitlich neben den Weg
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      aus.push({ x: Math.round(b.x + (nx / l) * 52), y: Math.round(b.y + (ny / l) * 52) });
    }
  }
  return aus;
});
