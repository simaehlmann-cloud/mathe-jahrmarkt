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

  it('migriert Version 1 auf 2: Figur bekommt Aussehen, gekaufter Strohhut bleibt auf', () => {
    const alt = { ...mitFortschritt(), deko: ['hut'] } as Record<string, unknown>;
    delete alt.aussehen;
    const ohneHut = { ...mitFortschritt(), id: 'p2' } as Record<string, unknown>;
    delete ohneHut.aussehen;
    const b = migriere({ schema: 1, profile: [alt, ohneHut], einstellungen: {}, paket: { gekauft: false } });
    expect(b.schema).toBe(SCHEMA);
    expect(b.profile[0]?.aussehen).toEqual({ fell: 0, tuch: 'keins', extra: 'strohhut' });
    expect(b.profile[1]?.aussehen).toEqual({ fell: 0, tuch: 'keins', extra: 'keins' });
    expect(b.profile[0]?.fortschritt).toEqual(alt.fortschritt);
  });

  it('migriert Version 2 auf 3: Fortschritt der Überschlags-Waage zieht zur Gleichgewichts-Waage um', () => {
    const p = neuesProfil('p1', 'Alex', 'eule', 1);
    const stand = { geschafft: true, rekord: 900, gespielt: 1, verlauf: [900] };
    const alt = {
      ...p,
      fortschritt: { ueberschlagswaage: { bronze: stand } },
      runden: [{ bude: 'ueberschlagswaage', stufe: 'bronze', start: 1, dauerMs: 60000, punkte: 900, richtig: 9, gesamt: 10 }],
      ereignisse: [{ t: 1, bude: 'ueberschlagswaage', kompetenz: 'halbschriftlich', dimension: 'wissen', richtig: true, ms: 900, gewertet: true }],
    };
    const b = migriere({ schema: 2, profile: [alt] });
    expect(b.profile[0]?.fortschritt.waage?.bronze?.geschafft).toBe(true);
    expect(b.profile[0]?.fortschritt.ueberschlagswaage).toBeUndefined();
    expect(b.profile[0]?.ereignisse[0]?.bude).toBe('waage');
    expect(b.profile[0]?.runden[0]?.bude).toBe('waage');
  });

  it('Strohhut ohne Kauf wird nicht übernommen, ungültige Werte werden ersetzt', () => {
    const p = { ...mitFortschritt(), aussehen: { fell: 9, tuch: 'pink', extra: 'strohhut' } };
    const b = migriere({ schema: 2, profile: [p] });
    expect(b.profile[0]?.aussehen).toEqual({ fell: 0, tuch: 'keins', extra: 'keins' });
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
    expect(b.profile[0]?.figur).toBe('mensch');
    expect(b.profile[0]?.taler).toBe(0);
    // Ältere Stände ohne Bauplatz, Aufträge und Check bekommen leere Werte
    expect(b.profile[0]?.bau.bloecke).toBeGreaterThan(0);
    expect(b.profile[0]?.bau.welt).toHaveLength(64);
    expect(b.profile[0]?.auftraege).toBeNull();
    expect(b.profile[0]?.check).toBeNull();
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

import { geschlecht, standardStimme, stimmenWert, waehleStimmen } from '../src/services/sprache';

describe('Stimmenwahl', () => {
  const v = (name: string, lang = 'de-DE', localService = true, def = false) => ({ name, voiceURI: name, lang, localService, default: def });
  it('nimmt nur deutsche Stimmen, die ohne Internet laufen', () => {
    expect(stimmenWert(v('en-us-x-sfg-local', 'en-US'))).toBeLessThan(0);
    expect(stimmenWert(v('de-de-x-nfh-network'))).toBeLessThan(0);
    expect(stimmenWert(v('Anna', 'de-DE', false))).toBeLessThan(0);
    expect(stimmenWert(v('de-de-x-deb-local'))).toBeGreaterThanOrEqual(0);
  });
  it('bevorzugt hochwertige Stimmen vor kompakten und zeigt jede Stimme nur einmal', () => {
    const liste = waehleStimmen([v('Anna (kompakt)'), v('Anna (Enhanced)'), v('de-de-x-nfh-network'), v('Thomas', 'fr-FR')]);
    expect(liste).toHaveLength(1);
    expect(liste[0]?.name).toBe('Frau 1');
    expect(liste[0]?.index).toBe(1);
  });
  it('höchstens vier unterscheidbare Stimmen, auch wenn alle gleich heißen; Standard ist Frau 2', () => {
    // So meldet ein Samsung-Handy mit Google-Sprachausgabe die Stimmen: Name überall gleich, Kennung verschieden
    const s = (uri: string) => ({ name: 'Deutsch (Deutschland)', voiceURI: uri, lang: 'de-DE', localService: true, default: false });
    const liste = waehleStimmen([
      s('de-de-x-deb-local'), s('de-de-x-dea-local'), s('de-de-x-deg-local'), s('de-de-x-nfh-local'), s('de-de-x-def-local'),
      s('de-de-x-deb-network'), s('de-DE-language'), s('de-de-x-dea-local'),
    ]);
    expect(liste.length).toBeLessThanOrEqual(4);
    expect(liste.map((x) => x.name)).toEqual(['Frau 1', 'Frau 2', 'Mann 1', 'Mann 2']);
    expect(new Set(liste.map((x) => x.uri)).size).toBe(liste.length);
    expect(standardStimme(liste)?.name).toBe('Frau 2');
    expect(geschlecht({ name: 'SMTf00', voiceURI: 'SMTf00' })).toBe('w');
    expect(geschlecht({ name: 'Markus', voiceURI: 'Markus' })).toBe('m');
    expect(standardStimme([])).toBeUndefined();
  });
  it('alte Einstellungen bekommen Tempo und Stimme', () => {
    const b = migriere({ schema: 2, profile: [], einstellungen: { lautSprache: 0.5 } });
    expect(b.einstellungen.sprechtempo).toBe(1.1);
    expect(b.einstellungen.stimme).toBe('');
    expect(b.einstellungen.lautSprache).toBe(0.5);
  });
});

import { FLINKAS_WALZER, SCHLAEGE_PRO_TAKT, frequenz } from '../src/services/musik';

describe('Flinkas Walzer', () => {
  it('jeder Takt hat genau drei Schläge und spielbare Töne', () => {
    expect(FLINKAS_WALZER).toHaveLength(16);
    for (const t of FLINKAS_WALZER) {
      expect(t.melodie.reduce((s, [, l]) => s + l, 0)).toBe(SCHLAEGE_PRO_TAKT);
      for (const [m] of t.melodie) expect(m).toBeGreaterThanOrEqual(60);
      expect(t.akkord).toHaveLength(3);
    }
    expect(frequenz(69)).toBe(440);
    expect(Math.round(frequenz(60))).toBe(262);
  });
});

import { LICHTER_AN, PLAYLIST } from '../src/services/musik';
describe('Lichter an', () => {
  it('jeder Takt hat vier Schläge, Töne im spielbaren Bereich, Akkorde mit drei Tönen', () => {
    expect(LICHTER_AN).toHaveLength(16);
    for (const t of LICHTER_AN) {
      expect(t.melodie.reduce((s, [, l]) => s + l, 0)).toBe(4);
      for (const [m] of t.melodie) expect(m === 0 || (m >= 60 && m <= 90)).toBe(true);
      expect(t.akkord).toHaveLength(3);
    }
    for (const s of PLAYLIST) expect(s.takte.every((t) => t.melodie.reduce((x, [, l]) => x + l, 0) === s.schlaege)).toBe(true);
  });
});
