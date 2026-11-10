import { describe, expect, it } from 'vitest';
import { BUDEN_DEFINITIONEN } from '../src/buden';
import { MAX_FUNDSACHEN, MAX_PRO_ABHOLUNG, abholStapel, beantwortet, faellige, legeAb, naechsteRueckkehr, pruefeFundbuero, tagNach } from '../src/domain/fundbuero';
import { neuesProfil } from '../src/domain/profil';
import { createRng } from '../src/domain/rng';
import { Rundensteuerung } from '../src/domain/runde';
import { pruefeProfil } from '../src/services/datenbestand';

const rng = createRng(4);
const aufgabe = (bude = 'dartbude') => BUDEN_DEFINITIONEN[bude]!.erzeuge('bronze', rng, () => 1);
const T0 = new Date('2026-11-09T15:00:00').getTime();
const TAG = 24 * 3600 * 1000;

describe('Fundbüro', () => {
  it('Fehler kommen am nächsten Tag wieder, dann nach 3 und 7 Tagen, dann sind sie erledigt', () => {
    let l = legeAb([], 'dartbude', 'bronze', aufgabe(), T0);
    expect(faellige(l, T0)).toHaveLength(0);
    expect(l[0]!.faellig).toBe(tagNach(T0, 1));
    expect(faellige(l, tagNach(T0, 1))).toHaveLength(1);
    const id = l[0]!.id;
    let t = tagNach(T0, 1) + 3600_000;
    let r = beantwortet(l, id, true, t);
    expect(r.liste[0]!.faellig).toBe(tagNach(t, 3));
    t = r.liste[0]!.faellig + 1000;
    r = beantwortet(r.liste, id, true, t);
    expect(r.liste[0]!.faellig).toBe(tagNach(t, 7));
    r = beantwortet(r.liste, id, true, r.liste[0]!.faellig);
    expect(r.erledigt).toBe(true);
    expect(r.liste).toHaveLength(0);
    // Fehler beim Wiederholen: zurück ins erste Fach
    l = legeAb([], 'dartbude', 'bronze', aufgabe(), T0);
    r = beantwortet(l, l[0]!.id, true, T0 + TAG);
    r = beantwortet(r.liste, l[0]!.id, false, T0 + 5 * TAG);
    expect(r.liste[0]!.fach).toBe(0);
    expect(r.liste[0]!.faellig).toBe(tagNach(T0 + 5 * TAG, 1));
  });
  it('dieselbe Aufgabe nur einmal, höchstens 40 Sachen, gebündelt nach Bude und Stufe', () => {
    const a = aufgabe();
    let l = legeAb([], 'dartbude', 'bronze', a, T0);
    l = legeAb(l, 'dartbude', 'bronze', a, T0 + 1000);
    expect(l).toHaveLength(1);
    for (let i = 0; i < 60; i++) l = legeAb(l, i % 2 ? 'dartbude' : 'kasse', 'bronze', aufgabe(i % 2 ? 'dartbude' : 'kasse'), T0 + i);
    expect(l.length).toBeLessThanOrEqual(MAX_FUNDSACHEN);
    const s = abholStapel(l, T0 + 2 * TAG);
    expect(s.map((x) => x.bude).sort()).toEqual(['dartbude', 'kasse']);
    expect(s.every((x) => x.sachen.length <= MAX_PRO_ABHOLUNG)).toBe(true);
    expect(naechsteRueckkehr(l, T0)).toBe(tagNach(T0, 1));
  });
  it('Runde mit Vorgaben hat genau diese Aufgaben', () => {
    const def = BUDEN_DEFINITIONEN.dartbude!;
    const vorgaben = [aufgabe(), aufgabe(), aufgabe()];
    const r = new Rundensteuerung({ bude: 'dartbude', stufe: 'bronze', rng, erzeuge: def.erzeuge, aehnlich: def.aehnlich, gewichtung: () => 1, vorgaben });
    expect(r.anzahl).toBe(3);
    for (const v of vorgaben) {
      expect(r.aktuelle).toBe(v);
      r.antworte(v.antwort, 3000);
      r.weiter();
    }
    expect(r.aktuellePhase).toBe('fertig');
  });
  it('wird beim Laden geprüft', () => {
    const p = neuesProfil('p', 'Alex', 'fuchs', 0);
    const l = legeAb([], 'dartbude', 'bronze', aufgabe(), T0);
    const roh = JSON.parse(JSON.stringify({ ...p, fundbuero: [...l, { id: 'x', bude: 'gibtsnicht', stufe: 'bronze', fach: 0, faellig: 1, aufgabe: l[0]!.aufgabe }, { id: 'y' }] }));
    expect(pruefeProfil(roh)?.fundbuero).toHaveLength(1);
    expect(pruefeFundbuero('kaputt')).toEqual([]);
    expect(pruefeProfil(JSON.parse(JSON.stringify({ ...p, fundbuero: undefined })))?.fundbuero).toEqual([]);
  });
});

import { DUELL_AUFGABEN, duellAufgaben, duellSieger } from '../src/domain/geschwister';
describe('Geschwister-Duell', () => {
  it('gleicher Startwert, gleiche Aufgaben; keine doppelt', () => {
    const a = duellAufgaben('mittel', 42);
    expect(a).toEqual(duellAufgaben('mittel', 42));
    expect(a).toHaveLength(DUELL_AUFGABEN);
    expect(new Set(a.map((x) => x.text)).size).toBe(DUELL_AUFGABEN);
  });
  it('erst Treffer, dann Zeit, knapp ist unentschieden', () => {
    expect(duellSieger({ richtig: 8, ms: 90000 }, { richtig: 7, ms: 20000 })).toBe(0);
    expect(duellSieger({ richtig: 8, ms: 40000 }, { richtig: 8, ms: 30000 })).toBe(1);
    expect(duellSieger({ richtig: 8, ms: 30000 }, { richtig: 8, ms: 30400 })).toBe(-1);
  });
});
