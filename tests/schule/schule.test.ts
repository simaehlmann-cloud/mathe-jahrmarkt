import { describe, expect, it } from 'vitest';
import { rundeVerbuchen } from '../../src/domain/fortschritt/fortschritt';
import type { Ereignis } from '../../src/domain/lernprofil/lernprofil';
import { fortschrittZurueckgesetzt, MAX_PROFILE, MAX_PROFILE_SCHULE, type Profil } from '../../src/domain/profil';
import { createRng } from '../../src/domain/rng';
import {
  ergebnisseEinsammeln,
  ergebnisseErstellen,
  klassenlisteErstellen,
  klassenlisteUebernehmen,
  pruefeKlassenliste,
} from '../../src/schule/domain/austausch';
import { klassenbericht, klassenuebersicht, schuelerbericht, zusammenfuehren } from '../../src/schule/domain/analyse';
import { BILDSYMBOLE, erzeugePasswort, passwortGueltig, passwortRichtig } from '../../src/schule/domain/bildpasswort';
import { erzeugeRettungscode, nachFehlversuch, PIN_WARTEN_MAX_MS, PIN_WARTEN_MS, pinFehler, rettungscodeNormal, RETTUNG_ZEICHEN } from '../../src/schule/domain/pin';
import {
  geraetLeeren,
  klasseAnlegen,
  klasseLoeschen,
  klassenMitKindern,
  namenAusText,
  passwoerterNeu,
  profilAendern,
  schuelerAnlegen,
  VerwaltungsFehler,
} from '../../src/schule/domain/verwaltung';
import { SpeicherDateien, TeilAblage, profilDatei } from '../../src/schule/dienste/ablage';
import { alleAenderungen, keineAenderung } from '../../src/services/aenderung';
import '../../src/schule/domain/pruefen';
import { leereSchule } from '../../src/schule/domain/schuldaten';
import { leererBestand, migriere, pruefeBestand, type Datenbestand } from '../../src/services/datenbestand';
import { sicherungEinspielen, sicherungErstellen } from '../../src/services/sicherung';
import { Speicherplan } from '../../src/services/speicher';
import { FalschePin, entschluesseln, hashe, leseUmschlag, pruefeGeheimnis, verschluesseln } from '../../src/schule/dienste/schulkrypto';

const TAG = 24 * 3600 * 1000;
let zaehler = 0;
const id = (v: string) => `${v}${++zaehler}`;
const schulBestand = (geraet = 'g1'): Datenbestand => leererBestand(leereSchule(geraet));

/** Bestand mit einer Klasse „4a“ und n Kindern. */
function mitKlasse(n: number, geraet = 'g1'): { b: Datenbestand; klasse: string } {
  const klasse = id('k');
  let b = klasseAnlegen(schulBestand(geraet), klasse, '4a');
  b = schuelerAnlegen(b, klasse, Array.from({ length: n }, (_, i) => `Kind ${i + 1}`), () => id('p'), createRng(7), 1000).bestand;
  return { b, klasse };
}

const ereignis = (t: number, richtig: boolean, teil: Partial<Ereignis> = {}): Ereignis => ({
  t,
  bude: 'dartbude',
  kompetenz: 'kopfrechnen',
  dimension: 'sicherheit',
  richtig,
  ms: 2000,
  fakt: '7x8',
  gewertet: true,
  ...(richtig ? {} : { fehlerArt: 'nachbaraufgabe' as const }),
  ...teil,
});

describe('Bildpasswort', () => {
  it('drei gültige Bilder, nie zwei gleiche direkt hintereinander', () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const pw = erzeugePasswort(rng);
      expect(passwortGueltig(pw)).toBe(true);
      expect(pw[0]).not.toBe(pw[1]);
      expect(pw[1]).not.toBe(pw[2]);
    }
    expect(new Set(BILDSYMBOLE.map((s) => s.id)).size).toBe(12);
  });
  it('prüft Reihenfolge und Länge', () => {
    expect(passwortRichtig(['stern', 'eis', 'mond'], ['stern', 'eis', 'mond'])).toBe(true);
    expect(passwortRichtig(['stern', 'eis', 'mond'], ['eis', 'stern', 'mond'])).toBe(false);
    expect(passwortRichtig(['stern', 'eis', 'mond'], ['stern', 'eis'])).toBe(false);
    expect(passwortRichtig(undefined, ['stern', 'eis', 'mond'])).toBe(false);
    expect(passwortGueltig(['stern', 'eis', 'gibtsnicht'])).toBe(false);
  });
});

