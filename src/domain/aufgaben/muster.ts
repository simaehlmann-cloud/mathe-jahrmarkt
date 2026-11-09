import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Fehler } from './auswahl';
import { auswahlAufgabe, codeAuswahl } from './baukasten';
import type { AuswahlAufgabe } from './typen';

/** Musterbahn und Forschergasse (KC: Muster und Strukturen; Daten und Zufall). */

/* ---------- Zahlenfolgen-Zug ---------- */

export function baueFolge(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'plusminus' : stufe === 'silber' ? 'maldurch' : 'zweiRegeln');
  let folge: number[] = [];
  let regel = '';
  if (f === 'plusminus') {
    const d = rng.pick([3, 4, 6, 7, 8, 9, 11, 12, 15, 25, 50]) * (rng.next() < 0.3 ? -1 : 1);
    const start = d > 0 ? rng.int(2, 300) : rng.int(400, 900);
    folge = Array.from({ length: 6 }, (_, i) => start + i * d);
    regel = d > 0 ? `immer plus ${d}` : `immer minus ${-d}`;
  } else if (f === 'maldurch') {
    if (rng.next() < 0.6) {
      const m = rng.pick([2, 3]);
      const start = rng.int(1, m === 2 ? 9 : 4);
      folge = Array.from({ length: 6 }, (_, i) => start * m ** i);
      regel = `immer mal ${m}`;
    } else {
      const ende = rng.int(2, 7);
      folge = Array.from({ length: 6 }, (_, i) => ende * 2 ** (5 - i));
      regel = 'immer geteilt durch 2';
    }
  } else if (rng.next() < 0.5) {
    const a = rng.int(4, 9);
    const b = rng.int(1, a - 1);
    const start = rng.int(10, 60);
    folge = [start];
    for (let i = 1; i < 7; i++) folge.push((folge[i - 1] ?? 0) + (i % 2 ? a : -b));
    regel = `abwechselnd plus ${a} und minus ${b}`;
  } else {
    const start = rng.int(1, 20);
    folge = [start];
    for (let i = 1; i < 7; i++) folge.push((folge[i - 1] ?? 0) + i);
    regel = 'plus 1, plus 2, plus 3, … (jedes Mal eins mehr)';
  }
  const luecke = rng.int(2, folge.length - 1);
  const antwort = folge[luecke] ?? 0;
  const vorher = folge[luecke - 1] ?? 0;
  const fehler: Fehler[] = [
    { wert: vorher + (folge[1] ?? 0) - (folge[0] ?? 0), fehlerArt: 'sonstige' },
    { wert: antwort + 1, fehlerArt: 'sonstige' },
    { wert: antwort - 1, fehlerArt: 'sonstige' },
    { wert: antwort + 10, fehlerArt: 'sonstige' },
  ].filter((x) => x.wert !== antwort && x.wert > 0) as Fehler[];
  return auswahlAufgabe(
    {
      bude: 'zahlenfolgenzug', form: f, stufe, text: 'Welche Zahl fehlt im Zug?', sprechtext: `Welche Zahl fehlt? ${folge.map((z, i) => (i === luecke ? 'Lücke' : z)).join(', ')}`,
      antwort, fehler, schritt: 1, kompetenz: 'muster', dimension: f === 'zweiRegeln' ? 'anwendung' : 'sicherheit',
      idee: 'Schau, wie du von einem Waggon zum nächsten kommst. Die Regel gilt für den ganzen Zug.',
      schritte: [`Die Regel: ${regel}.`, `${vorher} → ${antwort}`],
      daten: { folge, luecke },
    },
    rng,
  );
}

/* ---------- Rechenmauer ---------- */

/** Mauer aus der untersten Reihe: jeder Stein ist die Summe der beiden darunter. Zeilen von unten nach oben. */
export function mauer(unten: readonly number[]): number[][] {
  const zeilen = [[...unten]];
  while ((zeilen[zeilen.length - 1] ?? []).length > 1) {
    const z = zeilen[zeilen.length - 1] ?? [];
    zeilen.push(z.slice(1).map((v, i) => v + (z[i] ?? 0)));
  }
  return zeilen;
}

