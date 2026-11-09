import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { auswahl, neueAufgabenId, type Fehler } from './auswahl';
import type { Gewichtung } from './einmaleins';
import { fehlerkatalog } from './einmaleins';
import { zahlText } from './stellenwert';
import type { Aufgabe, Strahl, ZahlenstrahlAufgabe } from './typen';

/**
 * Zahlenstrahl-Seilbahn (KC: Zahlen am Zahlenstrahl darstellen und ablesen, Orientierung im Zahlenraum).
 * Jeder Strahl hat genau 20 Abschnitte, damit die Gondel auch auf kleinen Handys sicher einrastet.
 */
export const ABSCHNITTE = 20;

interface Vorlage {
  name: string;
  /** Schrittweite und Beschriftungsabstand. */
  schritt: number;
  beschriftung: number;
  /** Möglicher Startwert (Vielfaches davon, kleiner als `bis`). */
  startRaster: number;
  bis: number;
  /** Nur Anfang und Ende beschriftet (schwerer). */
  nurEnden?: boolean;
}

const VORLAGEN: Readonly<Record<Stufe, readonly Vorlage[]>> = {
  bronze: [
    { name: 'tausend', schritt: 50, beschriftung: 100, startRaster: 1000, bis: 1 },
    { name: 'zweihundert', schritt: 10, beschriftung: 50, startRaster: 1000, bis: 1 },
    { name: 'hunderter', schritt: 5, beschriftung: 10, startRaster: 100, bis: 900 },
  ],
  silber: [
    { name: 'hunderttausend', schritt: 5000, beschriftung: 10000, startRaster: 100000, bis: 1 },
    { name: 'zehntausend', schritt: 500, beschriftung: 1000, startRaster: 10000, bis: 1 },
    { name: 'tausender', schritt: 50, beschriftung: 100, startRaster: 1000, bis: 99000 },
  ],
  gold: [
    { name: 'nachbartausender', schritt: 100, beschriftung: 1000, startRaster: 1000, bis: 98000, nurEnden: true },
    { name: 'ausschnitt', schritt: 10, beschriftung: 100, startRaster: 100, bis: 99800 },
    { name: 'zehntausender', schritt: 1000, beschriftung: 10000, startRaster: 10000, bis: 980000 },
  ],
};

export const wertAnStrich = (s: Strahl, i: number): number => s.start + i * s.schritt;
export const strichVon = (s: Strahl, wert: number): number => Math.round((wert - s.start) / s.schritt);
export const istBeschriftet = (s: Strahl, wert: number): boolean =>
  wert === s.start || wert === s.ende || (s.beschriftung > 0 && (wert - s.start) % s.beschriftung === 0);

function baueStrahl(v: Vorlage, rng: Rng): Strahl {
  const start = v.bis <= 1 ? 0 : rng.int(0, Math.floor(v.bis / v.startRaster)) * v.startRaster;
  const ende = start + ABSCHNITTE * v.schritt;
  return { start, ende, schritt: v.schritt, beschriftung: v.nurEnden ? ende - start : v.beschriftung };
}

const schluessel = (form: ZahlenstrahlAufgabe['form'], v: Vorlage): string => `zs:${form}:${v.name}`;

export function zahlenstrahlAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): ZahlenstrahlAufgabe {
  const varianten = VORLAGEN[stufe].flatMap((v) => (['ziehen', 'ablesen'] as const).map((form) => ({ v, form })));
  const { v, form } = rng.weighted(varianten, (x) => gewichtung(schluessel(x.form, x.v)));
  return baueZahlenstrahl(form, v, stufe, rng);
}

