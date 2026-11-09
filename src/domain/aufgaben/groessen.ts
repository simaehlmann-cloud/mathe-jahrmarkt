import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import type { Fehler } from './auswahl';
import { auswahlAufgabe, codeAuswahl, euro } from './baukasten';
import type { AuswahlAufgabe } from './typen';

/** Größenmarkt (KC: Größen und Messen): Geld, Längen, Gewichte, Hohlmaße, Zeit. */

const pickForm = (formen: readonly string[], form: string | undefined, rng: Rng): string => (form && formen.includes(form) ? form : rng.pick([...formen]));

/* ---------- Süßigkeitenkasse ---------- */

const WAREN = ['Zuckerwatte', 'Lolli', 'Popcorn', 'Lebkuchenherz', 'Brezel', 'Apfel im Schokomantel', 'Gummibärchen', 'Limo'];
const MUENZEN = [200, 100, 50, 20, 10, 5, 2, 1];

/** Betrag gierig in Münzen zerlegen. */
export function muenzen(cent: number): number[] {
  const liste: number[] = [];
  let rest = cent;
  for (const m of MUENZEN) while (rest >= m) {
    liste.push(m);
    rest -= m;
  }
  return liste;
}
const muenzText = (m: number): string => (m >= 100 ? `${m / 100} €` : `${m} ct`);
const muenzenText = (l: readonly number[]): string => l.map(muenzText).join(' + ');

export function baueKasse(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = pickForm(stufe === 'bronze' ? ['bezahlen'] : stufe === 'silber' ? ['rueckgeld', 'bezahlen'] : ['einkauf', 'rueckgeld'], form, rng);
  const ware = rng.pick(WAREN);
  if (f === 'bezahlen') {
    const preis = rng.int(3, 9) * 50 + rng.pick([0, 5, 10, 20, 25, 30, 45]);
    const richtig = muenzen(preis);
    return auswahlAufgabe(
      {
        bude: 'kasse', form: f, stufe, text: 'Bezahle passend!', sprechtext: `${ware} kostet ${euro(preis)}. Lege die Münzen passend hin.`,
        antwort: preis, frei: true, schritt: 10, format: (w) => euro(w),
        fehler: [{ wert: preis + 10, fehlerArt: 'sonstige' }, { wert: preis - 5, fehlerArt: 'sonstige' }, { wert: preis + 100, fehlerArt: 'stelle' }],
        kompetenz: 'groessen', dimension: 'sicherheit',
        idee: 'Zähle die Münzen zusammen, mit den großen zuerst. 100 Cent sind 1 Euro.',
        schritte: [`Zum Beispiel: ${muenzenText(richtig)} = ${euro(preis)}`],
        daten: { ware, preis, modus: 'bezahlen', anzeige: 'euro', muenzen: richtig },
      },
      rng,
    );
  }
  if (f === 'rueckgeld') {
    const schein = rng.pick([500, 1000, 2000]);
    const preis = rng.int(Math.ceil(schein / 400), schein / 100 - 1) * 100 + rng.pick([15, 25, 35, 45, 55, 65, 85, 95]);
    const rueck = schein - preis;
    const fehler: Fehler[] = [
      { wert: rueck + 100, fehlerArt: 'uebertrag' },
      { wert: rueck - 10 > 0 ? rueck - 10 : rueck + 20, fehlerArt: 'uebertrag' },
      { wert: Math.floor(schein / 100 - preis / 100) * 100 + (100 - (preis % 100)), fehlerArt: 'uebertrag' },
    ];
    const ergaenzung = Math.ceil(preis / 100) * 100;
    return auswahlAufgabe(
      {
        bude: 'kasse', form: f, stufe, text: 'Gib das Rückgeld!', sprechtext: `${ware} kostet ${euro(preis)}. Der Kunde bezahlt mit ${schein / 100} Euro. Lege das Rückgeld hin.`,
        antwort: rueck, fehler, schritt: 10, format: (w) => euro(w), frei: true,
        kompetenz: 'groessen', dimension: 'anwendung',
        idee: 'Rückgeld findest du durch Ergänzen: erst bis zum vollen Euro, dann bis zum Schein.',
        schritte: [`${euro(preis)} + ${euro(ergaenzung - preis)} = ${euro(ergaenzung)}`, `${euro(ergaenzung)} + ${euro(schein - ergaenzung)} = ${euro(schein)}`, `Rückgeld: ${euro(ergaenzung - preis)} + ${euro(schein - ergaenzung)} = ${euro(rueck)}`],
        daten: { ware, preis, schein, modus: 'rueckgeld', anzeige: 'euro' },
      },
      rng,
    );
  }
  // Einkaufszettel mit Kommazahlen
  const waren = rng.shuffle([...WAREN]).slice(0, 3);
  const preise = waren.map(() => rng.int(1, 4) * 100 + rng.pick([5, 10, 25, 40, 50, 75, 90, 95]));
  const summe = preise.reduce((s, p) => s + p, 0);
  const fehler: Fehler[] = [
    // „1,05“ als 1,50 gelesen
    { wert: summe + preise.filter((p) => p % 100 < 10).reduce((s, p) => s + (p % 100) * 9, 0) || summe + 90, fehlerArt: 'stelle' },
    { wert: summe - 100, fehlerArt: 'uebertrag' },
    { wert: summe + 10, fehlerArt: 'uebertrag' },
  ];
  return auswahlAufgabe(
    {
      bude: 'kasse', form: 'einkauf', stufe, text: 'Bezahle den Einkauf!', sprechtext: `Du kaufst ${waren.map((w, i) => `${w} für ${euro(preise[i] ?? 0)}`).join(', ')}. Lege den ganzen Betrag passend hin.`,
      antwort: summe, fehler, schritt: 10, format: (w) => euro(w), frei: true,
      kompetenz: 'groessen', dimension: 'anwendung',
      idee: 'Erst die Euro zusammenzählen, dann die Cent. 100 Cent sind 1 Euro.',
      schritte: [`Euro: ${preise.map((p) => Math.floor(p / 100)).join(' + ')} = ${preise.reduce((s, p) => s + Math.floor(p / 100), 0)} €`, `Cent: ${preise.map((p) => p % 100).join(' + ')} = ${preise.reduce((s, p) => s + (p % 100), 0)} ct`, `Zusammen: ${euro(summe)}`],
      daten: { waren, preise, modus: 'einkauf', anzeige: 'euro' },
    },
    rng,
  );
}

