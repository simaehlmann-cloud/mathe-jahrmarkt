import type { Subtraktionsverfahren } from '../../services/datenbestand';
import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { fehlerkatalog } from './einmaleins';
import { zahlText } from './stellenwert';
import type { Aufgabe, SchriftlichAufgabe } from './typen';

/**
 * Rechen-Werkstatt (KC: schriftliche Addition, Subtraktion, Multiplikation).
 * Das Kind schreibt das Ergebnis Ziffer für Ziffer von rechts nach links.
 */
type Op = SchriftlichAufgabe['op'];
const OPS: Readonly<Record<Stufe, Op>> = { bronze: '+', silber: '−', gold: '·' };

export const ziffernVon = (n: number): number[] => String(n).split('').map(Number);
export const ziffer = (n: number, stelle: number): number => Math.floor(n / 10 ** stelle) % 10;

export function schriftlichAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): SchriftlichAufgabe {
  void gewichtung;
  return baueSchriftlich(OPS[stufe], rng);
}

export function aehnlicheSchriftlich(vorher: Aufgabe, rng: Rng): SchriftlichAufgabe {
  if (vorher.art !== 'schriftlich') throw new Error(`Keine schriftliche Aufgabe: ${vorher.text}`);
  return baueSchriftlich(vorher.op, rng);
}

export const schriftlichProbe = (rng: Rng): SchriftlichAufgabe => fertig('+', [234, 152], rng);

/** Wie viele Überträge bzw. Entbündelungen eine Rechnung braucht. */
export function uebertraege(op: '+' | '−', a: number, b: number): number {
  let u = 0;
  let n = 0;
  for (let s = 0; s < String(Math.max(a, b)).length; s++) {
    const x = ziffer(a, s);
    const y = ziffer(b, s) + (op === '−' ? u : 0);
    if (op === '+') {
      u = x + y + u >= 10 ? 1 : 0;
    } else {
      u = x < y ? 1 : 0;
    }
    n += u;
  }
  return n;
}

export function baueSchriftlich(op: Op, rng: Rng): SchriftlichAufgabe {
  for (;;) {
    if (op === '+') {
      const a = rng.int(234, 879);
      const b = rng.int(128, 699);
      if (uebertraege('+', a, b) >= 1 && a + b <= 1499) return fertig('+', [a, b], rng);
    } else if (op === '−') {
      const a = rng.int(412, 980);
      const b = rng.int(126, a - 60);
      if (uebertraege('−', a, b) >= 1) return fertig('−', [a, b], rng);
    } else {
      const a = rng.int(112, 489);
      const b = rng.int(12, 39);
      if (b % 10 !== 0 && a % 10 !== 0 && a * b < 20000) return fertig('·', [a, b], rng);
    }
  }
}

/** Ergebnis ohne Überträge (bzw. „kleiner von größer“ beim Minus). */
export function ohneUebertrag(op: '+' | '−', a: number, b: number): number {
  let r = 0;
  for (let s = 0; s < String(Math.max(a, b)).length; s++) {
    const x = ziffer(a, s);
    const y = ziffer(b, s);
    r += (op === '+' ? (x + y) % 10 : Math.abs(x - y)) * 10 ** s;
  }
  return r;
}

function fertig(op: Op, zahlen: number[], rng: Rng): SchriftlichAufgabe {
  void rng;
  const [a = 0, b = 0] = zahlen;
  const antwort = op === '+' ? a + b : op === '−' ? a - b : a * b;
  const f: Fehler[] = [];
  if (op === '+' || op === '−') {
    f.push({ wert: ohneUebertrag(op, a, b), fehlerArt: op === '+' ? 'uebertrag' : 'uebertrag' });
    f.push({ wert: antwort + (op === '+' ? -10 : 10), fehlerArt: 'uebertrag' });
    f.push({ wert: antwort + (op === '+' ? -100 : 100), fehlerArt: 'uebertrag' });
  } else {
    const zehner = Math.floor(b / 10);
    const einer = b % 10;
    // Zweites Teilprodukt nicht verschoben: a · 2 statt a · 20
    f.push({ wert: a * einer + a * zehner, fehlerArt: 'stelle' });
    f.push({ wert: a * zehner * 10, fehlerArt: 'sonstige' });
    f.push({ wert: a * einer, fehlerArt: 'sonstige' });
    f.push({ wert: antwort + 10, fehlerArt: 'uebertrag' });
    f.push({ wert: antwort - 10, fehlerArt: 'uebertrag' });
  }
  const zeichen = op === '+' ? 'plus' : op === '−' ? 'minus' : 'mal';
  return {
    id: neueAufgabenId('s'),
    text: `${zahlText(a)} ${op} ${zahlText(b)}`,
    sprechtext: `Rechne schriftlich: ${a} ${zeichen} ${b}.`,
    antwort,
    optionen: fehlerkatalog(antwort, f),
    eingabe: 'ziffern',
    kompetenz: 'schriftlich',
    dimension: 'wissen',
    fakt: `sr:${op}`,
    art: 'schriftlich',
    op,
    zahlen,
  };
}

