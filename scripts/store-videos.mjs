// App-Vorschauvideos für den App Store (und als YouTube-Video für Google Play).
// Aufruf: npm run build && npm run store-videos   (Ergebnis in store-bilder/, eigener Ordner mit AUS=…, nur ein Gerät mit NUR=iphone)
//
// Aufgenommen wird die echte App, Bild für Bild: Die Uhr der Seite steht still und rückt pro Bild genau 1/30 s vor,
// CSS-Animationen werden auf dieselbe Zeit gesetzt. So läuft das Video flüssig, egal wie schnell der Rechner ist.
// Apple: 15–30 s, H.264, 30 fps, Tonspur (hier stumm), iPhone 886×1920, iPad 13" 1200×1600. Braucht ffmpeg.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { beispielprofil } from './store-daten.mjs';
import { FPS, Film, beispielInsel, bildtext, richtigeAntwort, zeigeWelt } from './film.mjs';

const AUS = process.env.AUS ?? 'store-bilder';
mkdirSync(AUS, { recursive: true });
const PORT = 4996;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { detached: true });
await new Promise((r) => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL = `http://localhost:${PORT}/`;
const TAG = '2026-06-16';

async function film(name, viewport, dsf) {
  const ordner = `${AUS}/.bilder-${name}`;
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(ordner, { recursive: true });
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(`${TAG}T10:30:00`) });
  page.setDefaultTimeout(20000);
  await beispielprofil(page, URL, { spielzeit: { tag: TAG, ms: 10 * 60000 }, insel: beispielInsel() });
  const cdp = await ctx.newCDPSession(page);
  const f = new Film(page, cdp, ordner);

  const karte = async () => {
    await page.goto(URL);
    await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      const feier = page.locator('.feier');
      if (!(await feier.count())) break;
      await feier.getByRole('button', { name: 'Weiter' }).click();
    }
  };
  /** Bude öffnen (ohne Aufnahme), Stufe wählen, Runde starten, bis eine lösbare Aufgabe steht. */
  const bude = async (titel, stufe, loesbar = async () => true) => {
    for (let versuch = 0; versuch < 6; versuch++) {
      await karte();
      await page.getByRole('button', { name: new RegExp(`^${titel} öffnen`) }).click();
      await page.getByRole('radio', { name: new RegExp(stufe) }).click();
      await page.getByRole('button', { name: `${stufe} spielen` }).click();
      await page.locator('.schild').waitFor();
      await page.locator('p.laden').waitFor({ state: 'detached' }).catch(() => {});
      await page.waitForTimeout(1500);
      if (await loesbar()) return;
      console.log("nicht lösbar:", titel, (await page.locator(".aufgabe").textContent().catch(() => "?")).trim(), await page.locator(".nur-leser button").allTextContents());
    }
    throw new Error(`${titel}: keine passende Aufgabe gefunden`);
  };
  /** Eine Auswahl-Aufgabe sichtbar lösen. */
  const loeseAuswahl = async (w, vorher, nachher) => {
    await f.zeige(vorher);
    // genau dieser Knopf (nicht „63 240“, wenn „6 324“ gemeint ist)
    const alle = await page.locator('.nur-leser button').allTextContents();
    await page.locator('.nur-leser button').nth(alle.indexOf(w)).dispatchEvent('click');
    await f.zeige(nachher);
  };
  const auswahlBude = async (titel, stufe, text, vorher, nachher) => {
    let w;
    await bude(titel, stufe, async () => (w = await richtigeAntwort(page)) !== undefined);
    await bildtext(page, text);
    await f.an();
    await loeseAuswahl(w, vorher, nachher);
    await f.aus();
  };

  // 1. Jahrmarkt: Blick auf den Platz am Spiegelzelt, die Figur läuft über den Platz
  await karte();
  {
    // vorab hinlaufen (ohne Aufnahme), dann im Film ein Stück über den Platz
    const a = await zeigeWelt(page, 760, 2060);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(5000);
    const b2 = await zeigeWelt(page, 1180, 2040);
    await bildtext(page, 'Ein Jahrmarkt voller Mathe');
    await page.waitForTimeout(300);
    await f.an();
    await f.zeige(0.4);
    await page.mouse.click(b2.x, b2.y);
    await f.zeige(2.7);
    await f.aus();
  }

  // 2. Dosenwerfen: Stellenwerte
  await auswahlBude('Dosenwerfen', 'Silber', 'Stellenwerte bis zur Million', 1.3, 1.8);

  // 3. Rechen-Werkstatt: schriftlich rechnen
  {
    let erg;
    await bude('Rechen-Werkstatt', 'Bronze', async () => {
      const t = (await page.locator('.aufgabe').textContent()).replace(/\s/g, '');
      const m = t.match(/^(\d+)([+−-])(\d+)$/);
      if (!m) return false;
      erg = m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
      return true;
    });
    await bildtext(page, 'Schriftlich rechnen');
    await f.an();
    await f.zeige(0.9);
    for (const z of String(erg).split('').reverse()) {
      await page.locator('.tasten button').filter({ hasText: new RegExp(`^${z}$`) }).dispatchEvent('click');
      await f.zeige(0.35);
    }
    await page.getByRole('button', { name: 'Fertig' }).dispatchEvent('click');
    await f.zeige(1.5);
    await f.aus();
  }

  // 4. Gleichgewichts-Waage
  await auswahlBude('Gleichgewichts-Waage', 'Silber', 'Gleichungen an der Waage', 1.1, 1.7);

  // 5. Spiegelkabinett: Achsensymmetrie
  await bude('Spiegelkabinett', 'Bronze', async () => (await page.locator('.gitter rect[fill="#3c78d8"]').count()) > 0);
  await bildtext(page, 'Achsensymmetrie');
  await f.an();
  await f.zeige(0.8);
  {
    const blau = await page.locator('.gitter rect[fill="#3c78d8"]').evaluateAll((r) => r.map((e) => [Number(e.getAttribute('x')) / 52, Number(e.getAttribute('y')) / 52]));
    for (const [x, y] of blau) {
      await page.getByRole('button', { name: `Kästchen Spalte ${4 - x}, Zeile ${y + 1}`, exact: true }).dispatchEvent('click');
      await f.zeige(0.25);
    }
    await page.getByRole('button', { name: 'Fertig' }).dispatchEvent('click');
    await f.zeige(1.4);
  }
  await f.aus();

  // 6. Zahlenstrahl-Seilbahn
  await auswahlBude('Zahlenstrahl-Seilbahn', 'Bronze', 'Orientierung am Zahlenstrahl', 0.9, 2.0);

  // 7. Bauinsel: Haus mit Tür und Fenstern, Tiere; die Figur läuft, dann wird gebaut
  await karte();
  await page.getByRole('button', { name: /^Menü/ }).click();
  await page.locator('nav.menue').getByRole('button', { name: /Bauinsel/ }).click();
  await page.locator('[data-feld="10,20,-1"]').first().waitFor({ state: 'attached' });
  await page.getByRole('radio', { name: 'Laufen', exact: true }).click();
  await page.waitForTimeout(800);
  await bildtext(page, 'Bauen mit verdienten Blöcken', true);
  await f.an();
  await f.zeige(0.7);
  await page.locator('[data-feld="13,19,-1"] polygon[data-seite="oben"]').first().dispatchEvent('click');
  await f.zeige(1.5);
  await page.getByRole('radio', { name: 'Bauen', exact: true }).dispatchEvent('click');
  await page.getByRole('radio', { name: 'Holz', exact: true }).dispatchEvent('click');
  await f.zeige(0.3);
  for (const [x, y, z] of [[17, 13, -1], [17, 14, -1], [17, 15, -1], [17, 13, 0], [17, 14, 0], [17, 15, 0]]) {
    await page.locator(`[data-feld="${x},${y},${z}"] polygon[data-seite="oben"]`).first().dispatchEvent('click');
    await f.zeige(0.25);
  }
  await f.zeige(0.9);
  await f.aus();

  // 8. Pausen-Erinnerung
  await karte();
  await page.waitForTimeout(1000);
  await page.evaluate((tag) => {
    const k = 'CapacitorStorage.mathe-jahrmarkt.daten';
    const d = JSON.parse(localStorage.getItem(k));
    d.profile[0].spielzeit = { tag, ms: 20 * 60000 + 5000, nachschlag: 0, erinnernAb: 0 };
    localStorage.setItem(k, JSON.stringify(d));
  }, TAG);
  await page.reload();
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  await page.clock.runFor(31000);
  await page.getByRole('alertdialog', { name: 'Pausenzeit!' }).waitFor();
  await bildtext(page, 'Nach 20 Minuten: Pause');
  await page.waitForTimeout(400);
  await f.an();
  await f.zeige(2.6);
  await f.aus();
  await ctx.close();

  const ziel = `${AUS}/vorschau-${name}.mp4`;
  const w = Math.round(viewport.width * dsf), h = Math.round(viewport.height * dsf);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${ordner}/b%05d.jpg`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', `scale=${w}:${h},format=yuv420p`, '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'slow', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', ziel]);
  const sek = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ziel]).toString());
  if (sek < 15 || sek > 30) throw new Error(`${ziel}: ${sek.toFixed(1)} s – Apple verlangt 15 bis 30 Sekunden`);
  console.log(`${ziel}: ${sek.toFixed(1)} s, ${w}×${h}`);
  rmSync(ordner, { recursive: true, force: true });
}

const nur = process.env.NUR; // z. B. NUR=iphone
if (!nur || nur === 'iphone') await film('iphone', { width: 443, height: 960 }, 2);
if (!nur || nur === 'ipad') await film('ipad', { width: 900, height: 1200 }, 4 / 3);
console.log('fertig');
try { process.kill(-server.pid); } catch { server.kill(); }
await b.close();
process.exit(0);
