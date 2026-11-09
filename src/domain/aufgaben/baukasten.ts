import type { Dimension, KompetenzId } from '../kompetenzen/modell';
import type { Stufe } from '../buden';
import type { Rng } from '../rng';
import { auswahl, neueAufgabenId, type Fehler } from './auswahl';
import type { AuswahlAufgabe } from './typen';

/** Bausteine für Auswahl-Buden: eine Aufgabe aus Text, Antwort, typischen Fehlern und Erklärung. */
export interface AuswahlEntwurf {
  bude: string;
  form: string;
  stufe: Stufe;
  text: string;
  sprechtext?: string;
  antwort: number;
  fehler: Fehler[];
  /** Abstand für aufgefüllte nahe Zahlen (bei Codes ohne Bedeutung). */
  schritt?: number;
  labels?: Record<number, string>;
  /** Beschriftung für alle Antworten aus dem Wert (statt fester `labels`). */
  format?: (wert: number) => string;
  /** Freie Eingabe statt Auswahl. */
  frei?: boolean;
  anzahl?: number;
  kompetenz: KompetenzId;
  dimension: Dimension;
  idee: string;
  schritte: string[];
  daten?: Record<string, unknown>;
}

export function auswahlAufgabe(e: AuswahlEntwurf, rng: Rng): AuswahlAufgabe {
  // Auch bei freier Eingabe (Spiel-Buden) gibt es Antwortmöglichkeiten: für Bildschirmleser und den letzten Hilfeschritt
  const optionen = auswahl(e.antwort, e.fehler, rng, e.schritt ?? 1, e.anzahl);
  const fmt = e.format;
  const labels = fmt ? Object.fromEntries(optionen.map((o) => [o.wert, fmt(o.wert)])) : e.labels;
  return {
    id: neueAufgabenId(e.bude.slice(0, 2)),
    text: e.text,
    sprechtext: e.sprechtext ?? e.text,
    antwort: e.antwort,
    optionen,
    ...(e.frei ? { eingabe: 'ziffern' as const } : {}),
    ...(labels ? { labels } : {}),
    kompetenz: e.kompetenz,
    dimension: e.dimension,
    fakt: `${e.bude}:${e.form}`,
    erklaerung: { idee: e.idee, schritte: e.schritte },
    art: 'auswahl',
    bude: e.bude,
    form: e.form,
    daten: { ...(e.daten ?? {}), stufe: e.stufe },
  };
}

/** Optionen als Codes 1…n mit Texten; `richtig` ist der Index der richtigen Antwort in `texte`. */
export function codeAuswahl(texte: readonly string[], richtig: number, rng: Rng): { antwort: number; fehler: Fehler[]; labels: Record<number, string>; anzahl: number } {
  const reihenfolge = rng.shuffle(texte.map((t, i) => ({ t, i })));
  const labels: Record<number, string> = {};
  let antwort = 1;
  const fehler: Fehler[] = [];
  reihenfolge.forEach((x, j) => {
    labels[j + 1] = x.t;
    if (x.i === richtig) antwort = j + 1;
    else fehler.push({ wert: j + 1, fehlerArt: 'sonstige' });
  });
  return { antwort, fehler, labels, anzahl: texte.length };
}

/** Euro-Betrag aus Cent: 345 → „3,45 €“. */
export const euro = (cent: number): string => `${Math.floor(cent / 100)},${String(cent % 100).padStart(2, '0')} €`;
