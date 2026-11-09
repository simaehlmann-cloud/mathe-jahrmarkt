import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Fehler } from './auswahl';
import { auswahlAufgabe, codeAuswahl } from './baukasten';
import type { AuswahlAufgabe } from './typen';

/** Spiegelzelt (KC: Raum und Form): Symmetrie, Würfelnetze, Wege, Formen und Körper, Bandornamente. */

/* ---------- Spiegelkabinett ---------- */

export type Achse = 'senkrecht' | 'waagerecht' | 'schraeg';
export const GITTER = 4;

/** Spiegelbild einer Zelle (Spalte x, Zeile y) an der Achse. */
export function spiegle(x: number, y: number, achse: Achse): [number, number] {
  if (achse === 'senkrecht') return [GITTER - 1 - x, y];
  if (achse === 'waagerecht') return [x, GITTER - 1 - y];
  return [y, x];
}

/** Gegebene Seite: links (senkrecht), oben (waagerecht), oberhalb der Diagonale (schräg). */
export const istGegeben = (x: number, y: number, achse: Achse): boolean =>
  achse === 'senkrecht' ? x < GITTER / 2 : achse === 'waagerecht' ? y < GITTER / 2 : x > y;
export const istZuFuellen = (x: number, y: number, achse: Achse): boolean =>
  achse === 'senkrecht' ? x >= GITTER / 2 : achse === 'waagerecht' ? y >= GITTER / 2 : x < y;

/** Zellen, die das Kind färben kann, in fester Reihenfolge (für die Bitmaske). */
export function freieZellen(achse: Achse): [number, number][] {
  const z: [number, number][] = [];
  for (let y = 0; y < GITTER; y++) for (let x = 0; x < GITTER; x++) if (istZuFuellen(x, y, achse)) z.push([x, y]);
  return z;
}

/** Antwort als Zahl: Bitmaske der gefärbten freien Zellen + 1 (damit sie positiv ist). */
export function maske(gefaerbt: ReadonlySet<string>, achse: Achse): number {
  return freieZellen(achse).reduce((m, [x, y], i) => m + (gefaerbt.has(`${x},${y}`) ? 2 ** i : 0), 0) + 1;
}

export function baueSpiegel(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const achse: Achse = (form as Achse | undefined) ?? (stufe === 'bronze' ? 'senkrecht' : stufe === 'silber' ? 'waagerecht' : 'schraeg');
  const gegeben: [number, number][] = [];
  for (let y = 0; y < GITTER; y++) for (let x = 0; x < GITTER; x++) if (istGegeben(x, y, achse) && rng.next() < 0.45) gegeben.push([x, y]);
  if (gegeben.length < 2) return baueSpiegel(stufe, rng, achse);
  const loesung = new Set(gegeben.map(([x, y]) => spiegle(x, y, achse).join(',')));
  const antwort = maske(loesung, achse);
  // Typischer Fehler: verschoben statt gespiegelt
  const verschoben = new Set(
    gegeben.map(([x, y]) => (achse === 'senkrecht' ? [x + GITTER / 2, y] : achse === 'waagerecht' ? [x, y + GITTER / 2] : [y, x]).join(',')),
  );
  const fehler: Fehler[] = ([{ wert: maske(verschoben, achse), fehlerArt: 'sonstige' }] as Fehler[]).filter((f) => f.wert !== antwort);
  return auswahlAufgabe(
    {
      bude: 'spiegelkabinett', form: achse, stufe, text: 'Ergänze spiegelbildlich!', sprechtext: `Färbe die Kästchen so, dass das Muster an der ${achse === 'schraeg' ? 'schrägen' : achse} Achse gespiegelt ist.`,
      antwort, fehler, frei: true, kompetenz: 'raum', dimension: achse === 'schraeg' ? 'anwendung' : 'sicherheit',
      idee: 'Jedes Kästchen hat sein Spiegelbild genau gleich weit von der Achse entfernt, auf der anderen Seite.',
      schritte: ['Nimm ein gefärbtes Kästchen und zähle, wie weit es von der Achse weg ist.', 'Auf der anderen Seite gehst du genauso weit weg und färbst dort.'],
      daten: { achse, gegeben },
    },
    rng,
  );
}

