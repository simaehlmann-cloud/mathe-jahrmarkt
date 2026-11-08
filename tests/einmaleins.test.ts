import { describe, expect, it } from 'vitest';
import { aehnlicheAufgabe, einmaleinsAufgabe, faktenDerStufe, istKern, zerlegung } from '../src/domain/aufgaben/einmaleins';
import { STUFEN } from '../src/domain/buden';
import { createRng } from '../src/domain/rng';

const N = 10_000;

describe('Einmaleins-Generator', () => {
  for (const stufe of STUFEN) {
    it(`${stufe}: ${N} Aufgaben sind mathematisch korrekt und gut gebaut`, () => {
      const rng = createRng(1000 + STUFEN.indexOf(stufe));
      for (let i = 0; i < N; i++) {
        const a = einmaleinsAufgabe(stufe, rng);
        // Faktoren im kleinen 1×1
        expect(a.a).toBeGreaterThanOrEqual(1);
        expect(a.a).toBeLessThanOrEqual(10);
        expect(a.b).toBeGreaterThanOrEqual(1);
        expect(a.b).toBeLessThanOrEqual(10);
        // Ergebnis stimmt
        if (a.art === 'mal') expect(a.antwort).toBe(a.a * a.b);
        else expect(a.antwort * a.a).toBe(a.a * a.b);
        // Bronze nur Kernaufgaben, nur Mal
        if (stufe === 'bronze') {
          expect(istKern(a.a, a.b)).toBe(true);
          expect(a.art).toBe('mal');
        }
        if (stufe === 'silber') expect(a.art).toBe('mal');
        // Genau 4 Optionen, verschieden, positiv, genau eine richtig
        expect(a.optionen).toHaveLength(4);
        const werte = a.optionen.map((o) => o.wert);
        expect(new Set(werte).size).toBe(4);
        expect(werte.every((w) => Number.isInteger(w) && w > 0)).toBe(true);
        expect(werte.filter((w) => w === a.antwort)).toHaveLength(1);
        // Falsche Optionen tragen eine Fehlerart, die richtige nicht
        for (const o of a.optionen) {
          if (o.wert === a.antwort) expect(o.fehlerArt).toBeUndefined();
          else expect(o.fehlerArt).toBeDefined();
        }
        // Text passt zur Rechenart (Malpunkt und Geteiltzeichen nach KC)
        if (a.art === 'mal') expect(a.text).toMatch(/^\d+ · \d+$/);
        if (a.art === 'geteilt') expect(a.text).toMatch(/^\d+ : \d+$/);
        if (a.art === 'platzhalter') expect(a.text).toMatch(/^\d+ · _ = \d+$/);
      }
    });
  }

  it('„um 10 daneben“ nur bei Ergebnissen ab 20, sonst wäre der Hinweis „Fast!“ falsch', () => {
    const rng = createRng(21);
    for (let i = 0; i < 5000; i++) {
      const a = einmaleinsAufgabe('silber', rng);
      for (const o of a.optionen) {
        if (o.fehlerArt === 'zehner') {
          expect(a.antwort).toBeGreaterThanOrEqual(20);
          expect(Math.abs(o.wert - a.antwort)).toBe(10);
        }
      }
    }
  });

  it('Gold enthält alle drei Rechenarten', () => {
    const rng = createRng(7);
    const arten = new Set(Array.from({ length: 500 }, () => einmaleinsAufgabe('gold', rng).art));
    expect(arten).toEqual(new Set(['mal', 'geteilt', 'platzhalter']));
  });

  it('Silber deckt alle 100 Fakten ab', () => {
    expect(faktenDerStufe('silber')).toHaveLength(100);
    expect(faktenDerStufe('bronze').every((f) => istKern(f.a, f.b))).toBe(true);
  });

  it('Distraktoren enthalten typische Fehlvorstellungen', () => {
    const rng = createRng(3);
    let nachbar = 0;
    for (let i = 0; i < 1000; i++) {
      const a = einmaleinsAufgabe('silber', rng);
      if (a.optionen.some((o) => o.fehlerArt === 'nachbaraufgabe')) nachbar++;
    }
    expect(nachbar).toBeGreaterThan(950);
  });

  it('ähnliche Aufgabe bleibt in der Reihe und im Bereich', () => {
    const rng = createRng(11);
    for (let i = 0; i < 2000; i++) {
      const a = einmaleinsAufgabe('gold', rng);
      const n = aehnlicheAufgabe(a, rng);
      expect(n.art).toBe(a.art);
      const reihen = [n.a, n.b];
      expect(reihen.includes(a.a)).toBe(true);
      expect(n.a * n.b).not.toBe(a.a * a.b);
    }
  });

  it('Zerlegung: Produkt stimmt, abgeleitete Aufgaben aus Kernaufgaben', () => {
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        const z = zerlegung(a, b);
        expect(z.zeilen * z.spalten).toBe(a * b);
        expect(z.teile.reduce((s, x) => s + x, 0)).toBe(z.zeilen);
        if (istKern(a, b)) {
          // Kernaufgaben werden nicht zerlegt, gezählt wird in Schritten der Kernzahl
          expect(z.teile).toHaveLength(1);
          expect([1, 2, 5, 10]).toContain(z.spalten);
        } else {
          expect(z.teile).toHaveLength(2);
          expect([1, 2, 5, 10]).toContain(z.teile[0]);
        }
      }
    }
    expect(zerlegung(7, 8).teile).toEqual([5, 2]);
    expect(zerlegung(8, 1)).toEqual({ zeilen: 8, spalten: 1, teile: [8] });
    expect(zerlegung(10, 7)).toEqual({ zeilen: 7, spalten: 10, teile: [7] });
  });

  it('ist mit gleichem Seed reproduzierbar', () => {
    const x = Array.from({ length: 20 }, ((r) => () => einmaleinsAufgabe('gold', r).text)(createRng(42)));
    const y = Array.from({ length: 20 }, ((r) => () => einmaleinsAufgabe('gold', r).text)(createRng(42)));
    expect(x).toEqual(y);
  });
});
