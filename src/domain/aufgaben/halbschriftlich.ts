import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { auswahl, neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { zahlText } from './stellenwert';
import type { Aufgabe, HalbschriftlichAufgabe } from './typen';

/**
 * Rechendomino: halbschriftliches Rechnen (KC: Rechenwege mit Zerlegen, Ergänzen, Hilfsaufgaben).
 * Jede Aufgabe kennt ihren Rechenweg in Schritten; die Hilfe zeigt ihn.
 */
type Op = HalbschriftlichAufgabe['op'];

const OPS: Readonly<Record<Stufe, readonly Op[]>> = {
  bronze: ['+', '−'],
  silber: ['·', ':'],
  gold: ['+', '−', '·', ':'],
};

const t = zahlText;

export function halbschriftlichAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): HalbschriftlichAufgabe {
  const op = rng.weighted([...OPS[stufe]], (o) => gewichtung(`hs:${o}`));
  return baueHalbschriftlich(op, stufe === 'gold', rng);
}

export function aehnlicheHalbschriftlich(vorher: Aufgabe, rng: Rng): HalbschriftlichAufgabe {
  if (vorher.art !== 'halbschriftlich') throw new Error(`Keine halbschriftliche Aufgabe: ${vorher.text}`);
  return baueHalbschriftlich(vorher.op, vorher.a >= 1000 || (vorher.op === '·' && vorher.a >= 100) || (vorher.op === ':' && vorher.antwort >= 100), rng);
}

export const halbschriftlichProbe = (rng: Rng): HalbschriftlichAufgabe => fertig('+', 230, 40, rng);

export function baueHalbschriftlich(op: Op, gross: boolean, rng: Rng): HalbschriftlichAufgabe {
  switch (op) {
    case '+': {
      // Mit Übertrag bei Einern oder Zehnern, Ergebnis höchstens 1 000 (groß: 10 000)
      for (;;) {
        const a = gross ? rng.int(1200, 8800) : rng.int(120, 880);
        const b = gross ? rng.int(2, 9) * 100 + rng.int(11, 89) : rng.int(0, 1) ? rng.int(13, 89) : rng.int(2, 6) * 100 + rng.int(1, 9) * 10;
        const summe = a + b;
        const uebertrag = (a % 10) + (b % 10) >= 10 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10;
        if (uebertrag && summe <= (gross ? 9999 : 1000)) return fertig('+', a, b, rng);
      }
    }
    case '−': {
      for (;;) {
        const a = gross ? rng.int(1500, 9900) : rng.int(150, 990);
        const b = gross ? rng.int(2, 9) * 100 + rng.int(11, 89) : rng.int(0, 1) ? rng.int(13, 89) : rng.int(1, 4) * 100 + rng.int(1, 9) * 10;
        const entbuendeln = a % 10 < b % 10 || Math.floor(a / 10) % 10 < Math.floor(b / 10) % 10;
        if (entbuendeln && a - b > 0) return fertig('−', a, b, rng);
      }
    }
    case '·': {
      const b = rng.int(3, 9);
      const a = gross ? rng.int(101, Math.floor(999 / b)) : rng.int(12, 99);
      if (a % 10 === 0) return baueHalbschriftlich(op, gross, rng);
      return fertig('·', a, b, rng);
    }
    case ':': {
      const d = rng.int(2, 9);
      const q = gross ? rng.int(101, Math.floor(999 / d)) : rng.int(12, Math.min(99, Math.floor(999 / d)));
      if (q % 10 === 0) return baueHalbschriftlich(op, gross, rng);
      return fertig(':', q * d, d, rng);
    }
  }
}

/** Ergebnis ohne Übertrag (Stelle für Stelle, Überlauf weggelassen) bzw. „kleiner von größer“ beim Minus. */
function stellenweise(a: number, b: number, op: '+' | '−'): number {
  let r = 0;
  for (let e = 1; e <= Math.max(a, b); e *= 10) {
    const x = Math.floor(a / e) % 10;
    const y = Math.floor(b / e) % 10;
    r += (op === '+' ? (x + y) % 10 : Math.abs(x - y)) * e;
  }
  return r;
}