/* ---------- Rechenweg für die Hilfe ---------- */

export interface Spaltenschritt {
  stelle: number;
  text: string;
  ziffer: number;
  uebertrag: number;
}

const STELLE = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'];

/** Addition Spalte für Spalte, mit Übertrag. */
export function additionsSchritte(a: number, b: number): Spaltenschritt[] {
  const schritte: Spaltenschritt[] = [];
  let u = 0;
  const n = String(a + b).length;
  for (let s = 0; s < n; s++) {
    const x = ziffer(a, s);
    const y = ziffer(b, s);
    const summe = x + y + u;
    const teile = [x, y, u].filter((v, i) => i < 2 || v > 0);
    schritte.push({
      stelle: s,
      text: `${STELLE[s]}: ${teile.join(' + ')} = ${summe}${summe >= 10 ? `, schreibe ${summe % 10}, übertrage 1` : ''}`,
      ziffer: summe % 10,
      uebertrag: summe >= 10 ? 1 : 0,
    });
    u = summe >= 10 ? 1 : 0;
  }
  return schritte;
}

/** Subtraktion Spalte für Spalte im Verfahren der Schule. */
export function subtraktionsSchritte(a: number, b: number, verfahren: Subtraktionsverfahren): Spaltenschritt[] {
  const schritte: Spaltenschritt[] = [];
  const ergaenzen = verfahren.startsWith('ergaenzen');
  const entbuendeln = verfahren.endsWith('entbuendeln');
  let u = 0;
  // Beim Entbündeln wird die obere Zahl verändert
  const oben = ziffernVon(a).reverse();
  for (let s = 0; s < String(a).length; s++) {
    let x = entbuendeln ? (oben[s] ?? 0) : ziffer(a, s);
    const y = ziffer(b, s) + (entbuendeln ? 0 : u);
    const borgen = x < y;
    if (borgen) x += 10;
    const d = x - y;
    let text: string;
    if (entbuendeln && borgen) {
      oben[s + 1] = (oben[s + 1] ?? 0) - 1;
      text = ergaenzen
        ? `${STELLE[s]}: ${y} bis ${x - 10} geht nicht. Entbündeln: ${x}. Von ${y} bis ${x} sind ${d}.`
        : `${STELLE[s]}: ${x - 10} − ${y} geht nicht. Entbündeln: ${x} − ${y} = ${d}.`;
    } else if (borgen) {
      text = ergaenzen
        ? `${STELLE[s]}: von ${y} bis ${x} sind ${d}. Übertrag 1 bei den ${STELLE[s + 1] ?? ''}n.`
        : `${STELLE[s]}: ${x} − ${y} = ${d} (erweitert). Übertrag 1 bei den ${STELLE[s + 1] ?? ''}n.`;
    } else {
      text = ergaenzen ? `${STELLE[s]}: von ${y} bis ${x} sind ${d}.` : `${STELLE[s]}: ${x} − ${y} = ${d}.`;
    }
    schritte.push({ stelle: s, text, ziffer: d, uebertrag: borgen ? 1 : 0 });
    u = borgen ? 1 : 0;
  }
  // führende Nullen entfernen
  while (schritte.length > 1 && schritte[schritte.length - 1]?.ziffer === 0) schritte.pop();
  return schritte;
}

/** Multiplikation: zwei Teilprodukte und ihre Summe. */
export function multiplikationsSchritte(a: number, b: number): string[] {
  const z = Math.floor(b / 10);
  const e = b % 10;
  return [
    `${zahlText(a)} · ${z} Zehner = ${zahlText(a * z)} Zehner, also ${zahlText(a * z * 10)} (eine Stelle nach links)`,
    `${zahlText(a)} · ${e} = ${zahlText(a * e)}`,
    `${zahlText(a * z * 10)} + ${zahlText(a * e)} = ${zahlText(a * b)}`,
  ];
}