/* ---------- Schätz-Bude ---------- */

interface Ding {
  name: string;
  wert: number;
  einheit: string;
  /** Andere Einheiten derselben Größe, die als falsche Antworten dienen. */
  falsch: string[];
  art: 'laenge' | 'gewicht' | 'volumen' | 'zeit';
}
const DINGE: Ding[] = [
  { name: 'Ein Bleistift', wert: 15, einheit: 'cm', falsch: ['mm', 'm', 'km'], art: 'laenge' },
  { name: 'Eine Zimmertür ist hoch', wert: 2, einheit: 'm', falsch: ['cm', 'mm', 'km'], art: 'laenge' },
  { name: 'Eine Ameise', wert: 5, einheit: 'mm', falsch: ['cm', 'm', 'km'], art: 'laenge' },
  { name: 'Ein Bus', wert: 12, einheit: 'm', falsch: ['cm', 'mm', 'km'], art: 'laenge' },
  { name: 'Ein Fußballfeld', wert: 100, einheit: 'm', falsch: ['cm', 'mm', 'km'], art: 'laenge' },
  { name: 'Eine Wanderung', wert: 8, einheit: 'km', falsch: ['m', 'cm', 'mm'], art: 'laenge' },
  { name: 'Ein Schulheft ist breit', wert: 21, einheit: 'cm', falsch: ['mm', 'm', 'km'], art: 'laenge' },
  { name: 'Ein Apfel wiegt', wert: 150, einheit: 'g', falsch: ['kg', 't'], art: 'gewicht' },
  { name: 'Ein Kind wiegt', wert: 30, einheit: 'kg', falsch: ['g', 't'], art: 'gewicht' },
  { name: 'Eine Tafel Schokolade', wert: 100, einheit: 'g', falsch: ['kg', 't'], art: 'gewicht' },
  { name: 'Ein Elefant wiegt', wert: 5, einheit: 't', falsch: ['kg', 'g'], art: 'gewicht' },
  { name: 'Ein Sack Kartoffeln', wert: 5, einheit: 'kg', falsch: ['g', 't'], art: 'gewicht' },
  { name: 'In eine Milchtüte passt', wert: 1, einheit: 'l', falsch: ['ml'], art: 'volumen' },
  { name: 'In einen Teelöffel passen', wert: 5, einheit: 'ml', falsch: ['l'], art: 'volumen' },
  { name: 'In eine Badewanne passen', wert: 150, einheit: 'l', falsch: ['ml'], art: 'volumen' },
  { name: 'In ein Glas passen', wert: 200, einheit: 'ml', falsch: ['l'], art: 'volumen' },
  { name: 'Zähneputzen dauert', wert: 3, einheit: 'Minuten', falsch: ['Sekunden', 'Stunden', 'Tage'], art: 'zeit' },
  { name: 'Eine Schulstunde dauert', wert: 45, einheit: 'Minuten', falsch: ['Sekunden', 'Stunden', 'Tage'], art: 'zeit' },
  { name: 'Eine Nacht schlafen', wert: 10, einheit: 'Stunden', falsch: ['Minuten', 'Sekunden', 'Tage'], art: 'zeit' },
  { name: 'Ein 50-Meter-Lauf dauert', wert: 10, einheit: 'Sekunden', falsch: ['Minuten', 'Stunden', 'Tage'], art: 'zeit' },
  { name: 'Die Sommerferien dauern', wert: 42, einheit: 'Tage', falsch: ['Stunden', 'Minuten', 'Sekunden'], art: 'zeit' },
];