describe('Lehrer-PIN', () => {
  it('lehnt zu kurze, einfache und nicht-numerische PINs ab', () => {
    expect(pinFehler('12345')).toMatch(/6 bis 8/);
    expect(pinFehler('123456789')).toMatch(/6 bis 8/);
    expect(pinFehler('12a456')).toMatch(/Ziffern/);
    expect(pinFehler('000000')).toMatch(/wiederholen/);
    expect(pinFehler('123456')).toMatch(/Zahlenreihe/);
    expect(pinFehler('987654')).toMatch(/Zahlenreihe/);
    expect(pinFehler('890123')).toMatch(/Zahlenreihe/);
    expect(pinFehler('472915')).toBeNull();
  });
  it('Wartezeit ab dem 5. Fehlversuch, verdoppelt sich, mit Obergrenze', () => {
    let s = { fehl: 0, bis: 0 };
    for (let i = 0; i < 4; i++) s = nachFehlversuch(s, 0);
    expect(s.bis).toBe(0);
    s = nachFehlversuch(s, 0);
    expect(s.bis).toBe(PIN_WARTEN_MS);
    s = nachFehlversuch(s, 0);
    expect(s.bis).toBe(2 * PIN_WARTEN_MS);
    for (let i = 0; i < 20; i++) s = nachFehlversuch(s, 0);
    expect(s.bis).toBe(PIN_WARTEN_MAX_MS);
  });
  it('Wiederherstellungscode: drei Vierergruppen ohne Verwechsler, Eingabe tolerant', () => {
    const rng = createRng(3);
    const code = erzeugeRettungscode((n) => rng.int(0, n - 1));
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    for (const z of code.replace(/-/g, '')) expect(RETTUNG_ZEICHEN).toContain(z);
    expect(rettungscodeNormal(` ${code.toLowerCase().replace(/-/g, ' ')} `)).toBe(code.replace(/-/g, ''));
  });
  it('Hash: richtige PIN passt, falsche nicht, Salz macht Hashes verschieden', async () => {
    const a = await hashe('472915', 1000);
    const b = await hashe('472915', 1000);
    expect(a.hash).not.toBe(b.hash);
    expect(await pruefeGeheimnis('472915', a)).toBe(true);
    expect(await pruefeGeheimnis('472916', a)).toBe(false);
    expect(JSON.stringify(a)).not.toContain('472915');
  });
});

