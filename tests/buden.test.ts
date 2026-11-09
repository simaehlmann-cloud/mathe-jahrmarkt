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

import { GLEICH, baueGleichheit, ergaenzenSchritte, gleichheitAufgabe, loese, relationVon, termWert } from '../src/domain/aufgaben/gleichheit';

describe('Gleichgewichts-Waage', () => {
  it('die richtige Zahl bringt die Waage genau ins Gleichgewicht, jede falsche nicht', () => {
    const rng = createRng(51);
    for (const stufe of STUFEN) {
      for (let i = 0; i < 400; i++) {
        const a = gleichheitAufgabe(stufe, rng);
        pruefeOptionen(a);
        if (a.form === 'vergleichen') {
          expect(a.optionen).toHaveLength(3);
          expect(a.antwort).toBe(relationVon(termWert(a.links), termWert(a.rechts)));
        } else {
          expect(a.optionen).toHaveLength(4);
          for (const o of a.optionen) {
            const gleich = termWert(a.links, o.wert) === termWert(a.rechts, o.wert);
            expect(gleich).toBe(o.wert === a.antwort);
          }
          expect(Number.isInteger(a.antwort) && a.antwort > 0).toBe(true);
        }
      }
    }
  });
  it('Vergleichen kommt in allen drei Beziehungen vor', () => {
    const rng = createRng(3);
    const gesehen = new Set<number>();
    for (let i = 0; i < 200; i++) gesehen.add(baueGleichheit('vergleichen', 10000, rng).antwort);
    expect([...gesehen].sort()).toEqual([1, 2, 3]);
    expect(GLEICH).toBe(2);
  });
  it('Umkehraufgaben und Ergänzen in Schritten', () => {
    expect(loese({ a: 7, op: '·', b: null }, 420)).toBe(60);
    expect(loese({ a: 480, op: ':', b: null }, 60)).toBe(8);
    expect(loese({ a: null, op: ':', b: 6 }, 80)).toBe(480);
    expect(loese({ a: 500, op: '−', b: null }, 347)).toBe(153);
    expect(ergaenzenSchritte(347, 500)).toEqual([
      { von: 347, bis: 350, plus: 3 },
      { von: 350, bis: 400, plus: 50 },
      { von: 400, bis: 500, plus: 100 },
    ]);
  });
});

import { STIMMT, baueDetektiv, detektivAufgabe, einZifferAnders, falscheStelle } from '../src/domain/aufgaben/detektiv';
import { additionsSchritte, multiplikationsSchritte, ohneUebertrag, schriftlichAufgabe, subtraktionsSchritte } from '../src/domain/aufgaben/schriftlich';
import { baueKombinatorik, baueRaetsel, codes } from '../src/domain/aufgaben/tresor';

describe('Rechen-Werkstatt', () => {
  it('Aufgaben mit Übertrag, Ergebnis stimmt, typische Fehler erkannt', () => {
    const rng = createRng(61);
    for (const stufe of STUFEN) {
      for (let i = 0; i < 300; i++) {
        const a = schriftlichAufgabe(stufe, rng);
        const [x = 0, y = 0] = a.zahlen;
        expect(a.antwort).toBe(a.op === '+' ? x + y : a.op === '−' ? x - y : x * y);
        expect(a.antwort).toBeGreaterThan(0);
        expect(a.eingabe).toBe('ziffern');
        expect(a.optionen[0]?.wert).toBe(a.antwort);
        if (a.op !== '·') expect(ohneUebertrag(a.op, x, y)).not.toBe(a.antwort);
      }
    }
  });
  it('Rechenwege Spalte für Spalte ergeben das Ergebnis', () => {
    const add = additionsSchritte(467, 285);
    expect(add.map((s) => s.ziffer).reverse().join('')).toBe('752');
    for (const v of ['abziehen-entbuendeln', 'abziehen-erweitern', 'ergaenzen-entbuendeln', 'ergaenzen-erweitern', 'ergaenzen-auffuellen'] as const) {
      expect(subtraktionsSchritte(703, 245, v).map((s) => s.ziffer).reverse().join('')).toBe('458');
      expect(subtraktionsSchritte(912, 127, v).map((s) => s.ziffer).reverse().join('')).toBe('785');
    }
    expect(multiplikationsSchritte(234, 23)[2]).toContain('5 382');
  });
});

describe('Fehlerdetektiv', () => {
  it('genau eine falsche Ziffer, oder alles richtig', () => {
    const rng = createRng(71);
    let richtig = 0;
    for (const stufe of STUFEN) {
      for (let i = 0; i < 300; i++) {
        const a = detektivAufgabe(stufe, rng);
        pruefeOptionen(a);
        if (a.antwort === STIMMT) {
          richtig++;
          expect(a.gezeigt).toBe(a.richtig);
        } else {
          expect(einZifferAnders(a.gezeigt, a.richtig)).toBe(true);
          expect(a.antwort).toBe(falscheStelle(a.gezeigt, a.richtig) + 1);
        }
      }
    }
    expect(richtig).toBeGreaterThan(100);
    expect(richtig).toBeLessThan(400);
    const f = baueDetektiv('+', false, createRng(2));
    expect(f.fehler).toBe('uebertrag');
  });
});

