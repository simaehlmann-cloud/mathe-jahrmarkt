import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANBIETER, DATENSCHUTZ, IMPRESSUM } from '../src/app/rechtliches';

const html = (f: string) => readFileSync(new URL(`../docs/${f}`, import.meta.url), 'utf8');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

describe('Impressum und Datenschutz', () => {
  it('Impressum enthält die Pflichtangaben', () => {
    const t = JSON.stringify(IMPRESSUM);
    for (const w of [ANBIETER.inhaber, ANBIETER.strasse, ANBIETER.ort, ANBIETER.email, '§ 5 DDG', '§ 18 Abs. 2 MStV']) expect(t).toContain(w);
  });
  it('Datenschutz nennt Verantwortlichen, Speicherung, Kauf, Rechte', () => {
    const t = JSON.stringify(DATENSCHUTZ);
    for (const w of ['Art. 4 Nr. 7 DSGVO', 'lokalen Speicher', 'StoreKit', 'Art. 15 bis 21 DSGVO', 'keine Analyse']) expect(t).toContain(w);
  });
  it('die öffentlichen Seiten in docs/ sind auf dem Stand der App (sonst: npm run rechtliches)', () => {
    for (const [datei, liste] of [['impressum.html', IMPRESSUM], ['datenschutz.html', DATENSCHUTZ]] as const) {
      const h = html(datei);
      for (const a of liste) {
        expect(h, `${datei}: ${a.titel}`).toContain(esc(a.titel));
        for (const p of a.absaetze) expect(h, `${datei}: ${p.slice(0, 40)}`).toContain(esc(p).replace(/\n/g, '<br>'));
      }
    }
  });
});
