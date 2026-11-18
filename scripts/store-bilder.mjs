// Store-Bilder für App Store und Google Play.
// Aufruf: npm run build && npm run store-bilder   (Ergebnis in store-bilder/, eigener Ordner mit AUS=…)
//
// 1. Rohaufnahmen aus der echten App (Telefon 440×956 @3x, iPad 1032×1376 @2x), gespielte Beispielsitzung „Lea“
// 2. Daraus gerahmte Bilder mit Bildtext in allen Formaten, die die Stores verlangen:
//    Apple iPhone 6,9" 1320×2868 · Apple iPad 13" 2064×2752 · Google Telefon 1080×1920 · Google Tablet 1440×2560
//    dazu Google-Vorstellungsgrafik 1024×500 und Google-Symbol 512×512. Alles PNG ohne Transparenz.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { beispielprofil, WOERTER } from './store-daten.mjs';

const AUS = process.env.AUS ?? 'store-bilder';
const ROH = `${AUS}/roh`;
mkdirSync(ROH, { recursive: true });
const PORT = 4995;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { detached: true });
await new Promise((r) => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL = `http://localhost:${PORT}/`;
const TAG = '2026-06-16';

/** Bildtexte: Reihenfolge = Reihenfolge im Store. */
export const BILDER = [
  ['1-jahrmarkt', '30 Buden für den Weg in Klasse 5'],
  ['2-dartbude', 'Einmaleins mit Pfeil und Ballon'],
  ['3-hilfe', 'Fehler? Die Hilfe zeigt, wie es geht'],
  ['4-uhr', 'Uhr, Geld und Längen zum Anfassen'],
  ['5-knobelzelt', 'Knobeln in kleinen Schritten'],
  ['6-bauinsel', 'Mit verdienten Blöcken bauen'],
  ['7-eltern', 'Für Eltern: sehen, was schon sitzt'],
  ['8-pause', 'Kurz üben, dann Pause. Ohne Werbung.'],
];

async function rohaufnahmen(geraet, viewport, dsf) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  // Feste Zeit: Sommer, Vormittag – sonst hängt die Stimmung (Abend, Herbstlaub) vom Zeitpunkt des Erzeugens ab
  await page.clock.install({ time: new Date(`${TAG}T10:30:00`) });
  page.setDefaultTimeout(20000);
  const foto = (n) => page.screenshot({ path: `${ROH}/${geraet}-${n}.png` });
  const menue = async (punkt) => {
    await page.getByRole('button', { name: /^Menü/ }).click();
    await page.locator('nav.menue').getByRole('button', { name: punkt }).click();
  };
  const zumJahrmarkt = async () => {
    await page.goto(URL);
    await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  };
  await beispielprofil(page, URL);
  await zumJahrmarkt();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const f = page.locator('.feier');
    if (!(await f.count())) break;
    await f.getByRole('button', { name: 'Weiter' }).click();
  }
  await page.waitForTimeout(1200);
  await foto('1-jahrmarkt');

  // Dartbude, Silber, mitten in der Runde – danach eine absichtlich falsche Antwort für die Hilfe
  await page.getByRole('button', { name: 'Dartbude öffnen' }).click();
  await page.getByRole('radio', { name: /Silber/ }).click();
  await page.getByRole('button', { name: 'Silber spielen' }).click();
  await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
  // Eine Aufgabe, die etwas hermacht (nicht 1 · 2): leichte Aufgaben richtig lösen, bis eine passende kommt
  for (let i = 0; i < 9; i++) {
    const t = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    const [x, y] = t.split('·').map((s) => Number(s.trim()));
    if (Math.min(x, y) >= 3 && x * y >= 20) break;
    const id = await page.locator('.schild').getAttribute('data-aufgabe');
    await page.waitForTimeout(1300);
    await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${x * y}$`) }).dispatchEvent('click');
    await page.waitForFunction((alt) => document.querySelector('.schild')?.getAttribute('data-aufgabe') !== alt, id, { timeout: 20000 });
    await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
  }
  await page.waitForTimeout(1800);
  await foto('2-dartbude');
  {
    const text = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    const [x, y] = text.split('·').map((s) => Number(s.trim()));
    const werte = await page.locator('.nur-leser button').allTextContents();
    const falsch = werte.find((w) => Number(w) !== x * y);
    await page.waitForTimeout(1300);
    await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${falsch}$`) }).dispatchEvent('click');
    await page.getByText('Schauen wir genau hin').waitFor();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.waitForTimeout(900);
    await foto('3-hilfe');
  }
  await zumJahrmarkt();

  // Uhr-Karussell
  await page.getByRole('button', { name: 'Uhr-Karussell öffnen' }).click();
  for (let i = 0; i < 4 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  await page.getByRole('radio', { name: /Silber/ }).click();
  await page.getByRole('button', { name: 'Silber spielen' }).click();
  await page.waitForTimeout(2200);
  await foto('4-uhr');
  await zumJahrmarkt();

  // Knobelzelt
  await page.getByRole('button', { name: 'Knobelzelt' }).click();
  await page.getByRole('button', { name: /^Mittel/ }).click();
  await page.locator('.geschichte').waitFor();
  await page.waitForTimeout(400);
  await foto('5-knobelzelt');
  await zumJahrmarkt();

  // Bauinsel mit kleinem Haus
  await menue(/Bauinsel/);
  await page.locator('[data-feld="12,19,-1"]').first().waitFor({ state: 'attached' });
  const flaeche = (x, y, z, seite = 'oben') => page.locator(`[data-feld="${x},${y},${z}"] polygon[data-seite="${seite}"]`).first().dispatchEvent('click');
  await page.getByRole('radio', { name: 'Bauen', exact: true }).click();
  const wand = [];
  for (let x = 9; x <= 12; x++) { wand.push([x, 15]); wand.push([x, 18]); }
  for (let y = 16; y <= 17; y++) { wand.push([9, y]); wand.push([12, y]); }
  await page.getByRole('radio', { name: 'Ziegel', exact: true }).click();
  for (const [x, y] of wand) if (!(x === 11 && y === 18)) await flaeche(x, y, -1);
  for (const [x, y] of wand) if (!(x === 11 && y === 18)) await flaeche(x, y, 0);
  await page.getByRole('radio', { name: 'Holz', exact: true }).click();
  for (const [x, y] of wand) await flaeche(x, y, 1).catch(() => {});
  await page.getByRole('radio', { name: 'Laufen', exact: true }).click();
  await flaeche(12, 20, -1);
  await page.waitForTimeout(2500);
  await foto('6-bauinsel');
  await zumJahrmarkt();

  // Elternbereich: Wochenbericht
  await menue('Elternbereich');
  const sperre = await page.locator('.frage').textContent();
  const [, w1, w2] = sperre.match(/Was ist (\S+) mal (\S+)\?/);
  await page.getByLabel(sperre).fill(String(WOERTER[w1] * WOERTER[w2]));
  await page.getByRole('button', { name: 'Öffnen' }).click();
  await page.getByRole('heading', { name: /Die letzten 7 Tage/ }).waitFor();
  await page.waitForTimeout(400);
  await foto('7-eltern');

  // Pausen-Erinnerung: heutige Spielzeit auf 21 Minuten setzen, dann einen Zähltakt abwarten
  await zumJahrmarkt();
  await page.waitForTimeout(1000); // die App hat ihren Stand gesichert
  await page.evaluate((tag) => {
    const k = 'CapacitorStorage.mathe-jahrmarkt.daten';
    const d = JSON.parse(localStorage.getItem(k));
    d.profile[0].spielzeit = { tag, ms: 21 * 60000, nachschlag: 0, erinnernAb: 0 };
    localStorage.setItem(k, JSON.stringify(d));
  }, TAG);
  await page.reload();
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  await page.clock.runFor(31000);
  await page.getByRole('alertdialog', { name: 'Pausenzeit!' }).waitFor();
  await page.waitForTimeout(600);
  await foto('8-pause');
  await ctx.close();
}

