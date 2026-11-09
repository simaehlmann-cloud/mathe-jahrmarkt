import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { neueAufgabenId } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { additionsSchritte, baueSchriftlich, ziffer } from './schriftlich';
import { zahlText } from './stellenwert';
import { runde } from './ueberschlag';
import type { Aufgabe, DetektivAufgabe, Option } from './typen';

/**
 * Fehlerdetektiv (KC: Rechenwege prüfen, Ergebnisse mit Überschlag kontrollieren).
 * Eine schriftliche Rechnung ist fertig. Stimmt sie? Wenn nicht: Welche Ergebnisziffer ist falsch?
 * Antwortcodes: Stelle der falschen Ziffer + 1 (1 = Einer, 2 = Zehner, …), STIMMT = alles richtig.
 */
export const STIMMT = 100;
type Op = DetektivAufgabe['op'];
const OPS: Readonly<Record<Stufe, Op>> = { bronze: '+', silber: '−', gold: '·' };
const STELLE = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'];

export const stelleName = (code: number): string => (code === STIMMT ? 'Alles richtig' : `${STELLE[code - 1] ?? ''}ziffer`);

export function detektivAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): DetektivAufgabe {
  void gewichtung;
  return baueDetektiv(OPS[stufe], rng.next() < 0.25, rng);
}

export function aehnlicheDetektiv(vorher: Aufgabe, rng: Rng): DetektivAufgabe {
  if (vorher.art !== 'detektiv') throw new Error(`Keine Detektiv-Aufgabe: ${vorher.text}`);
  return baueDetektiv(vorher.op, vorher.fehler === 'keiner', rng);
}

export const detektivProbe = (rng: Rng): DetektivAufgabe => {
  void rng;
  return fertig('+', [345, 132], 487, 477, 'uebertrag');
};

/** Rechnung mit genau einem typischen Fehler in einer Ergebnisziffer (oder ohne Fehler). */
export function baueDetektiv(op: Op, korrekt: boolean, rng: Rng): DetektivAufgabe {
  for (;;) {
    const s = baueSchriftlich(op, rng);
    const [a = 0, b = 0] = s.zahlen;
    const richtig = s.antwort;
    if (korrekt) return fertig(op, s.zahlen, richtig, richtig, 'keiner');
    const fehler = fehlerVariante(op, a, b, richtig, rng);
    if (fehler) return fertig(op, s.zahlen, fehler.gezeigt, richtig, fehler.art);
  }
}

function fehlerVariante(op: Op, a: number, b: number, richtig: number, rng: Rng): { gezeigt: number; art: DetektivAufgabe['fehler'] } | undefined {
  const stellen = String(richtig).length;
  if (op === '+') {
    // Übertrag vergessen: in der Spalte nach einem Übertrag fehlt 1
    const kandidaten = additionsSchritte(a, b)
      .filter((x) => x.uebertrag === 1 && x.stelle < stellen - 1)
      .map((x) => x.stelle);
    if (kandidaten.length === 0) return undefined;
    const s = rng.pick(kandidaten);
    const gezeigt = richtig - 10 ** (s + 1);
    return einZifferAnders(richtig, gezeigt) ? { gezeigt, art: 'uebertrag' } : undefined;
  }
  if (op === '−') {
    // Kleiner von größer: in einer Spalte mit Entbündeln wurde einfach umgedreht gerechnet
    for (let s = 0; s < stellen; s++) {
      const x = ziffer(a, s);
      const y = ziffer(b, s);
      if (x < y) {
        // Ziffer an Stelle s wird |x − y| statt (x + 10 − y − ...) ; die nächste Stelle bleibt ohne Entbündeln
        const falscheZiffer = y - x;
        const gezeigt = richtig - ziffer(richtig, s) * 10 ** s + falscheZiffer * 10 ** s;
        if (gezeigt !== richtig && einZifferAnders(richtig, gezeigt)) return { gezeigt, art: 'kleinerVonGroesser' };
      }
    }
    return undefined;
  }
  // Mal: eine Ziffer durch einen Einmaleins-Fehler verändert (±1 in einer Stelle)
  const s = rng.int(0, stellen - 2);
  const z = ziffer(richtig, s);
  const neu = z === 9 ? 8 : z + 1;
  return { gezeigt: richtig - z * 10 ** s + neu * 10 ** s, art: 'einmaleins' };
}

/** Prüft, dass sich genau eine Ziffer unterscheidet (gleiche Länge). */
export function einZifferAnders(x: number, y: number): boolean {
  const a = String(x);
  const b = String(y);
  if (a.length !== b.length) return false;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n === 1;
}

/** Stelle (0 = Einer) der falschen Ziffer, −1 wenn alles stimmt. */
export function falscheStelle(gezeigt: number, richtig: number): number {
  for (let s = 0; s < String(Math.max(gezeigt, richtig)).length; s++) if (ziffer(gezeigt, s) !== ziffer(richtig, s)) return s;
  return -1;
}

/** Überschlag zur Kontrolle: auf die höchste Stelle der kleineren Zahl gerundet. */
export function kontrollUeberschlag(op: Op, a: number, b: number): { a: number; b: number; ergebnis: number } {
  const st = op === '·' ? 1 : 2;
  const ra = runde(a, op === '·' ? 2 : st);
  const rb = runde(b, st);
  return { a: ra, b: rb, ergebnis: op === '+' ? ra + rb : op === '−' ? ra - rb : ra * rb };
}

function fertig(op: Op, zahlen: number[], gezeigt: number, richtig: number, fehler: DetektivAufgabe['fehler']): DetektivAufgabe {
  const s = falscheStelle(gezeigt, richtig);
  const antwort = s < 0 ? STIMMT : s + 1;
  const optionen: Option[] = [{ wert: antwort }];
  for (let i = 0; i < String(gezeigt).length; i++) if (i + 1 !== antwort) optionen.push({ wert: i + 1, fehlerArt: 'sonstige' });
  if (antwort !== STIMMT) optionen.push({ wert: STIMMT, fehlerArt: 'sonstige' });
  const [a = 0, b = 0] = zahlen;
  return {
    id: neueAufgabenId('d'),
    text: 'Stimmt die Rechnung?',
    sprechtext: `Prüfe die Rechnung ${a} ${op === '+' ? 'plus' : op === '−' ? 'minus' : 'mal'} ${b} gleich ${gezeigt}. Stimmt sie? Wenn nicht, tippe auf die falsche Ziffer.`,
    antwort,
    optionen,
    kompetenz: 'schriftlich',
    dimension: 'anwendung',
    fakt: `fd:${op}`,
    art: 'detektiv',
    op,
    zahlen,
    gezeigt,
    richtig,
    fehler,
  };
}

export const detektivRechnung = (a: DetektivAufgabe): string => `${zahlText(a.zahlen[0] ?? 0)} ${a.op} ${zahlText(a.zahlen[1] ?? 0)} = ${zahlText(a.gezeigt)}`;
