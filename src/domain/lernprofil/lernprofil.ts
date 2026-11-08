import type { FehlerArt } from '../aufgaben/typen';
import type { Dimension, KompetenzId } from '../kompetenzen/modell';
import type { Ursache } from './fehlerursache';

/** Ein gewerteter oder ungewerteter Antwortversuch. Das Lernprofil ist ein Protokoll solcher Ereignisse. */
export interface Ereignis {
  /** Zeitpunkt (ms seit 1970). */
  t: number;
  bude: string;
  kompetenz: KompetenzId;
  dimension: Dimension;
  richtig: boolean;
  ms: number;
  fakt?: string | undefined;
  fehlerArt?: FehlerArt | undefined;
  ursache?: Ursache | undefined;
  gewertet: boolean;
}

/** Verdichtete Wochenwerte für alte Ereignisse. */
export interface Wochenwert {
  /** Montag der Woche als YYYY-MM-DD (lokale Zeit). */
  woche: string;
  kompetenz: KompetenzId;
  richtig: number;
  gesamt: number;
}

export type Status = 'kennenlernen' | 'weiterUeben' | 'aufGutemWeg' | 'sicher';

export const STATUS_TEXT: Readonly<Record<Status, string>> = {
  kennenlernen: 'Wir lernen uns noch kennen',
  weiterUeben: 'Weiter üben',
  aufGutemWeg: 'Auf gutem Weg',
  sicher: 'Sicher',
};

/** Erst ab so vielen gewerteten Aufgaben an so vielen Tagen trifft die App eine Aussage. */
export const MIN_AUFGABEN = 20;
export const MIN_TAGE = 2;
/** Ausgewertet werden die jüngsten Aufgaben, damit Fortschritt sichtbar wird. */
export const FENSTER = 60;
export const SCHWELLE_SICHER = 0.9;
export const SCHWELLE_GUTER_WEG = 0.7;
/** Ab so vielen Ereignissen einer Dimension wird sie einzeln bewertet. */
export const MIN_DIMENSION = 8;

export interface Einschaetzung {
  kompetenz: KompetenzId;
  status: Status;
  /** Anteil richtiger Antworten im Fenster, 0..1; nur bei ausreichender Datenlage. */
  anteil?: number;
  anzahl: number;
  tage: number;
  dimensionen: Partial<Record<Dimension, Status>>;
}

export const tagSchluessel = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const statusAusAnteil = (anteil: number): Status =>
  anteil >= SCHWELLE_SICHER ? 'sicher' : anteil >= SCHWELLE_GUTER_WEG ? 'aufGutemWeg' : 'weiterUeben';

export function einschaetzen(ereignisse: readonly Ereignis[], kompetenz: KompetenzId): Einschaetzung {
  const gewertet = ereignisse.filter((e) => e.gewertet && e.kompetenz === kompetenz);
  const tage = new Set(gewertet.map((e) => tagSchluessel(e.t))).size;
  const basis: Einschaetzung = { kompetenz, status: 'kennenlernen', anzahl: gewertet.length, tage, dimensionen: {} };
  if (gewertet.length < MIN_AUFGABEN || tage < MIN_TAGE) return basis;

  const fenster = [...gewertet].sort((x, y) => x.t - y.t).slice(-FENSTER);
  const anteil = fenster.filter((e) => e.richtig).length / fenster.length;
  const dimensionen: Partial<Record<Dimension, Status>> = {};
  for (const d of ['wissen', 'sicherheit', 'anwendung'] as const) {
    const teil = fenster.filter((e) => e.dimension === d);
    if (teil.length >= MIN_DIMENSION) dimensionen[d] = statusAusAnteil(teil.filter((e) => e.richtig).length / teil.length);
  }
  return { ...basis, status: statusAusAnteil(anteil), anteil, dimensionen };
}

/**
 * Einmaleins-Reihen, bei denen das Kind noch unsicher ist (Fehlerquote > 30 % bei mindestens 3 Versuchen).
 * Grundlage für Sätze wie „Bei Aufgaben mit 6, 7 und 8 besteht noch Unsicherheit.“
 */