describe('Zahlenrätsel-Tresor', () => {
  it('Hinweise führen zu genau einer Zahl', () => {
    const rng = createRng(81);
    for (const drei of [false, true]) {
      for (let i = 0; i < 60; i++) {
        const a = baueRaetsel(drei, rng);
        expect(a.hinweise.length).toBeGreaterThanOrEqual(2);
        expect(a.hinweise.length).toBeLessThanOrEqual(4);
        expect(String(a.antwort)).toHaveLength(drei ? 3 : 2);
      }
    }
  });
  it('Kombinatorik zählt richtig', () => {
    expect(codes([1, 2, 3], 3, false)).toHaveLength(6);
    expect(codes([1, 2, 3, 4], 2, true)).toHaveLength(16);
    expect(codes([1, 2, 3, 4], 2, false)).toHaveLength(12);
    const a = baueKombinatorik(createRng(4));
    expect(a.antwort).toBe(a.moeglichkeiten?.length);
  });
});

describe('Tresor: Prüfungen passen zu den Hinweisen', () => {
  it('die Lösung erfüllt alle Hinweise, andere Zahlen nicht alle', () => {
    const rng = createRng(91);
    for (let i = 0; i < 80; i++) {
      const a = baueRaetsel(i % 2 === 0, rng);
      expect(a.pruefungen).toHaveLength(a.hinweise.length);
      expect(a.pruefungen.every((p) => p(a.antwort))).toBe(true);
      const bereich = a.stellen === 3 ? [100, 999] : [10, 99];
      for (let n = bereich[0]!; n <= bereich[1]!; n++) if (n !== a.antwort) expect(a.pruefungen.every((p) => p(n))).toBe(false);
    }
  });
});

import { baueAchterbahn, baueKasse, baueMemory, baueSchaetzen, baueUhr, muenzen } from '../src/domain/aufgaben/groessen';

describe('Größenmarkt', () => {
  const alle = [baueKasse, baueSchaetzen, baueUhr, baueMemory, baueAchterbahn];
  it('jede Aufgabe hat eindeutige Antworten mit Beschriftung und eine Erklärung', () => {
    const rng = createRng(101);
    for (const baue of alle) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 150; i++) {
          const a = baue(stufe, rng);
          pruefeOptionen(a);
          expect(a.optionen.length).toBeGreaterThanOrEqual(3);
          for (const o of a.optionen) expect(a.labels?.[o.wert], `${a.bude} ${o.wert}`).toBeTruthy();
          expect(new Set(a.optionen.map((o) => a.labels?.[o.wert])).size).toBe(a.optionen.length);
          expect(a.erklaerung?.schritte.length).toBeGreaterThan(0);
          expect(a.daten.stufe).toBe(stufe);
        }
      }
    }
  });
  it('Münzen ergeben den Preis, Uhrzeiten und Rückgeld stimmen', () => {
    expect(muenzen(345).reduce((s, m) => s + m, 0)).toBe(345);
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) {
      const r = baueKasse('silber', rng, 'rueckgeld');
      expect(r.antwort).toBe((r.daten.schein as number) - (r.daten.preis as number));
      const u = baueUhr('gold', rng);
      expect(u.antwort).toBeGreaterThan(u.daten.min as number);
    }
  });
});

import { baueBand, baueFormen, baueLabyrinth, baueNetz, baueSpiegel, falte, fahre, freieZellen, gegenueber, spiegle } from '../src/domain/aufgaben/raum';

