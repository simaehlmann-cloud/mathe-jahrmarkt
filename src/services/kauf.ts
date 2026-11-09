/**
 * Kauf des Zusatzpakets (Einmalkauf, 3,99 €). Die Oberfläche spricht nur mit dieser Schnittstelle.
 *
 * In der App (iOS und Android) läuft der Kauf über StoreKit 2 bzw. Google Play Billing
 * (Plugin @capgo/native-purchases). Das Produkt muss in App Store Connect und in der
 * Google Play Console mit genau der PRODUKT_ID als „nicht verbrauchbarer“ Einmalkauf angelegt sein.
 * Im Browser während der Entwicklung und in der Test-APK (VITE_TESTKAUF=1) gibt es einen gekennzeichneten Testkauf.
 */
import { Capacitor } from '@capacitor/core';

export const PRODUKT_ID = 'de.maehlmann.mathejahrmarkt.zusatzpaket';
export const PREIS_ANZEIGE = '3,99 €';

export type KaufErgebnis = 'gekauft' | 'ausstehend' | 'abgebrochen' | 'nichtVerfuegbar' | 'fehler';

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

/** Das Nötigste aus dem Plugin – so bleibt der Store-Kauf ohne Gerät testbar. */
export interface StoreTransaktion {
  productIdentifier: string;
  /** Android: "1" = gekauft, "2" = ausstehend (z. B. Barzahlung im Laden). */
  purchaseState?: string;
}
export interface StorePlugin {
  isBillingSupported(): Promise<{ isBillingSupported: boolean }>;
  getProducts(o: { productIdentifiers: string[] }): Promise<{ products: { identifier: string; priceString: string }[] }>;
  purchaseProduct(o: { productIdentifier: string }): Promise<StoreTransaktion>;
  restorePurchases(): Promise<void>;
  getPurchases(o?: { onlyCurrentEntitlements?: boolean }): Promise<{ purchases: StoreTransaktion[] }>;
}

const istPaket = (t: StoreTransaktion, android: boolean): boolean =>
  t.productIdentifier === PRODUKT_ID && (!android || t.purchaseState === undefined || t.purchaseState === '1' || t.purchaseState === 'PURCHASED');

export function storeKauf(plugin: StorePlugin, android: boolean): KaufService {
  const bereit = async (): Promise<boolean> => {
    try {
      return (await plugin.isBillingSupported()).isBillingSupported;
    } catch {
      return false;
    }
  };
  return {
    art: 'store',
    async preis() {
      try {
        const { products } = await plugin.getProducts({ productIdentifiers: [PRODUKT_ID] });
        return products.find((p) => p.identifier === PRODUKT_ID)?.priceString ?? PREIS_ANZEIGE;
      } catch {
        return PREIS_ANZEIGE;
      }
    },
    async kaufen() {
      if (!(await bereit())) return 'nichtVerfuegbar';
      try {
        const t = await plugin.purchaseProduct({ productIdentifier: PRODUKT_ID });
        if (android && (t.purchaseState === '2' || t.purchaseState === 'PENDING')) return 'ausstehend';
        return istPaket(t, android) ? 'gekauft' : 'fehler';
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        if (/cancel/i.test(text)) return 'abgebrochen';
        // Schon gekauft (z. B. auf einem anderen Gerät): dann gilt es als Kauf.
        if (/already|owned/i.test(text)) return (await this.wiederherstellen()) ? 'gekauft' : 'fehler';
        return 'fehler';
      }
    },
    async wiederherstellen() {
      if (!(await bereit())) return false;
      try {
        await plugin.restorePurchases().catch(() => undefined);
        const { purchases } = await plugin.getPurchases({ onlyCurrentEntitlements: true });
        return purchases.some((t) => istPaket(t, android));
      } catch {
        return false;
      }
    },
  };
}

export async function erstelleKauf(): Promise<KaufService> {
  // Nur die Test-APK aus GitHub wird mit VITE_TESTKAUF=1 gebaut: dort lässt sich das Paket zum Ausprobieren freischalten.
  if (import.meta.env.VITE_TESTKAUF === '1') return testKauf();
  if (Capacitor.isNativePlatform()) {
    try {
      const { NativePurchases } = await import('@capgo/native-purchases');
      return storeKauf(NativePurchases as unknown as StorePlugin, Capacitor.getPlatform() === 'android');
    } catch {
      return keinKauf();
    }
  }
  return import.meta.env.DEV ? testKauf() : keinKauf();
}
