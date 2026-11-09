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
  /** Stellenwert verwechselt, z. B. 56 statt 560 oder 3047 statt 347 (Null vergessen oder zu viel). */
  | 'stelle'
  /** Nicht entbündelt, z. B. 4 T 13 H als 41 3.. gelesen. */
  | 'buendel'
  /** Kein bekanntes Muster. */
  | 'sonstige';

export interface Option {
  wert: number;
  /** Nur bei falschen Optionen gesetzt. */
  fehlerArt?: FehlerArt;
}

export type Rechenart = 'mal' | 'geteilt' | 'platzhalter';

/** Auswahl aus Antworten (Ballons, Dosen …) oder freie Eingabe mit Ziffernfeld. */
export type Eingabe = 'auswahl' | 'ziffern';

interface AufgabeBasis {
  /** Eindeutig innerhalb einer Runde. */
  id: string;
  /** Darstellung, z. B. „7 · 8“, „56 : 7“, „7 · _ = 56“. */
  text: string;
  /** Text für die Sprachausgabe. */
  sprechtext: string;
  antwort: number;
  /**
   * Genau eine Option ist richtig, alle Werte sind verschieden und nicht negativ.
   * Bei freier Eingabe sind es die bekannten typischen Fehler (unsichtbar); jede andere Zahl gilt als „sonstige“.
   */
  optionen: Option[];
  eingabe?: Eingabe;
  kompetenz: KompetenzId;
  dimension: Dimension;
  /** Schlüssel für Adaptivität und Lernprofil, z. B. „7x8“ (kleinerer Faktor zuerst) oder „stw:null“. */
  fakt: string;
}

export interface EinmaleinsAufgabe extends AufgabeBasis {
  art: Rechenart;
  a: number;
  b: number;
  /** Kernaufgabe nach KC: ein Faktor ist 1, 2, 5 oder 10. */
  kern: boolean;
  /**
   * Analogaufgabe wie 7 · 80 oder 70 · 8: a und b bleiben die Grundaufgabe (7 · 8),
   * `seite` sagt, welcher Faktor mit 10 malgenommen angezeigt wird.
   */
  analog?: { seite: 'a' | 'b' };
}

/** Ein Stellenwert-Baustein, z. B. 4 Tausender: { stelle: 3, anzahl: 4 }. */
export interface Baustein {
  /** Zehnerpotenz: 0 = Einer, 1 = Zehner, … 5 = Hunderttausender. */
  stelle: number;
  anzahl: number;
}

export interface StellenwertAufgabe extends AufgabeBasis {
  art: 'stellenwert';
  /**
   * tafel: Zahl aus Stellenwerttafel / Bausteinen bilden; wort: Zahlwort in Ziffern;
   * ziffer: Wert einer Ziffer bestimmen; buendeln: mit Überträgen (13 H = 1 T 3 H).
   */
  form: 'tafel' | 'wort' | 'ziffer' | 'buendeln';
  zahl: number;
  bausteine: Baustein[];
}

export type Aufgabe = EinmaleinsAufgabe | StellenwertAufgabe;

export function istEinmaleins(a: Aufgabe): a is EinmaleinsAufgabe {
  return a.art === 'mal' || a.art === 'geteilt' || a.art === 'platzhalter';
}
