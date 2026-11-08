import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Aufgabe, FehlerArt, Option, Rechenart } from './typen';

/** Kernaufgaben des kleinen 1×1 nach KC: Aufgaben mit einem Faktor 1, 2, 5 oder 10. */
export const KERN_FAKTOREN: readonly number[] = [1, 2, 5, 10];
export const FAKTOREN: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const OPTIONEN_PRO_AUFGABE = 4;

export const istKern = (a: number, b: number): boolean => KERN_FAKTOREN.includes(a) || KERN_FAKTOREN.includes(b);

export const faktSchluessel = (a: number, b: number): string => `${Math.min(a, b)}x${Math.max(a, b)}`;

export interface Fakt {
  a: number;
  b: number;
}

/** Alle Fakten einer Stufe. Bronze: nur Kernaufgaben. Silber und Gold: das ganze kleine 1×1. */
export function faktenDerStufe(stufe: Stufe): Fakt[] {
  const liste: Fakt[] = [];
  for (const a of FAKTOREN) {
    for (const b of FAKTOREN) {
      if (stufe === 'bronze' && !istKern(a, b)) continue;
      liste.push({ a, b });
    }
  }
  return liste;
}

/** Gewichtung, mit der ein Fakt gezogen wird. Höher = häufiger. */
export type Gewichtung = (fakt: Fakt) => number;

const gleichverteilt: Gewichtung = () => 1;

/**
 * Silber: abgeleitete Aufgaben kommen doppelt so oft wie Kernaufgaben,
 * weil die Kernaufgaben aus Bronze bekannt sind.
 */
const stufenGewicht = (stufe: Stufe, f: Fakt): number => (stufe === 'bronze' ? 1 : istKern(f.a, f.b) ? 1 : 2);

let zaehler = 0;
const neueId = (): string => `a${++zaehler}`;

/** Erzeugt eine Aufgabe der Stufe. Die Gewichtung kommt aus der Adaptivität. */
export function einmaleinsAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = gleichverteilt): Aufgabe {
  const fakt = rng.weighted(faktenDerStufe(stufe), (f) => stufenGewicht(stufe, f) * gewichtung(f));
  const art: Rechenart = stufe === 'gold' ? rng.weighted<Rechenart>(['mal', 'geteilt', 'platzhalter'], (r) => (r === 'mal' ? 2 : 1)) : 'mal';
  return baueAufgabe(fakt, art, rng);
}

/**
 * Ähnliche Aufgabe nach einem Fehler: dieselbe Reihe, Nachbarfaktor, gleiche Rechenart.
 * So wendet das Kind die Hilfe sofort an.
 */
export function aehnlicheAufgabe(vorher: Aufgabe, rng: Rng): Aufgabe {
  const kandidaten: Fakt[] = [];
  for (const d of [-1, 1]) {
    const nb = vorher.b + d;
    if (nb >= 1 && nb <= 10) kandidaten.push({ a: vorher.a, b: nb });
  }
  const fakt = rng.pick(kandidaten);
  return baueAufgabe(fakt, vorher.art, rng);
}

export function baueAufgabe(fakt: Fakt, art: Rechenart, rng: Rng): Aufgabe {
  // Tauschaufgabe: in der Hälfte der Fälle Faktoren vertauscht anzeigen (nur bei Mal).
  const tausch = art === 'mal' && rng.next() < 0.5;
  const a = tausch ? fakt.b : fakt.a;
  const b = tausch ? fakt.a : fakt.b;
  const produkt = a * b;
  let text: string;
  let sprechtext: string;
  let antwort: number;
  switch (art) {
    case 'mal':
      text = `${a} · ${b}`;
      sprechtext = `${a} mal ${b}`;
      antwort = produkt;
      break;
    case 'geteilt':
      text = `${produkt} : ${a}`;
      sprechtext = `${produkt} geteilt durch ${a}`;
      antwort = b;
      break;
    case 'platzhalter':
      text = `${a} · _ = ${produkt}`;
      sprechtext = `${a} mal wie viel ist ${produkt}?`;
      antwort = b;
      break;
  }
  return {
    id: neueId(),
    text,
    sprechtext,
    antwort,
    optionen: optionenFuer(art, a, b, rng),
    kompetenz: 'kopfrechnen',
    dimension: art === 'mal' ? 'sicherheit' : 'wissen',
    fakt: faktSchluessel(a, b),
    art,
    a,
    b,
    kern: istKern(a, b),
  };
}

