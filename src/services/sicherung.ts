import { MAX_PROFILE, type Profil } from '../domain/profil';
import { SCHEMA, migriere, type Datenbestand } from './datenbestand';

/**
 * Sicherungsdatei für den Gerätewechsel ohne eigenen Server.
 * Sie enthält nur Profile, keine Einstellungen und keinen Kaufstatus
 * (der Kauf wird über „Käufe wiederherstellen“ beim Store zurückgeholt).
 */
export const SICHERUNG_KENNUNG = 'mathe-jahrmarkt-sicherung';

export function sicherungErstellen(bestand: Datenbestand, jetzt: number): string {
  return JSON.stringify({ art: SICHERUNG_KENNUNG, schema: SCHEMA, erstellt: jetzt, profile: bestand.profile });
}

export interface Importergebnis {
  bestand: Datenbestand;
  uebernommen: number;
  ersetzt: number;
  uebersprungen: number;
}

/**
 * Übernimmt Profile aus einer Sicherung. Gleiche Profil-Kennung ersetzt das vorhandene Profil,
 * neue Profile kommen hinzu, solange Platz ist. Wirft bei unlesbarer Datei.
 */
export function sicherungEinspielen(bestand: Datenbestand, textInhalt: string): Importergebnis {
  let roh: unknown;
  try {
    roh = JSON.parse(textInhalt.trim());
  } catch {
    throw new Error('Die Sicherung ist nicht lesbar.');
  }
  if (typeof roh !== 'object' || roh === null || (roh as { art?: unknown }).art !== SICHERUNG_KENNUNG) {
    throw new Error('Das ist keine Sicherung vom Mathe-Jahrmarkt.');
  }
  const r = roh as { schema?: unknown; profile?: unknown };
  const geprueft = migriere({ schema: r.schema, profile: r.profile });
  let profile: Profil[] = [...bestand.profile];
  let uebernommen = 0;
  let ersetzt = 0;
  let uebersprungen = 0;
  for (const p of geprueft.profile) {
    const i = profile.findIndex((q) => q.id === p.id);
    if (i >= 0) {
      profile = profile.map((q, j) => (j === i ? p : q));
      ersetzt++;
    } else if (profile.length < MAX_PROFILE) {
      profile = [...profile, p];
      uebernommen++;
    } else {
      uebersprungen++;
    }
  }
  return { bestand: { ...bestand, profile }, uebernommen, ersetzt, uebersprungen };
}