/* ---------- Würfelnetze ---------- */

type Zelle = [number, number];
/** Würfel abrollen: welche Würfelfläche (0–5) jede Zelle wird; ungültig, wenn eine Fläche doppelt vorkommt. */
export function falte(netz: readonly Zelle[]): number[] | undefined {
  const flaeche = new Map<string, number>();
  const start = netz[0];
  if (!start) return undefined;
  type Lage = { B: number; T: number; N: number; S: number; E: number; W: number };
  const besucht = new Set<string>();
  const schritt = (z: Zelle, l: Lage) => {
    const k = z.join(',');
    if (besucht.has(k)) return;
    besucht.add(k);
    flaeche.set(k, l.B);
    const [x, y] = z;
    const nb: [Zelle, Lage][] = [
      [[x + 1, y], { ...l, B: l.E, E: l.T, T: l.W, W: l.B }],
      [[x - 1, y], { ...l, B: l.W, W: l.T, T: l.E, E: l.B }],
      [[x, y + 1], { ...l, B: l.S, S: l.T, T: l.N, N: l.B }],
      [[x, y - 1], { ...l, B: l.N, N: l.T, T: l.S, S: l.B }],
    ];
    for (const [n, nl] of nb) if (netz.some(([a, b]) => a === n[0] && b === n[1])) schritt(n, nl);
  };
  schritt(start, { B: 0, T: 1, N: 2, S: 3, E: 4, W: 5 });
  const werte = netz.map((z) => flaeche.get(z.join(',')) ?? -1);
  return new Set(werte).size === 6 && werte.every((w) => w >= 0) ? werte : undefined;
}
export const gegenueber = (f: number): number => (f % 2 === 0 ? f + 1 : f - 1);

/** Zufälliges Sechseck aus Quadraten (zusammenhängend). */
function zufallsNetz(rng: Rng): Zelle[] {
  const z: Zelle[] = [[0, 0]];
  while (z.length < 6) {
    const [x, y] = rng.pick(z);
    const n: Zelle = rng.pick([
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as Zelle[]);
    if (!z.some(([a, b]) => a === n[0] && b === n[1])) z.push(n);
  }
  const mx = Math.min(...z.map(([x]) => x));
  const my = Math.min(...z.map(([, y]) => y));
  return z.map(([x, y]) => [x - mx, y - my]);
}

const BUCHSTABEN = ['A', 'B', 'C', 'D', 'E', 'F'];

export function baueNetz(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'gold' ? 'gegenueber' : 'faltbar');
  if (f === 'gegenueber') {
    let netz = zufallsNetz(rng);
    let gefaltet = falte(netz);
    while (!gefaltet) {
      netz = zufallsNetz(rng);
      gefaltet = falte(netz);
    }
    const i = rng.int(0, 5);
    const ziel = gefaltet.findIndex((w) => w === gegenueber(gefaltet[i] ?? 0));
    const texte = [BUCHSTABEN[ziel] ?? '', ...BUCHSTABEN.filter((_, j) => j !== ziel && j !== i).slice(0, 3)];
    const c = codeAuswahl(texte, 0, rng);
    return auswahlAufgabe(
      {
        bude: 'wuerfelnetz', form: f, stufe, text: `Was liegt gegenüber von ${BUCHSTABEN[i]}?`, ...c,
        kompetenz: 'raum', dimension: 'anwendung',
        idee: 'Gegenüberliegende Flächen berühren sich im Netz nie. In einer Reihe aus drei Feldern liegen das erste und das dritte gegenüber.',
        schritte: [`${BUCHSTABEN[i]} und ${BUCHSTABEN[ziel]} liegen nach dem Falten gegenüber.`],
        daten: { netz, frage: i, gegen: ziel },
      },
      rng,
    );
  }
  // Faltbar? Hälfte gültige, Hälfte ungültige Netze
  const willGueltig = rng.next() < 0.5;
  let netz = zufallsNetz(rng);
  for (let n = 0; n < 500 && !!falte(netz) !== willGueltig; n++) netz = zufallsNetz(rng);
  const gueltig = !!falte(netz);
  const c = { antwort: gueltig ? 1 : 2, fehler: [{ wert: gueltig ? 2 : 1, fehlerArt: 'sonstige' as const }], labels: { 1: 'Ja, das klappt', 2: 'Nein, geht nicht' } };
  return auswahlAufgabe(
    {
      bude: 'wuerfelnetz', form: 'faltbar', stufe, text: 'Lässt sich ein Würfel falten?', ...c, anzahl: 2,
      kompetenz: 'raum', dimension: 'wissen',
      idee: 'Stell dir vor, ein Feld ist der Boden. Klappe die anderen Felder hoch. Keine zwei Felder dürfen auf derselben Würfelseite landen.',
      schritte: [gueltig ? 'Alle sechs Felder landen auf verschiedenen Seiten: Es klappt.' : 'Zwei Felder würden übereinander liegen, eine Seite bliebe offen: Es klappt nicht.'],
      daten: { netz, gueltig },
    },
    rng,
  );
}

