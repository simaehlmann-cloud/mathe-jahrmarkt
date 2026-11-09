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
    expect(aufStrecke(w, 50)).toEqual({ p: { x: 50, y: 0 }, richtung: 'rechts' });
    expect(aufStrecke(w, 150)).toEqual({ p: { x: 100, y: 50 }, richtung: 'runter' });
    expect(aufStrecke([{ x: 0, y: 100 }, { x: 0, y: 0 }], 10).richtung).toBe('hoch');
    expect(aufStrecke([{ x: 100, y: 0 }, { x: 0, y: 0 }], 10).richtung).toBe('links');
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

import { baueHalbschriftlich, halbschriftlichAufgabe, rechenweg } from '../src/domain/aufgaben/halbschriftlich';
import { baueUeberschlag, runde, ueberschlagAufgabe } from '../src/domain/aufgaben/ueberschlag';
import { ABSCHNITTE, istBeschriftet, wertAnStrich, zahlenstrahlAufgabe } from '../src/domain/aufgaben/zahlenstrahl';
import type { Aufgabe as AlleAufgaben } from '../src/domain/aufgaben/typen';

const pruefeOptionen = (a: AlleAufgaben) => {
  const werte = a.optionen.map((o) => o.wert);
  expect(new Set(werte).size).toBe(werte.length);
  expect(werte.filter((w) => w === a.antwort)).toHaveLength(1);
  expect(werte.every((w) => Number.isInteger(w) && w > 0)).toBe(true);
  expect(a.optionen.filter((o) => o.wert !== a.antwort).every((o) => o.fehlerArt)).toBe(true);
};

describe('Zahlenstrahl-Seilbahn', () => {
  it('Ziel liegt auf einem Strich, 20 Abschnitte, Zahlenraum der Stufe', () => {
    const rng = createRng(21);
    const max = { bronze: 1000, silber: 100_000, gold: 1_000_000 } as const;
    for (const stufe of STUFEN) {
      for (let i = 0; i < 300; i++) {
        const a = zahlenstrahlAufgabe(stufe, rng);
        pruefeOptionen(a);
        const s = a.strahl;
        expect((s.ende - s.start) / s.schritt).toBe(ABSCHNITTE);
        expect((a.antwort - s.start) % s.schritt).toBe(0);
        expect(a.antwort).toBeGreaterThan(s.start);
        expect(a.antwort).toBeLessThan(s.ende);
        expect(s.ende).toBeLessThanOrEqual(max[stufe]);
        if (a.form === 'ablesen') expect(a.optionen).toHaveLength(4);
        else expect(a.eingabe).toBe('ziffern');
      }
    }
  });
  it('Beschriftung: Enden immer, in Gold teils nur die Enden', () => {
    const s = { start: 7000, ende: 9000, schritt: 100, beschriftung: 2000 };
    expect(istBeschriftet(s, 7000) && istBeschriftet(s, 9000)).toBe(true);
    expect(istBeschriftet(s, 8000)).toBe(false);
    expect(wertAnStrich(s, 3)).toBe(7300);
  });
});

describe('Überschlags-Waage', () => {
  it('Runden nach Schulregel', () => {
    expect(runde(347, 2)).toBe(300);
    expect(runde(350, 2)).toBe(400);
    expect(runde(4651, 3)).toBe(5000);
  });
  it('richtiges Gewicht ist dem genauen Ergebnis am nächsten', () => {
    const rng = createRng(31);
    for (const stufe of STUFEN) {
      for (let i = 0; i < 400; i++) {
        const a = ueberschlagAufgabe(stufe, rng);
        pruefeOptionen(a);
        expect(a.optionen).toHaveLength(4);
        if (a.form !== 'runden') {
          for (const o of a.optionen) if (o.wert !== a.antwort) expect(Math.abs(a.genau - o.wert)).toBeGreaterThan(Math.abs(a.genau - a.antwort));
        }
      }
    }
  });
  it('Überschlag Mal rundet beide Faktoren', () => {
    const rng = createRng(2);
    for (let i = 0; i < 50; i++) {
      const a = baueUeberschlag('mal', 'gold', rng);
      expect(a.antwort).toBe((a.gerundet[0] ?? 0) * (a.gerundet[1] ?? 0));
    }
  });
});

describe('Rechendomino', () => {
  it('Ergebnisse stimmen, Rechenweg endet beim Ergebnis', () => {
    const rng = createRng(41);
    for (const stufe of STUFEN) {
      for (let i = 0; i < 400; i++) {
        const a = halbschriftlichAufgabe(stufe, rng);
        pruefeOptionen(a);
        expect(a.optionen).toHaveLength(4);
        const ergebnis = a.op === '+' ? a.a + a.b : a.op === '−' ? a.a - a.b : a.op === '·' ? a.a * a.b : a.a / a.b;
        expect(a.antwort).toBe(ergebnis);
        expect(Number.isInteger(a.antwort) && a.antwort > 0).toBe(true);
        const letzter = a.weg[a.weg.length - 1] ?? '';
        expect(letzter.replace(/ /g, '').endsWith(`= ${a.antwort}`)).toBe(true);
      }
    }
  });
  it('Bronze bleibt bis 1 000 und braucht einen Übertrag', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const a = baueHalbschriftlich('+', false, rng);
      expect(a.antwort).toBeLessThanOrEqual(1000);
    }
    expect(rechenweg('+', 467, 28)).toEqual(['467 + 20 = 487', '487 + 8 = 495']);
    expect(rechenweg(':', 744, 6)).toEqual(['720 : 6 = 120', '24 : 6 = 4', '120 + 4 = 124']);
  });
});