export function baueSchaetzen(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const arten = stufe === 'bronze' ? ['laenge'] : stufe === 'silber' ? ['gewicht', 'volumen'] : ['zeit'];
  const f = pickForm(arten, form, rng);
  const ding = rng.pick(DINGE.filter((d) => d.art === f));
  const texte = [`${ding.wert} ${ding.einheit}`, ...ding.falsch.map((e) => `${ding.wert} ${e}`), `${ding.wert * 10} ${ding.einheit}`, `${ding.wert * 100} ${ding.einheit}`].slice(0, 4);
  const c = codeAuswahl(texte, 0, rng);
  return auswahlAufgabe(
    {
      bude: 'schaetzbude', form: f, stufe, text: `${ding.name} ungefähr …`, sprechtext: `${ding.name} ungefähr wie viel?`,
      ...c, kompetenz: 'groessen', dimension: 'wissen',
      idee: 'Vergleiche mit etwas, das du kennst: 1 cm ist etwa ein Fingernagel breit, 1 m ein großer Schritt, 1 kg eine Packung Mehl, 1 l eine Milchtüte.',
      schritte: [`${ding.name} ungefähr ${ding.wert} ${ding.einheit}.`],
      daten: { ding: ding.name, art: ding.art },
    },
    rng,
  );
}

/* ---------- Uhr-Karussell ---------- */

export const uhrText = (min: number): string => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')} Uhr`;

