import { BUDEN, GASSEN, type GasseId } from './buden';

/**
 * Begehbarer Jahrmarkt: feste Karte in Weltkoordinaten.
 * Aufbau wie ein Kamm: eine Hauptallee in der Mitte, von der Querwege (Reihen) abgehen.
 * Unten der Festplatz mit Eingang und Riesenrad, ganz oben hinter dem Zaun der Sternenmarkt.
 * Jeder Ort auf den Wegen ist entweder auf der Allee oder auf einer Reihe;
 * der Weg zwischen zwei Orten führt daher immer über die Allee.
 */

export interface Punkt {
  x: number;
  y: number;
}

export interface Reihe {
  index: number;
  gasse: GasseId | 'festplatz';
  /** Höhe des Weges. */
  y: number;
  /** Buden der Reihe von links nach rechts. */
  buden: string[];
}

export interface BudenOrt {
  id: string;
  gasse: GasseId;
  reihe: number;
  /** Mitte unten der Bude (Bodenlinie). */
  x: number;
  boden: number;
  /** Hier steht die Figur vor der Bude. */
  vorne: Punkt;
}

export const WELT_BREITE = 1640;
export const BUDE_BREITE = 172;
export const BUDE_HOEHE = Math.round((BUDE_BREITE * 250) / 216);
const ABSTAND = 210;
const ALLEE_BREITE = 260;
export const ALLEE_X = WELT_BREITE / 2;
const REIHEN_ABSTAND = 360;
const OBEN = 330;
/** Zusätzlicher Platz unter dem Sternenmarkt für Zaun und Tor. */
const ZAUN_PLATZ = 170;
export const FESTPLATZ_HOEHE = 760;
/** Breite des Weges (für die Darstellung). */
export const WEG_BREITE = 64;

/** Reihen von oben (Sternenmarkt) nach unten. Die Zahlengasse hat zwei Reihen. */
const AUFTEILUNG: { gasse: GasseId; buden: string[] }[] = (() => {
  const von = (g: GasseId) => BUDEN.filter((b) => b.gasse === g).map((b) => b.id);
  const zahl = von('zahlengasse');
  return [
    { gasse: 'abendmarkt', buden: von('abendmarkt') },
    { gasse: 'musterbahn', buden: von('musterbahn') },
    { gasse: 'forschergasse', buden: von('forschergasse') },
    { gasse: 'spiegelzelt', buden: von('spiegelzelt') },
    { gasse: 'groessenmarkt', buden: von('groessenmarkt') },
    { gasse: 'zahlengasse', buden: zahl.slice(5) },
    { gasse: 'zahlengasse', buden: zahl.slice(0, 5) },
  ];
})();

/** Musterbahn und Forschergasse teilen sich eine Reihe (links und rechts der Allee). */
function baueReihen(): Reihe[] {
  const reihen: Reihe[] = [];
  let i = 0;
  for (let k = 0; k < AUFTEILUNG.length; k++) {
    const a = AUFTEILUNG[k];
    if (!a) continue;
    if (a.gasse === 'musterbahn') {
      const f = AUFTEILUNG[k + 1];
      reihen.push({ index: i, gasse: 'musterbahn', y: OBEN + i * REIHEN_ABSTAND + (i > 0 ? ZAUN_PLATZ : 0), buden: [...a.buden, ...(f?.buden ?? [])] });
      k++;
    } else {
      reihen.push({ index: i, gasse: a.gasse, y: OBEN + i * REIHEN_ABSTAND + (i > 0 ? ZAUN_PLATZ : 0), buden: a.buden });
    }
    i++;
  }
  return reihen;
}

export const REIHEN: readonly Reihe[] = baueReihen();
const letzteReihe = REIHEN[REIHEN.length - 1] as Reihe;
/** Weg über den Festplatz (Eingang, Riesenrad, Andenkenstand). */
export const FESTPLATZ_Y = letzteReihe.y + FESTPLATZ_HOEHE * 0.7;
export const WELT_HOEHE = letzteReihe.y + FESTPLATZ_HOEHE;
/** Eingang: hier beginnt die Figur. */
export const EINGANG: Punkt = { x: ALLEE_X, y: FESTPLATZ_Y };
export const ANDENKEN_X = ALLEE_X + 360;
export const RIESENRAD_X = ALLEE_X - 380;
/** Tor im Zaun vor dem Sternenmarkt (auf der Allee). */
export const TOR: Punkt = { x: ALLEE_X, y: OBEN + ZAUN_PLATZ };
/** Die Allee reicht vom Festplatz bis zum Sternenmarkt. */
const ALLEE_OBEN = (REIHEN[0] as Reihe).y;

/** x-Position der i-ten Bude einer Reihe mit n Buden: links und rechts der Allee verteilt. */
function budenX(i: number, n: number): number {
  const links = Math.ceil(n / 2);
  if (i < links) return ALLEE_X - ALLEE_BREITE / 2 - ABSTAND / 2 - (links - 1 - i) * ABSTAND;
  return ALLEE_X + ALLEE_BREITE / 2 + ABSTAND / 2 + (i - links) * ABSTAND;
}

