import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { auswahl, neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { zahlText } from './stellenwert';
import type { Aufgabe, GleichheitAufgabe, Option, Term } from './typen';

/**
 * Gleichgewichts-Waage (KC: Gleichheitszeichen als Beziehung, Umkehraufgaben, Ergänzen, Terme vergleichen).
 * Die Waage zeigt immer die echte Beziehung: im Gleichgewicht nur bei genau gleichen Werten.
 */

/** Antwortcodes beim Vergleichen. */
export const KLEINER = 1;
export const GLEICH = 2;
export const GROESSER = 3;
export const RELATION: Readonly<Record<number, string>> = { [KLEINER]: '<', [GLEICH]: '=', [GROESSER]: '>' };

type Form = GleichheitAufgabe['form'];
const FORMEN: Readonly<Record<Stufe, readonly Form[]>> = {
  bronze: ['ergaenzen'],
  silber: ['vergleichen', 'ergaenzen'],
  gold: ['platzhalter', 'vergleichen'],
};

/** Wert eines Terms, die gesuchte Zahl wird durch `x` ersetzt. */
export function termWert(t: Term, x = 0): number {
  const a = t.a ?? x;
  if (!t.op) return a;
  const b = t.b ?? x;
  switch (t.op) {
    case '+':
      return a + b;
    case '−':
      return a - b;
    case '·':
      return a * b;
    case ':':
      return b === 0 ? Number.NaN : a / b;
  }
}

export const termText = (t: Term): string => {
  const z = (n: number | null | undefined) => (n === null || n === undefined ? '?' : zahlText(n));
  return t.op ? `${z(t.a)} ${t.op} ${z(t.b)}` : z(t.a);
};

const hatLuecke = (t: Term): boolean => t.a === null || (t.op !== undefined && t.b === null);

export const relationVon = (links: number, rechts: number): number => (links < rechts ? KLEINER : links > rechts ? GROESSER : GLEICH);

export function gleichheitAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): GleichheitAufgabe {
  const form = rng.weighted([...FORMEN[stufe]], (f) => gewichtung(`gl:${f}`));
  return baueGleichheit(form, stufe === 'bronze' ? 1000 : 10000, rng);
}

export function aehnlicheGleichheit(vorher: Aufgabe, rng: Rng): GleichheitAufgabe {
  if (vorher.art !== 'gleichheit') throw new Error(`Keine Waagen-Aufgabe: ${vorher.text}`);
  const gross = Math.max(termWert(vorher.links, vorher.antwort), termWert(vorher.rechts, vorher.antwort)) > 1000;
  return baueGleichheit(vorher.form, gross ? 10000 : 1000, rng);
}

export const gleichheitProbe = (rng: Rng): GleichheitAufgabe => fertig('ergaenzen', { a: 300, op: '+', b: null }, { a: 500 }, rng);

export function baueGleichheit(form: Form, bis: number, rng: Rng): GleichheitAufgabe {
  switch (form) {
    case 'ergaenzen': {
      const rund = bis > 1000 ? 1000 : 100;
      const c = rng.int(2, bis / rund) * rund;
      let a = 0;
      do a = rng.int(Math.floor(c * 0.25), c - 11);
      while (a % 10 === 0);
      const variante = rng.int(0, 2);
      if (variante === 0) return fertig('ergaenzen', { a, op: '+', b: null }, { a: c }, rng);
      if (variante === 1) return fertig('ergaenzen', { a: null, op: '+', b: a }, { a: c }, rng);
      return fertig('ergaenzen', { a: c, op: '−', b: null }, { a }, rng);
    }
    case 'platzhalter': {
      const k = rng.int(3, 9);
      const g = rng.int(2, 9) * rng.pick([10, 100]);
      const p = k * g;
      switch (rng.int(0, 3)) {
        case 0:
          return fertig('platzhalter', { a: k, op: '·', b: null }, { a: p }, rng);
        case 1:
          return fertig('platzhalter', { a: null, op: '·', b: k }, { a: p }, rng);
        case 2:
          return fertig('platzhalter', { a: null, op: ':', b: k }, { a: g }, rng);
        default:
          return fertig('platzhalter', { a: p, op: ':', b: null }, { a: g }, rng);
      }
    }
    case 'vergleichen': {
      // Rechenvorteil: Konstanz der Summe bzw. Differenz, oder nur eine Zahl verändert
      const plus = rng.next() < 0.6;
      const d = rng.int(1, 4);
      let a = rng.int(120, 880);
      // a so wählen, dass a + d eine Zehnerzahl ist (398 → 400)
      a = Math.ceil(a / 10) * 10 - d;
      const b = rng.int(110, 480);
      const rel = rng.pick([KLEINER, GLEICH, GROESSER]);
      let rechts: Term;
      if (plus) {
        // links: a + b
        rechts =
          rel === GLEICH ? { a: a + d, op: '+', b: b - d } : rel === KLEINER ? { a: a + d, op: '+', b } : { a: a + d, op: '+', b: b - d - rng.int(1, 3) };
        return fertig('vergleichen', { a, op: '+', b }, rechts, rng);
      }
      // minus: links (a + 300) − b
      const m = a + 300;
      rechts = rel === GLEICH ? { a: m + d, op: '−', b: b + d } : rel === KLEINER ? { a: m + d, op: '−', b } : { a: m + d, op: '−', b: b + d + rng.int(1, 3) };
      return fertig('vergleichen', { a: m, op: '−', b }, rechts, rng);
    }
  }
}

