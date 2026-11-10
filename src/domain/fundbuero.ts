/**
 * Fundbüro: Aufgaben, bei denen sich ein Kind vertan hat, kommen nach 1, 3 und 7 Tagen wieder
 * (verteiltes Wiederholen). Wer sie dann löst, schiebt sie ins nächste Fach; nach dem dritten Fach sind sie erledigt.
 * Ein Fehler beim Wiederholen schickt die Aufgabe zurück ins erste Fach.
 * Beim Abholen kommt jeweils eine ähnliche Aufgabe (gleiche Form, neue Zahlen), nicht dieselbe.
 */
import type { Aufgabe } from './aufgaben/typen';
import { BUDEN, STUFEN, type Stufe } from './buden';

export interface Fundsache {
  id: string;
  bude: string;
  stufe: Stufe;
  aufgabe: Aufgabe;
  /** 0, 1 oder 2: nach wie vielen Tagen sie das nächste Mal wiederkommt (siehe ABSTAENDE). */
  fach: number;
  /** Ab diesem Zeitpunkt (Tagesbeginn) liegt sie zum Abholen bereit. */
  faellig: number;
}

export const ABSTAENDE_TAGE = [1, 3, 7] as const;
export const MAX_FUNDSACHEN = 40;
/** Höchstens so viele Aufgaben pro Abholung (eine Runde). */
export const MAX_PRO_ABHOLUNG = 6;
export const TALER_PRO_FUNDSACHE = 2;
const TAG = 24 * 3600 * 1000;

/** Tagesbeginn (lokale Zeit) plus `tage` Tage. */
export function tagNach(jetzt: number, tage: number): number {
  const d = new Date(jetzt);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + tage);
  return d.getTime();
}

const gleich = (a: Aufgabe, b: Aufgabe): boolean => a.text === b.text && a.fakt === b.fakt && a.antwort === b.antwort;

/** Eine falsch gelöste Aufgabe ins Fundbüro legen. Dieselbe Aufgabe wird nicht doppelt aufgenommen. */
export function legeAb(liste: readonly Fundsache[], bude: string, stufe: Stufe, aufgabe: Aufgabe, jetzt: number): Fundsache[] {
  const vorhanden = liste.find((f) => f.bude === bude && gleich(f.aufgabe, aufgabe));
  if (vorhanden) return liste.map((f) => (f === vorhanden ? { ...f, fach: 0, faellig: tagNach(jetzt, ABSTAENDE_TAGE[0]) } : f));
  const neu: Fundsache = { id: `${jetzt.toString(36)}-${aufgabe.id}`, bude, stufe, aufgabe, fach: 0, faellig: tagNach(jetzt, ABSTAENDE_TAGE[0]) };
  // Wenn das Fundbüro voll ist, fällt die älteste Sache aus dem höchsten Fach heraus
  const rest = [...liste];
  while (rest.length >= MAX_FUNDSACHEN) {
    const weg = [...rest].sort((a, b) => b.fach - a.fach || a.faellig - b.faellig)[0];
    rest.splice(rest.indexOf(weg as Fundsache), 1);
  }
  return [...rest, neu];
}

export const faellige = (liste: readonly Fundsache[], jetzt: number): Fundsache[] => liste.filter((f) => f.faellig <= jetzt);

/** Fällige Sachen nach Bude und Stufe gebündelt – so wird abgeholt (eine Runde in der passenden Bude). */
export function abholStapel(liste: readonly Fundsache[], jetzt: number): { bude: string; stufe: Stufe; sachen: Fundsache[] }[] {
  const stapel: { bude: string; stufe: Stufe; sachen: Fundsache[] }[] = [];
  for (const f of [...faellige(liste, jetzt)].sort((a, b) => a.faellig - b.faellig)) {
    let s = stapel.find((x) => x.bude === f.bude && x.stufe === f.stufe);
    if (!s) stapel.push((s = { bude: f.bude, stufe: f.stufe, sachen: [] }));
    if (s.sachen.length < MAX_PRO_ABHOLUNG) s.sachen.push(f);
  }
  return stapel;
}

/** Nach dem Abholen: richtig → nächstes Fach (nach dem letzten erledigt), falsch → zurück ins erste Fach. */
export function beantwortet(liste: readonly Fundsache[], id: string, richtig: boolean, jetzt: number): { liste: Fundsache[]; erledigt: boolean } {
  const f = liste.find((x) => x.id === id);
  if (!f) return { liste: [...liste], erledigt: false };
  if (richtig && f.fach >= ABSTAENDE_TAGE.length - 1) return { liste: liste.filter((x) => x !== f), erledigt: true };
  const fach = richtig ? f.fach + 1 : 0;
  return { liste: liste.map((x) => (x === f ? { ...x, fach, faellig: tagNach(jetzt, ABSTAENDE_TAGE[fach] ?? 1) } : x)), erledigt: false };
}

/** Wann kommt die nächste Sache zurück? (für „Bald zurück“). */
export const naechsteRueckkehr = (liste: readonly Fundsache[], jetzt: number): number | undefined => {
  const spaeter = liste.filter((f) => f.faellig > jetzt).map((f) => f.faellig);
  return spaeter.length ? Math.min(...spaeter) : undefined;
};

export const tageBis = (zeitpunkt: number, jetzt: number): number => Math.max(0, Math.round((tagNach(zeitpunkt, 0) - tagNach(jetzt, 0)) / TAG));

/** Gespeicherte Liste prüfen: unbekannte Buden, kaputte Aufgaben und Überlänge fallen heraus. */
export function pruefeFundbuero(x: unknown): Fundsache[] {
  if (!Array.isArray(x)) return [];
  const buden = new Set(BUDEN.map((b) => b.id));
  const aus: Fundsache[] = [];
  for (const f of x.slice(-MAX_FUNDSACHEN)) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    const a = o.aufgabe as Record<string, unknown> | undefined;
    if (typeof o.id !== 'string' || typeof o.bude !== 'string' || !buden.has(o.bude)) continue;
    if (!STUFEN.includes(o.stufe as Stufe)) continue;
    if (typeof o.fach !== 'number' || !Number.isInteger(o.fach) || o.fach < 0 || o.fach >= ABSTAENDE_TAGE.length) continue;
    if (typeof o.faellig !== 'number' || !Number.isFinite(o.faellig)) continue;
    if (!a || typeof a !== 'object' || typeof a.text !== 'string' || typeof a.antwort !== 'number' || !Array.isArray(a.optionen) || typeof a.art !== 'string') continue;
    aus.push({ id: o.id, bude: o.bude, stufe: o.stufe as Stufe, aufgabe: a as unknown as Aufgabe, fach: o.fach, faellig: o.faellig });
  }
  return aus;
}
