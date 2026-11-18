import { describe, expect, it } from 'vitest';
import {
  MAX_SCHRITT_MS,
  leereSpielzeit,
  minutenHeute,
  mitNachschlag,
  pauseFaellig,
  pausenText,
  pruefeSpielzeit,
  zaehleSpielzeit,
} from '../src/domain/spielzeit';
import { pruefeEinstellungen, standardEinstellungen } from '../src/services/datenbestand';
import { fortschrittZurueckgesetzt, neuesProfil } from '../src/domain/profil';

const MIN = 60_000;
const tag = '2026-11-18';

function spiele(minuten: number, sz = leereSpielzeit(), t = tag) {
  let s = sz;
  for (let i = 0; i < minuten * 2; i++) s = zaehleSpielzeit(s, t, 30_000);
  return s;
}

describe('Spielzeit-Erinnerung', () => {
  it('ist standardmäßig an (20 Minuten)', () => {
    expect(standardEinstellungen().spielzeitMin).toBe(20);
    expect(pruefeEinstellungen({}).spielzeitMin).toBe(20);
    expect(pruefeEinstellungen({ spielzeitMin: 0 }).spielzeitMin).toBe(0);
    expect(pruefeEinstellungen({ spielzeitMin: 7 }).spielzeitMin).toBe(20);
  });

  it('zählt je Tag und beginnt am neuen Tag von vorn', () => {
    const s = spiele(19);
    expect(minutenHeute(s, tag)).toBe(19);
    expect(pauseFaellig(s, tag, 20)).toBe(false);
    const morgen = zaehleSpielzeit(s, '2026-11-19', 30_000);
    expect(morgen.ms).toBe(30_000);
    expect(minutenHeute(s, '2026-11-19')).toBe(0);
  });

  it('schlägt nach der Grenze eine Pause vor, nie wenn aus', () => {
    const s = spiele(20);
    expect(pauseFaellig(s, tag, 20)).toBe(true);
    expect(pauseFaellig(s, tag, 0)).toBe(false);
    expect(pauseFaellig(s, '2026-11-19', 20)).toBe(false);
  });

  it('„Noch 5 Minuten“ verschiebt ab jetzt – auch wenn die Runde länger dauerte', () => {
    let s = spiele(27);
    expect(pauseFaellig(s, tag, 20)).toBe(true);
    s = mitNachschlag(s, tag);
    expect(pauseFaellig(s, tag, 20)).toBe(false);
    s = spiele(4.5, s);
    expect(pauseFaellig(s, tag, 20)).toBe(false);
    s = spiele(0.5, s);
    expect(pauseFaellig(s, tag, 20)).toBe(true);
    expect(s.nachschlag).toBe(1);
  });

  it('zählt keine langen Lücken (Gerät schlief)', () => {
    expect(zaehleSpielzeit(leereSpielzeit(), tag, 3_600_000).ms).toBe(MAX_SCHRITT_MS);
    expect(zaehleSpielzeit(leereSpielzeit(), tag, -5).ms).toBe(0);
  });

  it('prüft gespeicherte Daten', () => {
    expect(pruefeSpielzeit(null)).toEqual(leereSpielzeit());
    expect(pruefeSpielzeit({ tag: 'x', ms: 5 })).toEqual(leereSpielzeit());
    expect(pruefeSpielzeit({ tag, ms: 5 * MIN, nachschlag: 1, erinnernAb: 25 * MIN })).toEqual({ tag, ms: 5 * MIN, nachschlag: 1, erinnernAb: 25 * MIN });
    expect(pruefeSpielzeit({ tag, ms: -1, nachschlag: 1.5 })).toEqual({ tag, ms: 0, nachschlag: 0, erinnernAb: 0 });
  });

  it('Zurücksetzen des Fortschritts setzt die Spielzeit nicht zurück', () => {
    const p = { ...neuesProfil('a', 'Mia', 'fuchs', 0), spielzeit: spiele(25) };
    expect(fortschrittZurueckgesetzt(p).spielzeit.ms).toBe(25 * MIN);
  });

  it('Texte sind freundlich und nennen die Minuten', () => {
    expect(pausenText('Mia', 20, 0)).toContain('20 Minuten');
    expect(pausenText('Mia', 25, 1)).toContain('25 Minuten');
  });
});