export function baueUhr(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = pickForm(stufe === 'bronze' ? ['viertel'] : stufe === 'silber' ? ['minuten'] : ['spanne'], form, rng);
  const stunde = rng.int(1, 11);
  if (f === 'spanne') {
    const ab = (stunde + 12) * 60 + rng.int(1, 11) * 5;
    const dauer = rng.pick([25, 35, 40, 45, 50, 55, 70, 85]);
    const an = ab + dauer;
    const fehler: Fehler[] = [
      { wert: an - 60, fehlerArt: 'uebertrag' },
      { wert: an + 60, fehlerArt: 'uebertrag' },
      { wert: an - 10, fehlerArt: 'sonstige' },
      { wert: ab + dauer + 40, fehlerArt: 'stelle' },
    ];
    const bisVoll = 60 - (ab % 60);
    return auswahlAufgabe(
      {
        bude: 'uhrkarussell', form: f, stufe, text: 'Wann kommt das Bähnchen an?', sprechtext: `Das Bähnchen fährt um ${uhrText(ab)} los. Die Fahrt dauert ${dauer} Minuten. Stelle die Uhr auf die Ankunftszeit.`,
        antwort: an, fehler, schritt: 5, format: (w) => uhrText(w), frei: true,
        kompetenz: 'groessen', dimension: 'anwendung',
        idee: 'Rechne erst bis zur vollen Stunde, dann den Rest.',
        schritte: [`${uhrText(ab)} + ${Math.min(bisVoll, dauer)} min = ${uhrText(ab + Math.min(bisVoll, dauer))}`, ...(dauer > bisVoll ? [`+ ${dauer - bisVoll} min = ${uhrText(an)}`] : [])],
        daten: { min: an, start: ab, dauer, raster: 5, anzeige: 'uhr' },
      },
      rng,
    );
  }
  const minute = f === 'viertel' ? rng.pick([0, 15, 30, 45]) : rng.int(1, 11) * 5 + (rng.next() < 0.3 ? rng.int(1, 4) : 0);
  const zeit = stunde * 60 + minute;
  const fehler: Fehler[] = [
    // Stundenzeiger falsch gelesen (eine Stunde zu viel, typisch bei „halb“)
    { wert: zeit + 60, fehlerArt: 'sonstige' },
    { wert: zeit - 60 > 0 ? zeit - 60 : zeit + 120, fehlerArt: 'sonstige' },
    // Zeiger vertauscht: Minutenzeiger als Stunde
    { wert: (Math.round(minute / 5) % 12 || 12) * 60 + (stunde % 12) * 5, fehlerArt: 'ziffern' },
  ];
  const lesen = minute === 30 ? `halb ${(stunde % 12) + 1}` : minute === 15 ? `Viertel nach ${stunde}` : minute === 45 ? `Viertel vor ${(stunde % 12) + 1}` : minute === 0 ? `${stunde} Uhr` : '';
  return auswahlAufgabe(
    {
      bude: 'uhrkarussell', form: f, stufe, text: `Stelle die Uhr auf ${lesen || uhrText(zeit)}!`, sprechtext: `Stelle die Uhr auf ${lesen || uhrText(zeit)}.`,
      antwort: zeit, fehler, schritt: 5, frei: true,
      format: (w) => uhrText(w),
      kompetenz: 'groessen', dimension: f === 'viertel' ? 'wissen' : 'sicherheit',
      idee: 'Der kurze Zeiger zeigt die Stunde, der lange die Minuten. Jede Zahl auf dem Ziffernblatt sind 5 Minuten für den langen Zeiger.',
      schritte: [`Der kurze Zeiger ist bei ${stunde}${minute >= 30 ? ` (schon fast bei ${(stunde % 12) + 1})` : ''}.`, `Der lange Zeiger zeigt ${minute} Minuten.`, `Also ${uhrText(zeit)}${lesen ? ` (${lesen})` : ''}.`],
      daten: { min: zeit, raster: minute % 5 ? 1 : 5, anzeige: 'uhr' },
    },
    rng,
  );
}

/* ---------- Umrechnungs-Memory ---------- */

