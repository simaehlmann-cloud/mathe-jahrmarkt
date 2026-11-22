import type { Stufe } from '../../domain/buden';
import type { Profil } from '../../domain/profil';
import { keineSperre, type PinSperre } from './pin';

/**
 * Daten der Schulversion im Datenbestand (Feld `schule`). In der Familien-App fehlt das Feld.
 * Alles bleibt auf dem Gerät; zwischen Geräten wandert es nur als Datei, die die Lehrkraft selbst weitergibt.
 */

export interface Klasse {
  id: string;
  name: string;
  /** Kinder dieser Klasse melden sich ohne Bildpasswort an (z. B. Förderschule, jüngere Kinder). */
  ohnePasswort?: boolean | undefined;
}

/**
 * Bauinsel und Bauplatz im Unterricht:
 * - frei: wie in der Familien-App
 * - nachRunde: nach jeder gespielten Runde an einer Bude 10 Minuten
 * - aus: geschlossen
 */
export type InselRegel = 'frei' | 'nachRunde' | 'aus';
export const INSEL_REGELN: readonly InselRegel[] = ['frei', 'nachRunde', 'aus'];
export const INSEL_MINUTEN = 10;

/** Auftrag der Lehrkraft an eine Klasse oder an einzelne Kinder. */
export interface LehrerAuftrag {
  id: string;
  klasse: string;
  /** Profil-Kennungen; null = ganze Klasse. */
  fuer: string[] | null;
  ziel: { art: 'bude'; bude: string; stufe: Stufe | null } | { art: 'check' };
  erstellt: number;
}
export const MAX_AUFTRAEGE = 40;

/** Hash eines Geheimnisses (Lehrer-PIN, Wiederherstellungscode) – nie das Geheimnis selbst. */
export interface Geheimnis {
  hash: string;
  salz: string;
  iter: number;
}

export interface Geraet {
  /** Zufällige Kennung, damit eingesammelte Ergebnisse eines Geräts beim erneuten Einsammeln ersetzt werden. */
  id: string;
  /** Name, den die Lehrkraft vergibt, z. B. „iPad 7“. Steht auf den Kärtchen und bei eingesammelten Ergebnissen. */
  name: string;
}

/** Was aus einem Profil für die Auswertung auf ein anderes Gerät wandert (kein Bauen, keine Insel). */
export type ErgebnisProfil = Pick<Profil, 'id' | 'name' | 'figur' | 'aussehen' | 'fortschritt' | 'ereignisse' | 'wochen' | 'runden' | 'check'> & {
  klasse?: string | undefined;
  checkVerlauf?: Profil['checkVerlauf'];
};

/** Eingesammelte Ergebnisse eines anderen Geräts. Ein neues Einsammeln vom selben Gerät ersetzt den Eintrag. */
export interface Sammlung {
  geraetId: string;
  geraetName: string;
  /** Wann die Datei auf dem anderen Gerät erstellt wurde. */
  erstellt: number;
  /** Wann sie hier eingesammelt wurde. */
  eingesammelt: number;
  /** Klassennamen des anderen Geräts (Kennung → Name), falls hier eine Klasse fehlt. */
  klassen: Klasse[];
  profile: ErgebnisProfil[];
}

export interface SchulDaten {
  pin: Geheimnis | null;
  rettung: Geheimnis | null;
  sperre: PinSperre;
  klassen: Klasse[];
  geraet: Geraet;
  /** Bestenliste an den Buden für Kinder derselben Klasse zeigen (Standard: aus). */
  bestenliste: boolean;
  /** Bauinsel und Bauplatz im Unterricht (Standard: nach jeder Runde 10 Minuten). */
  bauinsel: InselRegel;
  auftraege: LehrerAuftrag[];
  gesammelt: Sammlung[];
}

export const MAX_KLASSEN = 12;
export const MAX_KLASSENNAME = 20;
export const MAX_GERAETENAME = 24;
/** Höchstens so viele andere Geräte werden eingesammelt (ein großer Gerätewagen). */
export const MAX_SAMMLUNGEN = 40;

export const leereSchule = (geraetId: string): SchulDaten => ({
  pin: null,
  rettung: null,
  sperre: keineSperre(),
  klassen: [],
  geraet: { id: geraetId, name: '' },
  bestenliste: false,
  bauinsel: 'nachRunde',
  auftraege: [],
  gesammelt: [],
});

/** Klassen- und Gerätenamen: Steuerzeichen raus, Leerraum zusammenfassen, Länge begrenzen. */
export function bereinigeText(s: string, max: number): string {
  const sauber = s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  return [...sauber].slice(0, max).join('');
}

/** Kennungen (Profile, Klassen, Geräte) aus fremden Dateien: kurz und harmlos. */
export const KENNUNG = /^[A-Za-z0-9_-]{1,40}$/;