/* ---------- Labyrinth-Robo ---------- */

export const PFEIL: Record<string, [number, number]> = { '→': [1, 0], '←': [-1, 0], '↓': [0, 1], '↑': [0, -1] };
export const LAB = 5;

/** Programm ausführen; liefert Endpunkt oder undefined bei Wand/Rand. */
export function fahre(start: Zelle, programm: string, mauern: ReadonlySet<string>): Zelle | undefined {
  let [x, y] = start;
  for (const p of programm) {
    const d = PFEIL[p];
    if (!d) continue;
    x += d[0];
    y += d[1];
    if (x < 0 || y < 0 || x >= LAB || y >= LAB || mauern.has(`${x},${y}`)) return undefined;
  }
  return [x, y];
}

function kuerzesterWeg(start: Zelle, ziel: Zelle, mauern: ReadonlySet<string>): string | undefined {
  const q: [Zelle, string][] = [[start, '']];
  const gesehen = new Set([start.join(',')]);
  while (q.length) {
    const eintrag = q.shift() as [Zelle, string];
    const [[x, y], w] = eintrag;
    if (x === ziel[0] && y === ziel[1]) return w;
    for (const [p, [dx, dy]] of Object.entries(PFEIL)) {
      const n: Zelle = [x + dx, y + dy];
      const k = n.join(',');
      if (n[0] < 0 || n[1] < 0 || n[0] >= LAB || n[1] >= LAB || mauern.has(k) || gesehen.has(k)) continue;
      gesehen.add(k);
      q.push([n, w + p]);
    }
  }
  return undefined;
}

export function baueLabyrinth(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const laenge = stufe === 'bronze' ? [3, 4] : stufe === 'silber' ? [5, 7] : [5, 8];
  for (;;) {
    const mauern = new Set<string>();
    for (let i = 0; i < (stufe === 'bronze' ? 4 : 7); i++) mauern.add(`${rng.int(0, LAB - 1)},${rng.int(0, LAB - 1)}`);
    const start: Zelle = [rng.int(0, 1), rng.int(0, LAB - 1)];
    const ziel: Zelle = [rng.int(3, 4), rng.int(0, LAB - 1)];
    if (mauern.has(start.join(',')) || mauern.has(ziel.join(','))) continue;
    const weg = kuerzesterWeg(start, ziel, mauern);
    if (!weg || weg.length < (laenge[0] ?? 3) || weg.length > (laenge[1] ?? 8)) continue;
    // Falsche Programme: ein Pfeil geändert, zwei vertauscht, ein Schritt zu wenig
    const kandidaten = new Set<string>();
    const pfeile = Object.keys(PFEIL);
    for (let n = 0; n < 40 && kandidaten.size < 6; n++) {
      const arr: string[] = [...weg];
      const art = rng.int(0, 2);
      if (art === 0) arr[rng.int(0, arr.length - 1)] = rng.pick(pfeile);
      else if (art === 1) {
        const i = rng.int(0, arr.length - 2);
        [arr[i], arr[i + 1]] = [arr[i + 1] ?? '', arr[i] ?? ''];
      } else arr.splice(rng.int(0, arr.length - 1), 1);
      const p: string = arr.join('');
      const ende = fahre(start, p, mauern);
      if (p !== weg && !(ende && ende[0] === ziel[0] && ende[1] === ziel[1])) kandidaten.add(p);
    }
    if (kandidaten.size < 3) continue;
    const zeige = (p: string) => [...p].join(' ');
    const texte = [zeige(weg), ...[...kandidaten].slice(0, 3).map(zeige)];
    const c = codeAuswahl(texte, 0, rng);
    return auswahlAufgabe(
      {
        bude: 'labyrinth', form: form ?? stufe, stufe, text: stufe === 'gold' ? 'Welches Programm führt zum Stern?' : 'Welches Programm führt zum Stern?', ...c,
        sprechtext: 'Welches Programm führt den Roboter zum Stern, ohne gegen eine Mauer zu fahren?',
        kompetenz: 'raum', dimension: stufe === 'bronze' ? 'sicherheit' : 'anwendung',
        idee: 'Fahre jedes Programm mit dem Finger nach: Jeder Pfeil ist ein Feld weit.',
        schritte: [`${zeige(weg)} führt um alle Mauern herum zum Stern.`],
        daten: { start, ziel, mauern: [...mauern], weg },
      },
      rng,
    );
  }
}