/** Zerlegung des zweiten Summanden/Subtrahenden nach Stellen: 245 → [200, 40, 5]. */
const zerlege = (n: number): number[] =>
  String(n)
    .split('')
    .map((z, i, alle) => Number(z) * 10 ** (alle.length - 1 - i))
    .filter((x) => x > 0);

export function rechenweg(op: Op, a: number, b: number): string[] {
  switch (op) {
    case '+':
    case '−': {
      const schritte: string[] = [];
      let x = a;
      for (const teil of zerlege(b)) {
        const y = op === '+' ? x + teil : x - teil;
        schritte.push(`${t(x)} ${op} ${t(teil)} = ${t(y)}`);
        x = y;
      }
      return schritte;
    }
    case '·': {
      const teile = zerlege(a);
      const produkte = teile.map((p) => p * b);
      return [...teile.map((p, i) => `${t(p)} · ${b} = ${t(produkte[i] ?? 0)}`), `${produkte.map(t).join(' + ')} = ${t(a * b)}`];
    }
    case ':': {
      const q = a / b;
      const grob = Math.floor(q / 10) * 10;
      const fein = q - grob;
      return [`${t(grob * b)} : ${b} = ${t(grob)}`, `${t(fein * b)} : ${b} = ${fein}`, `${t(grob)} + ${fein} = ${t(q)}`];
    }
  }
}

function fertig(op: Op, a: number, b: number, rng: Rng): HalbschriftlichAufgabe {
  const antwort = op === '+' ? a + b : op === '−' ? a - b : op === '·' ? a * b : a / b;
  const fehler: Fehler[] = [];
  if (op === '+' || op === '−') {
    fehler.push({ wert: stellenweise(a, b, op), fehlerArt: 'uebertrag' });
    fehler.push({ wert: op === '+' ? antwort - 10 : antwort + 10, fehlerArt: 'uebertrag' });
    if (b < 100) fehler.push({ wert: op === '+' ? a + b * 10 : a - b * 10, fehlerArt: 'stelle' });
    fehler.push({ wert: op === '+' ? a - b : a + b, fehlerArt: 'operation' });
  } else if (op === '·') {
    const zehner = Math.floor(a / 10) * 10;
    // Nur die Zehner malgenommen und die Einer addiert: 7 · 36 = 210 + 6
    fehler.push({ wert: zehner * b + (a % 10), fehlerArt: 'sonstige' });
    fehler.push({ wert: antwort + 10, fehlerArt: 'uebertrag' });
    fehler.push({ wert: a * (b - 1), fehlerArt: 'nachbaraufgabe' });
    fehler.push({ wert: a * (b + 1), fehlerArt: 'nachbaraufgabe' });
  } else {
    fehler.push({ wert: antwort + 1, fehlerArt: 'nachbaraufgabe' });
    fehler.push({ wert: antwort * 10, fehlerArt: 'stelle' });
    fehler.push({ wert: antwort - 1, fehlerArt: 'nachbaraufgabe' });
    fehler.push({ wert: a - b, fehlerArt: 'operation' });
  }
  const zeichen = op === '·' ? 'mal' : op === ':' ? 'geteilt durch' : op === '+' ? 'plus' : 'minus';
  return {
    id: neueAufgabenId('h'),
    text: `${t(a)} ${op} ${t(b)}`,
    sprechtext: `${a} ${zeichen} ${b}`,
    antwort,
    optionen: auswahl(antwort, fehler, rng, op === ':' ? 2 : 10),
    kompetenz: 'halbschriftlich',
    dimension: op === '+' || op === '−' ? 'sicherheit' : 'anwendung',
    fakt: `hs:${op}`,
    art: 'halbschriftlich',
    op,
    a,
    b,
    weg: rechenweg(op, a, b),
  };
}