export function baueMauer(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'drei' : stufe === 'silber' ? 'vier' : 'rueckwaerts');
  const breite = f === 'drei' ? 3 : 4;
  const unten = Array.from({ length: breite }, () => rng.int(f === 'drei' ? 5 : 3, f === 'drei' ? 60 : 40));
  const z = mauer(unten);
  // Gesuchter Stein: oben oder in der Mitte; rückwärts: unten (aus dem Stein darüber und dem Nachbarn)
  const reihe = f === 'rueckwaerts' ? 0 : rng.int(1, z.length - 1);
  const spalte = rng.int(0, (z[reihe] ?? []).length - 1);
  const antwort = z[reihe]?.[spalte] ?? 0;
  const sichtbar = z.map((zeile, r) => zeile.map((v, s) => (r === reihe && s === spalte ? null : v)));
  // Bei rückwärts müssen die Steine darüber bekannt sein, die mittleren dürfen teilweise fehlen; hier alle anderen sichtbar
  const darunter = reihe > 0 ? [z[reihe - 1]?.[spalte] ?? 0, z[reihe - 1]?.[spalte + 1] ?? 0] : [];
  const fehler: Fehler[] = (
    reihe > 0
      ? [
          { wert: Math.abs((darunter[0] ?? 0) - (darunter[1] ?? 0)), fehlerArt: 'operation' },
          { wert: antwort + 10, fehlerArt: 'uebertrag' },
          { wert: antwort - 10, fehlerArt: 'uebertrag' },
        ]
      : [
          { wert: (z[1]?.[spalte > 0 ? spalte - 1 : spalte] ?? 0) + (z[0]?.[spalte > 0 ? spalte - 1 : spalte + 1] ?? 0), fehlerArt: 'operation' },
          { wert: antwort + 10, fehlerArt: 'uebertrag' },
          { wert: antwort + 1, fehlerArt: 'sonstige' },
        ]
  ).filter((x) => x.wert > 0 && x.wert !== antwort) as Fehler[];
  const ueber = spalte > 0 ? (z[1]?.[spalte - 1] ?? 0) : (z[1]?.[0] ?? 0);
  const nachbar = spalte > 0 ? (z[0]?.[spalte - 1] ?? 0) : (z[0]?.[1] ?? 0);
  return auswahlAufgabe(
    {
      bude: 'rechenmauer', form: f, stufe, text: 'Welche Zahl gehört in den leeren Stein?', antwort, fehler, schritt: 1,
      kompetenz: f === 'rueckwaerts' ? 'operationsverstaendnis' : 'muster', dimension: f === 'rueckwaerts' ? 'anwendung' : 'wissen',
      idee: 'Jeder Stein ist so groß wie die beiden Steine darunter zusammen.',
      schritte: reihe > 0 ? [`${darunter[0]} + ${darunter[1]} = ${antwort}`] : [`Der Stein darüber ist ${ueber}, der Nachbar ${nachbar}.`, `${ueber} − ${nachbar} = ${antwort}`],
      daten: { zeilen: sichtbar },
    },
    rng,
  );
}

/* ---------- Riesenrad-Techniker ---------- */

export function baueRiesenrad(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'plaetze' : stufe === 'silber' ? 'rest' : 'tabelle');
  if (f === 'plaetze') {
    const pro = rng.int(3, 8);
    const gondeln = rng.int(4, 12);
    const antwort = pro * gondeln;
    return auswahlAufgabe(
      {
        bude: 'riesenradtechniker', form: f, stufe, text: `${gondeln} Gondeln mit je ${pro} Plätzen`, sprechtext: `Das Riesenrad hat ${gondeln} Gondeln. In jede passen ${pro} Kinder. Wie viele Kinder können gleichzeitig fahren?`,
        antwort, fehler: [{ wert: pro + gondeln, fehlerArt: 'operation' }, { wert: antwort + pro, fehlerArt: 'nachbaraufgabe' }, { wert: antwort - pro, fehlerArt: 'nachbaraufgabe' }],
        format: (w) => `${w} Kinder`, kompetenz: 'operationsverstaendnis', dimension: 'anwendung',
        idee: 'Gleich viele in jeder Gondel: Das ist eine Malaufgabe.',
        schritte: [`${gondeln} · ${pro} = ${antwort}`],
        daten: { gondeln, pro },
      },
      rng,
    );
  }
  if (f === 'rest') {
    const pro = rng.int(3, 8);
    let kinder = rng.int(pro * 3, pro * 10);
    if (kinder % pro === 0) kinder += rng.int(1, pro - 1);
    const voll = Math.floor(kinder / pro);
    const rest = kinder % pro;
    const antwort = voll + 1;
    return auswahlAufgabe(
      {
        bude: 'riesenradtechniker', form: f, stufe, text: `${kinder} Kinder, ${pro} pro Gondel`, sprechtext: `${kinder} Kinder wollen fahren. In jede Gondel passen ${pro}. Wie viele Gondeln braucht man mindestens?`,
        antwort, fehler: [{ wert: voll, fehlerArt: 'sonstige' }, { wert: rest, fehlerArt: 'sonstige' }, { wert: antwort + 1, fehlerArt: 'sonstige' }],
        format: (w) => `${w} Gondeln`, kompetenz: 'operationsverstaendnis', dimension: 'anwendung',
        idee: 'Teile die Kinder auf die Gondeln auf. Bleiben Kinder übrig, brauchen sie noch eine Gondel.',
        schritte: [`${kinder} : ${pro} = ${voll} Rest ${rest}`, `${voll} volle Gondeln und eine für die ${rest} übrigen Kinder: ${antwort} Gondeln.`],
        daten: { gondeln: antwort, pro, verdeckt: true },
      },
      rng,
    );
  }
  const preis = rng.int(2, 6);
  const grund = rng.pick([0, 0, 2, 3]);
  const n = rng.int(6, 10);
  const antwort = grund + preis * n;
  return auswahlAufgabe(
    {
      bude: 'riesenradtechniker', form: f, stufe, text: `Was kosten ${n} Fahrten?`, sprechtext: `${grund ? `Der Eintritt kostet ${grund} Euro, ` : ''}jede Fahrt ${preis} Euro. Was kosten ${n} Fahrten?`,
      antwort, fehler: [{ wert: preis * n, fehlerArt: 'sonstige' }, { wert: antwort + preis, fehlerArt: 'nachbaraufgabe' }, { wert: grund + preis + n, fehlerArt: 'operation' }].filter((x) => x.wert !== antwort) as Fehler[],
      format: (w) => `${w} €`, kompetenz: 'muster', dimension: 'anwendung',
      idee: 'In der Tabelle kommt bei jeder Fahrt derselbe Betrag dazu.',
      schritte: [grund ? `${grund} € Eintritt + ${n} · ${preis} € = ${antwort} €` : `${n} · ${preis} € = ${antwort} €`],
      daten: { tabelle: [1, 2, 3].map((k) => [k, grund + preis * k]), n },
    },
    rng,
  );
}

