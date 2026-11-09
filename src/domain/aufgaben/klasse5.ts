import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Fehler } from './auswahl';
import { auswahlAufgabe, codeAuswahl } from './baukasten';
import type { AuswahlAufgabe } from './typen';

/** Sternenmarkt: Ausblick auf Klasse 5 (schriftliche Division, Brüche, Dezimalzahlen). */

/* ---------- Geisterbahn: schriftliche Division ---------- */

export interface DivSchritt {
  /** Teilzahl, die gerade geteilt wird */
  teil: number;
  /** Ergebnisziffer */
  q: number;
  produkt: number;
  rest: number;
  /** Index der letzten Ziffer der Teilzahl im Dividenden */
  ende: number;
}

export function divisionsSchritte(a: number, d: number): DivSchritt[] {
  const ziffern = String(a).split('').map(Number);
  const schritte: DivSchritt[] = [];
  let teil = 0;
  let begonnen = false;
  ziffern.forEach((z, i) => {
    teil = teil * 10 + z;
    if (!begonnen && teil < d && i < ziffern.length - 1) return;
    begonnen = true;
    const q = Math.floor(teil / d);
    const produkt = q * d;
    schritte.push({ teil, q, produkt, rest: teil - produkt, ende: i });
    teil -= produkt;
  });
  return schritte;
}

/** Zeilen für die Darstellung bis vor Schritt `k` (Teilzahl von Schritt k ist sichtbar, alles danach nicht). */
export function divisionsZeilen(s: readonly DivSchritt[], k: number): { text: string; ende: number; minus?: boolean }[] {
  const zeilen: { text: string; ende: number; minus?: boolean }[] = [];
  for (let j = 0; j < Math.min(k, s.length); j++) {
    const x = s[j];
    if (!x) continue;
    zeilen.push({ text: String(x.produkt), ende: x.ende, minus: true });
    const n = s[j + 1];
    if (n) zeilen.push({ text: String(n.teil).padStart(String(n.teil).length, '0'), ende: n.ende });
    else zeilen.push({ text: String(x.rest), ende: x.ende });
  }
  return zeilen;
}

const ziffer = (w: number): string => String(w - 1);

export function baueDivision(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'ohne' : stufe === 'silber' ? 'rest' : 'probe');
  const d = rng.int(2, 9);
  let a: number;
  if (f === 'ohne') a = d * rng.int(Math.ceil(100 / d), Math.floor(999 / d));
  else {
    do a = rng.int(f === 'probe' ? 200 : 1000, f === 'probe' ? 999 : 9999);
    while (a % d === 0);
  }
  const s = divisionsSchritte(a, d);
  const q = Math.floor(a / d);
  const r = a % d;
  if (f === 'probe') {
    return auswahlAufgabe(
      {
        bude: 'geisterbahn', form: f, stufe, text: `Welche Zahl wurde durch ${d} geteilt?`, antwort: a,
        sprechtext: `Eine Zahl geteilt durch ${d} ergibt ${q} Rest ${r}. Welche Zahl war es? Mach die Probe.`,
        fehler: [{ wert: q * d, fehlerArt: 'sonstige' }, { wert: q * d - r, fehlerArt: 'operation' }, { wert: a + d, fehlerArt: 'sonstige' }, { wert: a + 10, fehlerArt: 'uebertrag' }],
        schritt: 10, kompetenz: 'klasse5', dimension: 'anwendung',
        idee: 'Bei der Probe rechnest du rückwärts: Ergebnis mal Teiler, dann den Rest dazu. Heraus kommt die Startzahl.',
        schritte: [`${q} · ${d} = ${q * d}`, `${q * d} + ${r} = ${a}`, `Stimmt: ${a} : ${d} = ${q} Rest ${r}.`],
        daten: { a, d, quotient: String(q).split(''), sichtbar: s.length, zeilen: divisionsZeilen(s, s.length), rest: r, frage: 'probe' },
      },
      rng,
    );
  }
  // Nach dem Rest fragen (nur mit Rest) oder nach einer Ergebnisziffer
  if (f === 'rest' && rng.next() < 0.35) {
    return auswahlAufgabe(
      {
        bude: 'geisterbahn', form: f, stufe, text: 'Welcher Rest bleibt?', antwort: r,
        sprechtext: `${a} geteilt durch ${d}. Welcher Rest bleibt am Ende?`,
        fehler: [{ wert: r + d, fehlerArt: 'sonstige' }, { wert: d - r, fehlerArt: 'operation' }, { wert: r + 1, fehlerArt: 'sonstige' }, { wert: r - 1, fehlerArt: 'sonstige' }],
        kompetenz: 'klasse5', dimension: 'sicherheit',
        idee: 'Der Rest ist das, was nach dem letzten Abziehen übrig bleibt. Er muss kleiner als der Teiler sein.',
        schritte: [`Letzter Schritt: ${s[s.length - 1]?.teil} − ${s[s.length - 1]?.produkt} = ${r}`, `${r} ist kleiner als ${d}, also ist ${r} der Rest.`],
        daten: { a, d, quotient: String(q).split(''), sichtbar: s.length, zeilen: divisionsZeilen(s, s.length), rest: null, frage: 'rest' },
      },
      rng,
    );
  }
  const k = rng.int(0, s.length - 1);
  const x = s[k] ?? { teil: 0, q: 0, produkt: 0, rest: 0, ende: 0 };
  const antwort = x.q + 1;
  const fehler: Fehler[] = [
    { wert: x.q + 2, fehlerArt: 'einmaleins' },
    { wert: x.q, fehlerArt: 'einmaleins' },
    { wert: Math.min(10, Math.floor(x.teil / 10) + 1), fehlerArt: 'stelle' },
    { wert: x.q + 3, fehlerArt: 'sonstige' },
  ].filter((y) => y.wert >= 1 && y.wert <= 10) as Fehler[];
  const quotient = String(q).padStart(s.length, '0').slice(-s.length).split('');
  return auswahlAufgabe(
    {
      bude: 'geisterbahn', form: f, stufe, text: `Wie oft passt ${d} in ${x.teil}?`, antwort, fehler, format: ziffer,
      sprechtext: `${a} geteilt durch ${d}. Wie oft passt ${d} in ${x.teil}?`,
      kompetenz: 'klasse5', dimension: f === 'ohne' ? 'wissen' : 'sicherheit',
      idee: 'Schritt für Schritt: Wie oft passt der Teiler in die Teilzahl? Malnehmen, abziehen, nächste Ziffer herunterholen.',
      schritte: [`${x.q} · ${d} = ${x.produkt}`, `${x.teil} − ${x.produkt} = ${x.rest}${x.rest < d ? `, und ${x.rest} ist kleiner als ${d}` : ''}.`, `Die nächste Ziffer im Ergebnis ist ${x.q}.`],
      daten: { a, d, quotient: quotient.slice(0, k), sichtbar: k, zeilen: divisionsZeilen(s, k), rest: null, frage: 'ziffer', loesung: x.q, markiere: k === 0 ? x.ende : -1 },
    },
    rng,
  );
}

