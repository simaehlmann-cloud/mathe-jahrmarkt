import { describe, expect, it } from 'vitest';
import type { CheckErgebnis } from '../../src/domain/check';
import { neuesProfil, type Profil, type Runde } from '../../src/domain/profil';
import { createRng } from '../../src/domain/rng';
import { leererBestand, migriere, type Datenbestand } from '../../src/services/datenbestand';
import { klassenbericht, klassenuebersicht, schuelerbericht, zusammenfuehren } from '../../src/schule/domain/analyse';
import { AuftragsFehler, auftragAnlegen, auftragEntfernen, auftragErledigt, auftragStand, auftraegeFuer } from '../../src/schule/domain/auftraege';
import { ergebnisseErstellen, ergebnisseEinsammeln, klassenlisteErstellen, klassenlisteUebernehmen, pruefeKlassenliste } from '../../src/schule/domain/austausch';
import { alleChecks, entwicklung, mitCheckVerlauf } from '../../src/schule/domain/checkverlauf';
import { inselZugang } from '../../src/schule/domain/insel';
import '../../src/schule/domain/pruefen';
import { INSEL_MINUTEN, leereSchule } from '../../src/schule/domain/schuldaten';
import { geraetLeeren, klasseAnlegen, klasseLoeschen, klasseOhnePasswort, schuelerAnlegen } from '../../src/schule/domain/verwaltung';
import { schulErweiterung } from '../../src/schule/app/erweiterung';
import { elternbrief, kurzanleitung } from '../../src/schule/hilfe';

const MIN = 60_000;
const TAG = 24 * 60 * MIN;
let n = 0;
const id = (v: string) => `${v}${++n}`;

function klasse(kinder: number, geraet = 'g1'): { b: Datenbestand; k: string } {
  const k = id('k');
  let b = klasseAnlegen(leererBestand(leereSchule(geraet)), k, '4a');
  b = schuelerAnlegen(b, k, Array.from({ length: kinder }, (_, i) => `Kind ${i + 1}`), () => id('p'), createRng(3), 1).bestand;
  return { b, k };
}

const runde = (bude: string, stufe: Runde['stufe'], start: number): Runde => ({ bude, stufe, start, dauerMs: 2 * MIN, punkte: 900, richtig: 9, gesamt: 10 });
const check = (am: number, zahlen: [number, number], rechnen: [number, number]): CheckErgebnis => ({ am, bereiche: { zahlen, rechnen }, empfehlung: [] });

describe('Bauinsel im Unterricht', () => {
  const p = { runden: [runde('dartbude', 'bronze', 100 * MIN)] };
  it('frei, aus und nach jeder Runde für 10 Minuten', () => {
    expect(inselZugang('frei', { runden: [] }, 0).offen).toBe(true);
    expect(inselZugang('aus', p, 101 * MIN).offen).toBe(false);
    expect(inselZugang('nachRunde', { runden: [] }, 0).offen).toBe(false);
    const ende = 102 * MIN;
    const offen = inselZugang('nachRunde', p, ende + 5 * MIN);
    expect(offen).toEqual({ offen: true, bisMs: ende + INSEL_MINUTEN * MIN });
    expect(inselZugang('nachRunde', p, ende + INSEL_MINUTEN * MIN + 1).offen).toBe(false);
  });
  it('eine Runde aus der Zukunft (falsche Uhr) öffnet nichts', () => {
    expect(inselZugang('nachRunde', { runden: [runde('dartbude', 'bronze', 10 * TAG)] }, 1 * TAG).offen).toBe(false);
  });
  it('die Nahtstelle liest die Regel aus den Schuldaten', () => {
    const { b } = klasse(1);
    const kind = b.profile[0] as Profil;
    expect(schulErweiterung.inselZugang(b, kind, 0).offen).toBe(false);
    expect(schulErweiterung.inselZugang({ ...b, schule: { ...b.schule!, bauinsel: 'frei' } }, kind, 0).offen).toBe(true);
  });
});