/* ---------- Murmel-Labor ---------- */

export const MURMELFARBEN = ['rot', 'blau', 'grün', 'gelb'] as const;

export function baueMurmeln(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'moeglich' : stufe === 'silber' ? 'wahrscheinlich' : 'vergleich');
  if (f === 'vergleich') {
    // Zwei Tüten: wo ist der Anteil Rot größer?
    let a: [number, number] = [0, 0];
    let b: [number, number] = [0, 0];
    do {
      a = [rng.int(1, 6), rng.int(1, 8)];
      b = [rng.int(1, 6), rng.int(1, 8)];
    } while (a[0] * (b[0] + b[1]) === b[0] * (a[0] + a[1]) || a[0] === b[0] || a[0] + a[1] === b[0] + b[1]);
    const anteilA = a[0] / (a[0] + a[1]);
    const anteilB = b[0] / (b[0] + b[1]);
    const richtig = anteilA > anteilB ? 0 : 1;
    const c = codeAuswahl(['Tüte A', 'Tüte B', 'beide gleich'], richtig, rng);
    return auswahlAufgabe(
      {
        bude: 'murmellabor', form: f, stufe, text: 'Wo ziehst du eher Rot?', ...c, anzahl: 3,
        sprechtext: `In Tüte A sind ${a[0]} rote und ${a[1]} blaue Murmeln, in Tüte B ${b[0]} rote und ${b[1]} blaue. Aus welcher Tüte ziehst du eher eine rote?`,
        kompetenz: 'daten', dimension: 'anwendung',
        idee: 'Es kommt nicht nur auf die Zahl der roten an, sondern darauf, wie viele es insgesamt sind.',
        schritte: [`Tüte A: ${a[0]} von ${a[0] + a[1]} sind rot.`, `Tüte B: ${b[0]} von ${b[0] + b[1]} sind rot.`, `In Tüte ${richtig === 0 ? 'A' : 'B'} ist der Anteil Rot größer.`],
        daten: { tueten: [a, b] },
      },
      rng,
    );
  }
  const anzahl = MURMELFARBEN.map(() => 0);
  const farben = rng.int(1, 3);
  for (let i = 0; i < farben; i++) anzahl[i] = rng.int(1, 7);
  if (f === 'moeglich') {
    // Frage nach einer Farbe: alle sind diese Farbe (sicher), einige (möglich), keine (unmöglich)
    const art = rng.pick(['sicher', 'möglich', 'unmöglich']);
    let farbe = 0;
    if (art === 'sicher') {
      anzahl.fill(0);
      anzahl[0] = rng.int(3, 8);
      farbe = 0;
    } else if (art === 'möglich') {
      anzahl[1] = Math.max(anzahl[1] ?? 0, 2);
      farbe = 1;
    } else farbe = 3;
    const c = codeAuswahl([art, ...['sicher', 'möglich', 'unmöglich'].filter((x) => x !== art)], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'murmellabor', form: f, stufe, text: `Eine ${MURMELFARBEN[farbe]}e Murmel ziehen ist …`, ...c, anzahl: 3,
        kompetenz: 'daten', dimension: 'wissen',
        idee: 'Sicher: Es kommt immer so. Möglich: Es kann so kommen, muss aber nicht. Unmöglich: Es kann gar nicht so kommen.',
        schritte: [`In der Tüte sind ${anzahl.map((n, i) => (n ? `${n} ${MURMELFARBEN[i]}e` : '')).filter(Boolean).join(', ')}.`, `Eine ${MURMELFARBEN[farbe]}e zu ziehen ist ${art}.`],
        daten: { anzahl },
      },
      rng,
    );
  }
  // Welche Farbe am wahrscheinlichsten?
  for (let i = 0; i < 3; i++) anzahl[i] = rng.int(1, 8);
  const max = Math.max(...anzahl);
  if (anzahl.filter((n) => n === max).length > 1) return baueMurmeln(stufe, rng, f);
  const richtig = anzahl.indexOf(max);
  const c = codeAuswahl([MURMELFARBEN[richtig] ?? '', ...MURMELFARBEN.filter((_, i) => i !== richtig && i < 3)], 0, rng);
  return auswahlAufgabe(
    {
      bude: 'murmellabor', form: f, stufe, text: 'Welche Farbe ziehst du am ehesten?', ...c, anzahl: 3,
      kompetenz: 'daten', dimension: 'anwendung',
      idee: 'Von welcher Farbe gibt es die meisten Murmeln?',
      schritte: [anzahl.slice(0, 3).map((n, i) => `${n} ${MURMELFARBEN[i]}`).join(', '), `Am meisten: ${MURMELFARBEN[richtig]}.`],
      daten: { anzahl },
    },
    rng,
  );
}

