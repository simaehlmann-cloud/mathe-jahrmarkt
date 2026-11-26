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
