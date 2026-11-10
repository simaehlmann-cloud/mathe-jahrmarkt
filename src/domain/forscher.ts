/**
 * Forscheraufgaben im Knobelzelt: offene Aufgaben mit mehreren richtigen Lösungen
 * (KC: Probleme lösen, Kommunizieren). Das Kind sucht verschiedene Lösungen; gezählt wird jede neue.
 * Tauschaufgaben gelten als dieselbe Lösung. Zum Schluss sieht man alle Möglichkeiten (wo es endlich viele gibt).
 */
import type { Rng } from './rng';

export type Regel = 'produkt' | 'summeGerade' | 'differenz' | 'mauer';

export interface LoesungsAufgabe {
  art: 'loesungen';
  regel: Regel;
  titel: string;
  text: string;
  /** Zielzahl (Ergebnis, Unterschied oder Deckstein). */
  ziel: number;
  /** Eingabefelder je Lösung. */
  felder: number;
  /** So viele verschiedene Lösungen sollen gefunden werden. */
  gesucht: number;
  tipp: string;
}

export interface GeschichtenAufgabe {
  art: 'geschichten';
  titel: string;
  text: string;
  rechnung: string;
  geschichten: { text: string; passt: boolean }[];
  tipp: string;
}

export type Forscheraufgabe = LoesungsAufgabe | GeschichtenAufgabe;

export const FORSCHER_TALER = 3;
/** Extra-Taler für jede Lösung über die gesuchte Zahl hinaus (höchstens alle). */
export const EXTRA_TALER = 1;
/** Größte Zahl, die eingetippt werden kann. */
const MAX_ZAHL = 999;

/** Ergebnis einer Prüfung: gültig mit Schlüssel (für „schon gefunden“) oder ein freundlicher Hinweis. */
export type Pruefung = { ok: true; schluessel: string; anzeige: string } | { ok: false; hinweis: string };

/** Rechenmauer mit drei Grundsteinen: oben steht a + 2b + c. */
export const mauerSpitze = (a: number, b: number, c: number): number => a + 2 * b + c;

export function pruefeLoesung(a: LoesungsAufgabe, werte: readonly number[]): Pruefung {
  if (werte.length !== a.felder || werte.some((w) => !Number.isInteger(w) || w < 0 || w > MAX_ZAHL)) return { ok: false, hinweis: 'Fülle alle Kästchen aus.' };
  const [x = 0, y = 0, z = 0] = werte;
  switch (a.regel) {
    case 'produkt':
      if (x * y !== a.ziel) return { ok: false, hinweis: `${x} · ${y} = ${x * y}, nicht ${a.ziel}.` };
      return { ok: true, schluessel: [x, y].sort((p, q) => p - q).join('·'), anzeige: `${x} · ${y} = ${a.ziel}` };
    case 'summeGerade':
      if (x + y !== a.ziel) return { ok: false, hinweis: `${x} + ${y} = ${x + y}, nicht ${a.ziel}.` };
      if (x % 2 || y % 2) return { ok: false, hinweis: 'Beide Zahlen sollen gerade sein.' };
      return { ok: true, schluessel: [x, y].sort((p, q) => p - q).join('+'), anzeige: `${x} + ${y} = ${a.ziel}` };
    case 'differenz':
      if (x - y !== a.ziel) return { ok: false, hinweis: `${x} − ${y} = ${x - y}, nicht ${a.ziel}.` };
      if (x > 100) return { ok: false, hinweis: 'Bleib bei Zahlen bis 100.' };
      return { ok: true, schluessel: `${x}-${y}`, anzeige: `${x} − ${y} = ${a.ziel}` };
    case 'mauer': {
      const s = mauerSpitze(x, y, z);
      if (s !== a.ziel) return { ok: false, hinweis: `Mit ${x}, ${y} und ${z} steht oben ${s}, nicht ${a.ziel}.` };
      // gespiegelte Mauer zählt als dieselbe
      const k1 = `${x}|${y}|${z}`;
      const k2 = `${z}|${y}|${x}`;
      return { ok: true, schluessel: k1 < k2 ? k1 : k2, anzeige: `${x}, ${y}, ${z} → ${x + y} und ${y + z} → ${s}` };
    }
  }
}

/** Alle Lösungen, wenn es überschaubar viele gibt (für die Auflösung am Ende); sonst undefined. */
export function alleLoesungen(a: LoesungsAufgabe): string[] | undefined {
  if (a.regel === 'produkt') {
    const l: string[] = [];
    for (let x = 1; x * x <= a.ziel; x++) if (a.ziel % x === 0) l.push(`${x} · ${a.ziel / x}`);
    return l;
  }
  if (a.regel === 'summeGerade') {
    const l: string[] = [];
    for (let x = 0; 2 * x <= a.ziel; x += 2) l.push(`${x} + ${a.ziel - x}`);
    return l.length <= 14 ? l : undefined;
  }
  return undefined;
}

