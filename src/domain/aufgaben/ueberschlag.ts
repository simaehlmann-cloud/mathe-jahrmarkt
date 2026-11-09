import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { auswahl, neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { zahlText } from './stellenwert';
import type { Aufgabe, UeberschlagAufgabe } from './typen';

/**
 * Überschlags-Waage (KC: Runden, Ergebnisse durch Überschlag abschätzen und prüfen).
 * Auf der Waage liegt ein Sack mit der Rechnung; das Kind legt das passende runde Gewicht dazu.
 * Richtig ist der Überschlag mit der Rundungsregel der Schule (ab 5 aufrunden).
 */

export const runde = (n: number, stelle: number): number => {
  const e = 10 ** stelle;
  return Math.floor(n / e + 0.5) * e;
};

const STELLEN_WORT = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'] as const;
type Form = UeberschlagAufgabe['form'];

const FORMEN: Readonly<Record<Stufe, readonly Form[]>> = {
  bronze: ['runden'],
  silber: ['plus', 'minus', 'runden'],
  gold: ['mal', 'plus', 'minus'],
};

export function ueberschlagAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): UeberschlagAufgabe {
  const form = rng.weighted([...FORMEN[stufe]], (f) => gewichtung(`ue:${f}`));
  return baueUeberschlag(form, stufe, rng);
}

export function aehnlicheUeberschlag(vorher: Aufgabe, rng: Rng): UeberschlagAufgabe {
  if (vorher.art !== 'ueberschlag') throw new Error(`Keine Überschlags-Aufgabe: ${vorher.text}`);
  const gross = vorher.zahlen.some((z) => z >= 1000);
  return baueUeberschlag(vorher.form, vorher.form === 'mal' ? 'gold' : gross ? 'gold' : vorher.form === 'runden' ? 'bronze' : 'silber', rng);
}

export const ueberschlagProbe = (rng: Rng): UeberschlagAufgabe => fertig('runden', [290], [2], rng);

/** Zahl, die nicht schon rund ist und nicht genau auf der Hälfte liegt (die Regel kommt in der Hilfe). */
function zahl(von: number, bis: number, stelle: number, rng: Rng): number {
  const e = 10 ** stelle;
  for (;;) {
    const n = rng.int(von, bis);
    const rest = n % e;
    if (rest !== 0 && Math.abs(rest - e / 2) >= e / 10) return n;
  }
}

export function baueUeberschlag(form: Form, stufe: Stufe, rng: Rng): UeberschlagAufgabe {
  for (let versuch = 0; versuch < 200; versuch++) {
    let a: UeberschlagAufgabe | undefined;
    switch (form) {
      case 'runden': {
        const stelle = stufe === 'bronze' ? rng.pick([1, 2]) : rng.pick([2, 3]);
        const n = stelle === 1 ? zahl(11, 989, 1, rng) : stelle === 2 ? zahl(110, stufe === 'bronze' ? 990 : 9890, 2, rng) : zahl(1100, 98900, 3, rng);
        a = fertig('runden', [n], [stelle], rng);
        break;
      }
      case 'plus':
      case 'minus': {
        const gross = stufe === 'gold';
        const stelle = gross ? 3 : 2;
        const x = zahl(gross ? 1100 : 110, gross ? 8900 : 890, stelle, rng);
        const y = zahl(gross ? 1100 : 110, gross ? 8900 : 890, stelle, rng);
        const [p, q] = form === 'minus' && y > x ? [y, x] : [x, y];
        a = fertig(form, [p, q], [stelle, stelle], rng);
        break;
      }
      case 'mal': {
        if (rng.next() < 0.5) {
          a = fertig('mal', [zahl(12, 98, 1, rng), zahl(11, 49, 1, rng)], [1, 1], rng);
        } else {
          a = fertig('mal', [zahl(110, 890, 2, rng), rng.int(3, 9)], [2, 0], rng);
        }
        break;
      }
    }
    if (a && eindeutig(a)) return a;
  }
  // Rückfall, kommt praktisch nicht vor
  return fertig('runden', [347], [2], rng);
}

/** Die richtige Antwort muss dem genauen Ergebnis näher sein als jede falsche, sonst wäre die Waage unfair. */
function eindeutig(a: UeberschlagAufgabe): boolean {
  if (a.form === 'runden') return true;
  const d = Math.abs(a.genau - a.antwort);
  return a.antwort > 0 && a.optionen.every((o) => o.wert === a.antwort || Math.abs(a.genau - o.wert) > d);
}

function fertig(form: Form, zahlen: number[], stellen: number[], rng: Rng): UeberschlagAufgabe {
  const gerundet = zahlen.map((z, i) => runde(z, stellen[i] ?? 0));
  const [g0 = 0, g1 = 0] = gerundet;
  const [z0 = 0, z1 = 0] = zahlen;
  let antwort: number;
  let genau: number;
  let text: string;
  let sprechtext: string;
  const fehler: Fehler[] = [];
  const einheit = 10 ** Math.max(...stellen);
  switch (form) {
    case 'runden': {
      const s = stellen[0] ?? 1;
      antwort = g0;
      genau = z0;
      text = `${zahlText(z0)} auf ${STELLEN_WORT[s]}`;
      sprechtext = `Runde ${z0} auf ${STELLEN_WORT[s]}.`;
      const e = 10 ** s;
      const ab = Math.floor(z0 / e) * e;
      fehler.push(
        { wert: ab === g0 ? ab + e : ab, fehlerArt: 'runden' },
        { wert: runde(z0, s === 1 ? 2 : s - 1), fehlerArt: 'runden' },
        { wert: g0 * 10, fehlerArt: 'stelle' },
      );
      break;
    }
    case 'plus':
    case 'minus': {
      const plus = form === 'plus';
      antwort = plus ? g0 + g1 : g0 - g1;
      genau = plus ? z0 + z1 : z0 - z1;
      text = `${zahlText(z0)} ${plus ? '+' : '−'} ${zahlText(z1)} ≈ ?`;
      sprechtext = `Ungefähr wie viel ist ${z0} ${plus ? 'plus' : 'minus'} ${z1}?`;
      fehler.push(
        { wert: antwort + einheit, fehlerArt: 'runden' },
        { wert: antwort - einheit, fehlerArt: 'runden' },
        { wert: plus ? g0 - g1 : g0 + g1, fehlerArt: 'operation' },
        { wert: antwort * 10, fehlerArt: 'stelle' },
      );
      break;
    }
    case 'mal': {
      antwort = g0 * g1;
      genau = z0 * z1;
      text = `${zahlText(z0)} · ${zahlText(z1)} ≈ ?`;
      sprechtext = `Ungefähr wie viel ist ${z0} mal ${z1}?`;
      const e0 = 10 ** (stellen[0] ?? 1);
      fehler.push(
        { wert: antwort * 10, fehlerArt: 'stelle' },
        { wert: (g0 + e0) * g1, fehlerArt: 'runden' },
        { wert: (g0 - e0) * g1, fehlerArt: 'runden' },
        { wert: g0 + g1, fehlerArt: 'operation' },
        { wert: antwort / 10, fehlerArt: 'stelle' },
      );
      break;
    }
  }
  return {
    id: neueAufgabenId('u'),
    text,
    sprechtext,
    antwort,
    optionen: auswahl(antwort, fehler, rng, einheit),
    kompetenz: 'halbschriftlich',
    dimension: form === 'runden' ? 'wissen' : 'anwendung',
    fakt: `ue:${form}`,
    art: 'ueberschlag',
    form,
    zahlen,
    gerundet,
    stellen,
    genau,
  };
}
