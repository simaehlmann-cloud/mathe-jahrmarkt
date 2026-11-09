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
  /** Skala am Zahlenstrahl falsch gelesen, z. B. einen Strich als 1 statt als 50 gezählt. */
  | 'skala'
  /** Falsch gerundet, z. B. immer aufgerundet oder auf die falsche Stelle. */
  | 'runden'
  /** Übertrag vergessen oder zu viel, z. B. 340 + 80 = 320. */
  | 'uebertrag'
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

/** Zahlenstrahl: von `start` bis `ende`, ein Strich alle `schritt`, beschriftet alle `beschriftung`. */
export interface Strahl {
  start: number;
  ende: number;
  schritt: number;
  beschriftung: number;
}

export interface ZahlenstrahlAufgabe extends AufgabeBasis {
  art: 'zahlenstrahl';
  /** ziehen: Gondel an die Zahl bringen (freie Position); ablesen: Zahl an der Gondel erkennen. */
  form: 'ziehen' | 'ablesen';
  strahl: Strahl;
}

export interface UeberschlagAufgabe extends AufgabeBasis {
  art: 'ueberschlag';
  /** runden: eine Zahl runden; plus, minus, mal: Überschlag einer Rechnung. */
  form: 'runden' | 'plus' | 'minus' | 'mal';
  /** Zahlen der Rechnung (beim Runden nur eine). */
  zahlen: number[];
  /** Die gerundeten Zahlen, mit denen überschlagen wird. */
  gerundet: number[];
  /** Rundungsstelle als Zehnerpotenz je Zahl (1 = Zehner, 2 = Hunderter …). */
  stellen: number[];
  /** Genaues Ergebnis (zum Vergleich auf der Waage). */
  genau: number;
}

export interface HalbschriftlichAufgabe extends AufgabeBasis {
  art: 'halbschriftlich';
  op: '+' | '−' | '·' | ':';
  a: number;
  b: number;
  /** Rechenweg in Schritten, z. B. ['467 + 20 = 487', '487 + 8 = 495']. */
  weg: string[];
}

/** Rechenausdruck auf einer Waagschale; `null` ist die gesuchte Zahl (?). Ohne `op` nur die Zahl `a`. */
export interface Term {
  a: number | null;
  op?: '+' | '−' | '·' | ':';
  b?: number | null;
}

export interface GleichheitAufgabe extends AufgabeBasis {
  art: 'gleichheit';
  /** ergaenzen: fehlende Zahl bei Plus/Minus; platzhalter: bei Mal/Geteilt; vergleichen: <, = oder > wählen. */
  form: 'ergaenzen' | 'platzhalter' | 'vergleichen';
  links: Term;
  rechts: Term;
}

/** Schriftliche Rechnung: Zahlen untereinander, Ergebnis Ziffer für Ziffer. */
export interface SchriftlichAufgabe extends AufgabeBasis {
  art: 'schriftlich';
  op: '+' | '−' | '·';
  /** Zahlen von oben nach unten (bei Mal: [Faktor, Faktor]). */
  zahlen: number[];
}

/** Fehlerdetektiv: eine fertige schriftliche Rechnung, vielleicht mit einem Fehler in einer Ergebnisziffer. */
export interface DetektivAufgabe extends AufgabeBasis {
  art: 'detektiv';
  op: '+' | '−' | '·';
  zahlen: number[];
  /** Das gezeigte (vielleicht falsche) Ergebnis. */
  gezeigt: number;
  /** Das richtige Ergebnis. */
  richtig: number;
  /** Welcher Fehler eingebaut ist (für die Hilfe). */
  fehler: 'keiner' | 'uebertrag' | 'kleinerVonGroesser' | 'einmaleins' | 'verschoben';
}

/** Zahlenrätsel-Tresor: Hinweise führen zu genau einer Zahl, oder eine Abzählaufgabe (Kombinatorik). */
export interface TresorAufgabe extends AufgabeBasis {
  art: 'tresor';
  form: 'raetsel' | 'kombinatorik';
  hinweise: string[];
  /** Prüfung je Hinweis (gleiche Reihenfolge), damit die Hilfe eine Zahl Hinweis für Hinweis prüfen kann. */
  pruefungen: ((n: number) => boolean)[];
  /** Anzahl der Rädchen am Schloss. */
  stellen: number;
  /** Bei Kombinatorik: alle Möglichkeiten (für die Hilfe). */
  moeglichkeiten?: string[];
}

export type Aufgabe =
  | EinmaleinsAufgabe
  | StellenwertAufgabe
  | ZahlenstrahlAufgabe
  | UeberschlagAufgabe
  | HalbschriftlichAufgabe
  | GleichheitAufgabe
  | SchriftlichAufgabe
  | DetektivAufgabe
  | TresorAufgabe;

export function istEinmaleins(a: Aufgabe): a is EinmaleinsAufgabe {
  return a.art === 'mal' || a.art === 'geteilt' || a.art === 'platzhalter';
}