describe('Klassen und Kinder verwalten', () => {
  it('Klassen: Name nötig, keine doppelten', () => {
    const b = klasseAnlegen(schulBestand(), 'k1', ' 4a ');
    expect(b.schule?.klassen).toEqual([{ id: 'k1', name: '4a' }]);
    expect(() => klasseAnlegen(b, 'k2', '4A')).toThrow(VerwaltungsFehler);
    expect(() => klasseAnlegen(b, 'k2', '  ')).toThrow(VerwaltungsFehler);
    expect(() => klasseAnlegen(leererBestand(), 'k1', '4a')).toThrow(/Schulversion/);
  });
  it('Namensliste: Zeilen, Kommas, Doppelte, zu lange Namen', () => {
    const n = namenAusText('Mia S.\nJonas K.; Aylin T.,\n\n mia s. \nEinSehrSehrLangerVorname X.', ['Jonas K.']);
    expect(n.namen).toEqual(['Mia S.', 'Aylin T.', 'EinSehrSehrLange']);
    expect(n.doppelt).toEqual(['Jonas K.', 'mia s.']);
    expect(n.gekuerzt).toEqual(['EinSehrSehrLange']);
  });
  it('Kinder anlegen: Bildpasswort, Klasse, Figur noch offen; höchstens 32 je Gerät', () => {
    const { b, klasse } = mitKlasse(30);
    expect(b.profile).toHaveLength(30);
    for (const p of b.profile) {
      expect(p.klasse).toBe(klasse);
      expect(passwortGueltig(p.passwort)).toBe(true);
      expect(p.figurGewaehlt).toBe(false);
    }
    const r = schuelerAnlegen(b, klasse, ['A', 'B', 'C', 'D'], () => id('p'), createRng(1), 1);
    expect(r.angelegt).toHaveLength(2);
    expect(r.uebersprungen).toEqual(['C', 'D']);
    expect(r.bestand.profile).toHaveLength(MAX_PROFILE_SCHULE);
  });
  it('Profil ändern, Passwort neu, Klasse löschen', () => {
    const { b, klasse } = mitKlasse(3);
    const p = b.profile[0] as Profil;
    const b2 = profilAendern(b, p.id, { name: 'Neu N.', klasse: null });
    expect(b2.profile[0]?.name).toBe('Neu N.');
    expect(b2.profile[0]?.klasse).toBeUndefined();
    expect(klassenMitKindern(b2).map((g) => g.klasse?.name ?? 'ohne')).toEqual(['4a', 'ohne']);
    const b3 = passwoerterNeu(b, [p.id], createRng(99));
    expect(b3.profile[0]?.passwort).not.toEqual(p.passwort);
    expect(b3.profile[1]?.passwort).toEqual(b.profile[1]?.passwort);
    expect(klasseLoeschen(b, klasse, true).profile).toHaveLength(0);
    const ohne = klasseLoeschen(b, klasse, false);
    expect(ohne.profile).toHaveLength(3);
    expect(ohne.profile.every((q) => q.klasse === undefined)).toBe(true);
  });
  it('Fortschritt zurücksetzen behält Klasse, Bildpasswort und Figur', () => {
    const { b } = mitKlasse(1);
    const p = { ...(b.profile[0] as Profil), figurGewaehlt: true };
    const gespielt = rundeVerbuchen(p, { bude: 'dartbude', stufe: 'bronze', start: 1, dauerMs: 1000, punkte: 100, richtig: 9, gesamt: 10 }).profil;
    const z = fortschrittZurueckgesetzt(gespielt);
    expect(z.fortschritt).toEqual({});
    expect(z.klasse).toBe(p.klasse);
    expect(z.passwort).toEqual(p.passwort);
    expect(z.figurGewaehlt).toBe(true);
  });
  it('Schuljahreswechsel leert Kinder, Klassen und Sammlungen, behält PIN und Gerät', () => {
    const { b } = mitKlasse(5);
    const mitPin = { ...b, schule: { ...b.schule!, pin: { hash: 'h', salz: 's', iter: 1 }, geraet: { id: 'g1', name: 'iPad 7' } } };
    const leer = geraetLeeren(mitPin);
    expect(leer.profile).toEqual([]);
    expect(leer.schule?.klassen).toEqual([]);
    expect(leer.schule?.pin?.hash).toBe('h');
    expect(leer.schule?.geraet.name).toBe('iPad 7');
  });
});

describe('Datenbestand der Schulversion', () => {
  it('Prüfung behält Schuldaten und bis zu 32 Profile; Familien-App bleibt bei 4', () => {
    const { b } = mitKlasse(32);
    const roh = JSON.parse(JSON.stringify(b));
    const g = pruefeBestand(roh);
    expect(g.profile).toHaveLength(32);
    expect(g.schule?.klassen).toHaveLength(1);
    expect(g.profile[0]?.passwort).toEqual(b.profile[0]?.passwort);
    const familie = pruefeBestand({ ...roh, schule: undefined });
    expect(familie.profile).toHaveLength(MAX_PROFILE);
    expect(familie.schule).toBeUndefined();
  });
  it('unbekannte Klasse am Profil fällt weg, kaputte Passwörter auch', () => {
    const { b } = mitKlasse(2);
    const roh = JSON.parse(JSON.stringify(b));
    roh.profile[0].klasse = 'gibtsnicht';
    roh.profile[1].passwort = ['stern'];
    const g = migriere(roh);
    expect(g.profile[0]?.klasse).toBeUndefined();
    expect(g.profile[1]?.passwort).toBeUndefined();
  });
  it('Sicherung im Schulbestand nimmt bis zu 32 Profile auf', () => {
    const { b } = mitKlasse(20);
    const datei = sicherungErstellen(b, 1);
    const ziel = { ...schulBestand('g2'), profile: mitKlasse(10).b.profile };
    expect(sicherungEinspielen(ziel, datei).uebernommen).toBe(20);
  });
});

