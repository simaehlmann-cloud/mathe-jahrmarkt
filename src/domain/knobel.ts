import type { KompetenzId } from './kompetenzen/modell';
import type { Rng } from './rng';

/**
 * Knobelzelt: Sachaufgaben in Schritten (KC: Probleme lösen, Modellieren, Kommunizieren).
 * Jede Aufgabe erzählt eine kleine Jahrmarkt-Situation; das Kind löst sie in zwei bis drei Schritten.
 * Pro Schritt gibt es einen Tipp, nach drei Fehlversuchen wird der Schritt gezeigt.
 */
export interface KnobelSchritt {
  frage: string;
  antwort: number;
  einheit: string;
  tipp: string;
  /** Rechnung, die nach dem Lösen (oder Aufdecken) gezeigt wird. */
  loesung: string;
}
export interface Knobelaufgabe {
  id: string;
  titel: string;
  geschichte: string;
  /** Optional eine kleine Tabelle (z. B. Preise). */
  tabelle?: [string, string][];
  schritte: KnobelSchritt[];
  kompetenz: KompetenzId;
}

export type KnobelStufe = 1 | 2 | 3;
type Bauer = (rng: Rng, stufe: KnobelStufe) => Knobelaufgabe;

const euro = (cent: number): string => (cent % 100 === 0 ? `${cent / 100} €` : `${Math.floor(cent / 100)},${String(cent % 100).padStart(2, '0')} €`);

const EINTRITT: Bauer = (rng, stufe) => {
  // Beträge so wählen, dass die Antworten ganze Euro sind (bei 3,50 € gerade Anzahl)
  const kinder = rng.int(stufe === 1 ? 6 : 10, stufe === 1 ? 10 : 14) * 2;
  const erw = stufe === 3 ? 2 : rng.int(2, 3);
  const pk = stufe === 3 ? rng.pick([350, 450, 250]) : rng.int(3, 5) * 100;
  const pe = pk + rng.pick([200, 300, 400]);
  return {
    id: 'eintritt', titel: 'Klassenausflug', kompetenz: 'operationsverstaendnis',
    geschichte: `Die Klasse 4b kommt mit ${kinder} Kindern und ${erw} Erwachsenen auf den Jahrmarkt. Wie viel kostet der Eintritt für alle zusammen?`,
    tabelle: [['Kind', euro(pk)], ['Erwachsene', euro(pe)]],
    schritte: [
      { frage: 'Was kostet der Eintritt für alle Kinder?', antwort: (kinder * pk) / 100, einheit: '€', tipp: `${kinder} Kinder, jedes zahlt ${euro(pk)}. Das ist eine Malaufgabe.`, loesung: `${kinder} · ${euro(pk)} = ${euro(kinder * pk)}` },
      { frage: 'Was kostet der Eintritt für die Erwachsenen?', antwort: (erw * pe) / 100, einheit: '€', tipp: `${erw} Erwachsene zahlen je ${euro(pe)}.`, loesung: `${erw} · ${euro(pe)} = ${euro(erw * pe)}` },
      { frage: 'Wie viel kostet es für alle zusammen?', antwort: (kinder * pk + erw * pe) / 100, einheit: '€', tipp: 'Zähle beide Beträge zusammen.', loesung: `${euro(kinder * pk)} + ${euro(erw * pe)} = ${euro(kinder * pk + erw * pe)}` },
    ],
  };
};

const GONDELN: Bauer = (rng, stufe) => {
  const pro = rng.int(4, 8);
  let kinder = rng.int(pro * 4, pro * (stufe === 1 ? 6 : 11));
  // Mindestens zwei Kinder bleiben übrig (sonst „1 Kinder“)
  if (kinder % pro < 2) kinder += 2 - (kinder % pro);
  const voll = Math.floor(kinder / pro);
  const rest = kinder % pro;
  return {
    id: 'gondeln', titel: 'Alle aufs Riesenrad', kompetenz: 'operationsverstaendnis',
    geschichte: `${kinder} Kinder wollen gleichzeitig Riesenrad fahren. In jede Gondel passen ${pro} Kinder. Wie viele Gondeln braucht man mindestens?`,
    schritte: [
      { frage: `Wie viele Gondeln werden ganz voll?`, antwort: voll, einheit: 'Gondeln', tipp: `Wie oft passt ${pro} in ${kinder}?`, loesung: `${kinder} : ${pro} = ${voll} Rest ${rest}` },
      { frage: 'Wie viele Kinder bleiben dann noch übrig?', antwort: rest, einheit: 'Kinder', tipp: `${voll} volle Gondeln, das sind ${voll * pro} Kinder. Wie viele fehlen bis ${kinder}?`, loesung: `${kinder} − ${voll * pro} = ${rest}` },
      { frage: 'Wie viele Gondeln braucht man also mindestens?', antwort: voll + 1, einheit: 'Gondeln', tipp: 'Die übrigen Kinder dürfen nicht zurückbleiben!', loesung: `${voll} volle Gondeln und eine für die letzten ${rest}: ${voll + 1}` },
    ],
  };
};