/* ---------- Pizzabäckerei: Brüche ---------- */

const NENNER_NAME: Record<number, string> = { 2: 'ein Halb', 3: 'ein Drittel', 4: 'ein Viertel', 5: 'ein Fünftel', 6: 'ein Sechstel', 8: 'ein Achtel', 10: 'ein Zehntel', 12: 'ein Zwölftel' };
const NENNER = [2, 3, 4, 5, 6, 8, 10, 12];
const bruch = (z: number, n: number): string => `${z}/${n}`;

export function baueBruch(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'stamm' : stufe === 'silber' ? 'anteil' : 'gleich');
  if (f === 'stamm') {
    const n = rng.pick(NENNER);
    const andere = rng.shuffle(NENNER.filter((m) => m !== n)).slice(0, 3);
    return auswahlAufgabe(
      {
        bude: 'pizzabaeckerei', form: f, stufe, text: 'Welcher Teil der Pizza ist belegt?', antwort: n,
        fehler: andere.map((m) => ({ wert: m, fehlerArt: 'sonstige' as const })),
        format: (w) => `1/${w}  (${NENNER_NAME[w] ?? ''})`, kompetenz: 'klasse5', dimension: 'wissen',
        idee: 'Zähle, in wie viele gleich große Stücke die Pizza geschnitten ist. Ein Stück davon ist ein …tel.',
        schritte: [`Die Pizza hat ${n} gleiche Stücke.`, `Ein Stück ist 1/${n}: ${NENNER_NAME[n]}.`],
        daten: { pizzen: [[1, n]] },
      },
      rng,
    );
  }
  if (f === 'anteil') {
    const n = rng.pick([4, 5, 6, 8, 10, 12]);
    const z = rng.int(2, n - 1);
    const texte = [bruch(z, n), bruch(n - z, n), bruch(z, n - z), bruch(n, z)];
    if (new Set(texte).size < 4) return baueBruch(stufe, rng, f);
    return auswahlAufgabe(
      {
        bude: 'pizzabaeckerei', form: f, stufe, text: 'Welcher Bruch passt zu den belegten Stücken?', ...codeAuswahl(texte, 0, rng),
        kompetenz: 'klasse5', dimension: 'wissen',
        idee: 'Unten (Nenner): in wie viele Stücke ist die Pizza geteilt? Oben (Zähler): wie viele davon sind belegt?',
        schritte: [`${n} Stücke insgesamt, ${z} belegt.`, `Also ${z}/${n}.`],
        daten: { pizzen: [[z, n]] },
      },
      rng,
    );
  }
  const n = rng.pick([2, 3, 4, 5]);
  const z = rng.int(1, n - 1);
  const k = rng.pick([2, 3]);
  const texte = [bruch(z * k, n * k), bruch(z + k, n + k), bruch(z, n * k), bruch(z * k, n)];
  if (new Set(texte).size < 4) return baueBruch(stufe, rng, f);
  return auswahlAufgabe(
    {
      bude: 'pizzabaeckerei', form: f, stufe, text: `Welcher Bruch ist genauso viel wie ${bruch(z, n)}?`, ...codeAuswahl(texte, 0, rng),
      kompetenz: 'klasse5', dimension: 'anwendung',
      idee: 'Schneidest du jedes Stück noch einmal durch, werden es mehr Stücke – aber die belegte Fläche bleibt gleich.',
      schritte: [`Jedes Stück in ${k} Teile schneiden.`, `Aus ${n} Stücken werden ${n * k}, aus ${z} belegten werden ${z * k}.`, `${bruch(z, n)} = ${bruch(z * k, n * k)}`],
      daten: { pizzen: [[z, n]], loesung: [z * k, n * k] },
    },
    rng,
  );
}

