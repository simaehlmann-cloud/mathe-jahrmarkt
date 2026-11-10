import { describe, expect, it } from 'vitest';
import { alleLoesungen, forscheraufgabe, forscherRunde, mauerSpitze, pruefeLoesung, type LoesungsAufgabe } from '../src/domain/forscher';
import { createRng } from '../src/domain/rng';

const rng = createRng(11);
const los = (regel: LoesungsAufgabe['regel']) => forscheraufgabe(regel, rng) as LoesungsAufgabe;

describe('Forscheraufgaben', () => {
  it('Malaufgaben: Tauschaufgaben zählen als dieselbe, falsche werden erklärt', () => {
    const a = { ...los('produkt'), ziel: 24 };
    const p1 = pruefeLoesung(a, [3, 8]);
    const p2 = pruefeLoesung(a, [8, 3]);
    expect(p1.ok && p2.ok && p1.schluessel === p2.schluessel).toBe(true);
    const f = pruefeLoesung(a, [5, 5]);
    expect(f.ok).toBe(false);
    expect(alleLoesungen(a)).toEqual(['1 · 24', '2 · 12', '3 · 8', '4 · 6']);
  });
  it('gerade Paare, Unterschied und Mauer', () => {
    const g = { ...los('summeGerade'), ziel: 20 };
    expect(pruefeLoesung(g, [8, 12]).ok).toBe(true);
    expect(pruefeLoesung(g, [9, 11]).ok).toBe(false);
    expect(alleLoesungen(g)).toHaveLength(6);
    const d = { ...los('differenz'), ziel: 9 };
    expect(pruefeLoesung(d, [20, 11]).ok).toBe(true);
    expect(pruefeLoesung(d, [11, 20]).ok).toBe(false);
    const m = { ...los('mauer'), ziel: 20 };
    expect(mauerSpitze(4, 5, 6)).toBe(20);
    const a = pruefeLoesung(m, [4, 5, 6]);
    const b = pruefeLoesung(m, [6, 5, 4]);
    expect(a.ok && b.ok && a.schluessel === b.schluessel).toBe(true);
  });
  it('jede Aufgabe ist lösbar: genug verschiedene Lösungen', () => {
    for (let i = 0; i < 200; i++)
      for (const a of forscherRunde(rng)) {
        if (a.art === 'geschichten') {
          expect(a.geschichten.some((g) => g.passt)).toBe(true);
          expect(a.geschichten.some((g) => !g.passt)).toBe(true);
          continue;
        }
        const l = alleLoesungen(a);
        if (l) expect(l.length).toBeGreaterThanOrEqual(a.gesucht);
        if (a.regel === 'mauer') expect(pruefeLoesung(a, [1, 1, a.ziel - 3]).ok).toBe(true);
      }
  });
});

import { KARTEN } from '../src/domain/belohnungen';
import { ALLGEMEINE_FAKTEN, BUDEN_FAKTEN } from '../src/domain/fakten';
describe('Sammelkarten-Rückseiten', () => {
  it('jede Karte hat einen eigenen Mathe-Fakt', () => {
    for (const k of KARTEN) {
      const f = k.id.startsWith('bude:') ? BUDEN_FAKTEN[k.id.slice(5)] : ALLGEMEINE_FAKTEN[k.id];
      expect(f, k.id).toBeTruthy();
    }
  });
});
