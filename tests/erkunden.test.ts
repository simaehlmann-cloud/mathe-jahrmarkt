import { describe, expect, it } from 'vitest';
import { baueGluecksrad, baueLageplan, baueWuerfel, feld, obenAnsicht, vorneAnsicht, wuerfelSumme, type PlanOrt } from '../src/domain/aufgaben/erkunden';
import { STUFEN } from '../src/domain/buden';
import { createRng } from '../src/domain/rng';

const N = 400;

describe('Würfelbauer', () => {
  it('Ansichten und Summe', () => {
    const h = [
      [2, 1, 3],
      [3, 0, 1],
    ];
    expect(wuerfelSumme(h)).toBe(10);
    expect(vorneAnsicht(h)).toBe(3 + 1 + 3);
    expect(obenAnsicht(h)).toBe(5);
  });
  it('Antwort passt zu Bauplan und Frage, Optionen eindeutig', () => {
    const rng = createRng(3);
    for (const s of STUFEN)
      for (let i = 0; i < N; i++) {
        const a = baueWuerfel(s, rng);
        const h = a.daten.hoehen as number[][];
        expect(h[0]?.every((z) => z > 0), 'vorne keine Lücke').toBe(true);
        const erwartet =
          a.form === 'vorne' ? vorneAnsicht(h) : a.form === 'oben' ? obenAnsicht(h) : a.form === 'quader' ? (h[0]?.length ?? 0) * h.length * Math.max(...h.flat()) - wuerfelSumme(h) : wuerfelSumme(h);
        expect(a.antwort).toBe(erwartet);
        expect(a.antwort).toBeGreaterThan(0);
        expect(new Set(a.optionen.map((o) => o.wert)).size).toBe(a.optionen.length);
        expect(a.optionen.length).toBeGreaterThanOrEqual(3);
      }
  });
});

describe('Lageplan', () => {
  it('Feldnamen', () => {
    expect(feld(0, 0)).toBe('A1');
    expect(feld(3, 2)).toBe('D3');
  });
  it('richtige Antwort stimmt mit dem Plan überein', () => {
    const rng = createRng(5);
    for (const s of STUFEN)
      for (let i = 0; i < N; i++) {
        const a = baueLageplan(s, rng);
        const orte = a.daten.orte as PlanOrt[];
        // keine zwei Orte im selben Feld
        expect(new Set(orte.map((o) => feld(o.x, o.y))).size).toBe(orte.length);
        const richtig = a.labels?.[a.antwort];
        if (a.form === 'wo') expect(orte.some((o) => feld(o.x, o.y) === richtig && a.text.includes(o.name))).toBe(true);
        if (a.form === 'was') expect(orte.find((o) => o.name === richtig) && a.text.includes(feld(...((): [number, number] => { const o = orte.find((x) => x.name === richtig)!; return [o.x, o.y]; })()))).toBeTruthy();
        if (a.form === 'weg') {
          // Weg nachgehen
          const [sx, sy] = a.daten.start as [number, number];
          let x = sx;
          let y = sy;
          for (const m of a.text.matchAll(/(\d+) Feld(?:er)? nach (rechts|links|oben|unten)/g)) {
            const n = Number(m[1]);
            if (m[2] === 'rechts') x += n;
            if (m[2] === 'links') x -= n;
            if (m[2] === 'oben') y -= n;
            if (m[2] === 'unten') y += n;
          }
          expect(orte.find((o) => o.x === x && o.y === y)?.name).toBe(richtig);
          // die anderen Antworten sind andere Orte
          expect(new Set(Object.values(a.labels ?? {})).size).toBe(a.optionen.length);
        }
        if (a.form === 'massstab') {
          const [x1, y1, x2, y2] = a.daten.linie as number[];
          expect(x1 === x2 || y1 === y2).toBe(true);
          expect(a.antwort).toBe((Math.abs(x1! - x2!) + Math.abs(y1! - y2!)) * (a.daten.massstab as number));
        }
      }
  });
});

describe('Glücksrad', () => {
  it('Antworten stimmen mit den Feldern überein', () => {
    const rng = createRng(8);
    for (const s of STUFEN)
      for (let i = 0; i < N; i++) {
        const a = baueGluecksrad(s, rng);
        const felder = (a.daten.felder as number[] | undefined) ?? [];
        const zahl = (f: number) => felder.filter((x) => x === f).length;
        const richtig = a.labels?.[a.antwort];
        if (a.form === 'meist') {
          const max = Math.max(zahl(0), zahl(1), zahl(2));
          expect([0, 1, 2].filter((f) => zahl(f) === max)).toHaveLength(1);
          expect(['rot', 'blau', 'gelb'][[0, 1, 2].find((f) => zahl(f) === max)!]).toBe(richtig);
        }
        if (a.form === 'moeglich') {
          const farbe = ['rot', 'blau', 'gelb'].findIndex((n) => a.text.includes(` ${n} `));
          const art = zahl(farbe) === felder.length ? 'sicher' : zahl(farbe) === 0 ? 'unmöglich' : 'möglich';
          expect(richtig).toBe(art);
        }
        if (a.form === 'fair') {
          expect(zahl(0) + a.antwort).toBe(zahl(1));
          expect(zahl(2)).toBeGreaterThanOrEqual(a.antwort);
        }
        if (a.form === 'anteil') expect(a.antwort).toBe(zahl(0));
        if (a.form === 'strichliste') {
          const [rot, blau] = a.daten.striche as [number, number];
          const raeder = a.daten.raeder as number[][];
          // Das richtige Rad liegt am nächsten an der beobachteten Häufigkeit
          const abstand = raeder.map((r) => Math.abs(r.filter((x) => x === 0).length / r.length - rot / (rot + blau)));
          const bester = abstand.indexOf(Math.min(...abstand));
          expect(richtig).toBe(`Rad ${'ABC'[bester]}`);
        }
        expect(a.optionen.every((o) => o.wert > 0)).toBe(true);
      }
  });
});