/* ---------- Diagramm-Reporter ---------- */

const THEMEN = [
  { titel: 'Lieblingsfahrgeschäft', namen: ['Karussell', 'Riesenrad', 'Autoscooter', 'Achterbahn'] },
  { titel: 'Lieblingseis', namen: ['Vanille', 'Schoko', 'Erdbeer', 'Zitrone'] },
  { titel: 'Besucher am Tag', namen: ['Mo', 'Di', 'Mi', 'Do'] },
];

export function baueDiagramm(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'strichliste' : stufe === 'silber' ? 'saeulen' : 'balken');
  const thema = rng.pick(THEMEN);
  const schritt = f === 'strichliste' ? 1 : f === 'saeulen' ? rng.pick([2, 5]) : 10;
  const werte = thema.namen.map(() => rng.int(1, f === 'strichliste' ? 14 : 9) * schritt);
  if (new Set(werte).size < werte.length) return baueDiagramm(stufe, rng, f);
  const i = rng.int(0, 3);
  let j = rng.int(0, 3);
  if (j === i) j = (i + 1) % 4;
  const frage = f === 'strichliste' ? 'wieviel' : rng.pick(['wieviel', 'unterschied', 'summe']);
  const wi = werte[i] ?? 0;
  const wj = werte[j] ?? 0;
  const antwort = frage === 'wieviel' ? wi : frage === 'unterschied' ? Math.abs(wi - wj) : wi + wj;
  const text =
    frage === 'wieviel' ? `Wie viele bei „${thema.namen[i]}“?` : frage === 'unterschied' ? `Unterschied „${thema.namen[i]}“ und „${thema.namen[j]}“?` : `„${thema.namen[i]}“ und „${thema.namen[j]}“ zusammen?`;
  return auswahlAufgabe(
    {
      bude: 'diagrammreporter', form: f, stufe, text, antwort,
      fehler: [{ wert: antwort + schritt, fehlerArt: 'skala' }, { wert: antwort - schritt, fehlerArt: 'skala' }, { wert: frage === 'wieviel' ? wj : wi, fehlerArt: 'sonstige' }].filter((x) => x.wert > 0 && x.wert !== antwort) as Fehler[],
      schritt, kompetenz: 'daten', dimension: frage === 'wieviel' ? 'wissen' : 'anwendung',
      idee: f === 'strichliste' ? 'Fünf Striche sind ein Bündel. Zähle in Fünferschritten.' : `Schau auf die Skala: Ein Kästchen ist ${schritt}.`,
      schritte: [`${thema.namen[i]}: ${wi}`, ...(frage === 'wieviel' ? [] : [`${thema.namen[j]}: ${wj}`, frage === 'unterschied' ? `${Math.max(wi, wj)} − ${Math.min(wi, wj)} = ${antwort}` : `${wi} + ${wj} = ${antwort}`])],
      daten: { titel: thema.titel, namen: thema.namen, werte, schritt, art: f, markiert: [i, ...(frage === 'wieviel' ? [] : [j])] },
    },
    rng,
  );
}