const TASCHENGELD: Bauer = (rng, stufe) => {
  const a = rng.int(2, 4) * 100 + rng.pick([0, 50, stufe > 1 ? 80 : 50]);
  const b = rng.int(1, 3) * 100 + rng.pick([20, 40, 60]);
  const n = stufe === 3 ? 2 : 1;
  const summe = a + n * b;
  // Geldschein, der sicher reicht
  const budget = [1000, 1500, 2000].find((x) => x > summe + 50 && (stufe > 1 || x === 1000)) ?? 2000;
  return {
    id: 'taschengeld', titel: 'Taschengeld', kompetenz: 'groessen',
    geschichte: `Mia hat ${euro(budget)} dabei. Sie kauft eine Zuckerwatte${n === 2 ? ' und zwei Limos' : ' und eine Limo'}. Wie viel Geld bleibt ihr?`,
    tabelle: [['Zuckerwatte', euro(a)], ['Limo', euro(b)]],
    schritte: [
      { frage: 'Wie viel kostet alles zusammen? (in Cent)', antwort: summe, einheit: 'ct', tipp: `Rechne in Cent: ${a} ct + ${n === 2 ? `2 · ${b}` : b} ct.`, loesung: `${euro(a)} + ${n === 2 ? `2 · ${euro(b)}` : euro(b)} = ${euro(summe)}` },
      { frage: 'Wie viel Geld bleibt übrig? (in Cent)', antwort: budget - summe, einheit: 'ct', tipp: `${euro(budget)} sind ${budget} Cent. Ziehe ab oder ergänze.`, loesung: `${budget} ct − ${summe} ct = ${budget - summe} ct = ${euro(budget - summe)}` },
    ],
  };
};

const TISCHE: Bauer = (rng, stufe) => {
  const n = rng.int(stufe === 1 ? 5 : 8, stufe === 1 ? 7 : 15);
  return {
    id: 'tische', titel: 'Tischreihe im Festzelt', kompetenz: 'muster',
    geschichte: 'Im Festzelt werden quadratische Tische zu einer langen Reihe zusammengeschoben. An einem Tisch sitzen 4 Kinder, an 2 Tischen 6, an 3 Tischen 8.',
    tabelle: [['1 Tisch', '4 Plätze'], ['2 Tische', '6 Plätze'], ['3 Tische', '8 Plätze']],
    schritte: [
      { frage: 'Wie viele Plätze kommen mit jedem Tisch dazu?', antwort: 2, einheit: 'Plätze', tipp: 'Vergleiche 4, 6, 8. Um wie viel wächst die Zahl?', loesung: 'Immer 2 mehr: oben und unten je ein Platz.' },
      { frage: `Wie viele Kinder passen an ${n} Tische?`, antwort: 2 * n + 2, einheit: 'Kinder', tipp: `Jeder Tisch bringt oben und unten 2 Plätze, dazu kommen die 2 Plätze an den Enden.`, loesung: `${n} · 2 + 2 = ${2 * n + 2}` },
    ],
  };
};

const ZAHLENRAETSEL: Bauer = (rng, stufe) => {
  const x = rng.int(stufe === 1 ? 4 : 11, stufe === 1 ? 15 : 45);
  const f = stufe === 1 ? 2 : rng.pick([2, 3]);
  const plus = rng.int(5, 30);
  return {
    id: 'zahl', titel: 'Brunos Zauberzahl', kompetenz: 'operationsverstaendnis',
    geschichte: `Bruno denkt sich eine Zahl. Er nimmt sie ${f === 2 ? 'doppelt' : 'dreimal'} und zählt ${plus} dazu. Heraus kommt ${x * f + plus}. Welche Zahl hat er sich gedacht?`,
    schritte: [
      { frage: `Welche Zahl hatte Bruno vor dem Dazuzählen?`, antwort: x * f, einheit: '', tipp: `Rechne rückwärts: Nimm die ${plus} wieder weg.`, loesung: `${x * f + plus} − ${plus} = ${x * f}` },
      { frage: 'Welche Zahl hat er sich gedacht?', antwort: x, einheit: '', tipp: `Rückwärts heißt: geteilt durch ${f}.`, loesung: `${x * f} : ${f} = ${x}` },
    ],
  };
};

