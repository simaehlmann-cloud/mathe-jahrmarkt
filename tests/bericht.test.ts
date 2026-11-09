import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { berichtDateiname, elternbericht, type Baustein } from '../src/domain/elternbericht';
import { neuesProfil, type Profil } from '../src/domain/profil';
import { berichtPdf } from '../src/services/pdf';

const TAG = 24 * 3600 * 1000;
const JETZT = Date.UTC(2026, 10, 9, 12);

function gespielt(): Profil {
  const p = neuesProfil('p1', 'Lea Müller', 'mensch', 0);
  for (let d = 0; d < 6; d++) {
    const t = JETZT - d * TAG;
    p.runden.push({ bude: 'dartbude', stufe: 'bronze', start: t, dauerMs: 6 * 60000, punkte: 500, richtig: 8, gesamt: 10 });
    for (let i = 0; i < 12; i++) p.ereignisse.push({ t: t + i, bude: 'dartbude', kompetenz: 'kopfrechnen', dimension: 'sicherheit', richtig: i % 4 !== 0, ms: 3000, gewertet: true });
  }
  p.fortschritt.dartbude = { bronze: { geschafft: true, rekord: 800, gespielt: 3, verlauf: [800] } };
  p.check = { am: JETZT - 2 * TAG, bereiche: { zahlen: [2, 2], rechnen: [1, 2], groessen: [0, 2] }, empfehlung: ['kasse', 'dartbude'] };
  return p;
}
const texte = (b: Baustein[]): string => JSON.stringify(b);

describe('Eltern-Bericht', () => {
  it('enthält Woche, Check, Fortschritt und mit Paket das Lernprofil', () => {
    const b = elternbericht(gespielt(), true, JETZT);
    expect(b[0]).toMatchObject({ art: 'titel', text: 'Mathe-Jahrmarkt: Bericht für Lea Müller' });
    const t = texte(b);
    expect(t).toContain('6 Runden, zusammen etwa 36 Minuten.');
    expect(t).toContain('2 von 2, sicher');
    expect(t).toContain('1 von 2, fast sicher');
    expect(t).toContain('0 von 2, üben');
    expect(t).toContain('Empfohlene Buden zum Weiterüben: Süßigkeitenkasse, Dartbude.');
    expect(t).toContain('"text":"Bronze"');
    expect(t).toContain('Lernprofil');
    expect(b.at(-1)?.art).toBe('hinweis');
  });
  it('ohne Paket kein Check-Ergebnis und kein Lernprofil', () => {
    const t = texte(elternbericht(gespielt(), false, JETZT));
    expect(t).toContain('Der Jahrmarkt-Check gehört zum Zusatzpaket.');
    expect(t).not.toContain('2 von 2');
    expect(t).not.toContain('"Lernprofil"');
  });
  it('neues Profil ohne Check', () => {
    const t = texte(elternbericht(neuesProfil('p', 'Ben', 'mensch', 0), true, JETZT));
    expect(t).toContain('0 Runden, zusammen weniger als eine Minute.');
    expect(t).toContain('hat den Jahrmarkt-Check noch nicht gemacht');
  });
  it('Dateiname ohne Umlaute', () => {
    expect(berichtDateiname('Lea Müller', JETZT)).toBe('mathe-jahrmarkt-bericht-lea-mueller-2026-11-09.pdf');
    expect(berichtDateiname('???', JETZT)).toBe('mathe-jahrmarkt-bericht-kind-2026-11-09.pdf');
  });
  it('erzeugt ein gültiges PDF', async () => {
    const bytes = await berichtPdf(elternbericht(gespielt(), true, JETZT));
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(3000);
    if (process.env.PDF_AUS) writeFileSync(process.env.PDF_AUS, bytes);
  });
});