describe('Spiegelzelt', () => {
  it('Würfelnetze: die 11 Netze falten sich, ein 2×3-Rechteck nicht', () => {
    const kreuz: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]];
    const f = falte(kreuz);
    expect(f).toBeDefined();
    // Im Kreuz liegen oben und unten gegenüber
    expect(f?.[0]).toBe(gegenueber(f?.[5] ?? -1));
    expect(falte([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])).toBeUndefined();
    expect(falte([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]])).toBeUndefined();
  });
  it('alle Aufgaben des Spiegelzelts sind eindeutig und erklärt', () => {
    const rng = createRng(111);
    for (const baue of [baueSpiegel, baueNetz, baueLabyrinth, baueFormen, baueBand]) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 80; i++) {
          const a = baue(stufe, rng);
          pruefeOptionen(a);
          if (a.eingabe !== 'ziffern') for (const o of a.optionen) expect(a.labels?.[o.wert], `${a.bude}`).toBeTruthy();
          expect(a.erklaerung?.schritte.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('Labyrinth: nur das richtige Programm erreicht den Stern', () => {
    const rng = createRng(7);
    for (let i = 0; i < 60; i++) {
      const a = baueLabyrinth('silber', rng);
      const mauern = new Set(a.daten.mauern as string[]);
      const ziel = a.daten.ziel as [number, number];
      for (const o of a.optionen) {
        const ende = fahre(a.daten.start as [number, number], (a.labels?.[o.wert] ?? '').replace(/ /g, ''), mauern);
        expect(!!ende && ende[0] === ziel[0] && ende[1] === ziel[1]).toBe(o.wert === a.antwort);
      }
    }
  });
  it('Spiegeln und Bitmaske', () => {
    expect(spiegle(0, 1, 'senkrecht')).toEqual([3, 1]);
    expect(spiegle(2, 0, 'schraeg')).toEqual([0, 2]);
    expect(freieZellen('senkrecht')).toHaveLength(8);
  });
});

import { baueDiagramm, baueFolge, baueMauer, baueMurmeln, baueRiesenrad, mauer } from '../src/domain/aufgaben/muster';

describe('Musterbahn und Forschergasse', () => {
  it('jede Aufgabe hat eindeutige, positive Antworten und eine Erklärung', () => {
    const rng = createRng(202);
    for (const baue of [baueFolge, baueMauer, baueRiesenrad, baueMurmeln, baueDiagramm]) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 200; i++) {
          const a = baue(stufe, rng);
          pruefeOptionen(a);
          expect(a.optionen.length).toBeGreaterThanOrEqual(3);
          expect(a.optionen.every((o) => Number.isInteger(o.wert) && o.wert > 0), `${a.bude} ${a.form}`).toBe(true);
          if (a.labels) expect(new Set(a.optionen.map((o) => a.labels?.[o.wert] ?? o.wert)).size).toBe(a.optionen.length);
          expect(a.erklaerung?.schritte.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('Rechenmauer: jeder Stein ist die Summe der beiden darunter, die Lücke ist die Antwort', () => {
    expect(mauer([1, 2, 3])).toEqual([[1, 2, 3], [3, 5], [8]]);
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const a = baueMauer(rng.pick(STUFEN), rng);
      const z = a.daten.zeilen as (number | null)[][];
      const voll = z.map((r) => r.map((v) => v ?? a.antwort));
      for (let r = 1; r < voll.length; r++) for (let s = 0; s < voll[r]!.length; s++) expect(voll[r]![s]).toBe(voll[r - 1]![s]! + voll[r - 1]![s + 1]!);
    }
  });
  it('Zahlenfolge: die Antwort ist der Wert an der Lücke', () => {
    const rng = createRng(8);
    for (let i = 0; i < 200; i++) {
      const a = baueFolge(rng.pick(STUFEN), rng);
      expect((a.daten.folge as number[])[a.daten.luecke as number]).toBe(a.antwort);
    }
  });
  it('Diagramm: Werte sind Vielfache der Skala', () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i++) {
      const a = baueDiagramm(rng.pick(STUFEN), rng);
      for (const w of a.daten.werte as number[]) expect(w % (a.daten.schritt as number)).toBe(0);
    }
  });
});

import { baueBruch, baueDezimal, baueDivision, divisionsSchritte } from '../src/domain/aufgaben/klasse5';

describe('Sternenmarkt', () => {
  it('jede Aufgabe hat eindeutige Antworten mit Beschriftung und eine Erklärung', () => {
    const rng = createRng(303);
    for (const baue of [baueDivision, baueBruch, baueDezimal]) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 200; i++) {
          const a = baue(stufe, rng);
          pruefeOptionen(a);
          expect(a.optionen.length, `${a.bude} ${a.form}`).toBeGreaterThanOrEqual(3);
          if (a.labels) expect(new Set(a.optionen.map((o) => a.labels?.[o.wert] ?? o.wert)).size, `${a.bude} ${a.form}`).toBe(a.optionen.length);
          expect(a.erklaerung?.schritte.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('schriftliche Division: Ziffern ergeben das Ergebnis, der Rest stimmt', () => {
    expect(divisionsSchritte(846, 3).map((s) => s.q)).toEqual([2, 8, 2]);
    expect(divisionsSchritte(1234, 5).map((s) => s.q).join('')).toBe('246');
    for (let a = 100; a < 3000; a += 7) {
      for (const d of [2, 3, 7, 9]) {
        const s = divisionsSchritte(a, d);
        expect(Number(s.map((x) => x.q).join(''))).toBe(Math.floor(a / d));
        expect(s[s.length - 1]!.rest).toBe(a % d);
        expect(s.every((x) => x.rest < d)).toBe(true);
      }
    }
  });
  it('Ziffer-Aufgaben fragen nach der richtigen Ergebnisziffer', () => {
    const rng = createRng(4);
    for (let i = 0; i < 300; i++) {
      const a = baueDivision(rng.pick(STUFEN), rng);
      if (a.daten.frage === 'ziffer') expect(a.antwort - 1).toBe(a.daten.loesung);
      if (a.daten.frage === 'rest') expect(a.antwort).toBe((a.daten.a as number) % (a.daten.d as number));
    }
  });
});