interface Paar {
  links: string;
  rechts: string;
  falsch: string[];
}
function paare(stufe: Stufe, rng: Rng): Paar {
  if (stufe === 'bronze') {
    const m = rng.int(1, 9);
    const cm = rng.int(1, 9) * 10 + rng.int(1, 9);
    if (rng.next() < 0.5) return { links: `${m} m ${cm} cm`, rechts: `${m * 100 + cm} cm`, falsch: [`${m * 1000 + cm} cm`, `${m * 10 + cm} cm`, `${m + cm} cm`] };
    const e = rng.int(1, 9);
    const ct = rng.int(1, 9) * 10 + rng.pick([0, 5]);
    return { links: `${e} € ${ct} ct`, rechts: `${e * 100 + ct} ct`, falsch: [`${e * 10 + ct} ct`, `${e * 1000 + ct} ct`, `${e + ct} ct`] };
  }
  if (stufe === 'silber') {
    const k = rng.int(1, 9);
    const g = rng.int(1, 9) * 100 + rng.pick([0, 50]);
    if (rng.next() < 0.5) return { links: `${k} kg ${g} g`, rechts: `${k * 1000 + g} g`, falsch: [`${k * 100 + g} g`, `${k * 10000 + g} g`, `${k}${g} kg`] };
    return { links: `${k} l ${g} ml`, rechts: `${k * 1000 + g} ml`, falsch: [`${k * 100 + g} ml`, `${k * 10000 + g} ml`, `${k}${g} l`] };
  }
  const v = rng.pick([
    () => { const a = rng.int(1, 9); return { links: `${a},5 km`, rechts: `${a * 1000 + 500} m`, falsch: [`${a * 100 + 5} m`, `${a * 1000 + 5} m`, `${a * 10 + 5} m`] }; },
    () => { const a = rng.int(1, 9); const b = rng.int(10, 95); return { links: `${a},${String(b).padStart(2, '0')} €`, rechts: `${a * 100 + b} ct`, falsch: [`${a * 10 + b} ct`, `${a * 1000 + b} ct`, `${a + b} ct`] }; },
    () => { const a = rng.int(1, 4); return { links: `${a} h ${15} min`, rechts: `${a * 60 + 15} min`, falsch: [`${a * 100 + 15} min`, `${a + 15} min`, `${a * 10 + 15} min`] }; },
    () => { const a = rng.int(1, 9); return { links: `${a},25 kg`, rechts: `${a * 1000 + 250} g`, falsch: [`${a * 100 + 25} g`, `${a * 1000 + 25} g`, `${a * 10 + 25} g`] }; },
  ]);
  return v();
}

export function baueMemory(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  void form;
  let p = paare(stufe, rng);
  for (let i = 0; i < 20 && new Set([p.rechts, ...p.falsch]).size < 4; i++) p = paare(stufe, rng);
  const texte = [...new Set([p.rechts, ...p.falsch])].slice(0, 4);
  const c = codeAuswahl(texte, 0, rng);
  return auswahlAufgabe(
    {
      bude: 'umrechnungsmemory', form: stufe, stufe, text: `${p.links} = ?`, sprechtext: `Welche Karte passt zu ${p.links}?`,
      ...c, kompetenz: 'groessen', dimension: 'sicherheit',
      idee: 'Merke dir: 1 m = 100 cm, 1 € = 100 ct, 1 kg = 1 000 g, 1 l = 1 000 ml, 1 km = 1 000 m, 1 h = 60 min.',
      schritte: [`${p.links} = ${p.rechts}`],
      daten: { links: p.links },
    },
    rng,
  );
}

/* ---------- Achterbahn-Architekt ---------- */

