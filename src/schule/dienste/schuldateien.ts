/**
 * Dateien der Schulversion weitergeben und einlesen: verschlüsselt mit der Lehrer-PIN (services/schulkrypto.ts),
 * weitergegeben über das Teilen-Menü (AirDrop, Dateien, Schulcloud …), eingelesen über die Dateiauswahl des Systems.
 */
import { dateiWeitergeben } from '../../services/pdf';
import { verschluesseln } from './schulkrypto';

/** Dateiendung der Austausch-Dateien. */
export const ENDUNG = '.jahrmarkt';

/** Dateiname ohne Zeichen, die in Dateisystemen stören (z. B. „Ergebnisse iPad 7 2026-11-22“). */
export function dateiname(teile: readonly string[], jetzt: number): string {
  const d = new Date(jetzt);
  const datum = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sauber = [...teile, datum]
    .map((t) => t.replace(/[^\p{L}\p{N} _-]/gu, '').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 80);
  return `${sauber}${ENDUNG}`;
}

/** Verschlüsselt den Inhalt und öffnet das Teilen-Menü. Liefert false, wenn abgebrochen. */
export async function austauschWeitergeben(inhalt: unknown, typ: string, von: string, pin: string, name: string, titel: string): Promise<boolean> {
  const text = await verschluesseln(inhalt, typ, von, pin, Date.now());
  return dateiWeitergeben(new TextEncoder().encode(text), name, 'application/octet-stream', titel);
}

/** Liest eine gewählte Datei als Text (höchstens 60 MB). */
export async function dateiAlsText(datei: File): Promise<string> {
  if (datei.size > 60 * 1024 * 1024) throw new Error('Die Datei ist zu groß.');
  return datei.text();
}
