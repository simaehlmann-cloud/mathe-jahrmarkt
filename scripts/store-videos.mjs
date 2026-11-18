// App-Vorschauvideos für den App Store (und als YouTube-Video für Google Play).
// Aufruf: npm run build && npm run store-videos   (Ergebnis in store-bilder/, eigener Ordner mit AUS=…)
//
// Aufgenommen wird die echte App (Bildschirmaufnahme über Chrome), keine Montage – so verlangt es Apple.
// Apple: 15–30 s, H.264, 30 fps, Tonspur (hier stumm), iPhone 6,9" 886×1920, iPad 13" 1200×1600.
// Braucht ffmpeg im PATH.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { beispielprofil } from './store-daten.mjs';

const AUS = process.env.AUS ?? 'store-bilder';
mkdirSync(AUS, { recursive: true });
const PORT = 4996;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { detached: true });
await new Promise((r) => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL = `http://localhost:${PORT}/`;
const TAG = '2026-06-16';

/** Nimmt Bilder per Screencast auf; zwischen `stopp()` und `weiter()` entsteht ein harter Schnitt. */
async function aufnahme(page, breite, hoehe, ordner) {
  const cdp = await page.context().newCDPSession(page);
  const bilder = [];
  let laeuft = false;
  // Videozeit: läuft nur während der Aufnahme, im Tempo `tempo` (2 = doppelt so schnell, für lange Bauphasen)
  let videozeit = 0;
  let letzte = null;
  let tempo = 1;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (!laeuft) return;
    if (letzte !== null) videozeit += (metadata.timestamp - letzte) / tempo;
    letzte = metadata.timestamp;
    const n = bilder.length;
    const datei = `${ordner}/b${String(n).padStart(5, '0')}.jpg`;
    writeFileSync(datei, Buffer.from(data, 'base64'));
    bilder.push({ datei, t: videozeit });
  });
  const start = () => cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: breite, maxHeight: hoehe, everyNthFrame: 1 });
  return {
    async los() { laeuft = true; await start(); },
    async stopp() { console.log('Schnitt bei', videozeit.toFixed(1), 's'); laeuft = false; letzte = null; videozeit += 1 / 30; },
    async weiter() { laeuft = true; },
    tempo(t) { tempo = t; },
    async ende() { await cdp.send('Page.stopScreencast'); laeuft = false; return bilder; },
  };
}

