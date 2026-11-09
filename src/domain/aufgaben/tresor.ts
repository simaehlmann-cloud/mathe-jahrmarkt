import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { fehlerkatalog } from './einmaleins';
import type { Aufgabe, TresorAufgabe } from './typen';

/**
 * Zahlenrätsel-Tresor (KC: Zahlbeziehungen, Teilbarkeit, Problemlösen; Kombinatorik in Gold).
 * Rätsel: Die Hinweise lassen genau eine Zahl übrig. Kombinatorik: Wie viele Codes gibt es?
 */
interface Hinweis {
  text: string;
  gilt: (n: number) => boolean;
}

const E = (n: number) => n % 10;
const Z = (n: number) => Math.floor(n / 10) % 10;
const H = (n: number) => Math.floor(n / 100) % 10;
const quersumme = (n: number) => String(n).split('').reduce((s, z) => s + Number(z), 0);

/** Alle Hinweise, die auf die Zielzahl zutreffen. */
function hinweiseFuer(ziel: number, dreistellig: boolean, rng: Rng): Hinweis[] {
  const h: Hinweis[] = [];
  h.push(ziel % 2 === 0 ? { text: 'Die Zahl ist gerade.', gilt: (n) => n % 2 === 0 } : { text: 'Die Zahl ist ungerade.', gilt: (n) => n % 2 === 1 });
  if (ziel % 5 === 0) h.push({ text: 'Die Zahl ist durch 5 teilbar.', gilt: (n) => n % 5 === 0 });
  if (ziel % 3 === 0) h.push({ text: 'Die Zahl ist durch 3 teilbar.', gilt: (n) => n % 3 === 0 });
  for (const t of [3, 4, 6, 7, 9]) if (ziel % t === 0 && rng.next() < 0.5) h.push({ text: `Die Zahl ist in der ${t}er-Reihe.`, gilt: (n) => n % t === 0 });
  const qs = quersumme(ziel);
  h.push({ text: `Die Quersumme ist ${qs}.`, gilt: (n) => quersumme(n) === qs });
  // Grenzen
  const max = dreistellig ? 999 : 99;
  const unten = Math.max(dreistellig ? 100 : 10, Math.floor((ziel - rng.int(5, dreistellig ? 150 : 25)) / 10) * 10);
  const oben = Math.min(max + 1, Math.ceil((ziel + rng.int(5, dreistellig ? 150 : 25)) / 10) * 10);
  h.push({ text: `Die Zahl liegt zwischen ${unten} und ${oben}.`, gilt: (n) => n > unten && n < oben });
  // Ziffernbeziehungen
  const e = E(ziel);
  const z = Z(ziel);
  if (z > e) h.push({ text: `Die Zehnerziffer ist um ${z - e} größer als die Einerziffer.`, gilt: (n) => Z(n) - E(n) === z - e });
  if (e > z) h.push({ text: `Die Einerziffer ist um ${e - z} größer als die Zehnerziffer.`, gilt: (n) => E(n) - Z(n) === e - z });
  if (z === e) h.push({ text: 'Zehner- und Einerziffer sind gleich.', gilt: (n) => Z(n) === E(n) });
  h.push({ text: `Die Einerziffer ist ${e}.`, gilt: (n) => E(n) === e });
  if (dreistellig) {
    const hz = H(ziel);
    if (hz === 2 * e && e > 0) h.push({ text: 'Die Hunderterziffer ist doppelt so groß wie die Einerziffer.', gilt: (n) => H(n) === 2 * E(n) });
    if (hz === z) h.push({ text: 'Hunderter- und Zehnerziffer sind gleich.', gilt: (n) => H(n) === Z(n) });
    h.push({ text: `Die Hunderterziffer ist ${hz < 5 ? 'kleiner als 5' : 'mindestens 5'}.`, gilt: (n) => (hz < 5 ? H(n) < 5 : H(n) >= 5) });
    if (hz + z + e > 0) h.push({ text: `Die Zahl hat ${hz} Hunderter.`, gilt: (n) => H(n) === hz });
  }
  return h;
}

/** Hinweise so wählen, dass genau die Zielzahl übrig bleibt (höchstens 4 Hinweise). */
export function waehleHinweise(ziel: number, dreistellig: boolean, rng: Rng): Hinweis[] | undefined {
  const alle = rng.shuffle(hinweiseFuer(ziel, dreistellig, rng));
  const bereich = dreistellig ? range(100, 999) : range(10, 99);
  let kandidaten = bereich;
  const gewaehlt: Hinweis[] = [];
  // Gierig: jeweils den Hinweis, der am meisten ausschließt; aber nie gleich einen „verratenden“ zuerst
  const verraet = (x: Hinweis) => x.text.startsWith('Die Einerziffer ist ') || x.text.startsWith('Die Zahl hat ');
  while (kandidaten.length > 1 && gewaehlt.length < 4) {
    const verfuegbar = alle.filter((x) => !gewaehlt.includes(x) && (gewaehlt.length >= 2 || !verraet(x)));
    if (verfuegbar.length === 0) break;
    let best: Hinweis | undefined;
    let bestN = Infinity;
    for (const x of verfuegbar) {
      const n = kandidaten.filter(x.gilt).length;
      if (n < bestN && n < kandidaten.length) {
        best = x;
        bestN = n;
      }
    }
    if (!best) break;
    gewaehlt.push(best);
    kandidaten = kandidaten.filter(best.gilt);
  }
  return kandidaten.length === 1 && kandidaten[0] === ziel && gewaehlt.length >= 2 ? gewaehlt : undefined;
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function tresorAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): TresorAufgabe {
  void gewichtung;
  if (stufe === 'gold') return rng.next() < 0.6 ? baueKombinatorik(rng) : baueRaetsel(true, rng);
  return baueRaetsel(stufe === 'silber', rng);
}