const KOMBI: Bauer = (rng, stufe) => {
  const sorten = rng.int(3, stufe === 1 ? 4 : 6);
  const waffeln = rng.int(2, 3);
  const extra = stufe === 3 ? 2 : 1;
  return {
    id: 'eis', titel: 'Eisbude', kompetenz: 'daten',
    geschichte: `An der Eisbude gibt es ${sorten} Sorten und ${waffeln} Waffeln (klein, groß${waffeln === 3 ? ', Schoko' : ''}).${extra === 2 ? ' Dazu darf man wählen: mit oder ohne Sahne.' : ''} Du nimmst eine Kugel. Wie viele verschiedene Eis kannst du bestellen?`,
    schritte: [
      { frage: 'Wie viele Möglichkeiten gibt es mit der kleinen Waffel?', antwort: sorten, einheit: '', tipp: 'Jede Sorte passt in die kleine Waffel.', loesung: `${sorten} Sorten → ${sorten} Möglichkeiten` },
      { frage: `Wie viele Möglichkeiten gibt es insgesamt?`, antwort: sorten * waffeln * extra, einheit: '', tipp: `Für jede Waffel gibt es wieder ${sorten} Möglichkeiten${extra === 2 ? ' – und jede mit oder ohne Sahne' : ''}.`, loesung: `${sorten} · ${waffeln}${extra === 2 ? ' · 2' : ''} = ${sorten * waffeln * extra}` },
    ],
  };
};

const ZAUN: Bauer = (rng, stufe) => {
  const abstand = rng.pick([2, 3, 5]);
  const felder = rng.int(stufe === 1 ? 4 : 6, stufe === 1 ? 6 : 12);
  const laenge = abstand * felder;
  return {
    id: 'zaun', titel: 'Der neue Zaun', kompetenz: 'raum',
    geschichte: `Um das Karussell kommt ein gerader Zaun, ${laenge} m lang. Alle ${abstand} m steht ein Pfosten – auch ganz am Anfang und ganz am Ende.`,
    schritte: [
      { frage: 'Wie viele Zaunfelder gibt es zwischen den Pfosten?', antwort: felder, einheit: 'Felder', tipp: `${laenge} m geteilt in Stücke von ${abstand} m.`, loesung: `${laenge} : ${abstand} = ${felder}` },
      { frage: 'Wie viele Pfosten braucht man?', antwort: felder + 1, einheit: 'Pfosten', tipp: 'Zeichne es auf: Bei 2 Feldern braucht man 3 Pfosten.', loesung: `Ein Pfosten mehr als Felder: ${felder} + 1 = ${felder + 1}` },
    ],
  };
};

const LOSE: Bauer = (rng, stufe) => {
  const kisten = rng.int(2, stufe === 1 ? 3 : 5);
  const je = rng.pick([20, 25, 50]);
  const uebrig = rng.int(8, 60);
  return {
    id: 'lose', titel: 'Losbude', kompetenz: 'operationsverstaendnis',
    geschichte: `Die Losbude hat heute ${kisten} Kisten mit je ${je} Losen verkauft. Am Abend sind noch ${uebrig} Lose übrig. Wie viele Lose waren es am Morgen?`,
    schritte: [
      { frage: 'Wie viele Lose wurden verkauft?', antwort: kisten * je, einheit: 'Lose', tipp: `${kisten} Kisten mit je ${je} Losen.`, loesung: `${kisten} · ${je} = ${kisten * je}` },
      { frage: 'Wie viele Lose waren es am Morgen?', antwort: kisten * je + uebrig, einheit: 'Lose', tipp: 'Am Morgen waren es die verkauften und die übrigen zusammen.', loesung: `${kisten * je} + ${uebrig} = ${kisten * je + uebrig}` },
    ],
  };
};

