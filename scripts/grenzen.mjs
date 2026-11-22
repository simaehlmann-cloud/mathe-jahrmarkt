#!/usr/bin/env node
/**
 * Grenze zwischen Familien-App und Schulversion prüfen, damit Fehler der einen Ausgabe die andere nicht treffen:
 *
 * 1. Quelltext: Außerhalb von src/schule/ darf nichts zur Laufzeit aus src/schule/ importieren – erlaubt sind nur
 *    `import type` (verschwindet beim Bauen) und dynamische Importe in einem Zweig `__AUSGABE__ === 'schule'`
 *    (den der Build der Familien-App ganz weglässt). Die Schulversion darf die gemeinsame App nutzen.
 * 2. Bundle (nach `npm run build`): Die Familien-App enthält keinen Code der Schulversion; die Schulversion
 *    enthält ihn. Welche Ausgabe gebaut wurde, sagt VITE_AUSGABE (Standard: privat).
 *
 *   node scripts/grenzen.mjs            # nur Quelltext
 *   node scripts/grenzen.mjs --bundle   # zusätzlich dist/ prüfen
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const wurzel = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SCHULE = join(wurzel, 'src', 'schule');
let fehler = 0;
let pruefungen = 0;
const ok = (b, text) => {
  pruefungen++;
  if (!b) {
    fehler++;
    console.error(`✗ ${text}`);
  }
};

const dateien = (ordner) =>
  readdirSync(ordner).flatMap((n) => {
    const p = join(ordner, n);
    return statSync(p).isDirectory() ? dateien(p) : /\.(ts|svelte|js|mjs)$/.test(n) ? [p] : [];
  });

/* 1. Quelltext */
const IMPORT = /\bimport\s+(type\s+)?(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const datei of dateien(join(wurzel, 'src'))) {
  if (datei.startsWith(SCHULE)) continue;
  const text = readFileSync(datei, 'utf8');
  const zeilen = text.split('\n');
  for (const m of text.matchAll(IMPORT)) {
    const ziel = m[2] ?? m[3];
    if (!ziel?.startsWith('.')) continue;
    if (!resolve(dirname(datei), ziel).startsWith(SCHULE)) continue;
    const zeile = text.slice(0, m.index).split('\n').length;
    const wo = `${relative(wurzel, datei)}:${zeile}`;
    if (m[1]) continue; // import type
    if (m[3]) {
      ok(/__AUSGABE__\s*===\s*'schule'/.test(zeilen[zeile - 1] ?? '') || /__AUSGABE__\s*===\s*'schule'/.test(zeilen.slice(Math.max(0, zeile - 12), zeile).join('\n')), `${wo}: dynamischer Import der Schulversion ohne Zweig __AUSGABE__ === 'schule'`);
      continue;
    }
    ok(false, `${wo}: Laufzeit-Import aus src/schule/ (${ziel}) – nur „import type“ oder dynamisch im Zweig __AUSGABE__ === 'schule'`);
  }
}

/* 2. Bundle */
if (process.argv.includes('--bundle')) {
  const ausgabe = process.env.VITE_AUSGABE ?? 'privat';
  const assets = join(wurzel, 'dist', 'assets');
  ok(existsSync(assets), 'dist/assets fehlt – erst bauen');
  if (existsSync(assets)) {
    const code = readdirSync(assets)
      .filter((n) => n.endsWith('.js'))
      .map((n) => readFileSync(join(assets, n), 'utf8'))
      .join('\n');
    // Merkmale, die nur im Code unter src/schule/ vorkommen
    const MERKMALE = ['Lehrerbereich einrichten', 'mathe-jahrmarkt-schule', 'Wiederherstellungscode', 'Klassenliste weitergeben', 'Schule verantwortlich im Sinne'];
    for (const m of MERKMALE) {
      if (ausgabe === 'schule') ok(code.includes(m), `Schulversion: „${m}“ fehlt im Bundle`);
      else ok(!code.includes(m), `Familien-App: Code der Schulversion im Bundle („${m}“)`);
    }
  }
}

console.log(`${pruefungen} Grenzprüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