/** Falsche Antworten aus typischen Fehlvorstellungen, ergänzt um nahe Zahlen. */
export function distraktoren(art: Rechenart, a: number, b: number): { wert: number; fehlerArt: FehlerArt }[] {
  const p = a * b;
  const liste: { wert: number; fehlerArt: FehlerArt }[] = [];
  if (art === 'mal') {
    liste.push(
      { wert: a * (b + 1), fehlerArt: 'nachbaraufgabe' },
      { wert: a * (b - 1), fehlerArt: 'nachbaraufgabe' },
      { wert: (a + 1) * b, fehlerArt: 'nachbaraufgabe' },
      { wert: (a - 1) * b, fehlerArt: 'nachbaraufgabe' },
      { wert: a + b, fehlerArt: 'operation' },
      { wert: zifferntausch(p), fehlerArt: 'ziffern' },
    );
    // Um 10 daneben ist nur bei zweistelligen Ergebnissen ein Verrechnen, nicht bei 12 → 2.
    if (p >= 20) liste.push({ wert: p + 10, fehlerArt: 'zehner' }, { wert: p - 10, fehlerArt: 'zehner' });
  } else {
    // Gesucht ist b, gegeben sind a und p.
    liste.push(
      { wert: b + 1, fehlerArt: 'nachbaraufgabe' },
      { wert: b - 1, fehlerArt: 'nachbaraufgabe' },
      { wert: p - a, fehlerArt: 'operation' },
      { wert: p, fehlerArt: 'umkehr' },
      { wert: a, fehlerArt: 'umkehr' },
    );
  }
  return liste;
}

function zifferntausch(n: number): number {
  if (n < 10 || n > 99) return -1;
  const umgedreht = (n % 10) * 10 + Math.floor(n / 10);
  return umgedreht;
}

function optionenFuer(art: Rechenart, a: number, b: number, rng: Rng): Option[] {
  const antwort = art === 'mal' ? a * b : b;
  const gesehen = new Set<number>([antwort]);
  const falsche: Option[] = [];
  // Zuerst typische Fehler, in gemischter Reihenfolge, damit nicht immer dieselben Muster erscheinen.
  // Bevorzugt eine Nachbaraufgabe und eine andere Fehlerart, damit die Auswertung etwas zu sehen bekommt.
  const kandidaten = rng.shuffle(distraktoren(art, a, b)).filter((d) => d.wert > 0);
  const nachVielfalt = [
    ...kandidaten.filter((d) => d.fehlerArt === 'nachbaraufgabe').slice(0, 1),
    ...kandidaten.filter((d) => d.fehlerArt !== 'nachbaraufgabe'),
    ...kandidaten.filter((d) => d.fehlerArt === 'nachbaraufgabe').slice(1),
  ];
  for (const d of nachVielfalt) {
    if (falsche.length >= OPTIONEN_PRO_AUFGABE - 1) break;
    if (gesehen.has(d.wert)) continue;
    gesehen.add(d.wert);
    falsche.push({ wert: d.wert, fehlerArt: d.fehlerArt });
  }
  // Auffüllen mit nahen Zahlen, falls die Muster zu wenige verschiedene Werte liefern (z. B. 1 · 1).
  let schritt = 1;
  while (falsche.length < OPTIONEN_PRO_AUFGABE - 1) {
    for (const kandidat of [antwort + schritt, antwort - schritt]) {
      if (falsche.length >= OPTIONEN_PRO_AUFGABE - 1) break;
      if (kandidat > 0 && !gesehen.has(kandidat)) {
        gesehen.add(kandidat);
        falsche.push({ wert: kandidat, fehlerArt: 'sonstige' });
      }
    }
    schritt++;
  }
  return rng.shuffle([{ wert: antwort }, ...falsche]);
}

/**
 * Darstellung für die Hilfe nach Fehlern als Punktefeld mit `zeilen` Reihen zu je `spalten` Punkten.
 * - Kernaufgabe (ein Faktor 1, 2, 5 oder 10): Die Kernzahl wird zur Reihenlänge, das Kind zählt
 *   in 2er-, 5er- oder 10er-Schritten. `teile` ist dann [zeilen].
 * - Sonst: Ableitung aus Kernaufgaben, die Reihen werden zerlegt, z. B. 7 · 8 = 5 · 8 + 2 · 8.
 */
export interface Zerlegung {
  zeilen: number;
  spalten: number;
  /** Teile der Zeilen; ein Teil = Kernaufgabe, zwei Teile = abgeleitete Aufgabe. */
  teile: number[];
}

export function zerlegung(a: number, b: number): Zerlegung {
  if (istKern(a, b)) {
    // Reihenlänge = Kernzahl; bei zwei Kernzahlen die größere, damit weniger gezählt wird.
    const spalten = KERN_FAKTOREN.includes(b) && (!KERN_FAKTOREN.includes(a) || b >= a) ? b : a;
    const zeilen = spalten === b ? a : b;
    return { zeilen, spalten, teile: [zeilen] };
  }
  if (a > 5) return { zeilen: a, spalten: b, teile: [5, a - 5] };
  // 3 = 2 + 1, 4 = 2 + 2
  return { zeilen: a, spalten: b, teile: [2, a - 2] };
}
