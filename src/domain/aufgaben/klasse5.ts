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

/**
 * Geisterbahn: Die ganze Division wird Schritt für Schritt gerechnet (Ziffer für Ziffer, mit Rest am Ende).
 * Antwort: Ergebnis (ohne Rest), Ergebnis · 10 + Rest (mit Rest, Rest < Teiler ≤ 9) oder die Startzahl (Probe).
 */
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
  const basis = { a, d, schritte: s, quotient: String(q).split(''), rest: r };
  if (f === 'probe') {
    return auswahlAufgabe(
      {
        bude: 'geisterbahn', form: f, stufe, text: `? : ${d} = ${q} Rest ${r}. Welche Zahl war es?`, antwort: a, frei: true,
        sprechtext: `Eine Zahl geteilt durch ${d} ergibt ${q} Rest ${r}. Welche Zahl war es? Mach die Probe.`,
        fehler: [{ wert: q * d, fehlerArt: 'sonstige' }, { wert: q * d - r, fehlerArt: 'operation' }, { wert: a + d, fehlerArt: 'sonstige' }, { wert: a + 10, fehlerArt: 'uebertrag' }],
        schritt: 10, kompetenz: 'klasse5', dimension: 'anwendung',
        idee: 'Bei der Probe rechnest du rückwärts: Ergebnis mal Teiler, dann den Rest dazu. Heraus kommt die Startzahl.',
        schritte: [`${q} · ${d} = ${q * d}`, `${q * d} + ${r} = ${a}`, `Stimmt: ${a} : ${d} = ${q} Rest ${r}.`],
        daten: { ...basis, frage: 'probe', zeilen: divisionsZeilen(s, s.length), sichtbar: s.length },
      },
      rng,
    );
  }
  const mitRest = f === 'rest';
  const antwort = mitRest ? q * 10 + r : q;
  const fehler: Fehler[] = (
    mitRest
      ? [
          { wert: (q + 1) * 10 + r, fehlerArt: 'einmaleins' },
          { wert: (q - 1) * 10 + r, fehlerArt: 'einmaleins' },
          { wert: q * 10 + ((r + 1) % d), fehlerArt: 'sonstige' },
          { wert: Math.floor(q / 10) * 10 + r, fehlerArt: 'stelle' },
        ]
      : [
          { wert: q + 1, fehlerArt: 'einmaleins' },
          { wert: q - 1, fehlerArt: 'einmaleins' },
          { wert: q + 10, fehlerArt: 'stelle' },
          { wert: Math.floor(q / 10), fehlerArt: 'stelle' },
        ]
  ).filter((y) => y.wert > 0 && y.wert !== antwort) as Fehler[];
  return auswahlAufgabe(
    {
      bude: 'geisterbahn', form: f, stufe, text: `${a} : ${d}`, sprechtext: `Rechne ${a} geteilt durch ${d}, Schritt für Schritt.`,
      antwort, fehler, frei: true, schritt: mitRest ? 10 : 1,
      kompetenz: 'klasse5', dimension: mitRest ? 'sicherheit' : 'wissen',
      idee: 'Schritt für Schritt: Wie oft passt der Teiler hinein? Malnehmen, abziehen, nächste Ziffer herunterholen.',
      schritte: [...s.map((x) => `${x.teil} : ${d} = ${x.q}, denn ${x.q} · ${d} = ${x.produkt}, Rest ${x.rest}`), `${a} : ${d} = ${q}${mitRest ? ` Rest ${r}` : ''}`],
      daten: { ...basis, frage: mitRest ? 'rest' : 'ohne', zeilen: divisionsZeilen(s, s.length), sichtbar: s.length, anzeige: mitRest ? 'division' : undefined },
    },
    rng,
  );
}

/* ---------- Pizzabäckerei: Brüche ---------- */

const NENNER_NAME: Record<number, string> = { 2: 'ein Halb', 3: 'ein Drittel', 4: 'ein Viertel', 5: 'ein Fünftel', 6: 'ein Sechstel', 8: 'ein Achtel', 10: 'ein Zehntel', 12: 'ein Zwölftel' };
const NENNER = [2, 3, 4, 5, 6, 8, 10, 12];
const bruch = (z: number, n: number): string => `${z}/${n}`;

/**
 * Pizzabäckerei: Das Kind schneidet die Pizza selbst in gleiche Stücke und belegt sie.
 * Antwort: Stückzahl · 100 + belegte Stücke (z. B. 3/8 → 803).
 */
const code = (z: number, n: number): number => n * 100 + z;