describe('Ablage in einzelnen Dateien', () => {
  it('Rundreise: Kopf, Profile und Sammlung', async () => {
    const d = new SpeicherDateien();
    const { b } = mitKlasse(3);
    const a = new TeilAblage(d);
    await a.schreiben(b, alleAenderungen());
    expect([...d.daten.keys()].filter((n) => n.startsWith('p-'))).toHaveLength(3);
    const geladen = await new TeilAblage(d).laden(() => schulBestand('neu'));
    expect(geladen.wiederhergestellt).toBe(false);
    expect(geladen.bestand.profile.map((p) => p.name)).toEqual(b.profile.map((p) => p.name));
    expect(geladen.bestand.schule?.geraet.id).toBe('g1');
  });
  it('schreibt nur geänderte Profile und abwechselnd in zwei Fächer', async () => {
    const d = new SpeicherDateien();
    const { b } = mitKlasse(3);
    const a = new TeilAblage(d);
    await a.schreiben(b, alleAenderungen());
    const geschrieben: string[] = [];
    const orig = d.schreiben.bind(d);
    d.schreiben = async (n, t) => {
      geschrieben.push(n);
      return orig(n, t);
    };
    const p0 = b.profile[0] as Profil;
    const b2 = { ...b, profile: b.profile.map((p, i) => (i === 0 ? { ...p, taler: 5 } : p)) };
    await a.schreiben(b2, { ...keineAenderung(), profile: new Set([p0.id]) });
    expect(geschrieben).toEqual([`${profilDatei(p0.id)}.b.json`]);
    const b3 = { ...b2, profile: b2.profile.map((p, i) => (i === 0 ? { ...p, taler: 9 } : p)) };
    await a.schreiben(b3, { ...keineAenderung(), profile: new Set([p0.id]) });
    expect(geschrieben.at(-1)).toBe(`${profilDatei(p0.id)}.a.json`);
    expect((await new TeilAblage(d).laden(() => schulBestand())).bestand.profile[0]?.taler).toBe(9);
  });
  it('halb geschriebenes Fach: der ältere Stand bleibt lesbar', async () => {
    const d = new SpeicherDateien();
    const { b } = mitKlasse(1);
    const a = new TeilAblage(d);
    await a.schreiben(b, alleAenderungen());
    const p0 = b.profile[0] as Profil;
    await a.schreiben({ ...b, profile: [{ ...p0, taler: 7 }] }, { ...keineAenderung(), profile: new Set([p0.id]) });
    // Das neuere Fach ist abgeschnitten (Akku leer)
    const neu = `${profilDatei(p0.id)}.b.json`;
    d.daten.set(neu, (d.daten.get(neu) as string).slice(0, 30));
    const g = await new TeilAblage(d).laden(() => schulBestand());
    expect(g.bestand.profile[0]?.taler).toBe(0);
    expect(g.wiederhergestellt).toBe(false);
  });
  it('gelöschte Profile verschwinden, unlesbarer Kopf rettet die Profile', async () => {
    const d = new SpeicherDateien();
    const { b } = mitKlasse(3);
    const a = new TeilAblage(d);
    await a.schreiben(b, alleAenderungen());
    await a.schreiben({ ...b, profile: b.profile.slice(1) }, alleAenderungen());
    expect([...d.daten.keys()].filter((n) => n.startsWith(profilDatei((b.profile[0] as Profil).id)))).toEqual([]);
    for (const n of [...d.daten.keys()]) if (n.startsWith('kopf')) d.daten.set(n, '{kaputt');
    const g = await new TeilAblage(d).laden(() => schulBestand('neu'));
    expect(g.wiederhergestellt).toBe(true);
    expect(g.bestand.profile.map((p) => p.name).sort()).toEqual(['Kind 2', 'Kind 3']);
    // Unlesbare Dateien bleiben liegen
    expect([...d.daten.keys()].some((n) => n.startsWith('kopf'))).toBe(true);
  });
  it('Speicherplan mit Ablage: Funktion wird erst beim Schreiben ausgewertet, Änderungen werden gesammelt', async () => {
    const aufrufe: { profile: string[]; alle: boolean }[] = [];
    const plan = new Speicherplan({ schreiben: async (_b, a) => void aufrufe.push({ profile: [...a.profile].sort(), alle: a.alle }) }, 10_000);
    let ausgewertet = 0;
    const quelle = () => {
      ausgewertet++;
      return schulBestand();
    };
    plan.vormerken(quelle, { ...keineAenderung(), profile: new Set(['a']) });
    plan.vormerken(quelle, { ...keineAenderung(), profile: new Set(['b']) });
    expect(ausgewertet).toBe(0);
    await plan.sofort();
    expect(ausgewertet).toBe(1);
    expect(aufrufe).toEqual([{ profile: ['a', 'b'], alle: false }]);
  });
});