export function aehnlicheTresor(vorher: Aufgabe, rng: Rng): TresorAufgabe {
  if (vorher.art !== 'tresor') throw new Error(`Keine Tresor-Aufgabe: ${vorher.text}`);
  return vorher.form === 'kombinatorik' ? baueKombinatorik(rng) : baueRaetsel(vorher.stellen === 3, rng);
}

export const tresorProbe = (rng: Rng): TresorAufgabe => {
  void rng;
  return fertigRaetsel(
    50,
    [
      { text: 'Die Zahl ist durch 10 teilbar.', gilt: (n) => n % 10 === 0 },
      { text: 'Die Zahl liegt zwischen 40 und 60.', gilt: (n) => n > 40 && n < 60 },
    ],
    2,
  );
};

export function baueRaetsel(dreistellig: boolean, rng: Rng): TresorAufgabe {
  for (;;) {
    const ziel = dreistellig ? rng.int(102, 987) : rng.int(12, 98);
    const h = waehleHinweise(ziel, dreistellig, rng);
    if (h) return fertigRaetsel(ziel, h, dreistellig ? 3 : 2);
  }
}

function fertigRaetsel(ziel: number, h: Hinweis[], stellen: number): TresorAufgabe {
  const hinweise = h.map((x) => x.text);
  const f: Fehler[] = [
    { wert: Number(String(ziel).split('').reverse().join('')), fehlerArt: 'ziffern' },
    { wert: ziel + 1, fehlerArt: 'sonstige' },
    { wert: ziel - 1, fehlerArt: 'sonstige' },
  ];
  return {
    id: neueAufgabenId('t'),
    text: 'Knacke den Code!',
    sprechtext: `Knacke den Code. ${hinweise.join(' ')}`,
    antwort: ziel,
    optionen: fehlerkatalog(ziel, f.filter((x) => x.wert !== ziel && x.wert > 0)),
    eingabe: 'ziffern',
    kompetenz: 'zahlverstaendnis',
    dimension: 'anwendung',
    fakt: `tr:raetsel${stellen}`,
    art: 'tresor',
    form: 'raetsel',
    hinweise,
    pruefungen: h.map((x) => x.gilt),
    stellen,
  };
}

/* ---------- Kombinatorik ---------- */

/** Alle Codes einer Länge aus den Ziffern, mit oder ohne Wiederholung. */
export function codes(ziffern: readonly number[], laenge: number, wiederholung: boolean): string[] {
  const ergebnis: string[] = [];
  const bau = (bisher: number[]) => {
    if (bisher.length === laenge) {
      ergebnis.push(bisher.join(''));
      return;
    }
    for (const z of ziffern) if (wiederholung || !bisher.includes(z)) bau([...bisher, z]);
  };
  bau([]);
  return ergebnis;
}

export function baueKombinatorik(rng: Rng): TresorAufgabe {
  const variante = rng.pick([
    { ziffern: [1, 2, 3], laenge: 3, wdh: false },
    { ziffern: [2, 5, 7], laenge: 3, wdh: false },
    { ziffern: [1, 2, 3, 4], laenge: 2, wdh: false },
    { ziffern: [1, 2, 3, 4], laenge: 2, wdh: true },
    { ziffern: [3, 6, 9], laenge: 2, wdh: true },
    { ziffern: [1, 2, 3, 4], laenge: 3, wdh: false },
  ]);
  const alle = codes(variante.ziffern, variante.laenge, variante.wdh);
  const zl = variante.ziffern.join(', ').replace(/, (\d)$/, ' und $1');
  const hinweis = `Der Code hat ${variante.laenge} Stellen und nur die Ziffern ${zl}. ${variante.wdh ? 'Ziffern dürfen sich wiederholen.' : 'Jede Ziffer kommt höchstens einmal vor.'}`;
  const antwort = alle.length;
  const n = variante.ziffern.length;
  const f: Fehler[] = [
    { wert: n, fehlerArt: 'sonstige' },
    { wert: n * variante.laenge, fehlerArt: 'sonstige' },
    { wert: variante.wdh ? codes(variante.ziffern, variante.laenge, false).length : n ** variante.laenge, fehlerArt: 'sonstige' },
  ];
  return {
    id: neueAufgabenId('k'),
    text: 'Wie viele Codes gibt es?',
    sprechtext: `${hinweis} Wie viele verschiedene Codes gibt es?`,
    antwort,
    optionen: fehlerkatalog(antwort, f.filter((x) => x.wert !== antwort)),
    eingabe: 'ziffern',
    kompetenz: 'zahlverstaendnis',
    dimension: 'anwendung',
    fakt: `tr:kombi`,
    art: 'tresor',
    form: 'kombinatorik',
    hinweise: [hinweis, 'Wie viele verschiedene Codes gibt es?'],
    pruefungen: [],
    stellen: 2,
    moeglichkeiten: alle,
  };
}
