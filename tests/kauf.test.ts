import { describe, expect, it, vi } from 'vitest';
import { PRODUKT_ID, PREIS_ANZEIGE, storeKauf, type StorePlugin, type StoreTransaktion } from '../src/services/kauf';

function plugin(teil: Partial<StorePlugin> = {}, kaeufe: StoreTransaktion[] = []): StorePlugin {
  return {
    isBillingSupported: async () => ({ isBillingSupported: true }),
    getProducts: async () => ({ products: [{ identifier: PRODUKT_ID, priceString: '4,49 €' }] }),
    purchaseProduct: async () => ({ productIdentifier: PRODUKT_ID, purchaseState: '1' }),
    restorePurchases: async () => undefined,
    getPurchases: async () => ({ purchases: kaeufe }),
    ...teil,
  };
}

describe('Store-Kauf', () => {
  it('zeigt den Preis aus dem Store, sonst den geplanten', async () => {
    expect(await storeKauf(plugin(), true).preis()).toBe('4,49 €');
    expect(await storeKauf(plugin({ getProducts: async () => { throw new Error('offline'); } }), true).preis()).toBe(PREIS_ANZEIGE);
  });
  it('kauft, erkennt Abbruch, ausstehende Zahlung und fehlende Abrechnung', async () => {
    expect(await storeKauf(plugin(), true).kaufen()).toBe('gekauft');
    expect(await storeKauf(plugin({ purchaseProduct: async () => ({ productIdentifier: PRODUKT_ID }) }), false).kaufen()).toBe('gekauft');
    expect(await storeKauf(plugin({ purchaseProduct: async () => { throw new Error('User cancelled the purchase'); } }), true).kaufen()).toBe('abgebrochen');
    expect(await storeKauf(plugin({ purchaseProduct: async () => ({ productIdentifier: PRODUKT_ID, purchaseState: '2' }) }), true).kaufen()).toBe('ausstehend');
    expect(await storeKauf(plugin({ isBillingSupported: async () => ({ isBillingSupported: false }) }), true).kaufen()).toBe('nichtVerfuegbar');
    expect(await storeKauf(plugin({ purchaseProduct: async () => { throw new Error('Netzwerk'); } }), true).kaufen()).toBe('fehler');
  });
  it('„schon gekauft“ wird über die Wiederherstellung freigeschaltet', async () => {
    const p = plugin({ purchaseProduct: async () => { throw new Error('Item already owned'); } }, [{ productIdentifier: PRODUKT_ID, purchaseState: '1' }]);
    expect(await storeKauf(p, true).kaufen()).toBe('gekauft');
  });
  it('stellt nur das Paket und nur bezahlte Käufe wieder her', async () => {
    const wieder = vi.fn(async () => undefined);
    expect(await storeKauf(plugin({ restorePurchases: wieder }, [{ productIdentifier: PRODUKT_ID, purchaseState: '1' }]), true).wiederherstellen()).toBe(true);
    expect(wieder).toHaveBeenCalled();
    expect(await storeKauf(plugin({}, [{ productIdentifier: PRODUKT_ID, purchaseState: '2' }]), true).wiederherstellen()).toBe(false);
    expect(await storeKauf(plugin({}, [{ productIdentifier: 'anderes' }]), false).wiederherstellen()).toBe(false);
    expect(await storeKauf(plugin({ getPurchases: async () => { throw new Error('x'); } }), false).wiederherstellen()).toBe(false);
  });
});