describe('Aufträge der Lehrkraft', () => {
  it('für die Klasse oder einzelne Kinder; erledigt nach einer passenden Runde nach dem Erteilen', () => {
    const { b, k } = klasse(3);
    const [a, c] = b.profile as [Profil, Profil, Profil];
    let s = auftragAnlegen(b.schule!, { id: 'a1', klasse: k, fuer: null, bude: 'dartbude', stufe: 'silber' }, 1000);
    s = auftragAnlegen(s, { id: 'a2', klasse: k, fuer: [c.id], bude: null, stufe: null }, 1000);
    const bb = { ...b, schule: s };
    expect(auftraegeFuer(bb, a).map((x) => x.id)).toEqual(['a1']);
    expect(auftraegeFuer(bb, c).map((x) => x.text).sort()).toEqual(['Dartbude, Silber', 'Jahrmarkt-Check']);
    const a1 = s.auftraege[0]!;
    // Vor dem Erteilen gespielt, falsche Stufe, dann passend
    expect(auftragErledigt(a1, { ...a, runden: [runde('dartbude', 'silber', 500)] })).toBe(false);
    expect(auftragErledigt(a1, { ...a, runden: [runde('dartbude', 'bronze', 2000)] })).toBe(false);
    expect(auftragErledigt(a1, { ...a, runden: [runde('dartbude', 'silber', 2000)] })).toBe(true);
    const a2 = s.auftraege[1]!;
    expect(auftragErledigt(a2, { ...c, check: check(999, [1, 2], [1, 2]) })).toBe(false);
    expect(auftragErledigt(a2, { ...c, check: check(1001, [1, 2], [1, 2]) })).toBe(true);
    // Offene zuerst
    const fertig = { ...c, runden: [runde('dartbude', 'silber', 2000)] };
    expect(auftraegeFuer(bb, fertig).map((x) => [x.id, x.erledigt])).toEqual([
      ['a2', false],
      ['a1', true],
    ]);
    const stand = auftragStand(a1, [{ ...a, name: 'A' }, { ...fertig, name: 'C' }, { ...(b.profile[1] as Profil), name: 'B' }]);
    expect(stand.erledigt).toBe(1);
    expect(stand.kinder).toHaveLength(3);
    expect(auftragEntfernen(s, 'a1').auftraege.map((x) => x.id)).toEqual(['a2']);
  });
  it('lehnt unbrauchbare Aufträge ab', () => {
    const { b, k } = klasse(1);
    expect(() => auftragAnlegen(b.schule!, { id: 'x', klasse: 'gibtsnicht', fuer: null, bude: 'dartbude', stufe: null }, 1)).toThrow(AuftragsFehler);
    expect(() => auftragAnlegen(b.schule!, { id: 'x', klasse: k, fuer: [], bude: 'dartbude', stufe: null }, 1)).toThrow(/mindestens ein Kind/);
    expect(() => auftragAnlegen(b.schule!, { id: 'x', klasse: k, fuer: null, bude: 'erfunden', stufe: null }, 1)).toThrow(/Bude/);
  });
  it('überstehen Speichern und Prüfen; Aufträge gelöschter Klassen fallen weg', () => {
    const { b, k } = klasse(2);
    const s = auftragAnlegen(b.schule!, { id: 'a1', klasse: k, fuer: null, bude: 'dartbude', stufe: null }, 5);
    const geladen = migriere(JSON.parse(JSON.stringify({ ...b, schule: s })));
    expect(geladen.schule?.auftraege).toHaveLength(1);
    expect(klasseLoeschen({ ...b, schule: s }, k, false).schule?.auftraege).toEqual([]);
    expect(geraetLeeren({ ...b, schule: s }).schule?.auftraege).toEqual([]);
    const kaputt = migriere(JSON.parse(JSON.stringify({ ...b, schule: { ...s, auftraege: [{ id: 'x', klasse: k, ziel: { art: 'zaubern' } }, { id: 'y', klasse: 'fremd', fuer: null, ziel: { art: 'check' } }] } })));
    expect(kaputt.schule?.auftraege).toEqual([]);
  });
});

describe('Klassenliste trägt Aufträge, Bauinsel-Regel und „ohne Passwort“', () => {
  it('ersetzt die Aufträge der übernommenen Klasse, behält andere', () => {
    const { b, k } = klasse(2);
    let quelle = klasseOhnePasswort(b, k, true);
    quelle = { ...quelle, schule: { ...auftragAnlegen(quelle.schule!, { id: 'a1', klasse: k, fuer: null, bude: 'dartbude', stufe: null }, 5), bauinsel: 'aus' } };
    const liste = pruefeKlassenliste(JSON.parse(JSON.stringify(klassenlisteErstellen(quelle, [k]))));
    // Zielgerät hat dieselbe Klasse (andere Kennung) mit altem Auftrag und eine weitere Klasse mit eigenem Auftrag
    let ziel = klasseAnlegen(klasseAnlegen(leererBestand(leereSchule('g2')), 'kZiel', '4A'), 'kAnders', '4b');
    ziel = { ...ziel, schule: auftragAnlegen(auftragAnlegen(ziel.schule!, { id: 'alt', klasse: 'kZiel', fuer: null, bude: 'dartbude', stufe: null }, 1), { id: 'b1', klasse: 'kAnders', fuer: null, bude: null, stufe: null }, 1) };
    const r = klassenlisteUebernehmen(ziel, liste, 10);
    expect(r.bestand.schule?.auftraege.map((a) => [a.id, a.klasse]).sort()).toEqual([
      ['a1', 'kZiel'],
      ['b1', 'kAnders'],
    ]);
    expect(r.bestand.schule?.bauinsel).toBe('aus');
    expect(r.bestand.schule?.klassen.find((x) => x.id === 'kZiel')?.ohnePasswort).toBe(true);
    // Ausschalten wandert auch
    const aus = pruefeKlassenliste(klassenlisteErstellen(klasseOhnePasswort(quelle, k, false), [k]));
    expect(klassenlisteUebernehmen(r.bestand, aus, 11).bestand.schule?.klassen.find((x) => x.id === 'kZiel')?.ohnePasswort).toBeUndefined();
  });
});