export function baueZahlenstrahl(form: ZahlenstrahlAufgabe['form'], v: Vorlage, stufe: Stufe, rng: Rng): ZahlenstrahlAufgabe {
  const strahl = baueStrahl(v, rng);
  // Ziel: meist ein unbeschrifteter Strich, in Bronze manchmal auch ein beschrifteter
  const kandidaten = Array.from({ length: ABSCHNITTE - 1 }, (_, i) => i + 1).filter(
    (i) => !istBeschriftet(strahl, wertAnStrich(strahl, i)) || (stufe === 'bronze' && rng.next() < 0.15),
  );
  const i = rng.pick(kandidaten.length > 0 ? kandidaten : [7]);
  const ziel = wertAnStrich(strahl, i);
  const fehler = typischeFehler(strahl, ziel);
  const text = form === 'ziehen' ? `Fahre zu ${zahlText(ziel)}` : 'Wo hält die Gondel?';
  const sprechtext = form === 'ziehen' ? `Fahre die Gondel zur ${ziel}.` : 'An welcher Zahl hält die Gondel?';
  return {
    id: neueAufgabenId('z'),
    text,
    sprechtext,
    antwort: ziel,
    optionen: form === 'ziehen' ? fehlerkatalog(ziel, fehler) : auswahl(ziel, fehler, rng, strahl.schritt),
    ...(form === 'ziehen' ? { eingabe: 'ziffern' as const } : {}),
    kompetenz: 'zahlverstaendnis',
    dimension: stufe === 'gold' ? 'anwendung' : form === 'ablesen' ? 'wissen' : 'sicherheit',
    fakt: schluessel(form, v),
    art: 'zahlenstrahl',
    form,
    strahl,
  };
}

/** Typische Fehler am Zahlenstrahl: Striche als Einer gezählt, im falschen Abschnitt, ein Strich daneben. */
export function typischeFehler(s: Strahl, ziel: number): Fehler[] {
  const i = strichVon(s, ziel);
  const vorBeschriftung = s.start + Math.floor((ziel - s.start) / s.beschriftung) * s.beschriftung;
  const striche = (ziel - vorBeschriftung) / s.schritt;
  const f: Fehler[] = [
    // Striche als Einer (oder Zehner) gezählt: 600 + 3 statt 600 + 150
    { wert: vorBeschriftung + striche, fehlerArt: 'skala' },
    { wert: vorBeschriftung + striche * 10, fehlerArt: 'skala' },
    // Abschnitt verwechselt
    { wert: ziel + s.beschriftung, fehlerArt: 'skala' },
    { wert: ziel - s.beschriftung, fehlerArt: 'skala' },
    // Einen Strich daneben
    { wert: wertAnStrich(s, i + 1), fehlerArt: 'sonstige' },
    { wert: wertAnStrich(s, i - 1), fehlerArt: 'sonstige' },
  ];
  return f.filter((x) => x.wert !== ziel && x.wert > 0);
}

export function aehnlicheZahlenstrahl(vorher: Aufgabe, rng: Rng): ZahlenstrahlAufgabe {
  if (vorher.art !== 'zahlenstrahl') throw new Error(`Keine Zahlenstrahl-Aufgabe: ${vorher.text}`);
  const stufe = (Object.keys(VORLAGEN) as Stufe[]).find((st) => VORLAGEN[st].some((v) => vorher.fakt.endsWith(`:${v.name}`))) ?? 'bronze';
  const v = VORLAGEN[stufe].find((x) => vorher.fakt.endsWith(`:${x.name}`)) ?? (VORLAGEN[stufe][0] as Vorlage);
  return baueZahlenstrahl(vorher.form, v, stufe, rng);
}

export const zahlenstrahlProbe = (rng: Rng): ZahlenstrahlAufgabe => {
  const v = VORLAGEN.bronze[0] as Vorlage;
  const a = baueZahlenstrahl('ziehen', v, 'bronze', rng);
  // Leichte Probe: zur 500
  return { ...a, antwort: 500, text: `Fahre zu 500`, sprechtext: 'Fahre die Gondel zur 500.', strahl: { start: 0, ende: 1000, schritt: 50, beschriftung: 100 }, optionen: fehlerkatalog(500, typischeFehler({ start: 0, ende: 1000, schritt: 50, beschriftung: 100 }, 500)) };
};
