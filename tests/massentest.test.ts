/**
 * Massentest (seit 0.20.1): alle Aufgaben-Generatoren mit vielen Zufallszahlen – genau eine richtige Option,
 * keine doppelten Werte oder Beschriftungen, keine NaN/undefined in Texten und Daten.
 */
import { describe, expect, it } from 'vitest';
import { BUDEN_DEFINITIONEN } from '../src/buden';
import { STUFEN } from '../src/domain/buden';
import { createRng } from '../src/domain/rng';
import { blitzAufgabe } from '../src/domain/blitz';
import { knobelRunde, raetselDerWoche } from '../src/domain/knobel';
import { forscheraufgabe } from '../src/domain/forscher';
import { erzeugeSperrfrage } from '../src/domain/elternsperre';

const SCHLECHT = /undefined|NaN|Infinity|\[object|null\b|\{\{|\$\{/;
const probleme: string[] = [];
function scanne(wert: unknown, pfad: string, wo: string) {
  if (typeof wert === 'number' && !Number.isFinite(wert)) probleme.push(`${wo}: ${pfad} = ${wert}`);
  else if (typeof wert === 'string' && SCHLECHT.test(wert)) probleme.push(`${wo}: ${pfad} = "${wert}"`);
  else if (Array.isArray(wert)) wert.forEach((x, i) => scanne(x, `${pfad}[${i}]`, wo));
  else if (wert && typeof wert === 'object') for (const [k, v] of Object.entries(wert)) scanne(v, `${pfad}.${k}`, wo);
}
function pruefe(a: any, wo: string) {
  scanne(a, 'a', wo);
  if (!Number.isFinite(a.antwort)) probleme.push(`${wo}: antwort ${a.antwort}`);
  const werte = (a.optionen ?? []).map((o: any) => o.wert);
  if (new Set(werte).size !== werte.length) probleme.push(`${wo}: doppelte Optionen ${werte} (${a.text})`);
  if (werte.some((w: number) => w < 0)) probleme.push(`${wo}: negative Option ${werte} (${a.text})`);
  if (a.eingabe !== 'ziffern') {
    const richtig = werte.filter((w: number) => w === a.antwort).length;
    if (richtig !== 1 && werte.length) probleme.push(`${wo}: ${richtig} richtige Optionen, antwort ${a.antwort}, ${werte} (${a.text})`);
    if (!werte.length && a.art !== 'schriftlich' && a.art !== 'tresor') probleme.push(`${wo}: keine Optionen (${a.art})`);
  }
  if (a.labels) {
    for (const w of werte) if (a.labels[w] === undefined) probleme.push(`${wo}: Label fehlt für ${w}`);
    const ls = werte.map((w: number) => a.labels[w]);
    if (new Set(ls).size !== ls.length) probleme.push(`${wo}: doppelte Beschriftung ${ls.join(' | ')} (${a.text})`);
  }
  if (!a.text?.trim() && !a.sprechtext?.trim()) probleme.push(`${wo}: kein Text`);
}

describe('Massentest aller Generatoren', () => {
  it('alle Buden, alle Stufen, viele Zufallszahlen', () => {
    let n = 0;
    for (const [id, def] of Object.entries(BUDEN_DEFINITIONEN)) {
      const g = def.gewichtung([]);
      for (const stufe of STUFEN)
        for (let s = 1; s <= 600; s++) {
          let a;
          try {
            a = def.erzeuge(stufe, createRng(s * 7919 + 13), g);
          } catch (e) {
            probleme.push(`${id}/${stufe}/${s}: Ausnahme ${e}`);
            continue;
          }
          n++;
          pruefe(a, `${id}/${stufe}/${s}`);
          if (s % 5 === 0) {
            try {
              pruefe(def.aehnlich(a, createRng(s)), `${id}/${stufe}/${s}/aehnlich`);
            } catch (e) {
              probleme.push(`${id}/${stufe}/${s}/aehnlich: Ausnahme ${e}`);
            }
          }
        }
      for (let s = 1; s <= 50; s++) pruefe(def.probe(createRng(s)), `${id}/probe/${s}`);
    }
    const gruppen = new Map<string, string[]>();
    for (const p of probleme) {
      const k = p.split('/')[0] + ' ' + p.replace(/^[^:]*: /, '').replace(/[0-9]+/g, '#').slice(0, 60);
      gruppen.set(k, [...(gruppen.get(k) ?? []), p]);
    }
    for (const [k, v] of gruppen) console.log(`${v.length}× ${k}\n   z. B. ${v[0]}`);
    console.log(`geprüft: ${n} Aufgaben, Probleme: ${probleme.length}`);
    expect(probleme.length).toBe(0);
  }, 600000);
});

const SCHLECHT2 = /undefined|NaN|Infinity|\[object|\bnull\b/;
const p2: string[] = [];
const scan2 = (w: unknown, wo: string): void => {
  if (typeof w === 'number' && !Number.isFinite(w)) p2.push(`${wo}: ${w}`);
  else if (typeof w === 'string' && SCHLECHT2.test(w)) p2.push(`${wo}: "${w}"`);
  else if (Array.isArray(w)) w.forEach((x, i) => scan2(x, `${wo}[${i}]`));
  else if (w && typeof w === 'object') for (const [k, v] of Object.entries(w)) scan2(v, `${wo}.${k}`);
};
describe('Massentest Zusatzspiele', () => {
  it('Blitz, Knobelzelt, Forscher, Elternsperre, Rätsel', () => {
    for (let s = 1; s < 3000; s++) {
      for (const st of ['leicht', 'mittel', 'schwer'] as const) {
        const a = blitzAufgabe(st, createRng(s));
        scan2(a, `blitz/${st}`);
        if (!Number.isInteger(a.antwort) || a.antwort < 0) p2.push(`blitz/${st}: ${a.text} = ${a.antwort}`);
      }
      if (s < 600) for (const st of [1, 2, 3] as const) scan2(knobelRunde(createRng(s), st), `knobel/${st}/${s}`);
      if (s < 600) for (const r of ['produkt', 'summeGerade', 'differenz', 'mauer', 'geschichten'] as const) {
        const f = forscheraufgabe(r, createRng(s));
        scan2(f, `forscher/${r}`);
      }
      const q = erzeugeSperrfrage(createRng(s));
      scan2(q, 'sperre');
    }
    for (let w = 1; w <= 53; w++) scan2(raetselDerWoche(`2026-W${String(w).padStart(2, '0')}`), `raetsel/${w}`);
    const k = [...new Set(p2.map((x) => x.replace(/[0-9]+/g, '#')))];
    console.log(k.slice(0, 20).join('\n'), '\nProbleme', p2.length);
    expect(p2.length).toBe(0);
  }, 300000);
});
