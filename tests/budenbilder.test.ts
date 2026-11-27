import { describe, expect, it } from 'vitest';
import { PROFILE, bogen, punktBei, strecke, stueckPfad } from '../src/buden/spiele/achterbahnStrecke';
import { falte, flaechen } from '../src/domain/aufgaben/raum';

const laengeVon = (d: string): number => {
  const p = d.split(/[ML]/).filter(Boolean).map((x) => x.trim().split(' ').map(Number));
  return p.reduce((s, q, i) => (i ? s + Math.hypot((q[0] ?? 0) - (p[i - 1]?.[0] ?? 0), (q[1] ?? 0) - (p[i - 1]?.[1] ?? 0)) : 0), 0);
};

describe('Achterbahn-Strecke (Punkt 101)', () => {
  it('teilt die Schiene maßstäblich auf: 40 m sind doppelt so lang wie 20 m', () => {
    for (const profil of PROFILE) {
      const st = strecke(profil);
      const a = laengeVon(stueckPfad(st, bogen(st, 10, 100), bogen(st, 30, 100)));
      const b = laengeVon(stueckPfad(st, bogen(st, 40, 100), bogen(st, 80, 100)));
      expect(b / a).toBeCloseTo(2, 1);
    }
  });
  it('das Ziel liegt genau am Zielbahnhof, dahinter ist Platz für zu lange Bahnen', () => {
    for (const profil of PROFILE) {
      const st = strecke(profil);
      const z = punktBei(st, bogen(st, 150, 150));
      const letzter = profil.bisZiel[profil.bisZiel.length - 1]!.zu;
      expect(z.x).toBeCloseTo(letzter.x, 0);
      expect(z.y).toBeCloseTo(letzter.y, 0);
      expect(st.laengeGesamt).toBeGreaterThan(st.laengeZiel + 60);
    }
  });
  it('jede Strecke geht erst bergauf und dann bergab (echte Achterbahn)', () => {
    for (const profil of PROFILE) {
      const st = strecke(profil);
      const ys = st.punkte.filter((q) => q.s <= st.laengeZiel).map((q) => q.y);
      expect(Math.min(...ys)).toBeLessThan(80);
      expect(ys[ys.length - 1]).toBeGreaterThan(160);
    }
  });
});

describe('Würfelnetz falten (Punkt 102)', () => {
  it('gültiges Netz: sechs verschiedene Seiten', () => {
    const kreuz: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
    expect(falte(kreuz)).toBeDefined();
    expect(new Set(flaechen(kreuz)).size).toBe(6);
  });
  it('ungültiges Netz: Felder landen übereinander (für die rote Markierung)', () => {
    const reihe: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
    expect(falte(reihe)).toBeUndefined();
    expect(new Set(flaechen(reihe)).size).toBeLessThan(6);
  });
});

import { LANDSCHAFT, LUFT, WIESE, idx, leereInsel, raumUm, type InselStand } from '../src/domain/insel';

describe('Raum auf der Bauinsel (Punkt 111: Wände kürzen statt durchsichtig)', () => {
  const x0 = WIESE.x0 + 4;
  const y0 = WIESE.y0 + 4;
  const h = LANDSCHAFT.hoehe[idx(x0, y0)] ?? 0;
  /** Haus mit 3 × 3 Innenraum; Wände `hoch` Ebenen, optional mit Dach und Lücke. */
  const haus = (hoch: number, dach = false, luecke = false): InselStand => {
    const s = leereInsel();
    for (let y = y0 - 1; y <= y0 + 3; y++)
      for (let x = x0 - 1; x <= x0 + 3; x++) {
        const rand = x === x0 - 1 || x === x0 + 3 || y === y0 - 1 || y === y0 + 3;
        if (luecke && x === x0 + 1 && y === y0 + 3) continue;
        const st: number[] = [];
        if (rand) for (let z = 0; z < hoch; z++) st.push(1);
        if (dach) {
          while (st.length < 3) st.push(LUFT);
          st.push(1);
        }
        s.stapel[idx(x, y)] = st;
      }
    return s;
  };
  const mitte = (s: InselStand) => raumUm(s, x0 + 1, y0 + 1, h);
  it('Haus mit hohen Mauern (ohne Dach) ist ein Raum mit 9 Feldern', () => {
    expect(mitte(haus(4))?.size).toBe(9);
  });
  it('Haus mit Dach ist ein Raum', () => {
    expect(mitte(haus(2, true))?.size).toBe(9);
  });
  it('Eine Lücke in der Wand führt ins Freie: kein Raum', () => {
    expect(mitte(haus(4, false, true))).toBeNull();
  });
  it('Niedrige Mauer ohne Dach (wie ein Zaun-Garten): kein Raum', () => {
    expect(mitte(haus(1))).toBeNull();
  });
  it('Unter einem Vordach im Freien: kein Raum', () => {
    const s = leereInsel();
    s.stapel[idx(x0, y0)] = [LUFT, LUFT, 1];
    expect(raumUm(s, x0, y0, h)).toBeNull();
  });
});