describe('Verschlüsselte Dateien', () => {
  it('Rundreise mit gzip; falsche PIN und veränderter Typ scheitern', async () => {
    const inhalt = { hallo: 'Welt', zahlen: Array.from({ length: 500 }, (_, i) => i) };
    const text = await verschluesseln(inhalt, 'ergebnisse', 'iPad 7', '472915', 5, 1000);
    expect(text).not.toContain('Welt');
    const u = leseUmschlag(text);
    expect(u.von).toBe('iPad 7');
    expect(u.gz).toBe(true);
    expect(await entschluesseln(u, '472915')).toEqual(inhalt);
    await expect(entschluesseln(u, '472916')).rejects.toBeInstanceOf(FalschePin);
    await expect(entschluesseln({ ...u, typ: 'klassenliste' }, '472915')).rejects.toBeInstanceOf(FalschePin);
  });
  it('erkennt fremde und beschädigte Dateien', () => {
    expect(() => leseUmschlag('kein json')).toThrow(/keine Datei/);
    expect(() => leseUmschlag('{"art":"etwas"}')).toThrow(/keine Datei/);
    expect(() => leseUmschlag('{"art":"mathe-jahrmarkt-schule","v":2}')).toThrow(/neueren/);
    expect(() => leseUmschlag('{"art":"mathe-jahrmarkt-schule","v":1,"typ":"x"}')).toThrow(/beschädigt/);
  });
});