export function baueBruch(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = form ?? (stufe === 'bronze' ? 'stamm' : stufe === 'silber' ? 'anteil' : 'gleich');
  const fehlerFuer = (z: number, n: number): Fehler[] =>
    [
      { wert: code(n, z), fehlerArt: 'sonstige' as const },
      { wert: code(n - z, n), fehlerArt: 'sonstige' as const },
      { wert: code(z, n + 1), fehlerArt: 'sonstige' as const },
      { wert: code(z + 1, n), fehlerArt: 'sonstige' as const },
    ].filter((x) => x.wert !== code(z, n) && x.wert % 100 > 0 && Math.floor(x.wert / 100) >= 2 && x.wert % 100 <= Math.floor(x.wert / 100));
  if (f === 'stamm' || f === 'anteil') {
    const n = f === 'stamm' ? rng.pick(NENNER) : rng.pick([4, 5, 6, 8, 10, 12]);
    const z = f === 'stamm' ? 1 : rng.int(2, Math.min(n - 1, 7));
    return auswahlAufgabe(
      {
        bude: 'pizzabaeckerei', form: f, stufe, text: `Bestellung: ${bruch(z, n)} mit Salami`, sprechtext: `Bestellung: ${z === 1 ? NENNER_NAME[n] : bruch(z, n)} der Pizza mit Salami. Schneide die Pizza und belege sie.`,
        antwort: code(z, n), fehler: fehlerFuer(z, n), frei: true, format: (w) => bruch(w % 100, Math.floor(w / 100)),
        kompetenz: 'klasse5', dimension: f === 'stamm' ? 'wissen' : 'sicherheit',
        idee: 'Der Nenner (unten) sagt, in wie viele gleich große Stücke du schneidest. Der Zähler (oben) sagt, wie viele davon belegt werden.',
        schritte: [`${n} gleiche Stücke schneiden.`, `${z} ${z === 1 ? 'Stück' : 'Stücke'} mit Salami belegen: ${bruch(z, n)}${z === 1 ? ` (${NENNER_NAME[n]})` : ''}.`],
        daten: { pizzen: [[z, n]], anzeige: 'bruch', bestellung: [z, n] },
      },
      rng,
    );
  }
  const n = rng.pick([2, 3, 4, 5]);
  const z = rng.int(1, n - 1);
  const k = rng.pick([2, 3]);
  return auswahlAufgabe(
    {
      bude: 'pizzabaeckerei', form: f, stufe, text: `Genauso viel Salami wie ${bruch(z, n)} – aber in ${n * k} Stücken!`,
      sprechtext: `Der Kunde möchte genauso viel Salami wie auf ${bruch(z, n)} der Pizza. Schneide die Pizza aber in ${n * k} Stücke.`,
      antwort: code(z * k, n * k), fehler: [...fehlerFuer(z * k, n * k), { wert: code(z, n * k), fehlerArt: 'sonstige' }, { wert: code(z + k, n * k), fehlerArt: 'sonstige' }], frei: true,
      format: (w) => bruch(w % 100, Math.floor(w / 100)),
      kompetenz: 'klasse5', dimension: 'anwendung',
      idee: 'Schneidest du jedes Stück noch einmal durch, werden es mehr Stücke – aber die belegte Fläche bleibt gleich.',
      schritte: [`Jedes ${bruch(1, n)}-Stück wird in ${k} Teile geschnitten.`, `Aus ${n} Stücken werden ${n * k}, aus ${z} belegten werden ${z * k}.`, `${bruch(z, n)} = ${bruch(z * k, n * k)}`],
      daten: { pizzen: [[z, n]], loesung: [z * k, n * k], anzeige: 'bruch', bestellung: [z, n], stuecke: n * k },
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
        bude: 'hauDenLukas', form: f, stufe, text: `Triff genau ${zehntel(antwort)}!`, sprechtext: `Stelle die Kraft so ein, dass der Puck genau bis ${zehntel(antwort)} fliegt.`, antwort, format: zehntel, frei: true,
        fehler: [{ wert: antwort + 1, fehlerArt: 'skala' }, { wert: antwort - 1, fehlerArt: 'skala' }, { wert: ganz * 10 + (10 - k), fehlerArt: 'skala' }, { wert: k * 10 + ganz, fehlerArt: 'stelle' }].filter((x) => x.wert !== antwort) as Fehler[],
        kompetenz: 'klasse5', dimension: 'wissen',
        idee: `Zwischen ${ganz} und ${ganz + 1} ist die Skala in 10 gleiche Teile geteilt. Jeder Strich ist ein Zehntel: 0,1.`,
        schritte: [`Von ${ganz} aus ${k} Striche nach oben.`, `${ganz} + ${k} Zehntel = ${zehntel(antwort)}`],
        daten: { von: ganz, pos: k, zeige: true, anzeige: 'zehntel', raster: 10 },
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
  const paare: [string, number][] = [
    ['1/2', 50], ['1/4', 25], ['3/4', 75], ['1/5', 20], ['1/10', 10], ['3/10', 30], ['7/10', 70], ['2/5', 40], ['9/10', 90], ['4/5', 80],
  ];
  const [b, hundertstel] = rng.pick(paare);
  const [z = '1', n = '2'] = b.split('/');
  const dz = `0,${String(hundertstel).replace(/0$/, '')}`;
  return auswahlAufgabe(
    {
      bude: 'hauDenLukas', form: f, stufe, text: `Triff genau ${b}!`, sprechtext: `Stelle die Kraft so ein, dass der Puck bis ${b} fliegt. Die Skala geht von 0 bis 1.`,
      antwort: hundertstel, frei: true, schritt: 5,
      fehler: [
        { wert: Number(`${z}${n}`) <= 100 ? Number(`${z}${n}`) : hundertstel + 10, fehlerArt: 'stelle' },
        { wert: Number(z) * 10 <= 100 ? Number(z) * 10 : hundertstel - 10, fehlerArt: 'stelle' },
        { wert: hundertstel + 5, fehlerArt: 'skala' },
        { wert: hundertstel - 5, fehlerArt: 'skala' },
      ].filter((x) => x.wert > 0 && x.wert !== hundertstel) as Fehler[],
      kompetenz: 'klasse5', dimension: 'anwendung',
      idee: 'Wandle den Bruch in Zehntel oder Hundertstel um. Dann findest du ihn auf der Skala von 0 bis 1.',
      schritte: [n === '10' ? `${b} sind ${z} Zehntel.` : `${b} = ${hundertstel}/100`, `${b} = ${dz}`],
      daten: { von: 0, pos: hundertstel / 10, zeige: false, anzeige: 'hundertstel', raster: 20 },
    },
    rng,
  );
}
