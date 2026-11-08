import type { Stufe } from './buden';
import type { Ereignis, Wochenwert } from './lernprofil/lernprofil';

export type FigurId = 'fuchs' | 'eule' | 'igel' | 'katze' | 'baer' | 'hase';
export const FIGUREN: readonly { id: FigurId; name: string }[] = [
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
  abzeichen: Abzeichen[];
  fortschritt: Record<string, Partial<Record<Stufe, StufenStand>>>;
  ereignisse: Ereignis[];
  wochen: Wochenwert[];
  runden: Runde[];
  /** Gesehene Geschichte und Entdeckungen. */
  gesehen: { intro: boolean; entdeckungen: string[]; gassen: string[] };
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
    abzeichen: [],
    fortschritt: {},
    ereignisse: [],
    wochen: [],
    runden: [],
    gesehen: { intro: false, entdeckungen: [], gassen: [] },
  };
}

/** Spitznamen: Steuerzeichen raus, Leerraum zusammenfassen, Länge begrenzen. */
export function bereinigeName(name: string): string {
  const sauber = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return [...sauber].slice(0, MAX_NAME).join('');
}