export const BUDEN_ORTE: readonly BudenOrt[] = REIHEN.flatMap((r) =>
  r.buden.map((id, i) => {
    const x = budenX(i, r.buden.length);
    const gasse = BUDEN.find((b) => b.id === id)?.gasse ?? (r.gasse as GasseId);
    return { id, gasse, reihe: r.index, x, boden: r.y - WEG_BREITE / 2 + 6, vorne: { x, y: r.y } };
  }),
);

export const budenOrt = (id: string): BudenOrt | undefined => BUDEN_ORTE.find((o) => o.id === id);

/** Linke und rechte Grenze einer Reihe (Weg). */
export function reihenSpanne(r: Reihe): [number, number] {
  const xs = r.buden.map((_, i) => budenX(i, r.buden.length));
  return [Math.min(ALLEE_X, ...xs) - 60, Math.max(ALLEE_X, ...xs) + 60];
}

/** Gassennamen für die Straßenschilder, je Reihe. */
export function reihenSchilder(): { reihe: Reihe; name: string; farbe: string; seite: 'links' | 'rechts' }[] {
  const liste: { reihe: Reihe; name: string; farbe: string; seite: 'links' | 'rechts' }[] = [];
  for (const r of [...REIHEN].reverse()) {
    const ids = new Set(r.buden.map((id) => BUDEN.find((b) => b.id === id)?.gasse));
    for (const g of GASSEN) {
      if (!ids.has(g.id)) continue;
      const erste = r.buden.findIndex((id) => BUDEN.find((b) => b.id === id)?.gasse === g.id);
      const seite = erste >= Math.ceil(r.buden.length / 2) ? 'rechts' : 'links';
      liste.push({ reihe: r, name: g.name, farbe: g.farbe, seite });
    }
  }
  return liste;
}

/* ---------- Wege ---------- */

/** Ein Ort auf dem Wegenetz: auf einer Reihe (y fest) oder auf der Allee (x fest). */
export type Wegort = { art: 'reihe'; y: number; x: number } | { art: 'allee'; y: number };

const ALLE_WEGE_Y = [...REIHEN.map((r) => r.y), FESTPLATZ_Y];

/** Nächster Punkt auf dem Wegenetz zu einem angetippten Punkt. */
export function aufWeg(p: Punkt): Punkt {
  // Kandidaten: senkrecht auf die Allee, waagerecht auf jede Reihe
  const kandidaten: Punkt[] = [{ x: ALLEE_X, y: Math.min(FESTPLATZ_Y, Math.max(ALLEE_OBEN, p.y)) }];
  for (const r of REIHEN) {
    const [l, re] = reihenSpanne(r);
    kandidaten.push({ x: Math.min(re, Math.max(l, p.x)), y: r.y });
  }
  kandidaten.push({ x: Math.min(WELT_BREITE - 120, Math.max(120, p.x)), y: FESTPLATZ_Y });
  let best = kandidaten[0] as Punkt;
  let d = Infinity;
  for (const k of kandidaten) {
    const dd = (k.x - p.x) ** 2 + (k.y - p.y) ** 2;
    if (dd < d) {
      d = dd;
      best = k;
    }
  }
  return best;
}

const aufAllee = (p: Punkt): boolean => Math.abs(p.x - ALLEE_X) < 1;
const aufQuerweg = (p: Punkt): boolean => ALLE_WEGE_Y.some((y) => Math.abs(p.y - y) < 1);

/**
 * Weg von a nach b über das Wegenetz (beide Punkte liegen auf Wegen).
 * Gleiche Reihe: geradeaus. Sonst: zur Allee, die Allee entlang, in die Zielreihe.
 */
export function weg(a: Punkt, b: Punkt): Punkt[] {
  if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) return [a];
  if (Math.abs(a.y - b.y) < 1 && aufQuerweg(a)) return [a, b];
  if (aufAllee(a) && aufAllee(b)) return [a, b];
  const punkte: Punkt[] = [a];
  if (!aufAllee(a)) punkte.push({ x: ALLEE_X, y: a.y });
  if (!aufAllee(b)) punkte.push({ x: ALLEE_X, y: b.y });
  punkte.push(b);
  // doppelte Punkte entfernen
  return punkte.filter((p, i) => i === 0 || Math.abs(p.x - (punkte[i - 1] as Punkt).x) + Math.abs(p.y - (punkte[i - 1] as Punkt).y) > 0.5);
}

export const weglaenge = (w: readonly Punkt[]): number =>
  w.reduce((s, p, i) => (i === 0 ? 0 : s + Math.hypot(p.x - (w[i - 1] as Punkt).x, p.y - (w[i - 1] as Punkt).y)), 0);

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

/** Laufdauer: gemütlich, aber nie länger als 3,5 Sekunden. */
export const laufdauerMs = (laenge: number): number => Math.min(3500, Math.max(350, (laenge / 300) * 1000));
