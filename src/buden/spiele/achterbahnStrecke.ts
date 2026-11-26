/**
 * Achterbahn-Architekt: Streckenprofile und Umrechnung von Metern auf die gezeichnete Schiene.
 * Die Schiene wird entlang ihrer Bogenlänge maßstäblich aufgeteilt: Ein 40-m-Stück ist auf der
 * Schiene genau doppelt so lang wie ein 20-m-Stück, egal ob es bergauf, bergab oder geradeaus geht.
 */

export type Punkt = { x: number; y: number };
type Abschnitt = { art: 'L'; zu: Punkt } | { art: 'C'; c1: Punkt; c2: Punkt; zu: Punkt };

export interface Profil {
  start: Punkt;
  /** Abschnitte bis zum Ziel (Bahnhof rechts). */
  bisZiel: Abschnitt[];
  /** Gerade Verlängerung hinter dem Ziel, damit zu lange Bahnen sichtbar über das Ziel hinausragen. */
  dahinter: Punkt;
}

/** Zeichenfläche 400 × 210, Boden bei y = 196, Bahnhöfe auf Höhe 170. */
export const BREITE = 400;
export const HOEHE = 210;
export const BODEN = 196;

const p = (x: number, y: number): Punkt => ({ x, y });
const C = (c1: Punkt, c2: Punkt, zu: Punkt): Abschnitt => ({ art: 'C', c1, c2, zu });
const L = (zu: Punkt): Abschnitt => ({ art: 'L', zu });

/** Drei Streckenformen zur Abwechslung: Anstieg, großes Gefälle, Hügel, Einfahrt ins Ziel. */
export const PROFILE: readonly Profil[] = [
  {
    start: p(14, 170),
    bisZiel: [L(p(58, 170)), C(p(88, 170), p(108, 36), p(138, 36)), C(p(168, 36), p(178, 176), p(212, 176)), C(p(242, 176), p(252, 108), p(274, 108)), C(p(294, 108), p(298, 170), p(318, 170))],
    dahinter: p(398, 170),
  },
  {
    start: p(14, 170),
    bisZiel: [L(p(54, 170)), C(p(84, 170), p(98, 50), p(124, 50)), C(p(150, 50), p(158, 160), p(184, 160)), C(p(206, 160), p(212, 84), p(236, 84)), C(p(262, 84), p(276, 172), p(300, 172)), L(p(318, 170))],
    dahinter: p(398, 170),
  },
  {
    start: p(14, 170),
    bisZiel: [L(p(58, 170)), C(p(92, 170), p(118, 28), p(150, 28)), C(p(186, 28), p(194, 176), p(228, 176)), C(p(258, 176), p(268, 132), p(288, 132)), C(p(304, 132), p(308, 170), p(318, 170))],
    dahinter: p(398, 170),
  },
];

export interface Strecke {
  /** Dicht abgetastete Punkte mit Bogenlänge `s` ab dem Start. */
  punkte: (Punkt & { s: number })[];
  /** Bogenlänge vom Start bis zum Ziel. */
  laengeZiel: number;
  /** Bogenlänge bis zum Ende der Verlängerung. */
  laengeGesamt: number;
}

const bezier = (a: Punkt, b: Punkt, c: Punkt, d: Punkt, t: number): Punkt => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
};

/** Profil in eine Punktkette mit Bogenlängen umwandeln. */
export function strecke(profil: Profil): Strecke {
  const roh: Punkt[] = [profil.start];
  let hier = profil.start;
  const abtasten = (ab: Abschnitt) => {
    if (ab.art === 'L') {
      const n = Math.max(2, Math.ceil(Math.hypot(ab.zu.x - hier.x, ab.zu.y - hier.y) / 2));
      for (let i = 1; i <= n; i++) roh.push({ x: hier.x + ((ab.zu.x - hier.x) * i) / n, y: hier.y + ((ab.zu.y - hier.y) * i) / n });
    } else {
      for (let i = 1; i <= 120; i++) roh.push(bezier(hier, ab.c1, ab.c2, ab.zu, i / 120));
    }
    hier = ab.zu;
  };
  profil.bisZiel.forEach(abtasten);
  const zielIndex = roh.length - 1;
  abtasten(L(profil.dahinter));
  const punkte: (Punkt & { s: number })[] = [];
  let s = 0;
  roh.forEach((q, i) => {
    const v = roh[i - 1];
    if (v) s += Math.hypot(q.x - v.x, q.y - v.y);
    punkte.push({ ...q, s });
  });
  return { punkte, laengeZiel: punkte[zielIndex]?.s ?? 0, laengeGesamt: s };
}

/** Punkt und Steigungswinkel (Grad) an der Bogenlänge `s`. */
export function punktBei(st: Strecke, s: number): Punkt & { winkel: number } {
  const z = Math.max(0, Math.min(st.laengeGesamt, s));
  const pk = st.punkte;
  let lo = 0;
  let hi = pk.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if ((pk[m]?.s ?? 0) < z) lo = m;
    else hi = m;
  }
  const a = pk[lo] ?? pk[0] ?? { x: 0, y: 0, s: 0 };
  const b = pk[hi] ?? a;
  const t = b.s > a.s ? (z - a.s) / (b.s - a.s) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, winkel: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

/** SVG-Pfad für das Schienenstück zwischen den Bogenlängen `von` und `bis`. */
export function stueckPfad(st: Strecke, von: number, bis: number): string {
  const a = Math.max(0, Math.min(st.laengeGesamt, von));
  const e = Math.max(a, Math.min(st.laengeGesamt, bis));
  const teile: Punkt[] = [punktBei(st, a), ...st.punkte.filter((q) => q.s > a && q.s < e), punktBei(st, e)];
  return teile.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
}

/** Meter (bzw. cm) auf Bogenlänge: Das Ziel liegt genau am Zielbahnhof. */
export const bogen = (st: Strecke, wert: number, ziel: number): number => (wert / Math.max(1, ziel)) * st.laengeZiel;

/** Stützen: alle paar Pixel von der Schiene bis zum Boden (nur wo die Schiene über dem Boden schwebt). */
export function stuetzen(st: Strecke, von: number, bis: number, abstand = 24): Punkt[] {
  const r: Punkt[] = [];
  for (let s = von + abstand / 2; s < Math.min(bis, st.laengeGesamt); s += abstand) {
    const q = punktBei(st, s);
    if (q.y < BODEN - 30) r.push(q);
  }
  return r;
}

/** Welche Streckenform zu einer Aufgabe gehört (fest je Aufgabe, damit sie beim Neuzeichnen gleich bleibt). */
export const profilFuer = (ziel: number, gebaut: number): Profil => PROFILE[(ziel + gebaut) % PROFILE.length] ?? PROFILE[0]!;

/**
 * Fahrgeschwindigkeit in Pixeln je Millisekunde: Am ersten Anstieg zieht ein Kettenlift langsam hoch,
 * danach ist der Wagen umso schneller, je tiefer er unter dem höchsten Punkt ist.
 */
export function tempo(st: Strecke, s: number): number {
  const gipfel = st.punkte.reduce((m, q) => (q.y < m.y ? q : m), st.punkte[0] ?? { x: 0, y: 0, s: 0 });
  if (s < gipfel.s) return s < 30 ? 0.18 : 0.14;
  const y = punktBei(st, s).y;
  return 0.16 + 0.03 * Math.sqrt(Math.max(0, y - gipfel.y));
}
