import type { Dimension, KompetenzId } from '../kompetenzen/modell';

/**
 * Woher ein falscher Antwortvorschlag stammt. Die Art ist der Hinweis auf eine mögliche
 * Fehlerursache und wird im Lernprofil ausgewertet.
 */
export type FehlerArt =
  /** Ergebnis der Nachbaraufgabe, z. B. 7·7 statt 7·8: typische Unsicherheit beim Abrufen. */
  | 'nachbaraufgabe'
  /** Andere Rechenart, z. B. 7+8 statt 7·8: Aufgabe vermutlich falsch gelesen. */
  | 'operation'
  /** Vertauschte Ziffern, z. B. 65 statt 56. */
  | 'ziffern'
  /** Um 10 daneben: Verrechnet. */
  | 'zehner'
  /** Die gegebene Zahl selbst wiederholt, z. B. bei 56 : 7 die 56 statt 8: Umkehraufgabe nicht verstanden. */
  | 'umkehr'
  /** Kein bekanntes Muster. */
  | 'sonstige';

export interface Option {
  wert: number;
  /** Nur bei falschen Optionen gesetzt. */
  fehlerArt?: FehlerArt;
}

export type Rechenart = 'mal' | 'geteilt' | 'platzhalter';

export interface Aufgabe {
  /** Eindeutig innerhalb einer Runde. */
  id: string;
  /** Darstellung, z. B. „7 · 8“, „56 : 7“, „7 · _ = 56“. */
  text: string;
  /** Text für die Sprachausgabe. */
  sprechtext: string;
  antwort: number;
  /** Genau eine Option ist richtig, alle Werte sind verschieden und positiv. */
  optionen: Option[];
  kompetenz: KompetenzId;
  dimension: Dimension;
  /** Der Fakt hinter der Aufgabe, z. B. „7x8“ (kleinerer Faktor zuerst). */
  fakt: string;
  art: Rechenart;
  a: number;
  b: number;
  /** Kernaufgabe nach KC: ein Faktor ist 1, 2, 5 oder 10. */
  kern: boolean;
}
