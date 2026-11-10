import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Fehler } from './auswahl';
import { auswahlAufgabe, codeAuswahl } from './baukasten';
import type { AuswahlAufgabe } from './typen';

/**
 * Drei Buden zum Erkunden (KC: Raum und Form; Größen und Messen; Daten und Zufall):
 * Würfelbauer (Würfelgebäude und Baupläne), Lageplan (Planquadrate, Wege, Maßstab), Glücksrad (Chancen).
 */

/* ---------- Würfelbauer ---------- */

/** Höhen eines Würfelgebäudes: `hoehen[y][x]`, y = 0 ist die vordere Reihe. */
export type Bauplan = number[][];

export const wuerfelSumme = (h: Bauplan): number => h.flat().reduce((a, b) => a + b, 0);
/** Ansicht von vorne: je Spalte der höchste Turm. */
export const vorneAnsicht = (h: Bauplan): number => {
  const breite = h[0]?.length ?? 0;
  let n = 0;
  for (let x = 0; x < breite; x++) n += Math.max(...h.map((r) => r[x] ?? 0));
  return n;
};
/** Ansicht von oben: jedes Feld mit mindestens einem Würfel. */
export const obenAnsicht = (h: Bauplan): number => h.flat().filter((z) => z > 0).length;

function zufallsPlan(rng: Rng, breite: number, tiefe: number, max: number): Bauplan {
  for (;;) {
    const h = Array.from({ length: tiefe }, () => Array.from({ length: breite }, () => rng.int(0, max)));
    // keine leere Spalte vorne, mindestens drei Türme, nicht alles gleich hoch
    if ((h[0] ?? []).some((z) => z === 0)) continue;
    if (obenAnsicht(h) < Math.min(3, breite * tiefe)) continue;
    if (new Set(h.flat()).size < 2) continue;
    return h;
  }
}

