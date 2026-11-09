import type { Stufe } from './buden';
import { standardAussehen, type Aussehen } from './aussehen';
import type { Ereignis, Wochenwert } from './lernprofil/lernprofil';
import { leererBau, type BauStand } from './bau';
import type { AuftragsTag } from './auftraege';
import type { CheckErgebnis } from './check';
import type { Pause } from './pause';
import { leererBlitz, type BlitzStand } from './blitz';
import { leereInsel, type InselStand } from './insel';

export type FigurId = 'mensch' | 'menschLang' | 'roboter' | 'fuchs' | 'eule' | 'igel' | 'katze' | 'baer' | 'hase';
export const FIGUREN: readonly { id: FigurId; name: string }[] = [
  { id: 'mensch', name: 'Kurzhaar' },
  { id: 'menschLang', name: 'Langhaar' },
  { id: 'roboter', name: 'Roboter' },
  { id: 'fuchs', name: 'Fuchs' },
  { id: 'eule', name: 'Eule' },
  { id: 'igel', name: 'Igel' },
  { id: 'katze', name: 'Katze' },
  { id: 'baer', name: 'Bär' },
  { id: 'hase', name: 'Hase' },
];

export interface StufenStand {
  geschafft: boolean;
  rekord: number;
  gespielt: number;
  /** Punkte der letzten 10 Runden, älteste zuerst. */
  verlauf: number[];
}

export interface Runde {
  bude: string;
  stufe: Stufe;
  start: number;
  dauerMs: number;
  punkte: number;
  richtig: number;
  gesamt: number;
}

export type AbzeichenId = 'durchhalte' | 'entdecker' | 'budenmeister' | 'strategie';
export interface Abzeichen {
  id: AbzeichenId;
  /** Wofür, z. B. die Bude. */
  bezug: string;
  am: number;
}

export interface Profil {
  id: string;
  name: string;
  figur: FigurId;
  erstellt: number;
  taler: number;
  /** Gekaufte Deko-Kennungen. */
  deko: string[];
  /** Eigene Figur aus dem Baukasten. */
  aussehen: Aussehen;
  abzeichen: Abzeichen[];
  fortschritt: Record<string, Partial<Record<Stufe, StufenStand>>>;
  ereignisse: Ereignis[];
  wochen: Wochenwert[];
  runden: Runde[];
  /** Gesehene Geschichte und Entdeckungen. */
  gesehen: { intro: boolean; entdeckungen: string[]; gassen: string[]; hinweise: string[] };
  /** Bauplatz: Blöcke, gebaute Welt, erledigte Bauaufträge. */
  bau: BauStand;
  /** Tagesaufträge des aktuellen Tages. */
  auftraege: AuftragsTag | null;
  /** Letzter Jahrmarkt-Check. */
  check: CheckErgebnis | null;
  /** Unterbrochene Runden zum Weiterspielen. */
  pausen: Pause[];
  /** Schon vergebene Belohnungen (Wochenziel, Gassenfeiern, Rätsel …). */
  belohnt: string[];
  /** Angesehene Sammelkarten. */
  album: string[];
  /** Blitzrechnen: Rekorde je Stufe. */
  blitz: BlitzStand;
  /** Bauinsel (Zusatzpaket). */
  insel: InselStand;
}

export const MAX_PROFILE = 4;
export const MAX_RUNDEN = 500;
export const MAX_NAME = 16;

export function neuesProfil(id: string, name: string, figur: FigurId, jetzt: number): Profil {
  return {
    id,
    name: bereinigeName(name),
    figur,
    erstellt: jetzt,
    taler: 0,
    deko: [],
    aussehen: standardAussehen(),
    abzeichen: [],
    fortschritt: {},
    ereignisse: [],
    wochen: [],
    runden: [],
    gesehen: { intro: false, entdeckungen: [], gassen: [], hinweise: [] },
    bau: leererBau(),
    auftraege: null,
    check: null,
    pausen: [],
    belohnt: [],
    album: [],
    blitz: leererBlitz(),
    insel: leereInsel(),
  };
}

/**
 * Fortschritt zurücksetzen: Stufen, Rekorde, Taler, Andenken, Abzeichen und Lernprofil auf Anfang.
 * Spitzname und gestaltete Figur bleiben; Extras, die es nur im Andenkenstand gibt (Strohhut), fallen weg.
 * Das Intro muss nicht noch einmal kommen.
 */
export function fortschrittZurueckgesetzt(p: Profil): Profil {
  const neu = neuesProfil(p.id, p.name, p.figur, p.erstellt);
  return {
    ...neu,
    aussehen: { ...p.aussehen, extra: p.aussehen.extra === 'strohhut' ? 'keins' : p.aussehen.extra },
    gesehen: { ...neu.gesehen, intro: p.gesehen.intro, hinweise: p.gesehen.hinweise },
  };
}

/** Spitznamen: Steuerzeichen raus, Leerraum zusammenfassen, Länge begrenzen. */
export function bereinigeName(name: string): string {
  const sauber = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return [...sauber].slice(0, MAX_NAME).join('');
}
