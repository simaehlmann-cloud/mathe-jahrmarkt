import { describe, expect, it } from 'vitest';
import { turboAufgabe } from '../src/domain/aufgaben/einmaleins';
import { ausBausteinen, baueStellenwert, stellenwertAufgabe, stellenwertProbe, typischeFehler, zahlText } from '../src/domain/aufgaben/stellenwert';
import { STUFEN } from '../src/domain/buden';
import { zahlInWorten } from '../src/domain/elternsperre';
import { createRng } from '../src/domain/rng';
import { Rundensteuerung } from '../src/domain/runde';

describe('Dosenwerfen: Stellenwert-Aufgaben', () => {
  it('jede Aufgabe hat genau eine richtige, verschiedene, positive Dosen', () => {
    const rng = createRng(11);
    for (const stufe of STUFEN) {
      for (let i = 0; i < 400; i++) {
        const a = stellenwertAufgabe(stufe, rng);
        const werte = a.optionen.map((o) => o.wert);
        expect(new Set(werte).size).toBe(4);
        expect(werte.filter((w) => w === a.antwort)).toHaveLength(1);
        expect(werte.every((w) => Number.isInteger(w) && w > 0)).toBe(true);
        expect(a.optionen.find((o) => o.wert === a.antwort)?.fehlerArt).toBeUndefined();
        expect(a.optionen.filter((o) => o.wert !== a.antwort).every((o) => o.fehlerArt)).toBe(true);
      }
    }
  });

  it('Zahlenraum passt zur Stufe', () => {
    const rng = createRng(3);
    const max = { bronze: 999, silber: 99_999, gold: 999_999 } as const;
    for (const stufe of STUFEN) {
      for (let i = 0; i < 300; i++) {
        const a = stellenwertAufgabe(stufe, rng);
        expect(a.antwort).toBeLessThanOrEqual(max[stufe]);
        expect(a.zahl).toBeLessThanOrEqual(max[stufe]);
      }
    }
  });

  it('Stellentafel und Bündeln ergeben die richtige Zahl', () => {
    const rng = createRng(5);
    for (let i = 0; i < 300; i++) {
      for (const form of ['tafel', 'buendeln'] as const) {
        const a = baueStellenwert(form, i % 2 ? 'silber' : 'gold', i % 3 === 0, rng);
        expect(ausBausteinen(a.bausteine)).toBe(a.antwort);
        if (form === 'buendeln') expect(a.bausteine.some((b) => b.anzahl >= 10)).toBe(true);
      }
    }
  });

  it('Zahlwort und Ziffernwert stimmen', () => {
    const rng = createRng(8);
    for (let i = 0; i < 200; i++) {
      const w = baueStellenwert('wort', 'gold', i % 2 === 0, rng);
      expect(zahlInWorten(w.antwort)).toBe(w.text);
      const z = baueStellenwert('ziffer', 'silber', false, rng);
      const ziffer = Number(/der (\d)/.exec(z.text)?.[1]);
      expect(z.antwort / ziffer).toBe(10 ** Math.round(Math.log10(z.antwort / ziffer)));
      expect(String(z.zahl)).toContain(String(ziffer));
    }
  });

  it('typische Fehler: Null vergessen, wie gesprochen, nicht entbündelt', () => {
    const f = typischeFehler('tafel', 3050, [{ stelle: 3, anzahl: 3 }, { stelle: 1, anzahl: 5 }], 3050).map((x) => x.wert);
    expect(f).toContain(35);
    expect(f).toContain(300050);
    const b = typischeFehler('buendeln', 5350, [{ stelle: 3, anzahl: 4 }, { stelle: 2, anzahl: 13 }, { stelle: 1, anzahl: 5 }], 5350).map((x) => x.wert);
    expect(b).toContain(41350);
    expect(b).toContain(4350);
  });

  it('Zahlwörter bis eine Million', () => {
    expect(zahlInWorten(21_000)).toBe('einundzwanzigtausend');
    expect(zahlInWorten(101_001)).toBe('einhunderteintausendeins');
    expect(zahlInWorten(3050)).toBe('dreitausendfünfzig');
    expect(zahlText(305350)).toBe('305 350');
  });

  it('Probewurf ist leicht und richtig gebaut', () => {
    const p = stellenwertProbe(createRng(1));
    expect(p.antwort).toBe(235);
    expect(p.optionen).toHaveLength(4);
  });
});