export function baueWuerfel(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? rng.pick(['reihe', 'reihe', 'treppe']) : stufe === 'silber' ? rng.pick(['bau', 'plan']) : rng.pick(['vorne', 'oben', 'quader']));
  const farbe = rng.int(0, 3);
  if (f === 'reihe' || f === 'treppe') {
    // Eine Reihe von Türmen, alles sichtbar
    const n = rng.int(3, 5);
    const h: Bauplan = [f === 'treppe' ? Array.from({ length: n }, (_, i) => i + 1) : Array.from({ length: n }, () => rng.int(1, 4))];
    if (f === 'treppe' && rng.next() < 0.5) h[0]?.reverse();
    const summe = wuerfelSumme(h);
    return auswahlAufgabe(
      {
        bude: 'wuerfelbauer', form: f, stufe, text: 'Aus wie vielen Würfeln ist das gebaut?', antwort: summe,
        fehler: [{ wert: summe - 1, fehlerArt: 'sonstige' }, { wert: summe + 1, fehlerArt: 'sonstige' }, { wert: n, fehlerArt: 'sonstige' }],
        kompetenz: 'raum', dimension: 'wissen',
        idee: 'Zähle Turm für Turm von links nach rechts und rechne zusammen.',
        schritte: [`Die Türme sind ${(h[0] ?? []).join(', ')} Würfel hoch.`, `${(h[0] ?? []).join(' + ')} = ${summe}`],
        daten: { hoehen: h, zeige: 'bau', farbe },
      },
      rng,
    );
  }
  if (f === 'bau' || f === 'plan') {
    const h = zufallsPlan(rng, rng.int(2, 3), 2, 3);
    // Im Schrägbild muss jeder hintere Turm oben herausschauen, sonst wäre er nicht zu sehen
    if (f === 'bau' && h[1]?.some((z, x) => z > 0 && z <= (h[0]?.[x] ?? 0))) return baueWuerfel(stufe, rng, f);
    const summe = wuerfelSumme(h);
    const sichtbar = vorneAnsicht(h);
    return auswahlAufgabe(
      {
        bude: 'wuerfelbauer', form: f, stufe,
        text: f === 'bau' ? 'Wie viele Würfel sind es? Auch versteckte zählen.' : 'Wie viele Würfel brauchst du für diesen Bauplan?',
        antwort: summe,
        fehler: [
          { wert: sichtbar, fehlerArt: 'sonstige' },
          { wert: obenAnsicht(h), fehlerArt: 'sonstige' },
          { wert: summe - 1, fehlerArt: 'sonstige' },
          { wert: summe + 1, fehlerArt: 'sonstige' },
        ],
        kompetenz: 'raum', dimension: f === 'bau' ? 'anwendung' : 'sicherheit',
        idee: f === 'bau' ? 'Unter jedem Würfel steht ein anderer. Zähle jeden Turm von unten bis oben – auch die hinteren.' : 'Im Bauplan steht für jedes Feld, wie hoch der Turm ist. Addiere alle Zahlen.',
        schritte: [`Turmhöhen: ${h.flat().filter((z) => z > 0).join(', ')}`, `Zusammen ${summe} Würfel.`],
        daten: { hoehen: h, zeige: f === 'bau' ? 'bau' : 'plan', farbe },
      },
      rng,
    );
  }
  // Gold: Ansichten und Ergänzen
  const h = zufallsPlan(rng, 3, f === 'quader' ? 2 : rng.int(2, 3), 3);
  const summe = wuerfelSumme(h);
  if (f === 'quader') {
    const hoch = Math.max(...h.flat());
    const voll = (h[0]?.length ?? 0) * h.length * hoch;
    const fehlt = voll - summe;
    if (fehlt <= 0) return baueWuerfel(stufe, rng, f);
    return auswahlAufgabe(
      {
        bude: 'wuerfelbauer', form: f, stufe,
        text: `Wie viele Würfel fehlen noch bis zum Quader, der ${hoch} Würfel hoch ist?`,
        antwort: fehlt,
        fehler: [{ wert: summe, fehlerArt: 'sonstige' }, { wert: fehlt + 1, fehlerArt: 'sonstige' }, { wert: fehlt - 1, fehlerArt: 'sonstige' }, { wert: voll, fehlerArt: 'sonstige' }],
        kompetenz: 'raum', dimension: 'anwendung',
        idee: 'Rechne erst aus, wie viele Würfel der ganze Quader hat. Dann ziehst du ab, was schon steht.',
        schritte: [`Der Quader: ${h[0]?.length ?? 0} · ${h.length} · ${hoch} = ${voll} Würfel`, `Es stehen schon ${summe}.`, `${voll} − ${summe} = ${fehlt}`],
        daten: { hoehen: h, zeige: 'plan', farbe },
      },
      rng,
    );
  }
  const vorne = f === 'vorne';
  const antwort = vorne ? vorneAnsicht(h) : obenAnsicht(h);
  return auswahlAufgabe(
    {
      bude: 'wuerfelbauer', form: f, stufe,
      text: vorne ? 'Wie viele Quadrate siehst du, wenn du genau von vorne schaust?' : 'Wie viele Quadrate siehst du, wenn du genau von oben schaust?',
      antwort,
      fehler: [{ wert: summe, fehlerArt: 'sonstige' }, { wert: vorne ? obenAnsicht(h) : vorneAnsicht(h), fehlerArt: 'sonstige' }, { wert: antwort + 1, fehlerArt: 'sonstige' }, { wert: antwort - 1, fehlerArt: 'sonstige' }],
      kompetenz: 'raum', dimension: 'anwendung',
      idee: vorne ? 'Von vorne siehst du von jeder Spalte nur den höchsten Turm. Die hinteren verstecken sich dahinter.' : 'Von oben siehst du auf jedes Feld, auf dem etwas steht, genau ein Quadrat.',
      schritte: vorne
        ? [`Höchster Turm je Spalte (von links): ${Array.from({ length: h[0]?.length ?? 0 }, (_, x) => Math.max(...h.map((r) => r[x] ?? 0))).join(', ')}`, `Zusammen ${antwort} Quadrate.`]
        : [`Felder mit Würfeln: ${antwort}`, 'Wie hoch die Türme sind, sieht man von oben nicht.'],
      daten: { hoehen: h, zeige: 'plan', farbe },
    },
    rng,
  );
}

