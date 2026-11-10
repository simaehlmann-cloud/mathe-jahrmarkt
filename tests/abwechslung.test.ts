import { describe, expect, it } from 'vitest';
import { BUDEN_DEFINITIONEN } from '../src/buden';
import { BUDEN, STUFEN, type Stufe } from '../src/domain/buden';
import { aufgabenSchluessel, fingerabdruck, leererVerlauf, merke, motiv, pruefeVerlauf, MERKE_AUFGABEN, type Verlauf } from '../src/domain/abwechslung';
import { Rundensteuerung } from '../src/domain/runde';
import { createRng } from '../src/domain/rng';
import type { Aufgabe } from '../src/domain/aufgaben/typen';

/** Spielt eine Runde mit lauter richtigen Antworten und liefert die zehn Hauptaufgaben. */
function runde(bude: string, stufe: Stufe, seed: number, verlauf?: Verlauf): { aufgaben: Aufgabe[]; verlauf: Verlauf } {
  const def = BUDEN_DEFINITIONEN[bude]!;
  const r = new Rundensteuerung({ bude, stufe, rng: createRng(seed), erzeuge: def.erzeuge, aehnlich: def.aehnlich, gewichtung: () => 1, verlauf });
  const aufgaben: Aufgabe[] = [r.aktuelle];
  for (;;) {
    r.antworte(r.aktuelle.antwort, 5000);
    const n = r.weiter();
    if (!n) break;
    aufgaben.push(n);
  }
  return { aufgaben, verlauf: r.verlauf };
}

const SPIELBAR = BUDEN.filter((b) => b.spielbar).map((b) => b.id);

describe('Abwechslung', () => {
  it('Fingerabdruck ist stabil und kurz', () => {
    expect(fingerabdruck('abc')).toBe(fingerabdruck('abc'));
    expect(fingerabdruck('abc')).not.toBe(fingerabdruck('abd'));
    expect(fingerabdruck('x'.repeat(5000)).length).toBeLessThanOrEqual(8);
  });

  it('keine Bude stellt in einer Runde dieselbe Aufgabe zweimal', () => {
    for (const bude of SPIELBAR) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 15; seed++) {
          const { aufgaben } = runde(bude, stufe, seed * 97);
          const schluessel = aufgaben.map(aufgabenSchluessel);
          expect(new Set(schluessel).size, `${bude} ${stufe} Seed ${seed}`).toBe(schluessel.length);
        }
      }
    }
  });

  it('dasselbe Motiv kommt nie direkt hintereinander (Formen, Schätzen, Kasse, Diagramme, Netze)', () => {
    for (const bude of SPIELBAR) {
      for (const stufe of STUFEN) {
        for (let seed = 1; seed <= 15; seed++) {
          const m = runde(bude, stufe, seed * 31).aufgaben.map(motiv);
          for (let i = 1; i < m.length; i++) {
            if (m[i] !== undefined) expect(m[i], `${bude} ${stufe} Seed ${seed}: ${m.join(' | ')}`).not.toBe(m[i - 1]);
          }
        }
      }
    }
  });

  it('Formen-Sortierer und Schätz-Bude: kein Motiv innerhalb von drei Aufgaben doppelt', () => {
    for (const [bude, stufe] of [['formensortierer', 'bronze'], ['formensortierer', 'silber'], ['schaetzbude', 'bronze'], ['schaetzbude', 'silber'], ['schaetzbude', 'gold']] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const m = runde(bude, stufe, seed).aufgaben.map(motiv);
        for (let i = 0; i < m.length; i++) {
          const fenster = m.slice(Math.max(0, i - 3), i);
          expect(fenster, `${bude} ${stufe} Seed ${seed}: ${m.join(' | ')}`).not.toContain(m[i]);
        }
      }
    }
  });

  it('die nächste Runde beginnt nicht mit den Motiven, mit denen die letzte aufhörte', () => {
    let v: Verlauf | undefined;
    let letzte: Aufgabe[] = [];
    for (let r = 0; r < 20; r++) {
      const e = runde('schaetzbude', 'bronze', 500 + r, v);
      if (letzte.length) {
        const ende = letzte.slice(-3).map(motiv);
        expect(ende, `Runde ${r}`).not.toContain(motiv(e.aufgaben[0]!));
      }
      letzte = e.aufgaben;
      v = e.verlauf;
    }
    expect(v!.k.length).toBe(MERKE_AUFGABEN);
  });

  it('Verlauf ist begrenzt und wird beim Laden geprüft', () => {
    const a = runde('dartbude', 'silber', 3).aufgaben[0]!;
    let v = leererVerlauf();
    for (let i = 0; i < 100; i++) v = merke(v, a);
    expect(v.k.length).toBe(MERKE_AUFGABEN);
    expect(pruefeVerlauf({ k: ['a', 3, 'x'.repeat(200)], m: 'kaputt' })).toEqual({ k: ['a'], m: [] });
    expect(pruefeVerlauf(null)).toBeUndefined();
  });

  it('Formen-Sortierer fragt auch nach Ecken, und die Antwort stimmt', () => {
    const rng = createRng(9);
    const def = BUDEN_DEFINITIONEN.formensortierer!;
    let ecken = 0;
    for (let i = 0; i < 200; i++) {
      const a = def.erzeuge('bronze', rng, () => 1);
      if (!a.text.includes('Ecken')) continue;
      ecken++;
      const name = String((a as { daten: Record<string, unknown> }).daten.name);
      const soll: Record<string, number> = { Dreieck: 3, Quadrat: 4, Rechteck: 4, Kreis: 0, Fünfeck: 5, Sechseck: 6 };
      expect(a.antwort - 10).toBe(soll[name]);
      expect(a.labels?.[a.antwort]).toBe(soll[name] === 0 ? 'keine Ecke' : `${soll[name]} Ecken`);
      expect(a.optionen.length).toBe(4);
    }
    expect(ecken).toBeGreaterThan(40);
  });
});