/** Bildfolge mit Zeitstempeln → MP4 mit 30 fps, genaue Größe, stumme Stereo-Tonspur. */
function video(bilder, breite, hoehe, ziel, ordner) {
  const zeilen = [];
  for (let i = 0; i < bilder.length; i++) {
    const dauer = i + 1 < bilder.length ? Math.max(0.001, bilder[i + 1].t - bilder[i].t) : 1.5;
    zeilen.push(`file '${bilder[i].datei.split('/').pop()}'`, `duration ${dauer.toFixed(4)}`);
  }
  zeilen.push(`file '${bilder.at(-1).datei.split('/').pop()}'`);
  writeFileSync(`${ordner}/liste.txt`, zeilen.join('\n'));
  console.log(`${bilder.length} Bilder, ${(bilder.at(-1).t - bilder[0].t).toFixed(1)} s`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${ordner}/liste.txt`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', `scale=${breite}:${hoehe}:force_original_aspect_ratio=decrease,pad=${breite}:${hoehe}:(ow-iw)/2:(oh-ih)/2:color=0x8fd3f7,fps=30,format=yuv420p`,
    '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'veryfast', '-crf', '18', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-t', '29', '-movflags', '+faststart', ziel]);
  const sek = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ziel]).toString());
  if (sek < 15 || sek > 30) throw new Error(`${ziel}: ${sek.toFixed(1)} s – Apple verlangt 15 bis 30 Sekunden`);
  console.log(`${ziel}: ${sek.toFixed(1)} s`);
}

async function film(name, viewport, dsf, breite, hoehe) {
  const ordner = `${AUS}/.bilder-${name}`;
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(ordner, { recursive: true });
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TAG}T10:30:00`) });
  page.setDefaultTimeout(20000);
  // 19 Minuten heute schon gespielt: Am Ende erscheint die Pausen-Erinnerung
  await beispielprofil(page, URL, { spielzeit: { tag: TAG, ms: 19 * 60000 }, startbildschirm: true });
  await page.goto(URL);
  // Der Startbildschirm zeigt die Eintrittskarte von Lea
  await page.getByRole('button', { name: /^Lea:/ }).waitFor();
  await page.waitForTimeout(800);
  const rec = await aufnahme(page, breite, hoehe, ordner);
  await rec.los();
  await page.waitForTimeout(1300);
  await page.getByRole('button', { name: /^Lea:/ }).click();
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  // Gassenfeiern der Beispielsitzung wegklicken (erscheinen kurz nach dem Laden)
  await rec.stopp();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const f = page.locator('.feier');
    if (!(await f.count())) break;
    await f.getByRole('button', { name: 'Weiter' }).click();
  }
  await rec.weiter();
  await page.waitForTimeout(1000);

  // Zur Dartbude laufen (Anfang des Wegs, dann Schnitt) und zwei Aufgaben lösen
  await page.getByRole('button', { name: 'Dartbude öffnen' }).click();
  await page.waitForTimeout(1300);
  await rec.stopp();
  await page.getByRole('radio', { name: /Silber/ }).waitFor();
  await page.getByRole('radio', { name: /Silber/ }).click();
  await page.waitForTimeout(300);
  await rec.weiter();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Silber spielen' }).click();
  rec.tempo(1.25);
  for (let i = 0; i < 2; i++) {
    await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
    const t = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    const [x, y] = t.split('·').map((s) => Number(s.trim()));
    const id = await page.locator('.schild').getAttribute('data-aufgabe');
    // warten, bis Bruno die Ballons aufgeblasen hat, dann kurz zeigen
    await page.locator('p.laden').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${x * y}$`) }).dispatchEvent('click');
    await page.waitForFunction((alt) => document.querySelector('.schild')?.getAttribute('data-aufgabe') !== alt, id, { timeout: 20000 });
  }
  await page.waitForTimeout(900);

  // Schnitt: Bauinsel, ein Haus wächst
  await rec.stopp();
  await page.goto(URL);
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  await page.getByRole('button', { name: /^Menü/ }).click();
  await page.locator('nav.menue').getByRole('button', { name: /Bauinsel/ }).click();
  await page.locator('[data-feld="12,19,-1"]').first().waitFor({ state: 'attached' });
  await page.getByRole('radio', { name: 'Bauen', exact: true }).click();
  await page.getByRole('radio', { name: 'Ziegel', exact: true }).click();
  await page.waitForTimeout(600);
  rec.tempo(5); // die Bauphase im Zeitraffer
  await rec.weiter();
  await page.waitForTimeout(700);
  const flaeche = (x, y, z) => page.locator(`[data-feld="${x},${y},${z}"] polygon[data-seite="oben"]`).first().dispatchEvent('click');
  const wand = [];
  for (let x = 9; x <= 12; x++) wand.push([x, 15]);
  for (let y = 16; y <= 17; y++) wand.push([12, y]);
  for (let x = 12; x >= 9; x--) wand.push([x, 18]);
  for (let y = 17; y >= 16; y--) wand.push([9, y]);
  for (const [x, y] of wand) if (!(x === 11 && y === 18)) { await flaeche(x, y, -1); await page.waitForTimeout(110); }
  for (const [x, y] of wand) if (!(x === 11 && y === 18)) { await flaeche(x, y, 0); await page.waitForTimeout(110); }
  await page.getByRole('radio', { name: 'Holz', exact: true }).click();
  for (const [x, y] of wand) { await flaeche(x, y, 1).catch(() => {}); await page.waitForTimeout(110); }
  await page.getByRole('radio', { name: 'Laufen', exact: true }).click();
  await flaeche(12, 20, -1);
  await page.waitForTimeout(2200);

  // Schnitt: zurück auf dem Jahrmarkt schlägt Flinka eine Pause vor
  await rec.stopp();
  await page.goto(URL);
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  await page.waitForTimeout(400);
  rec.tempo(1);
  await rec.weiter();
  await page.waitForTimeout(1500);
  await rec.stopp(); // Uhr vorstellen (zwei Zähltakte), dann erscheint die Erinnerung
  await page.clock.runFor(65000);
  await page.getByRole('alertdialog', { name: 'Pausenzeit!' }).waitFor();
  await rec.weiter();
  await page.waitForTimeout(3500);
  const bilder = await rec.ende();
  await ctx.close();
  video(bilder, breite, hoehe, `${AUS}/vorschau-${name}.mp4`, ordner);
  rmSync(ordner, { recursive: true, force: true });
}

await film('iphone', { width: 443, height: 960 }, 2, 886, 1920);
await film('ipad', { width: 900, height: 1200 }, 4 / 3, 1200, 1600);
console.log('fertig');
try { process.kill(-server.pid); } catch { server.kill(); }
await b.close();
process.exit(0);