describe('Einmaleins-Turbo', () => {
  it('freie Eingabe, Gold mit Analogaufgaben wie 7 · 80', () => {
    const rng = createRng(9);
    let analog = 0;
    for (let i = 0; i < 500; i++) {
      const a = turboAufgabe('gold', rng);
      expect(a.eingabe).toBe('ziffern');
      if (a.analog) {
        analog++;
        expect(a.antwort).toBe(a.a * a.b * 10);
        expect(a.optionen.find((o) => o.wert === a.a * a.b)?.fehlerArt).toBe('stelle');
      }
    }
    expect(analog).toBeGreaterThan(250);
    for (let i = 0; i < 200; i++) {
      const b = turboAufgabe('bronze', rng);
      expect(b.kern).toBe(true);
      expect(b.analog).toBeUndefined();
    }
  });

  it('jede getippte Zahl wird angenommen, unbekannte Fehler ohne Muster', () => {
    const rng = createRng(2);
    const r = new Rundensteuerung({ bude: 'einmaleins-turbo', stufe: 'silber', rng, erzeuge: turboAufgabe, aehnlich: (a) => a, gewichtung: () => 1 });
    const a = r.aktuelle;
    const ant = r.antworte(a.antwort + 1234, 400);
    expect(ant.richtig).toBe(false);
    // Tippen dauert: schnelle Eingaben gelten hier nicht als „zu schnell geraten“
    expect(ant.ursache).not.toBe('zuSchnell');
    expect(ant.hilfe).toBe(true);
  });

  it('Turbo-Bonus zählt nur bei richtigen Hauptaufgaben', () => {
    const rng = createRng(4);
    const r = new Rundensteuerung({ bude: 'einmaleins-turbo', stufe: 'silber', rng, erzeuge: turboAufgabe, aehnlich: (a) => a, gewichtung: () => 1 });
    const ok = r.antworte(r.aktuelle.antwort, 2000, 50);
    expect(ok.punkte).toBe(150);
    r.weiter();
    const falsch = r.antworte(r.aktuelle.antwort + 1, 2000, 50);
    expect(falsch.punkte).toBe(0);
  });
});

import { BUDEN } from '../src/domain/buden';
import { BUDEN_ORTE, BUDE_BREITE, EINGANG, REIHEN, WELT_BREITE, aufStrecke, aufWeg, budenOrt, laufdauerMs, weg, weglaenge } from '../src/domain/karte';

describe('Begehbarer Jahrmarkt', () => {
  it('jede Bude hat genau einen Platz auf der Karte, ohne Überlappung', () => {
    expect(BUDEN_ORTE.map((o) => o.id).sort()).toEqual(BUDEN.map((b) => b.id).sort());
    for (const r of REIHEN) {
      const xs = BUDEN_ORTE.filter((o) => o.reihe === r.index).map((o) => o.x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect((xs[i] as number) - (xs[i - 1] as number)).toBeGreaterThan(BUDE_BREITE);
      expect(Math.min(...xs) - BUDE_BREITE / 2).toBeGreaterThan(0);
      expect(Math.max(...xs) + BUDE_BREITE / 2).toBeLessThan(WELT_BREITE);
    }
  });

  it('Weg vom Eingang zur Bude führt über die Allee und endet vor der Bude', () => {
    for (const o of BUDEN_ORTE) {
      const w = weg(EINGANG, o.vorne);
      expect(w[0]).toEqual(EINGANG);
      expect(w[w.length - 1]).toEqual(o.vorne);
      // Nur waagerechte und senkrechte Stücke
      for (let i = 1; i < w.length; i++) {
        const a = w[i - 1]!;
        const b = w[i]!;
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    }
  });

  it('in derselben Reihe geht es geradeaus', () => {
    const a = budenOrt('dartbude')!.vorne;
    const b = budenOrt('dosenwerfen')!.vorne;
    expect(weg(a, b)).toEqual([a, b]);
  });

  it('Position entlang des Weges und Blickrichtung', () => {
    const w = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(weglaenge(w)).toBe(200);
    expect(aufStrecke(w, 50)).toEqual({ p: { x: 50, y: 0 }, rechts: true });
    expect(aufStrecke(w, 150).p).toEqual({ x: 100, y: 50 });
    expect(aufStrecke(w, 999).p).toEqual({ x: 100, y: 100 });
    expect(laufdauerMs(100000)).toBe(3500);
  });

  it('Tippen neben den Weg landet auf dem nächsten Weg', () => {
    const r = REIHEN[2]!;
    expect(aufWeg({ x: 300, y: r.y + 10 })).toEqual({ x: 300, y: r.y });
    const p = aufWeg({ x: WELT_BREITE / 2 + 5, y: (r.y + REIHEN[3]!.y) / 2 });
    expect(p.x).toBe(WELT_BREITE / 2);
  });
});