describe('Klassenliste verteilen', () => {
  it('übernimmt Klassen, Namen und Bildpasswörter auf einem leeren iPad', () => {
    const { b } = mitKlasse(5);
    const liste = pruefeKlassenliste(JSON.parse(JSON.stringify(klassenlisteErstellen(b, b.schule!.klassen.map((k) => k.id)))));
    const r = klassenlisteUebernehmen(schulBestand('g2'), liste, 1);
    expect(r.neu).toBe(5);
    expect(r.klassenNeu).toBe(1);
    expect(r.bestand.profile.map((p) => [p.id, p.passwort])).toEqual(b.profile.map((p) => [p.id, p.passwort]));
    expect(r.bestand.schule?.geraet.id).toBe('g2');
  });
  it('erhält Fortschritt, legt gleichnamige Kinder derselben Klasse zusammen, Figur nur, wenn hier noch keine gewählt', () => {
    const { b } = mitKlasse(2);
    // Auf dem zweiten iPad wurden dieselbe Klasse und ein gleichnamiges Kind getrennt angelegt und schon gespielt
    let hier = klasseAnlegen(schulBestand('g2'), 'kHier', '4A');
    hier = schuelerAnlegen(hier, 'kHier', ['Kind 1'], () => 'pHier', createRng(5), 1).bestand;
    hier = { ...hier, profile: hier.profile.map((p) => ({ ...p, taler: 33, figurGewaehlt: true, figur: 'eule' as const })) };
    const quelle = { ...b, profile: b.profile.map((p) => ({ ...p, figurGewaehlt: true, figur: 'igel' as const })) };
    const r = klassenlisteUebernehmen(hier, pruefeKlassenliste(klassenlisteErstellen(quelle, [b.schule!.klassen[0]!.id])), 1);
    expect(r.klassenNeu).toBe(0);
    expect(r.aktualisiert).toBe(1);
    expect(r.neu).toBe(1);
    const kind1 = r.bestand.profile.find((p) => p.name === 'Kind 1') as Profil;
    expect(kind1.id).toBe(b.profile[0]?.id);
    expect(kind1.taler).toBe(33);
    expect(kind1.klasse).toBe('kHier');
    expect(kind1.figur).toBe('eule');
    expect(kind1.passwort).toEqual(b.profile[0]?.passwort);
    const kind2 = r.bestand.profile.find((p) => p.name === 'Kind 2') as Profil;
    expect(kind2.figur).toBe('igel');
  });
  it('überträgt Subtraktionsverfahren, Spielzeit und Bestenliste', () => {
    const { b } = mitKlasse(1);
    const q = { ...b, einstellungen: { ...b.einstellungen, subtraktion: 'ergaenzen-auffuellen' as const, spielzeitMin: 30 }, schule: { ...b.schule!, bestenliste: true } };
    const r = klassenlisteUebernehmen(schulBestand('g2'), pruefeKlassenliste(klassenlisteErstellen(q, [b.schule!.klassen[0]!.id])), 1);
    expect(r.bestand.einstellungen.subtraktion).toBe('ergaenzen-auffuellen');
    expect(r.bestand.einstellungen.spielzeitMin).toBe(30);
    expect(r.bestand.schule?.bestenliste).toBe(true);
  });
  it('verwirft unbrauchbare Einträge', () => {
    expect(() => pruefeKlassenliste({})).toThrow();
    const l = pruefeKlassenliste({
      klassen: [{ id: 'k1', name: '4a' }, { id: '../x', name: 'böse' }],
      profile: [
        { id: 'p1', name: 'Mia', klasse: 'k1', passwort: ['stern', 'eis', 'mond'] },
        { id: 'p2', name: 'Ohne Passwort', klasse: 'k1' },
        { id: 'p3', name: 'Fremde Klasse', klasse: 'k9', passwort: ['stern', 'eis', 'mond'] },
      ],
    });
    expect(l.klassen.map((k) => k.id)).toEqual(['k1']);
    expect(l.profile.map((p) => p.id)).toEqual(['p1']);
  });
});