/* ---------- Lageplan ---------- */

export const PLAN_GROESSE = 5;
export const SPALTEN = ['A', 'B', 'C', 'D', 'E'] as const;

export interface PlanOrt {
  name: string;
  farbe: string;
  x: number;
  y: number;
}

/** Kurze Namen: Sie stehen genau so im Plan und auf den Antwortknöpfen. */
const ORTE: readonly Omit<PlanOrt, 'x' | 'y'>[] = [
  { name: 'Karussell', farbe: '#e23a4e' },
  { name: 'Eis', farbe: '#f0a202' },
  { name: 'Ponys', farbe: '#8a5a2b' },
  { name: 'Bühne', farbe: '#7b5ea7' },
  { name: 'WC', farbe: '#3c78d8' },
  { name: 'Riesenrad', farbe: '#17a398' },
  { name: 'Popcorn', farbe: '#e86fae' },
  { name: 'Eingang', farbe: '#2e2a4f' },
  { name: 'Scooter', farbe: '#4a8c2a' },
];

/** „B3“: Spalte als Buchstabe, Zeile als Zahl (Zeile 1 oben). */
export const feld = (x: number, y: number): string => `${SPALTEN[x] ?? '?'}${y + 1}`;

function verteileOrte(rng: Rng, anzahl: number): PlanOrt[] {
  const plaetze = rng.shuffle(Array.from({ length: PLAN_GROESSE * PLAN_GROESSE }, (_, i) => i)).slice(0, anzahl);
  return rng
    .shuffle([...ORTE])
    .slice(0, anzahl)
    .map((o, i) => ({ ...o, x: (plaetze[i] ?? 0) % PLAN_GROESSE, y: Math.floor((plaetze[i] ?? 0) / PLAN_GROESSE) }));
}

const RICHTUNG = { rechts: [1, 0], links: [-1, 0], oben: [0, -1], unten: [0, 1] } as const;
type Richtung = keyof typeof RICHTUNG;