/* ---------- Hau den Lukas: Dezimalzahlen ---------- */

/** Zehntel als Text: 37 → „3,7“. */
export const zehntel = (w: number): string => `${Math.floor(w / 10)},${w % 10}`;

export function baueDezimal(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'zehntel' : stufe === 'silber' ? 'ordnen' : 'bruch');
  if (f === 'zehntel') {
    const ganz = rng.int(0, 4);
    const k = rng.int(1, 9);
    const antwort = ganz * 10 + k;
    return auswahlAufgabe(
      {
        bude: 'hauDenLukas', form: f, stufe, text: 'Wie hoch ist der Puck geflogen?', antwort, format: zehntel,
        fehler: [{ wert: antwort + 1, fehlerArt: 'skala' }, { wert: antwort - 1, fehlerArt: 'skala' }, { wert: ganz * 10 + (10 - k), fehlerArt: 'skala' }, { wert: k * 10 + ganz, fehlerArt: 'stelle' }].filter((x) => x.wert !== antwort) as Fehler[],
        kompetenz: 'klasse5', dimension: 'wissen',
        idee: `Zwischen ${ganz} und ${ganz + 1} ist die Skala in 10 gleiche Teile geteilt. Jeder Strich ist ein Zehntel: 0,1.`,
        schritte: [`Von ${ganz} aus ${k} Striche nach oben.`, `${ganz} + ${k} Zehntel = ${zehntel(antwort)}`],
        daten: { von: ganz, pos: k, zeige: true },
      },
      rng,
    );
  }
  if (f === 'ordnen') {
    // Fehlvorstellung „länger ist größer“: 2,45 gegen 2,5
    const ganz = rng.int(1, 8);
    const a = rng.int(3, 8);
    const kandidaten = [`${ganz},${a}`, `${ganz},${a - 1}${rng.int(1, 9)}`, `${ganz},${a - 2}${rng.int(1, 9)}`, `${ganz},0${a + 1}`];
    const zahl = (t: string): number => Number(t.replace(',', '.'));
    const werte = kandidaten.map(zahl);
    if (new Set(werte).size < 4) return baueDezimal(stufe, rng, f);
    const richtig = werte.indexOf(Math.max(...werte));
    return auswahlAufgabe(
      {
        bude: 'hauDenLukas', form: f, stufe, text: 'Wer hat am höchsten gehauen?', ...codeAuswahl(kandidaten, richtig, rng),
        kompetenz: 'klasse5', dimension: 'sicherheit',
        idee: 'Vergleiche Stelle für Stelle von links: erst die Ganzen, dann die Zehntel, dann die Hundertstel. Mehr Ziffern heißt nicht größer!',
        schritte: [`Alle haben ${ganz} Ganze.`, `Zehntel: ${kandidaten.map((t) => t.split(',')[1]?.[0]).join(', ')}.`, `Am meisten Zehntel hat ${kandidaten[richtig]}.`],
        daten: { von: ganz, marken: kandidaten.map((t) => Math.round((zahl(t) - ganz) * 100) / 10), namen: kandidaten, zeige: false },
      },
      rng,
    );
  }
  const paare: [string, string, number][] = [
    ['1/2', '0,5', 5], ['1/4', '0,25', 2.5], ['3/4', '0,75', 7.5], ['1/5', '0,2', 2], ['1/10', '0,1', 1],
    ['3/10', '0,3', 3], ['7/10', '0,7', 7], ['2/5', '0,4', 4], ['9/10', '0,9', 9],
  ];
  const [b, dz, pos] = rng.pick(paare);
  const [z = '1', n = '2'] = b.split('/');
  const falsch = [`0,${z}${n}`, `${z},${n}`, `0,0${z}`].filter((t) => t !== dz);
  const texte = [dz, ...falsch].slice(0, 4);
  return auswahlAufgabe(
    {
      bude: 'hauDenLukas', form: f, stufe, text: `Welche Dezimalzahl ist ${b}?`, ...codeAuswahl(texte, 0, rng),
      kompetenz: 'klasse5', dimension: 'anwendung',
      idee: 'Wandle den Bruch in Zehntel oder Hundertstel um. Dann kannst du ihn als Kommazahl schreiben.',
      schritte: [n === '10' ? `${b} sind ${z} Zehntel.` : `${b} = ${pos * 10}/100`, `${b} = ${dz}`],
      daten: { von: 0, pos, zeige: false },
    },
    rng,
  );
}