const PRODUKTE = [12, 16, 18, 20, 24, 30, 36, 40, 48];
const GESCHICHTEN: readonly { a: number; b: number }[] = [
  { a: 4, b: 6 },
  { a: 3, b: 8 },
  { a: 5, b: 7 },
  { a: 6, b: 9 },
];

function geschichten(rng: Rng): GeschichtenAufgabe {
  const { a, b } = rng.pick(GESCHICHTEN);
  const passend = [
    `In ${a} Tüten sind je ${b} Bonbons.`,
    `An ${b} Tischen sitzen je ${a} Kinder.`,
    `Ein Riesenrad hat ${a} Gondeln mit je ${b} Plätzen.`,
    `${a} Kinder bekommen je ${b} Lose.`,
  ];
  const unpassend = [
    `Tim hat ${a} Murmeln, Mia hat ${b} Murmeln.`,
    `${a * b} Bonbons werden an ${a} Kinder verteilt.`,
    `Im Bus sitzen ${b} Kinder, ${a} steigen aus.`,
    `Ein Seil ist ${b} m lang. Es wird ${a} m länger.`,
  ];
  const auswahl = [...rng.shuffle(passend).slice(0, rng.int(2, 3)).map((text) => ({ text, passt: true })), ...rng.shuffle(unpassend).slice(0, 2).map((text) => ({ text, passt: false }))];
  return {
    art: 'geschichten',
    titel: 'Geschichten-Detektiv',
    text: `Welche Geschichten passen zur Aufgabe ${a} · ${b}? Tippe alle passenden an.`,
    rechnung: `${a} · ${b}`,
    geschichten: rng.shuffle(auswahl),
    tipp: `Mal heißt: ${a}-mal gleich viel. Gibt es ${a} Gruppen mit je ${b} (oder ${b} Gruppen mit je ${a})?`,
  };
}

/** Eine Forscheraufgabe einer Art. */
export function forscheraufgabe(regel: Regel | 'geschichten', rng: Rng): Forscheraufgabe {
  if (regel === 'geschichten') return geschichten(rng);
  if (regel === 'produkt') {
    const ziel = rng.pick(PRODUKTE);
    return { art: 'loesungen', regel, titel: 'Malaufgaben-Jagd', text: `Finde drei verschiedene Malaufgaben mit dem Ergebnis ${ziel}.`, ziel, felder: 2, gesucht: 3, tipp: `Welche Einmaleins-Reihen treffen die ${ziel}? Probier die 2er-, 3er-, 4er-Reihe …` };
  }
  if (regel === 'summeGerade') {
    const ziel = rng.pick([20, 30, 40, 50, 60]);
    return { art: 'loesungen', regel, titel: 'Gerade Paare', text: `Zwei gerade Zahlen ergeben zusammen ${ziel}. Finde vier verschiedene Möglichkeiten.`, ziel, felder: 2, gesucht: 4, tipp: `Gerade Zahlen enden auf 0, 2, 4, 6 oder 8. Wenn die erste Zahl um 2 größer wird, wird die zweite um 2 kleiner.` };
  }
  if (regel === 'differenz') {
    const ziel = rng.pick([7, 9, 12, 15, 25]);
    return { art: 'loesungen', regel, titel: 'Unterschied gesucht', text: `Finde drei Minusaufgaben mit dem Ergebnis ${ziel}. Zahlen bis 100.`, ziel, felder: 2, gesucht: 3, tipp: `Die erste Zahl muss um ${ziel} größer sein als die zweite. Nimm eine Zahl und rechne ${ziel} dazu.` };
  }
  const ziel = rng.pick([20, 24, 30, 36, 40]);
  return { art: 'loesungen', regel, titel: 'Mauer-Baumeister', text: `Baue zwei verschiedene Rechenmauern mit dem Deckstein ${ziel}. Tippe die drei Grundsteine ein.`, ziel, felder: 3, gesucht: 2, tipp: `Der mittlere Grundstein zählt doppelt: Er steckt in beiden Steinen darüber. Fang mit einer kleinen Mitte an.` };
}

/** Eine Forscher-Runde: vier verschiedene Arten in zufälliger Reihenfolge. */
export function forscherRunde(rng: Rng): Forscheraufgabe[] {
  const arten: (Regel | 'geschichten')[] = rng.shuffle<Regel | 'geschichten'>(['produkt', 'summeGerade', 'differenz', 'mauer', 'geschichten']).slice(0, 4);
  return arten.map((r) => forscheraufgabe(r, rng));
}