export function baueLageplan(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? rng.pick(['wo', 'was']) : stufe === 'silber' ? 'weg' : 'massstab');
  const orte = verteileOrte(rng, f === 'massstab' ? 5 : 6);
  const ziel = orte[0] as PlanOrt;
  if (f === 'wo') {
    const richtig = feld(ziel.x, ziel.y);
    // typische Verwechslungen: Zahl und Buchstabe vertauscht, Nachbarfeld
    const kandidaten = [feld(ziel.y, ziel.x), feld(ziel.x, (ziel.y + 1) % PLAN_GROESSE), feld((ziel.x + 1) % PLAN_GROESSE, ziel.y), feld((ziel.x + 4) % PLAN_GROESSE, ziel.y), feld(ziel.x, (ziel.y + 4) % PLAN_GROESSE)];
    const falsche = [...new Set(kandidaten.filter((k) => k !== richtig))].slice(0, 3);
    const c = codeAuswahl([richtig, ...falsche], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'lageplan', form: f, stufe, text: `In welchem Feld ist ${ziel.name === 'WC' ? 'das WC' : ziel.name === 'Eingang' ? 'der Eingang' : `„${ziel.name}“`}?`, ...c,
        kompetenz: 'raum', dimension: 'wissen',
        idee: 'Erst den Buchstaben oben ablesen, dann die Zahl an der Seite. Wie beim Spiel „Schiffe versenken“.',
        schritte: [`Spalte ${SPALTEN[ziel.x]}, Zeile ${ziel.y + 1}`, `Das Feld heißt ${richtig}.`],
        daten: { orte },
      },
      rng,
    );
  }
  if (f === 'was') {
    const c = codeAuswahl([ziel.name, ...orte.slice(1, 4).map((o) => o.name)], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'lageplan', form: f, stufe, text: `Was ist im Feld ${feld(ziel.x, ziel.y)}?`, ...c,
        kompetenz: 'raum', dimension: 'wissen',
        idee: 'Suche oben die Spalte mit dem Buchstaben und an der Seite die Zeile mit der Zahl. Wo sie sich treffen, ist das Feld.',
        schritte: [`Spalte ${SPALTEN[ziel.x]} nach unten, Zeile ${ziel.y + 1} nach rechts.`, `Dort ist: ${ziel.name}.`],
        daten: { orte },
      },
      rng,
    );
  }
  if (f === 'weg') {
    // Von einem Ort aus Schritte gehen; man landet auf einem anderen Ort
    const start = ziel;
    const zielOrt = orte[1] as PlanOrt;
    const dx = zielOrt.x - start.x;
    const dy = zielOrt.y - start.y;
    if (dx === 0 && dy === 0) return baueLageplan(stufe, rng, f);
    const teile: string[] = [];
    const schritt = (n: number, r: Richtung) => teile.push(`${n} ${n === 1 ? 'Feld' : 'Felder'} nach ${r}`);
    const waagrecht = () => dx !== 0 && schritt(Math.abs(dx), dx > 0 ? 'rechts' : 'links');
    const senkrecht = () => dy !== 0 && schritt(Math.abs(dy), dy > 0 ? 'unten' : 'oben');
    if (rng.next() < 0.5) {
      waagrecht();
      senkrecht();
    } else {
      senkrecht();
      waagrecht();
    }
    // Falsche Antworten: Orte, die man mit vertauschter Richtung erreicht hätte, sonst andere Orte
    const spiegel = orte.find((o) => o.x === start.x - dx && o.y === start.y - dy);
    const andere = orte.slice(2).filter((o) => o !== spiegel);
    const c = codeAuswahl([zielOrt.name, ...(spiegel ? [spiegel.name] : []), ...andere.map((o) => o.name)].slice(0, 4), 0, rng);
    return auswahlAufgabe(
      {
        bude: 'lageplan', form: f, stufe,
        text: `Du startest bei: ${start.name}. Gehe ${teile.join(' und dann ')}. Wo kommst du an?`, ...c,
        kompetenz: 'raum', dimension: 'anwendung',
        idee: 'Leg den Finger auf den Start und zähle die Felder einzeln ab. Rechts und links, oben und unten – so wie auf dem Plan.',
        schritte: [`Start: ${feld(start.x, start.y)}`, ...teile.map((t) => `${t[0]?.toUpperCase()}${t.slice(1)}`), `Ziel: ${feld(zielOrt.x, zielOrt.y)} – ${zielOrt.name}`],
        daten: { orte, start: [start.x, start.y] },
      },
      rng,
    );
  }
  // Gold: Maßstab. Zwei Orte in derselben Zeile oder Spalte, Abstand in Kästchen mal Maßstab
  const massstab = rng.pick([10, 20, 50, 100]);
  const a = ziel;
  let b = orte.find((o, i) => i > 0 && (o.x === a.x || o.y === a.y));
  if (!b) {
    // zweiten Ort passend setzen
    const waagrecht = rng.next() < 0.5;
    const frei = Array.from({ length: PLAN_GROESSE }, (_, i) => i).filter((i) => (waagrecht ? i !== a.x && !orte.some((o) => o.x === i && o.y === a.y) : i !== a.y && !orte.some((o) => o.x === a.x && o.y === i)));
    const neu = rng.pick(frei);
    const zweiter = orte[1] as PlanOrt;
    b = { ...zweiter, x: waagrecht ? neu : a.x, y: waagrecht ? a.y : neu };
    orte[1] = b;
  }
  const kaestchen = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const antwort = kaestchen * massstab;
  return auswahlAufgabe(
    {
      bude: 'lageplan', form: f, stufe,
      text: `Ein Kästchen sind ${massstab} m. Wie weit ist es von „${a.name}“ bis „${b.name}“ (Mitte bis Mitte)?`,
      antwort,
      fehler: [
        { wert: (kaestchen + 1) * massstab, fehlerArt: 'sonstige' },
        { wert: (kaestchen - 1) * massstab, fehlerArt: 'sonstige' },
        { wert: kaestchen, fehlerArt: 'skala' },
        { wert: antwort * 10, fehlerArt: 'stelle' },
      ],
      format: (w) => `${w} m`,
      schritt: massstab,
      kompetenz: 'groessen', dimension: 'anwendung',
      idee: 'Zähle, wie viele Kästchen die beiden auseinander sind. Jedes Kästchen ist so lang wie der Maßstab.',
      schritte: [`Von ${feld(a.x, a.y)} bis ${feld(b.x, b.y)} sind es ${kaestchen} Kästchen.`, `${kaestchen} · ${massstab} m = ${antwort} m`],
      daten: { orte, massstab, linie: [a.x, a.y, b.x, b.y] },
    },
    rng,
  );
}

