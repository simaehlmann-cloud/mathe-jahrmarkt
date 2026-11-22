import { describe, expect, it } from 'vitest';
import { MAX_PROFILE, neuesProfil } from '../src/domain/profil';
import { migriere } from '../src/services/datenbestand';

/**
 * Familien-App ohne Schulversion: Diese Datei importiert nichts aus src/schule/, die Prüfung der Schuldaten ist
 * also nicht angemeldet – wie im Bundle der Familien-App.
 */
describe('Familien-App ohne Schulversion', () => {
  it('lässt ein Feld „schule“ weg und bleibt bei 4 Profilen', () => {
    const profile = Array.from({ length: 10 }, (_, i) => neuesProfil(`p${i}`, `Kind ${i}`, 'fuchs', 0));
    const b = migriere({ schema: 3, profile, einstellungen: {}, paket: { gekauft: true }, schule: { klassen: [{ id: 'k1', name: '4a' }] } });
    expect(b.schule).toBeUndefined();
    expect(b.profile).toHaveLength(MAX_PROFILE);
    expect(b.paket.gekauft).toBe(true);
  });
});
