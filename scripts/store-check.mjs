#!/usr/bin/env node
/**
 * Prüft den Produktions-Build gegen die Regeln für Kinder-Apps
 * (Apple Kids-Kategorie 1.3 / 5.1.4, Google Play Families).
 * Läuft nach `npm run build`. Beendet sich mit Code 1 bei einem Verstoß.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const wurzel = new URL('..', import.meta.url).pathname;
const dist = join(wurzel, 'dist');
let fehler = 0;
let pruefungen = 0;
const ok = (bedingung, text) => {
  pruefungen++;
  if (!bedingung) {
    fehler++;
    console.error(`✗ ${text}`);
  }
};

ok(existsSync(join(dist, 'index.html')), 'dist/index.html fehlt – vorher `npm run build` ausführen');
if (fehler) process.exit(1);

const dateien = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js'));
const code = dateien.map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const pkg = JSON.parse(readFileSync(join(wurzel, 'package.json'), 'utf8'));

/* 1. Keine Analyse-, Werbe- oder Tracking-SDKs */
const VERBOTEN = /(firebase|analytics|admob|ads-|adjust|appsflyer|amplitude|mixpanel|sentry|onesignal|facebook|segment|branch|revenuecat|crashlytics|bugsnag|datadog)/i;
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  ok(!VERBOTEN.test(name), `Paket ${name} ist in einer Kinder-App nicht erlaubt (Analyse/Werbung/Tracking)`);
}

/* 2. Keine Adressen außer Dokumentations- und Namensraum-Texten */
const ERLAUBT = [/^https?:\/\/www\.w3\.org\//, /^https:\/\/svelte\.dev\/e\//, /^http:\/\/www\.pixijs\.com\/$/];
const urls = [...new Set(code.match(/https?:\/\/[a-zA-Z0-9./_-]+/g) ?? [])];
for (const u of urls) ok(ERLAUBT.some((r) => r.test(u)), `Unerwartete Adresse im Bundle: ${u}`);

/* 3. Content-Security-Policy erlaubt keine Verbindungen nach außen */
const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)?.[1] ?? '';
ok(csp.length > 0, 'index.html ohne Content-Security-Policy');
ok(/connect-src 'self'/.test(csp), "CSP: connect-src muss 'self' sein");
ok(!/https?:/.test(csp), 'CSP erlaubt externe Quellen');
ok(!/unsafe-eval/.test(csp), 'CSP erlaubt unsafe-eval');

/* 4. Der Testkauf darf nicht im Produktions-Build stecken */
ok(!code.includes('(Testkauf)'), 'Testkauf ist im Produktions-Build enthalten');

/* 5. Keine Links nach außen in der Oberfläche */
ok(!/window\.open\(|target="_blank"/.test(code.replace(/svelte\.dev[^"']*/g, '')), 'Externer Link gefunden – nur hinter der Elternsperre erlaubt');

/* 6. Elternsperre ist eingebaut und nicht abschaltbar */
const quellen = readdirSync(join(wurzel, 'src/app/screens')).map((f) => readFileSync(join(wurzel, 'src/app/screens', f), 'utf8'));
const eltern = readFileSync(join(wurzel, 'src/app/screens/Eltern.svelte'), 'utf8');
ok(/<Elternsperre /.test(eltern) && /\{#if !offen\}/.test(eltern), 'Elternbereich muss mit der Elternsperre beginnen');
ok(!quellen.some((q) => /elternsperre(Aus|Deaktiv|Abschalt)/i.test(q)), 'Die Elternsperre darf sich nicht abschalten lassen');
ok(!quellen.filter((q) => q !== eltern).some((q) => /app\.kauf\.kaufen\(/.test(q)), 'Kauf nur im Elternbereich hinter der Sperre');

console.log(`${pruefungen} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