describe('Vorher-nachher mit dem Jahrmarkt-Check', () => {
  it('Verlauf ohne Doppelte, höchstens 8', () => {
    let p = neuesProfil('p', 'Mia', 'fuchs', 0);
    for (let i = 1; i <= 10; i++) p = mitCheckVerlauf({ ...p, check: check(i, [i % 3, 3], [1, 2]) });
    p = mitCheckVerlauf(p);
    expect(p.checkVerlauf?.map((c) => c.am)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(alleChecks(p)).toHaveLength(8);
    const geladen = migriere(JSON.parse(JSON.stringify({ ...leererBestand(leereSchule('g')), profile: [p] })));
    expect(geladen.profile[0]?.checkVerlauf).toHaveLength(8);
  });
  it('Entwicklung je Bereich: erster gegen letzten Check, nur Kinder mit zwei Checks', () => {
    const a = { check: check(30, [4, 4], [3, 4]), checkVerlauf: [check(10, [2, 4], [1, 4])] };
    const b = { check: check(20, [2, 4], [2, 4]), checkVerlauf: [] };
    const e = entwicklung([a, b]);
    expect(e.kinder).toBe(1);
    expect(e.bereiche).toEqual([
      { bereich: 'zahlen', vorher: 0.5, nachher: 1 },
      { bereich: 'rechnen', vorher: 0.25, nachher: 0.75 },
    ]);
  });
  it('Berichte zeigen die Entwicklung; eingesammelte Checks werden zusammengeführt', () => {
    const { b } = klasse(1, 'gA');
    const kind = { ...(b.profile[0] as Profil), checkVerlauf: [check(10, [1, 4], [1, 4])], check: check(10, [1, 4], [1, 4]) };
    const spaeter = { ...kind, check: check(50 * TAG, [4, 4], [3, 4]), checkVerlauf: [check(50 * TAG, [4, 4], [3, 4])] };
    const lehrer = ergebnisseEinsammeln(leererBestand({ ...leereSchule('gL'), klassen: b.schule!.klassen }), ergebnisseErstellen({ ...b, profile: [spaeter], schule: { ...b.schule!, geraet: { id: 'gB', name: 'iPad 2' } } }, 60 * TAG), 60 * TAG).bestand;
    const kinder = zusammenfuehren([kind], lehrer.schule!.klassen, lehrer.schule!.gesammelt);
    expect(alleChecks(kinder[0]!).map((c) => c.am)).toEqual([10, 50 * TAG]);
    const text = JSON.stringify(klassenbericht('4a', klassenuebersicht(kinder, 60 * TAG), 60 * TAG, 'x'));
    expect(text).toContain('Entwicklung im Jahrmarkt-Check');
    expect(text).toContain('+75 Punkte');
    expect(JSON.stringify(schuelerbericht(kinder[0]!, 60 * TAG))).toContain('2 Checks');
  });
});

describe('Hilfe und Elternbrief', () => {
  it('Kurzanleitung beschreibt alle Schritte', () => {
    const t = JSON.stringify(kurzanleitung());
    for (const w of ['Lehrerbereich einrichten', 'Kärtchen drucken', 'Klassenliste weitergeben', 'Ergebnisse weitergeben', 'Gezielt üben lassen', 'Neues Schuljahr', 'ohne Passwort']) expect(t).toContain(w);
  });
  it('Elternbrief setzt die Angaben ein und erklärt den Datenschutz', () => {
    const t = JSON.stringify(elternbrief({ schule: 'GS am Park', klasse: '4a', lehrkraft: 'Frau Muster', datum: '1. Dezember 2026' }));
    for (const w of ['GS am Park', 'der Klasse 4a', 'Frau Muster', 'keine Werbung', 'iPads der Schule']) expect(t).toContain(w);
    expect(JSON.stringify(elternbrief({ schule: '', klasse: '', lehrkraft: '', datum: '' }))).toContain('unserer Klasse');
  });
});
