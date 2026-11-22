/**
 * Nahtstelle zwischen der gemeinsamen App und der Schulversion (src/schule/).
 *
 * Die gemeinsame App kennt nur diese Schnittstelle. Die Schulversion meldet beim Start ihre Umsetzung an
 * (`app.schule`); in der Familien-App bleibt `app.schule` leer und der Code unter src/schule/ ist nicht im Bundle.
 * So wirkt ein Fehler in der Schulversion nicht auf die Familien-App.
 */
import type { Abschnitt } from './rechtliches';
import type { Stufe } from '../domain/buden';
import type { Profil } from '../domain/profil';
import type { Datenbestand } from '../services/datenbestand';

/** Auftrag der Lehrkraft, wie ihn das Kind sieht. */
export interface KindAuftrag {
  id: string;
  /** Bude oder null für den Jahrmarkt-Check. */
  bude: string | null;
  stufe: Stufe | null;
  erledigt: boolean;
  /** Kurzer Text, z. B. „Dartbude, Silber“. */
  text: string;
}

export interface SchulErweiterung {
  /** Bauinsel und Bauplatz: offen oder mit Grund geschlossen (Lehrkraft-Einstellung). */
  inselZugang(b: Datenbestand, p: Profil, jetzt: number): { offen: true; bisMs: number | null } | { offen: false; grund: string };
  /** Aufträge der Lehrkraft für dieses Kind (offene zuerst). */
  auftraegeFuer(b: Datenbestand, p: Profil): KindAuftrag[];
  /** Nach einem Jahrmarkt-Check: Verlauf für den Vorher-nachher-Vergleich ergänzen. */
  nachCheck(p: Profil): Profil;
  /** Datenschutzerklärung der Schulversion. */
  datenschutz: Abschnitt[];
}