describe('Ergebnisse einsammeln und auswerten', () => {
  function gespielt(p: Profil, start: number, richtig: number): Profil {
    const r = rundeVerbuchen(p, { bude: 'dartbude', stufe: 'bronze', start, dauerMs: 120_000, punkte: richtig * 100, richtig, gesamt: 10 }).profil;
    const ev = Array.from({ length: 10 }, (_, i) => ereignis(start + i * 1000, i < richtig));
    return { ...r, ereignisse: [...r.ereignisse, ...ev] };
  }

  it('sammelt ein, ersetzt neuere desselben iPads, lehnt eigene und ältere ab', () => {
    const { b: a } = mitKlasse(2, 'gA');
    const lehrer = schulBestand('gL');
    const e1 = ergebnisseErstellen(a, 100);
    const r1 = ergebnisseEinsammeln(lehrer, JSON.parse(JSON.stringify(e1)), 200);
    expect(r1.kinder).toBe(2);
    expect(r1.ersetzt).toBe(false);
    const r2 = ergebnisseEinsammeln(r1.bestand, ergebnisseErstellen(a, 300), 400);
    expect(r2.ersetzt).toBe(true);
    expect(r2.bestand.schule?.gesammelt).toHaveLength(1);
    expect(() => ergebnisseEinsammeln(r2.bestand, e1, 500)).toThrow(/neuere/);
    expect(() => ergebnisseEinsammeln(a, ergebnisseErstellen(a, 600), 700)).toThrow(/dieses iPads/);
  });

  it('führt ein Kind von zwei iPads zusammen: Runden und Antworten einmal, Medaillen vereint', () => {
    const jetzt = 100 * TAG;
    const { b } = mitKlasse(1, 'gA');
    const kind = b.profile[0] as Profil;
    const aufA = gespielt(kind, jetzt - 2 * TAG, 9);
    const aufB = gespielt(kind, jetzt - 1 * TAG, 6);
    const lehrer = ergebnisseEinsammeln({ ...schulBestand('gL'), schule: { ...schulBestand('gL').schule!, klassen: b.schule!.klassen } }, ergebnisseErstellen({ ...b, profile: [aufB], schule: { ...b.schule!, geraet: { id: 'gB', name: 'iPad 2' } } }, jetzt), jetzt).bestand;
    // Lehrer-iPad hat das Kind selbst nicht; dazu die Ergebnisse von iPad A doppelt (einmal hier lokal)
    const kinder = zusammenfuehren([aufA], lehrer.schule!.klassen, [...lehrer.schule!.gesammelt, { ...lehrer.schule!.gesammelt[0]!, geraetId: 'gA2', geraetName: 'iPad 1', profile: [aufA] }], 'Lehrer-iPad');
    expect(kinder).toHaveLength(1);
    const k = kinder[0]!;
    expect(k.runden).toHaveLength(2);
    expect(k.ereignisse).toHaveLength(20);
    expect(k.fortschritt.dartbude?.bronze?.geschafft).toBe(true);
    expect(k.geraete).toEqual(['Lehrer-iPad', 'iPad 2', 'iPad 1']);
    expect(k.klassenName).toBe('4a');
    const u = klassenuebersicht(kinder, jetzt);
    expect(u.zeilen[0]?.minuten7).toBe(4);
    expect(u.zeilen[0]?.medaillen.bronze).toBe(1);
    expect(u.zeilen[0]?.quote).toBeCloseTo(15 / 20);
    expect(u.fehler[0]?.art).toBe('nachbaraufgabe');
    expect(u.fehler[0]?.anzahl).toBe(5);
  });

  it('Kompetenz-Einschätzung erst ab genug Aufgaben; Berichte enthalten Tabelle und Hinweis', () => {
    const jetzt = 100 * TAG;
    const { b } = mitKlasse(2);
    let p = b.profile[0] as Profil;
    for (let tag = 5; tag >= 1; tag--) p = gespielt(p, jetzt - tag * TAG, 10);
    const kinder = zusammenfuehren([p, b.profile[1] as Profil], b.schule!.klassen, []);
    const u = klassenuebersicht(kinder, jetzt);
    const z = u.zeilen.find((x) => x.kind.id === p.id)!;
    expect(z.kompetenzen.kopfrechnen).toBe('sicher');
    expect(u.zeilen.find((x) => x.kind.id !== p.id)?.kompetenzen.kopfrechnen).toBe('kennenlernen');
    expect(u.verteilung.kopfrechnen).toEqual({ sicher: 1, aufGutemWeg: 0, weiterUeben: 0, kennenlernen: 1 });
    expect(u.ohneAktivitaet).toEqual(['Kind 2']);
    const kb = klassenbericht('4a', u, jetzt, 'Daten von diesem iPad');
    const tabelle = kb.find((x) => x.art === 'tabelle');
    expect(tabelle && tabelle.art === 'tabelle' && tabelle.zeilen).toHaveLength(2);
    expect(kb.at(-1)?.art).toBe('hinweis');
    const sb = schuelerbericht(kinder.find((k) => k.id === p.id)!, jetzt);
    expect(JSON.stringify(sb)).toContain('Kopfrechnen');
  });
});