const schrift = (gewicht) => readFileSync(`node_modules/@fontsource/nunito/files/nunito-latin-${gewicht}-normal.woff2`).toString('base64');
const SCHRIFT = `@font-face{font-family:N;font-weight:900;src:url(data:font/woff2;base64,${schrift(900)})}@font-face{font-family:N;font-weight:800;src:url(data:font/woff2;base64,${schrift(800)})}`;
const bildUrl = (pfad) => `data:image/png;base64,${readFileSync(pfad).toString('base64')}`;
const HINTERGRUND = `radial-gradient(120% 80% at 50% 30%, #8f6fd6 0%, #5a3fa8 55%, #2b2470 100%)`;

/** Ein gerahmtes Store-Bild: Bildtext oben, Aufnahme darunter mit runden Ecken. */
async function rahmen(roh, text, breite, hoehe, ziel) {
  const p = await b.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
  const kopf = Math.round(hoehe * 0.2);
  const html = `<html><head><style>${SCHRIFT}
    html,body{margin:0;width:${breite}px;height:${hoehe}px;overflow:hidden;background:${HINTERGRUND}}
    h1{position:absolute;left:7%;right:7%;top:0;height:${kopf}px;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;
      font:900 ${Math.round(breite * 0.07)}px/1.12 N;color:#fff;letter-spacing:-0.01em;text-wrap:balance;text-shadow:0 ${breite * 0.004}px 0 #1f2a6b}
    img{position:absolute;left:50%;transform:translateX(-50%);border-radius:${breite * 0.045}px;border:${Math.max(4, breite * 0.006)}px solid #1f2a6b;
      box-shadow:0 ${breite * 0.012}px 0 #1f2a6b, 0 ${breite * 0.03}px ${breite * 0.05}px #0006}
  </style></head><body><h1>${text}</h1><img id="b" src="${bildUrl(roh)}"></body></html>`;
  await p.setContent(html);
  await p.evaluate(({ kopf, breite, hoehe }) => {
    const img = document.getElementById('b');
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const s = Math.min((breite * 0.84) / sw, (hoehe * 0.965 - kopf) / sh);
    const w = sw * s, h = sh * s;
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
    img.style.top = `${kopf + Math.max(0, (hoehe * 0.965 - kopf - h) / 2)}px`;
  }, { kopf, breite, hoehe });
  await p.screenshot({ path: ziel, omitBackground: false });
  await p.close();
}