/* ---------- Formen-Sortierer ---------- */

export const FORMEN_FLAECHE = ['Dreieck', 'Quadrat', 'Rechteck', 'Kreis', 'Fünfeck', 'Sechseck'] as const;
export const KOERPER = ['Würfel', 'Quader', 'Kugel', 'Zylinder', 'Kegel', 'Pyramide'] as const;

export function baueFormen(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'flaeche' : stufe === 'silber' ? 'koerper' : 'inhalt');
  if (f === 'inhalt') {
    // Figur aus Rechtecken auf Karopapier: L-Form oder Treppe
    const a = rng.int(2, 5);
    const b = rng.int(2, 4);
    const c2 = rng.int(1, a - 1);
    const d = rng.int(1, 3);
    const zellen: Zelle[] = [];
    for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) zellen.push([x, y]);
    for (let y = b; y < b + d; y++) for (let x = 0; x < c2; x++) zellen.push([x, y]);
    const n = zellen.length;
    return auswahlAufgabe(
      {
        bude: 'formensortierer', form: f, stufe, text: 'Wie viele Kästchen groß ist die Fläche?', antwort: n,
        fehler: [{ wert: 2 * (a + b + d), fehlerArt: 'sonstige' }, { wert: a * (b + d), fehlerArt: 'sonstige' }, { wert: n - c2, fehlerArt: 'sonstige' }],
        format: (w) => `${w} Kästchen`,
        kompetenz: 'raum', dimension: 'anwendung',
        idee: 'Zerlege die Figur in Rechtecke und zähle reihenweise.',
        schritte: [`${a} · ${b} = ${a * b}`, `${c2} · ${d} = ${c2 * d}`, `${a * b} + ${c2 * d} = ${n}`],
        daten: { zellen },
      },
      rng,
    );
  }
  const liste = f === 'koerper' ? KOERPER : FORMEN_FLAECHE;
  const i = rng.int(0, liste.length - 1);
  const name = liste[i] ?? '';
  const andere = rng.shuffle(liste.filter((x) => x !== name)).slice(0, 3);
  const c = codeAuswahl([name, ...andere], 0, rng);
  const merkmale: Record<string, string> = {
    Dreieck: '3 Ecken und 3 Seiten.',
    Quadrat: '4 gleich lange Seiten und 4 rechte Winkel.',
    Rechteck: '4 rechte Winkel, gegenüberliegende Seiten gleich lang.',
    Kreis: 'keine Ecken, überall gleich weit von der Mitte.',
    Fünfeck: '5 Ecken.',
    Sechseck: '6 Ecken.',
    Würfel: '6 gleich große Quadrate als Flächen.',
    Quader: '6 Rechtecke als Flächen, gegenüberliegende gleich.',
    Kugel: 'keine Ecken und Kanten, rollt in alle Richtungen.',
    Zylinder: 'zwei Kreise als Boden und Deckel, rollt geradeaus.',
    Kegel: 'ein Kreis unten und eine Spitze.',
    Pyramide: 'ein Viereck unten, Dreiecke treffen sich oben in einer Spitze.',
  };
  return auswahlAufgabe(
    {
      bude: 'formensortierer', form: f, stufe, text: f === 'koerper' ? 'Welcher Körper ist das?' : 'Welche Form ist das?', ...c,
      kompetenz: 'raum', dimension: 'wissen',
      idee: 'Zähle Ecken und Seiten und schau, ob Seiten gleich lang sind.',
      schritte: [`Das ist ein${['Kugel', 'Pyramide'].includes(name) ? 'e' : ''} ${name}: ${merkmale[name] ?? ''}`],
      daten: { name },
    },
    rng,
  );
}

