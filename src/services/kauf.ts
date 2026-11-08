/**
 * Kauf des Zusatzpakets (Einmalkauf, 3,99 €). Die Oberfläche spricht nur mit dieser Schnittstelle.
 *
 * Stand: Der native Kauf über StoreKit 2 und Google Play Billing ist noch nicht angebunden
 * (Fahrplan Schritt 6). Bis dahin meldet die native App „nicht verfügbar“; im Browser
 * gibt es einen gekennzeichneten Testkauf für die Entwicklung.
 */
import { Capacitor } from '@capacitor/core';

export const PRODUKT_ID = 'de.maehlmann.mathejahrmarkt.zusatzpaket';
export const PREIS_ANZEIGE = '3,99 €';

export type KaufErgebnis = 'gekauft' | 'abgebrochen' | 'nichtVerfuegbar' | 'fehler';

export interface KaufService {
  readonly art: 'store' | 'test' | 'keiner';
  /** Lokalisierter Preis aus dem Store, sonst der geplante Preis. */
  preis(): Promise<string>;
  kaufen(): Promise<KaufErgebnis>;
  /** Fragt den Store nach früheren Käufen. True, wenn das Paket gekauft ist. */
  wiederherstellen(): Promise<boolean>;
}

/** Testkauf für die Entwicklung im Browser. Darf nie in einer Store-Version aktiv sein. */
export function testKauf(): KaufService {
  return {
    art: 'test',
    preis: async () => `${PREIS_ANZEIGE} (Testkauf)`,
    kaufen: async () => 'gekauft',
    wiederherstellen: async () => false,
  };
}

export function keinKauf(): KaufService {
  return {
    art: 'keiner',
    preis: async () => PREIS_ANZEIGE,
    kaufen: async () => 'nichtVerfuegbar',
    wiederherstellen: async () => false,
  };
}

export async function erstelleKauf(): Promise<KaufService> {
  if (Capacitor.isNativePlatform()) return keinKauf();
  return import.meta.env.DEV ? testKauf() : keinKauf();
}