async function vorstellungsgrafik(ziel) {
  const p = await b.newPage({ viewport: { width: 1024, height: 500 } });
  const flinka = readFileSync('grafik-quellen/flinka.svg').toString('base64');
  await p.setContent(`<html><head><style>${SCHRIFT}
    html,body{margin:0;width:1024px;height:500px;overflow:hidden;background:${HINTERGRUND}}
    .rad{position:absolute;left:40px;top:40px;width:420px;height:420px;border-radius:50%;border:4px solid #c9b8ff88;box-shadow:inset 0 0 0 40px #ffe57a14}
    img{position:absolute;left:95px;top:60px;height:400px}
    .text{position:absolute;left:470px;right:40px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;color:#fff}
    h1{margin:0;font:900 76px/1 N;text-shadow:0 4px 0 #1f2a6b}
    h2{margin:14px 0 22px;font:900 44px/1 N;color:#ffc62b;text-shadow:0 3px 0 #1f2a6b}
    p{margin:0;font:800 26px/1.35 N;color:#efe9ff}
  </style></head><body><div class="rad"></div><img src="data:image/svg+xml;base64,${flinka}">
  <div class="text"><h1>Mathe-<br>Jahrmarkt</h1><h2>Fit für Klasse 5</h2><p>30 Buden · ohne Werbung<br>ohne Konto · mit Pausen</p></div></body></html>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: ziel });
  await p.close();
}

for (const [geraet, viewport, dsf] of [
  ['telefon', { width: 440, height: 956 }, 3],
  ['ipad', { width: 1032, height: 1376 }, 2],
]) await rohaufnahmen(geraet, viewport, dsf);

for (const [i, [name, text]] of BILDER.entries()) {
  const n = i + 1;
  await rahmen(`${ROH}/telefon-${name}.png`, text, 1320, 2868, `${AUS}/iphone-${n}.png`);
  await rahmen(`${ROH}/ipad-${name}.png`, text, 2064, 2752, `${AUS}/ipad-${n}.png`);
  await rahmen(`${ROH}/telefon-${name}.png`, text, 1080, 1920, `${AUS}/play-telefon-${n}.png`);
  await rahmen(`${ROH}/ipad-${name}.png`, text, 1440, 2560, `${AUS}/play-tablet-${n}.png`);
}
await vorstellungsgrafik(`${AUS}/play-vorstellungsgrafik.png`);
{
  // Google-Symbol: das iOS-Symbol, verkleinert (Google rundet selbst ab)
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  await p.setContent(`<body style="margin:0"><img style="width:512px;height:512px;display:block" src="${bildUrl('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')}">`);
  await p.screenshot({ path: `${AUS}/play-symbol.png` });
  await p.close();
}
console.log('fertig');
try { process.kill(-server.pid); } catch { server.kill(); } // ganze Prozessgruppe, sonst läuft vite weiter (Windows: nur der Startprozess)
await b.close();
process.exit(0);