/* ---------- Glücksrad ---------- */

export const RAD_FARBEN = ['rot', 'blau', 'gelb', 'grün'] as const;

/** Felder des Rads als Farbnummern, gemischt verteilt. */
function rad(rng: Rng, anzahl: number[]): number[] {
  return rng.shuffle(anzahl.flatMap((n, f) => Array<number>(n).fill(f)));
}

export function baueGluecksrad(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? rng.pick(['meist', 'moeglich']) : stufe === 'silber' ? 'strichliste' : rng.pick(['fair', 'fair', 'anteil']));
  if (f === 'meist') {
    const felder = rng.pick([6, 8, 10]);
    let anzahl: number[] = [];
    do {
      const a = rng.int(1, felder - 2);
      const b = rng.int(1, felder - a - 1);
      anzahl = [a, b, felder - a - b];
    } while (new Set(anzahl).size < 3);
    const richtig = anzahl.indexOf(Math.max(...anzahl));
    const c = codeAuswahl([RAD_FARBEN[richtig] ?? '', ...RAD_FARBEN.slice(0, 3).filter((_, i) => i !== richtig), 'alle gleich oft'], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'gluecksrad', form: f, stufe, text: 'Welche Farbe kommt beim Drehen am ehesten?', ...c,
        kompetenz: 'daten', dimension: 'wissen',
        idee: 'Die Farbe mit den meisten Feldern hat die größte Chance.',
        schritte: [anzahl.map((n, i) => `${n} ${RAD_FARBEN[i]}`).join(', '), `Am meisten Felder: ${RAD_FARBEN[richtig]}.`],
        daten: { felder: rad(rng, anzahl) },
      },
      rng,
    );
  }
  if (f === 'moeglich') {
    const art = rng.pick(['sicher', 'möglich', 'unmöglich']);
    const felder = rng.pick([4, 6, 8]);
    const anzahl = art === 'sicher' ? [felder] : [rng.int(1, felder - 1)].flatMap((a) => [a, felder - a]);
    // gefragte Farbe: sicher → rot (alles rot), möglich → blau, unmöglich → gelb (kommt nicht vor)
    const farbe = art === 'sicher' ? 0 : art === 'möglich' ? 1 : 2;
    const c = codeAuswahl([art, ...['sicher', 'möglich', 'unmöglich'].filter((x) => x !== art)], 0, rng);
    return auswahlAufgabe(
      {
        bude: 'gluecksrad', form: f, stufe, text: `Dass der Zeiger auf ${RAD_FARBEN[farbe]} stehen bleibt, ist …`, ...c,
        kompetenz: 'daten', dimension: 'wissen',
        idee: 'Sicher: Es kommt immer. Möglich: Es kann kommen. Unmöglich: Die Farbe gibt es auf dem Rad gar nicht.',
        schritte: [`Auf dem Rad: ${anzahl.map((n, i) => `${n} ${RAD_FARBEN[i]}`).join(', ')}.`, `${RAD_FARBEN[farbe]} ist ${art}.`],
        daten: { felder: rad(rng, anzahl) },
      },
      rng,
    );
  }
  if (f === 'strichliste') {
    // Vermutung und Ergebnis: Zu welchem Rad passt die Strichliste?
    const raeder = [
      [6, 2],
      [4, 4],
      [2, 6],
    ];
    const richtig = rng.int(0, 2);
    const r = (raeder[richtig] as [number, number])[0];
    const wuerfe = 20;
    // Ergebnis nahe am Erwartungswert, aber nicht genau
    const erwartet = (wuerfe * r) / 8;
    const rot = Math.max(1, Math.min(wuerfe - 1, Math.round(erwartet + rng.int(-2, 2))));
    const c = codeAuswahl(['Rad A', 'Rad B', 'Rad C'], richtig, rng);
    return auswahlAufgabe(
      {
        bude: 'gluecksrad', form: f, stufe,
        text: `Jemand hat ${wuerfe}-mal gedreht: ${rot}-mal rot, ${wuerfe - rot}-mal blau. Welches Rad war es wohl?`, ...c,
        kompetenz: 'daten', dimension: 'anwendung',
        idee: 'Viel Rot gedreht? Dann hat das Rad vermutlich viele rote Felder. Ganz genau passt es selten – aber ungefähr.',
        schritte: [`Rad A: 6 rot, 2 blau. Rad B: 4 rot, 4 blau. Rad C: 2 rot, 6 blau.`, `${rot} von ${wuerfe} rot passt am besten zu ${['Rad A', 'Rad B', 'Rad C'][richtig]}.`],
        daten: { raeder: raeder.map(([x, y]) => rad(rng, [x ?? 0, y ?? 0])), striche: [rot, wuerfe - rot] },
      },
      rng,
    );
  }
  if (f === 'anteil') {
    // „Wie viele von … Feldern sind rot?“ als Bruch-Vorbereitung: Chance als „x von n“
    const felder = rng.pick([8, 10, 12]);
    const rot = rng.int(1, felder - 2);
    const blau = rng.int(1, felder - rot - 1);
    const anzahl = [rot, blau, felder - rot - blau];
    const fehler: Fehler[] = [{ wert: felder - rot, fehlerArt: 'sonstige' }, { wert: blau, fehlerArt: 'sonstige' }, { wert: felder, fehlerArt: 'sonstige' }];
    return auswahlAufgabe(
      {
        bude: 'gluecksrad', form: f, stufe, text: 'Wie groß ist die Chance für Rot?',
        sprechtext: `Auf dem Rad sind ${felder} Felder. Wie groß ist die Chance für Rot?`,
        antwort: rot, fehler, format: (w) => `${w} von ${felder}`,
        kompetenz: 'daten', dimension: 'anwendung',
        idee: 'Zähle die roten Felder und alle Felder. Die Chance ist „rote von allen“.',
        schritte: [`Rote Felder: ${rot}`, `Alle Felder: ${felder}`, `Chance für Rot: ${rot} von ${felder}`],
        daten: { felder: rad(rng, anzahl) },
      },
      rng,
    );
  }
  // fair: Rot gegen Blau – wie viele Felder müssen rot werden, damit beide gleich gute Chancen haben?
  const felder = rng.pick([8, 10, 12]);
  const blau = felder / 2;
  const rot = rng.int(1, blau - 1);
  const weiss = felder - blau - rot;
  const antwort = blau - rot;
  return auswahlAufgabe(
    {
      bude: 'gluecksrad', form: f, stufe,
      text: `Rot gegen Blau: Wie viele gelbe Felder musst du rot anmalen, damit das Spiel fair ist?`,
      antwort,
      fehler: [{ wert: blau, fehlerArt: 'sonstige' }, { wert: rot, fehlerArt: 'sonstige' }, { wert: antwort + 1, fehlerArt: 'sonstige' }, { wert: antwort - 1, fehlerArt: 'sonstige' }],
      kompetenz: 'daten', dimension: 'anwendung',
      idee: 'Fair heißt: Rot und Blau haben gleich viele Felder.',
      schritte: [`Blau hat ${blau} Felder, Rot erst ${rot}.`, `${blau} − ${rot} = ${antwort} gelbe Felder müssen rot werden.`],
      daten: { felder: rad(rng, [rot, blau, weiss]) },
    },
    rng,
  );
}