function fertig(form: Form, links: Term, rechts: Term, rng: Rng): GleichheitAufgabe {
  const text = form === 'vergleichen' ? `${termText(links)}  ○  ${termText(rechts)}` : `${termText(links)} = ${termText(rechts)}`;
  const sprech = (t: Term) => termText(t).replace(/·/g, 'mal').replace(/:/g, 'geteilt durch').replace(/−/g, 'minus').replace(/\?/g, 'wie viel').replace(/ /g, '');
  let antwort: number;
  let optionen: Option[];
  let sprechtext: string;
  if (form === 'vergleichen') {
    antwort = relationVon(termWert(links), termWert(rechts));
    // Wer nur auf eine Zahl schaut, hält ungleiche Seiten für gleich oder umgekehrt
    optionen = [KLEINER, GLEICH, GROESSER].map((w) => (w === antwort ? { wert: w } : { wert: w, fehlerArt: w === GLEICH || antwort === GLEICH ? ('operation' as const) : ('sonstige' as const) }));
    sprechtext = `Was ist mehr: ${sprech(links)} oder ${sprech(rechts)}? Oder ist es gleich viel?`;
  } else {
    const luecke = hatLuecke(links) ? links : rechts;
    const andere = luecke === links ? rechts : links;
    antwort = loese(luecke, termWert(andere));
    optionen = auswahl(antwort, typischeFehler(luecke, termWert(andere), antwort), rng, 10);
    sprechtext = `${sprech(links)} ist gleich ${sprech(rechts)}. Welche Zahl fehlt?`;
  }
  return {
    id: neueAufgabenId('g'),
    text,
    sprechtext,
    antwort,
    optionen,
    kompetenz: form === 'vergleichen' ? 'operationsverstaendnis' : 'halbschriftlich',
    dimension: 'anwendung',
    fakt: `gl:${form}`,
    art: 'gleichheit',
    form,
    links,
    rechts,
  };
}

/** Die gesuchte Zahl, damit der Term den Wert `ziel` hat. */
export function loese(t: Term, ziel: number): number {
  if (!t.op) return ziel;
  const a = t.a;
  const b = t.b ?? 0;
  switch (t.op) {
    case '+':
      return a === null ? ziel - b : ziel - a;
    case '−':
      return a === null ? ziel + b : a - ziel;
    case '·':
      return a === null ? ziel / b : ziel / a;
    case ':':
      return a === null ? ziel * b : a / ziel;
  }
}

function typischeFehler(t: Term, ziel: number, antwort: number): Fehler[] {
  const f: Fehler[] = [];
  const bekannt = (t.a ?? t.b ?? 0) as number;
  if (t.op === '+' || t.op === '−') {
    // Stellenweise „kleiner von größer“ statt richtig ergänzen
    const groesser = Math.max(ziel, bekannt);
    const kleiner = Math.min(ziel, bekannt);
    let stellenweise = 0;
    for (let e = 1; e <= groesser; e *= 10) stellenweise += Math.abs((Math.floor(groesser / e) % 10) - (Math.floor(kleiner / e) % 10)) * e;
    f.push({ wert: stellenweise, fehlerArt: 'uebertrag' });
    f.push({ wert: antwort + 10, fehlerArt: 'uebertrag' });
    f.push({ wert: antwort - 100, fehlerArt: 'uebertrag' });
    f.push({ wert: ziel + bekannt, fehlerArt: 'operation' });
  } else {
    f.push({ wert: antwort / 10, fehlerArt: 'stelle' });
    f.push({ wert: antwort * 10, fehlerArt: 'stelle' });
    f.push({ wert: t.op === '·' ? ziel - bekannt : ziel * bekannt, fehlerArt: 'operation' });
  }
  return f;
}

/** Ergänzen in Schritten bis zum nächsten Zehner, Hunderter, … und dann zum Ziel. */
export function ergaenzenSchritte(von: number, bis: number): { von: number; bis: number; plus: number }[] {
  const schritte: { von: number; bis: number; plus: number }[] = [];
  let x = von;
  for (const e of [10, 100, 1000]) {
    if (x >= bis) break;
    const naechste = Math.ceil(x / e) * e;
    if (naechste > x && naechste <= bis && naechste - x < e) {
      schritte.push({ von: x, bis: naechste, plus: naechste - x });
      x = naechste;
    }
  }
  if (x < bis) schritte.push({ von: x, bis, plus: bis - x });
  return schritte;
}