const STRECKE: Bauer = (rng, stufe) => {
  const runde = rng.pick([150, 250, 350, 450]);
  const n = rng.int(3, stufe === 1 ? 4 : 8);
  const km = stufe === 3;
  const meter = runde * n;
  // Ziel in ganzen Kilometern, das sie knapp nicht schafft
  const ziel = Math.floor(meter / 1000) + 1;
  return {
    id: 'strecke', titel: 'Die Bimmelbahn', kompetenz: 'groessen',
    geschichte: `Die Bimmelbahn fährt eine Runde von ${runde} m um den Jahrmarkt. Heute fährt Mia ${n} Runden mit.${km ? ` Ihr Ziel: ${ziel} Kilometer.` : ''}`,
    schritte: [
      { frage: `Wie viele Meter fährt Mia?`, antwort: meter, einheit: 'm', tipp: `${n} Runden zu je ${runde} m.`, loesung: `${n} · ${runde} m = ${meter} m` },
      ...(km
        ? [{ frage: `Wie viele Meter fehlen ihr bis ${ziel} km?`, antwort: ziel * 1000 - meter, einheit: 'm', tipp: `${ziel} km = ${ziel === 1 ? '1 000' : `${ziel} 000`} m.`, loesung: `${ziel * 1000} m − ${meter} m = ${ziel * 1000 - meter} m` }]
        : []),
    ],
  };
};

export const KNOBEL_ARTEN: readonly Bauer[] = [EINTRITT, GONDELN, TASCHENGELD, TISCHE, ZAHLENRAETSEL, KOMBI, ZAUN, LOSE, STRECKE];

/** Eine Runde im Knobelzelt: fünf verschiedene Aufgaben. */
export function knobelRunde(rng: Rng, stufe: KnobelStufe, anzahl = 5): Knobelaufgabe[] {
  return rng.shuffle([...KNOBEL_ARTEN]).slice(0, anzahl).map((b) => b(rng, stufe));
}

export const KNOBEL_TALER = 3;

/* ---------- Rätsel der Woche ---------- */

export interface Wochenraetsel {
  titel: string;
  text: string;
  antwort: number;
  einheit: string;
  tipps: [string, string];
  loesung: string;
}

