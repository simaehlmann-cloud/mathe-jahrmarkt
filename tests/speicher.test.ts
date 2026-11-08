import { describe, expect, it } from 'vitest';
import { rundeVerbuchen } from '../src/domain/fortschritt/fortschritt';
import { neuesProfil } from '../src/domain/profil';
import { MIGRATIONEN, SCHEMA, leererBestand, migriere } from '../src/services/datenbestand';
import { sicherungEinspielen, sicherungErstellen } from '../src/services/sicherung';
import { MemoryKV, SCHLUESSEL, SCHLUESSEL_KAPUTT, Speicherplan, laden, speichern } from '../src/services/speicher';

const mitFortschritt = () => {
  const p = neuesProfil('p1', 'Alex', 'eule', 1);
  return rundeVerbuchen(p, { bude: 'dartbude', stufe: 'bronze', start: 1, dauerMs: 60000, punkte: 1200, richtig: 9, gesamt: 10 }).profil;
};

describe('Speicher', () => {
  it('speichert und lädt verlustfrei', async () => {
    const kv = new MemoryKV();
    const b = { ...leererBestand(), profile: [mitFortschritt()], aktiv: 'p1' };
    await speichern(kv, b);
    const { bestand, wiederhergestellt } = await laden(kv);
    expect(wiederhergestellt).toBe(false);
    expect(bestand).toEqual(b);
  });

  it('leerer Speicher ergibt leeren Bestand', async () => {
    expect((await laden(new MemoryKV())).bestand.profile).toEqual([]);
  });

  it('kaputte Daten werden beiseitegelegt, nicht gelöscht', async () => {
    const kv = new MemoryKV();
    await kv.set(SCHLUESSEL, '{kaputt');
    const e = await laden(kv);
    expect(e.wiederhergestellt).toBe(true);
    expect(e.bestand.profile).toEqual([]);
    expect(await kv.get(SCHLUESSEL_KAPUTT)).toBe('{kaputt');
  });

  it('Daten aus einer neueren Version werden nicht überschrieben', async () => {
    const kv = new MemoryKV();
    await kv.set(SCHLUESSEL, JSON.stringify({ schema: SCHEMA + 1, profile: [] }));
    const e = await laden(kv);
    expect(e.wiederhergestellt).toBe(true);
    expect(await kv.get(SCHLUESSEL_KAPUTT)).toContain(`"schema":${SCHEMA + 1}`);
  });

  it('jede alte Schema-Version hat eine Migration', () => {
    for (let v = 0; v < SCHEMA; v++) expect(MIGRATIONEN[v], `Migration ${v}`).toBeDefined();
  });

  it('migriert Version 0 ohne Fortschrittsverlust', () => {
    const p = mitFortschritt();
    const b = migriere({ profile: [p] });
    expect(b.schema).toBe(SCHEMA);
    expect(b.profile[0]?.fortschritt).toEqual(p.fortschritt);
    expect(b.profile[0]?.taler).toBe(p.taler);
  });

  it('repariert unvollständige und falsche Felder', () => {
    const b = migriere({
      schema: 1,
      profile: [
        { id: 'a', name: '  Mia ', figur: 'drache', taler: -5, fortschritt: { dartbude: { bronze: { geschafft: true, rekord: 'x' } } } },
        { id: 'a', name: 'Doppelt' },
        { name: 'ohne id' },
        'unsinn',
      ],
      einstellungen: { lautMusik: 7, schrift: 'riesig' },
      aktiv: 'gibtsnicht',
    });
    expect(b.profile).toHaveLength(1);
    expect(b.profile[0]?.name).toBe('Mia');
    expect(b.profile[0]?.figur).toBe('fuchs');
    expect(b.profile[0]?.taler).toBe(0);
    expect(b.profile[0]?.fortschritt.dartbude?.bronze).toEqual({ geschafft: true, rekord: 0, gespielt: 0, verlauf: [] });
    expect(b.einstellungen.lautMusik).toBe(1);
    expect(b.einstellungen.schrift).toBe('normal');
    expect(b.aktiv).toBeUndefined();
  });

  it('Speicherplan bündelt Änderungen und schreibt bei sofort()', async () => {
    const kv = new MemoryKV();
    const plan = new Speicherplan(kv, 10_000);
    plan.vormerken({ ...leererBestand(), aktiv: undefined });
    plan.vormerken({ ...leererBestand(), profile: [mitFortschritt()] });
    expect(await kv.get(SCHLUESSEL)).toBeNull();
    await plan.sofort();
    expect(JSON.parse((await kv.get(SCHLUESSEL)) as string).profile).toHaveLength(1);
  });
});

describe('Sicherungsdatei', () => {
  it('Rundreise: exportieren und auf leerem Gerät einspielen', () => {
    const quelle = { ...leererBestand(), profile: [mitFortschritt()] };
    const datei = sicherungErstellen(quelle, 123);
    const e = sicherungEinspielen(leererBestand(), datei);
    expect(e.uebernommen).toBe(1);
    expect(e.bestand.profile).toEqual(quelle.profile);
  });

  it('gleiches Profil wird ersetzt, volles Gerät überspringt', () => {
    const p = mitFortschritt();
    const datei = sicherungErstellen({ ...leererBestand(), profile: [p] }, 1);
    const ziel = { ...leererBestand(), profile: [{ ...p, taler: 0 }] };
    expect(sicherungEinspielen(ziel, datei).ersetzt).toBe(1);
    const voll = { ...leererBestand(), profile: ['a', 'b', 'c', 'd'].map((id) => neuesProfil(id, id, 'fuchs', 0)) };
    expect(sicherungEinspielen(voll, datei).uebersprungen).toBe(1);
  });

  it('lehnt fremde und kaputte Dateien ab', () => {
    expect(() => sicherungEinspielen(leererBestand(), 'kein json')).toThrow(/nicht lesbar/);
    expect(() => sicherungEinspielen(leererBestand(), '{"profile":[]}')).toThrow(/keine Sicherung/);
  });
});