export function baueAchterbahn(stufe: Stufe, rng: Rng, form?: string): AuswahlAufgabe {
  const f = pickForm(stufe === 'bronze' ? ['meter'] : stufe === 'silber' ? ['einheiten'] : ['umfang'], form, rng);
  if (f === 'umfang') {
    const a = rng.int(3, 12) * 5;
    const b = rng.int(2, 8) * 5;
    const u = 2 * (a + b);
    const fehler: Fehler[] = [
      { wert: a + b, fehlerArt: 'sonstige' },
      { wert: a * b, fehlerArt: 'operation' },
      { wert: 2 * a + b, fehlerArt: 'sonstige' },
    ];
    return auswahlAufgabe(
      {
        bude: 'achterbahn', form: f, stufe, text: 'Schienen für die ganze Runde!', sprechtext: `Die Bahn fährt außen um ein Rechteck, ${a} Meter lang und ${b} Meter breit. Lege genau so viele Meter Schienen, wie die ganze Runde lang ist.`,
        antwort: u, fehler, schritt: 10, format: (w) => `${w} m`, frei: true,
        kompetenz: 'groessen', dimension: 'anwendung',
        idee: 'Die Runde geht an allen vier Seiten entlang. Gegenüberliegende Seiten sind gleich lang.',
        schritte: [`${a} m + ${b} m + ${a} m + ${b} m = ${u} m`],
        daten: { teile: [a, b, a, b], rechteck: true, ziel: u, gebaut: 0, stuecke: [100, 50, 10, 5], anzeige: 'einheit', einheit: 'm' },
      },
      rng,
    );
  }
  if (f === 'einheiten') {
    const km = rng.next() < 0.5;
    const ziel = km ? 1000 : 300;
    const gebaut = km ? rng.int(2, 8) * 100 + rng.int(1, 9) * 10 : rng.int(1, 2) * 100 + rng.int(1, 9) * 10;
    const fehlt = ziel - gebaut;
    const fehler: Fehler[] = [
      { wert: fehlt + 100, fehlerArt: 'uebertrag' },
      { wert: (km ? 1000 : 100) - (gebaut % 100), fehlerArt: 'sonstige' },
      { wert: fehlt - 10, fehlerArt: 'uebertrag' },
    ];
    const zeige = (w: number) => (km ? `${w} m` : `${Math.floor(w / 100)} m ${w % 100} cm`.replace(/^0 m /, ''));
    return auswahlAufgabe(
      {
        bude: 'achterbahn', form: f, stufe, text: 'Lege das fehlende Stück!',
        sprechtext: km ? `Die Bahn soll einen Kilometer lang werden. ${gebaut} Meter sind gebaut. Lege die fehlenden Schienen.` : `Das Modell soll 3 Meter lang werden. ${zeige(gebaut)} sind gebaut. Lege die fehlenden Schienen.`,
        antwort: fehlt, fehler: fehler.filter((x) => x.wert > 0), schritt: 10, format: (w) => zeige(w), frei: true,
        kompetenz: 'groessen', dimension: 'anwendung',
        idee: km ? '1 km sind 1 000 m. Ergänze bis 1 000.' : '1 m sind 100 cm, 3 m also 300 cm. Ergänze bis 300 cm.',
        schritte: [`${gebaut} + ${fehlt} = ${ziel}`, `Es fehlen ${zeige(fehlt)}.`],
        daten: km ? { teile: [gebaut, fehlt], ziel, gebaut, stuecke: [100, 50, 10], anzeige: 'einheit', einheit: 'm' } : { teile: [gebaut, fehlt], ziel, gebaut, stuecke: [100, 50, 10, 5, 1], anzeige: 'mcm' },
      },
      rng,
    );
  }
  const ziel = rng.pick([100, 150, 200]);
  const a = rng.int(2, 6) * 10 + rng.int(1, 9);
  const b = rng.int(1, 4) * 10 + rng.int(1, 9);
  const fehlt = ziel - a - b;
  if (fehlt <= 0) return baueAchterbahn(stufe, rng, 'meter');
  const fehler: Fehler[] = [
    { wert: fehlt + 10, fehlerArt: 'uebertrag' },
    { wert: fehlt - 10 > 0 ? fehlt - 10 : fehlt + 20, fehlerArt: 'uebertrag' },
    { wert: ziel - a, fehlerArt: 'sonstige' },
  ];
  return auswahlAufgabe(
    {
      bude: 'achterbahn', form: 'meter', stufe, text: 'Lege das fehlende Stück!', sprechtext: `Die Bahn soll ${ziel} Meter lang werden. Gebaut sind ${a} Meter und ${b} Meter. Lege die fehlenden Schienen.`,
      antwort: fehlt, fehler, schritt: 5, format: (w) => `${w} m`, frei: true,
      kompetenz: 'groessen', dimension: 'anwendung',
      idee: 'Erst zusammenzählen, was schon gebaut ist, dann bis zum Ziel ergänzen.',
      schritte: [`${a} m + ${b} m = ${a + b} m`, `${a + b} m + ${fehlt} m = ${ziel} m`],
      daten: { teile: [a, b, fehlt], ziel, gebaut: a + b, stuecke: [50, 20, 10, 5, 1], anzeige: 'einheit', einheit: 'm' },
    },
    rng,
  );
}