export function unsichereReihen(ereignisse: readonly Ereignis[]): number[] {
  const proReihe = new Map<number, { f: number; n: number }>();
  for (const e of ereignisse) {
    if (!e.gewertet || !e.fakt) continue;
    const teile = e.fakt.split('x').map(Number);
    for (const r of new Set(teile)) {
      if (!Number.isInteger(r) || r < 1 || r > 10) continue;
      const w = proReihe.get(r) ?? { f: 0, n: 0 };
      w.n++;
      if (!e.richtig) w.f++;
      proReihe.set(r, w);
    }
  }
  return [...proReihe.entries()]
    .filter(([, w]) => w.n >= 3 && w.f / w.n > 0.3)
    .map(([r]) => r)
    .sort((x, y) => x - y);
}

const aufzaehlung = (zahlen: number[]): string =>
  zahlen.length <= 1 ? zahlen.join('') : `${zahlen.slice(0, -1).join(', ')} und ${zahlen[zahlen.length - 1]}`;

/** Lernprofil in Sätzen für die Eltern. Gibt nur Aussagen, die die Datenlage trägt. */
export function elternSaetze(ereignisse: readonly Ereignis[], kompetenz: KompetenzId, name: string): string[] {
  const e = einschaetzen(ereignisse, kompetenz);
  if (e.status === 'kennenlernen') {
    const fehlen = Math.max(0, MIN_AUFGABEN - e.anzahl);
    return [
      fehlen > 0
        ? `Für eine Einschätzung fehlen noch etwa ${fehlen} Aufgaben.`
        : 'Für eine Einschätzung braucht es noch Übung an einem weiteren Tag.',
    ];
  }
  const saetze: string[] = [];
  if (kompetenz === 'kopfrechnen') {
    const wissen = e.dimensionen.wissen;
    const reihen = unsichereReihen(ereignisse.filter((x) => x.kompetenz === 'kopfrechnen'));
    if (e.status === 'sicher') saetze.push(`${name} beherrscht das Einmaleins sicher.`);
    else saetze.push('Das Einmaleins ist grundsätzlich verstanden.');
    if (reihen.length > 0) saetze.push(`Bei Aufgaben mit ${aufzaehlung(reihen)} besteht noch Unsicherheit.`);
    if (wissen && wissen !== 'sicher') saetze.push('Besonders bei Geteilt- und Platzhalteraufgaben lohnt sich weiteres Üben.');
    return saetze;
  }
  saetze.push(`Einschätzung: ${STATUS_TEXT[e.status]}.`);
  return saetze;
}

/** Montag der Woche eines Zeitpunkts als YYYY-MM-DD. */
export function wochenSchluessel(t: number): string {
  const d = new Date(t);
  const tag = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - tag);
  return tagSchluessel(d.getTime());
}

/** Ereignisse älter als dieses Alter werden zu Wochenwerten verdichtet. */
export const VERDICHTEN_AB_MS = 8 * 7 * 24 * 3600 * 1000;
/** Höchstzahl gespeicherter Einzelereignisse pro Profil. */
export const MAX_EREIGNISSE = 3000;

export function verdichten(
  ereignisse: readonly Ereignis[],
  wochen: readonly Wochenwert[],
  jetzt: number,
): { ereignisse: Ereignis[]; wochen: Wochenwert[] } {
  const sortiert = [...ereignisse].sort((x, y) => x.t - y.t);
  const grenze = jetzt - VERDICHTEN_AB_MS;
  let alt = sortiert.filter((e) => e.t < grenze);
  let neu = sortiert.filter((e) => e.t >= grenze);
  if (neu.length > MAX_EREIGNISSE) {
    alt = [...alt, ...neu.slice(0, neu.length - MAX_EREIGNISSE)];
    neu = neu.slice(-MAX_EREIGNISSE);
  }
  const karte = new Map<string, Wochenwert>();
  for (const w of wochen) karte.set(`${w.woche}|${w.kompetenz}`, { ...w });
  for (const e of alt) {
    if (!e.gewertet) continue;
    const woche = wochenSchluessel(e.t);
    const schluessel = `${woche}|${e.kompetenz}`;
    const w = karte.get(schluessel) ?? { woche, kompetenz: e.kompetenz, richtig: 0, gesamt: 0 };
    w.gesamt++;
    if (e.richtig) w.richtig++;
    karte.set(schluessel, w);
  }
  return { ereignisse: neu, wochen: [...karte.values()].sort((x, y) => x.woche.localeCompare(y.woche)) };
}