export const WOCHENRAETSEL: readonly Wochenraetsel[] = [
  { titel: 'Die Schnecke am Mast', text: 'Eine Schnecke klettert an einem 10 m hohen Fahnenmast. Tagsüber kommt sie 3 m hoch, nachts rutscht sie 2 m hinunter. Am wievielten Tag ist sie oben?', antwort: 8, einheit: '. Tag', tipps: ['Pro Tag und Nacht schafft sie zusammen 1 m.', 'Achtung: Wenn sie tagsüber oben ankommt, rutscht sie nicht mehr zurück!'], loesung: 'Nach 7 Tagen und Nächten ist sie bei 7 m. Am 8. Tag klettert sie 3 m und ist bei 10 m oben.' },
  { titel: 'Gegenüber im Riesenrad', text: 'Die Gondeln im Riesenrad sind der Reihe nach nummeriert. Gondel 3 und Gondel 11 hängen sich genau gegenüber. Wie viele Gondeln hat das Rad?', antwort: 16, einheit: 'Gondeln', tipps: ['Von Gondel 3 bis Gondel 11 ist genau das halbe Rad.', 'Das sind 8 Gondel-Abstände – für das ganze Rad braucht man doppelt so viele.'], loesung: '11 − 3 = 8 ist ein halbes Rad, also 2 · 8 = 16 Gondeln.' },
  { titel: 'Die Zauberzahl', text: 'Ich bin eine zweistellige Zahl. Meine Quersumme ist 9. Meine Zehnerziffer ist doppelt so groß wie meine Einerziffer. Wer bin ich?', antwort: 63, einheit: '', tipps: ['Zehner + Einer = 9.', 'Probiere: Einer 1 → Zehner 2, Einer 2 → Zehner 4, …'], loesung: 'Einer 3, Zehner 6: 6 + 3 = 9 und 6 = 2 · 3. Die Zahl ist 63.' },
  { titel: 'Hände schütteln', text: 'Fünf Freunde treffen sich am Karussell. Jeder gibt jedem anderen genau einmal die Hand. Wie oft werden Hände geschüttelt?', antwort: 10, einheit: 'Mal', tipps: ['Der Erste gibt 4 Hände. Der Zweite muss dem Ersten nicht mehr die Hand geben …', '4 + 3 + 2 + 1'], loesung: '4 + 3 + 2 + 1 = 10 Handschläge.' },
  { titel: 'Seitenzahlen', text: 'Flinka nummeriert die Seiten ihres Rätselheftes von 1 an. Dafür braucht sie genau 33 Ziffern. Wie viele Seiten hat das Heft?', antwort: 21, einheit: 'Seiten', tipps: ['Die Seiten 1 bis 9 brauchen 9 Ziffern.', 'Danach braucht jede Seite 2 Ziffern. 33 − 9 = 24 Ziffern bleiben.'], loesung: '1–9: 9 Ziffern. Bleiben 24 Ziffern für 12 zweistellige Seiten (10–21). Also 21 Seiten.' },
  { titel: 'Der Ziegelstein', text: 'Ein Ziegelstein wiegt 1 kg und noch einen halben Ziegelstein. Wie viel Gramm wiegt ein ganzer Ziegelstein?', antwort: 2000, einheit: 'g', tipps: ['Ein halber Ziegelstein wiegt also genau 1 kg.', 'Zwei Hälften ergeben einen ganzen Stein.'], loesung: 'Halber Stein = 1 kg, ganzer Stein = 2 kg = 2 000 g.' },
  { titel: 'Geschwister', text: 'Lisa ist 4 Jahre älter als ihr Bruder Tom. Zusammen sind sie 22 Jahre alt. Wie alt ist Lisa?', antwort: 13, einheit: 'Jahre', tipps: ['Nimm Lisas 4 Jahre Vorsprung erst einmal weg: 22 − 4 = 18.', 'Die 18 teilen sich gleich auf beide auf.'], loesung: 'Tom ist 9, Lisa 9 + 4 = 13. Zusammen 22.' },
  { titel: 'Die Würfeltreppe', text: 'Eine Treppe aus Würfeln: Die erste Stufe ist 1 Würfel hoch, die zweite 2, die dritte 3 Würfel. Wie viele Würfel braucht man für eine Treppe mit 10 Stufen?', antwort: 55, einheit: 'Würfel', tipps: ['1 + 2 + 3 + … + 10', 'Rechne geschickt: 1 + 10, 2 + 9, 3 + 8 …'], loesung: '5 Paare zu je 11: 5 · 11 = 55 Würfel.' },
  { titel: 'Sockenschublade', text: 'In einer dunklen Schublade liegen rote und blaue Socken durcheinander. Wie viele Socken musst du mindestens herausnehmen, damit sicher zwei gleichfarbige dabei sind?', antwort: 3, einheit: 'Socken', tipps: ['Was ist das Pech, wenn du zwei Socken nimmst?', 'Es gibt nur zwei Farben.'], loesung: 'Bei 2 Socken könnten es eine rote und eine blaue sein. Die dritte passt dann sicher zu einer: 3 Socken.' },
  { titel: 'Glockenschläge', text: 'Die Turmuhr auf dem Jahrmarkt schlägt zur vollen Stunde: um 1 Uhr einmal, um 2 Uhr zweimal, … um 12 Uhr zwölfmal. Wie oft schlägt sie von 1 Uhr bis 12 Uhr zusammen?', antwort: 78, einheit: 'Mal', tipps: ['1 + 2 + 3 + … + 12', 'Bilde Paare: 1 + 12, 2 + 11, …'], loesung: '6 Paare zu je 13: 6 · 13 = 78.' },
  { titel: 'Zaunpfosten', text: 'Ein gerader Zaun ist 20 m lang. Alle 2 m steht ein Pfosten, auch an beiden Enden. Wie viele Pfosten gibt es?', antwort: 11, einheit: 'Pfosten', tipps: ['Wie viele 2-m-Stücke passen in 20 m?', 'Am Anfang steht schon ein Pfosten, bevor das erste Stück beginnt.'], loesung: '10 Felder, aber 11 Pfosten.' },
  { titel: 'Seil schneiden', text: 'Bruno schneidet ein 12 m langes Seil in gleich lange Stücke von je 1,5 m. Wie oft muss er schneiden?', antwort: 7, einheit: 'Schnitte', tipps: ['Wie viele Stücke entstehen? 12 m : 1,5 m', 'Für 2 Stücke braucht man nur einen Schnitt.'], loesung: '8 Stücke, dafür 7 Schnitte.' },
];

/** Rätsel der Woche nach Kalenderwoche („2026-W46“). */
export function raetselDerWoche(woche: string): Wochenraetsel {
  const n = Number(woche.slice(-2)) + Number(woche.slice(0, 4)) * 53;
  return WOCHENRAETSEL[n % WOCHENRAETSEL.length] as Wochenraetsel;
}
export const RAETSEL_BLOECKE = 25;