/* ---------- Zelt-Dekorateur (Bandornamente) ---------- */

const ZEICHEN_PAARE = [
  ['▲', '▼'],
  ['◀', '▶'],
  ['●', '■'],
  ['★', '◆'],
];
const DREHUNG = ['▲', '▶', '▼', '◀'];

export function baueBand(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'fortsetzen' : stufe === 'silber' ? 'fehler' : 'abbildung');
  if (f === 'abbildung') {
    const art = rng.pick(['verschoben', 'gespiegelt', 'gedreht']);
    const folge = art === 'verschoben' ? ['▶', '▶', '▶', '▶', '▶'] : art === 'gespiegelt' ? ['▶', '◀', '▶', '◀', '▶'] : [...DREHUNG, '▲'];
    const c = codeAuswahl([art, ...['verschoben', 'gespiegelt', 'gedreht'].filter((x) => x !== art)], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'zeltdekorateur', form: f, stufe, text: 'Wie entsteht das nächste Bild?', ...c, anzahl: 3,
        kompetenz: 'muster', dimension: 'anwendung',
        idee: 'Verschoben: gleiches Bild, nur weiter. Gespiegelt: wie im Spiegel umgeklappt. Gedreht: um eine Vierteldrehung weiter.',
        schritte: [`Hier wird jedes Bild ${art}.`],
        daten: { folge, luecke: -1 },
      },
      rng,
    );
  }
  const paar = rng.pick(ZEICHEN_PAARE);
  const muster = rng.pick([
    [0, 1],
    [0, 0, 1],
    [0, 1, 1],
  ]);
  const folge = Array.from({ length: 8 }, (_, i) => paar[muster[i % muster.length] ?? 0] ?? '');
  if (f === 'fehler') {
    const stelle = rng.int(2, 7);
    const falsch = [...folge];
    falsch[stelle] = falsch[stelle] === paar[0] ? (paar[1] ?? '') : (paar[0] ?? '');
    return auswahlAufgabe(
      {
        bude: 'zeltdekorateur', form: f, stufe, text: 'Welches Bild ist falsch?', antwort: stelle + 1,
        fehler: [stelle, stelle + 2, stelle - 1].filter((s) => s >= 0 && s < 8).map((s) => ({ wert: s + 1, fehlerArt: 'sonstige' as const })),
        format: (w) => `Nr. ${w}`,
        kompetenz: 'muster', dimension: 'anwendung',
        idee: 'Finde den Baustein, der sich immer wiederholt. Dann prüfe Bild für Bild.',
        schritte: [`Der Baustein ist ${muster.map((m) => paar[m]).join(' ')}.`, `Bild Nr. ${stelle + 1} passt nicht.`],
        daten: { folge: falsch, nummern: true },
      },
      rng,
    );
  }
  const luecke = 6;
  const richtig = folge[luecke] ?? '';
  const andere = [...new Set([...paar, ...rng.pick(ZEICHEN_PAARE.filter((p) => p !== paar))])].filter((z) => z !== richtig).slice(0, 3);
  const c = codeAuswahl([richtig, ...andere], 0, rng);
  return auswahlAufgabe(
    {
      bude: 'zeltdekorateur', form: 'fortsetzen', stufe, text: 'Welches Bild fehlt?', ...c,
      kompetenz: 'muster', dimension: 'sicherheit',
      idee: 'Finde den Baustein, der sich immer wiederholt.',
      schritte: [`Der Baustein ist ${muster.map((m) => paar[m]).join(' ')}.`, `An der Lücke steht ${richtig}.`],
      daten: { folge, luecke },
    },
    rng,
  );
}

