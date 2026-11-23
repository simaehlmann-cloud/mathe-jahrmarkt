// YouTube-Werbevideo (16:9, 1920×1080, 30 fps) aus der echten App, mit Titel- und Schlusskarte,
// deutschen Bildtexten, dezenter Hintergrundmusik und englischen Untertiteln.
// Aufruf: npm run build && node scripts/youtube-video.mjs   (Ergebnis in youtube/, braucht ffmpeg und python3 mit numpy)
//
// Jede Szene wird Bild für Bild aufgenommen (wie die App-Vorschau) und als eigene Datei kodiert; danach
// werden die Dateien ohne Neukodierung aneinandergehängt und die Musik daruntergelegt.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { beispielprofil, WOERTER } from './store-daten.mjs';
import { FPS, Film, beispielInsel, bildtext, richtigeAntwort, zeigeWelt } from './film.mjs';

const AUS = process.env.AUS ?? 'youtube';
const TMP = `${AUS}/.szenen`;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const PORT = 4997;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { detached: true });
await new Promise((r) => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL = `http://localhost:${PORT}/`;
const TAG = '2026-06-16';
const BREITE = 1920, HOEHE = 1080;

/** Szenen in Reihenfolge: Datei, Dauer (s), englischer Untertitel. */
const szenen = [];
const X264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-g', String(FPS * 2)];

function kodiere(ordner, name, untertitel) {
  const ziel = `${TMP}/${name}.mp4`;
  const tmp = `${TMP}/${name}.tmp.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${ordner}/b%05d.jpg`,
    '-vf', `scale=${BREITE}:${HOEHE}:flags=lanczos,format=yuv420p`, ...X264, tmp]);
  renameSync(tmp, ziel);
  const sek = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ziel]).toString());
  szenen.push({ datei: `${name}.mp4`, sek, untertitel });
  rmSync(ordner, { recursive: true, force: true });
}

/* ---------- Titel- und Schlusskarte (HTML, Standbild mit Ein- und Ausblenden) ---------- */
const schrift = (g) => readFileSync(`node_modules/@fontsource/nunito/files/nunito-latin-${g}-normal.woff2`).toString('base64');
const SCHRIFT = `@font-face{font-family:N;font-weight:900;src:url(data:font/woff2;base64,${schrift(900)})}@font-face{font-family:N;font-weight:800;src:url(data:font/woff2;base64,${schrift(800)})}`;
const bild = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const SYMBOL = bild('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const HINTERGRUND = 'radial-gradient(120% 90% at 50% 30%, #8f6fd6 0%, #5a3fa8 55%, #2b2470 100%)';

async function karte(name, html, sek, untertitel) {
  const p = await b.newPage({ viewport: { width: BREITE, height: HOEHE } });
  await p.setContent(`<style>${SCHRIFT}*{box-sizing:border-box}body{margin:0;width:${BREITE}px;height:${HOEHE}px;background:${HINTERGRUND};font-family:N;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    h1{font-size:120px;font-weight:900;margin:24px 0 0;text-shadow:0 6px 0 #1f2a6b}h2{font-size:64px;font-weight:900;margin:8px 0 0;color:#ffc62b;text-shadow:0 4px 0 #1f2a6b}
    p{font-size:44px;font-weight:800;margin:28px 0 0;max-width:1500px;line-height:1.3}img{width:300px;height:300px;border-radius:66px;box-shadow:0 12px 0 rgba(31,42,107,.5)}
    .marken{display:flex;gap:28px;margin-top:40px}.marke{font-size:38px;font-weight:900;background:#fffdf7;color:#1f2a6b;border:5px solid #1f2a6b;border-radius:22px;padding:12px 30px}</style>${html}`);
  await p.waitForTimeout(400);
  const png = `${TMP}/${name}.png`;
  await p.screenshot({ path: png });
  await p.close();
  const ziel = `${TMP}/${name}.mp4`;
  const tmp = `${TMP}/${name}.tmp.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', png,
    '-vf', `format=yuv420p,loop=-1:1,trim=duration=${sek},fade=t=in:st=0:d=0.6,fade=t=out:st=${sek - 0.6}:d=0.6`, ...X264, tmp]);
  renameSync(tmp, ziel);
  szenen.push({ datei: `${name}.mp4`, sek, untertitel });
}

/* ---------- App-Szenen ---------- */
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, hasTouch: true });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(`${TAG}T10:30:00`) });
page.setDefaultTimeout(20000);
await beispielprofil(page, URL, { spielzeit: { tag: TAG, ms: 10 * 60000 }, insel: beispielInsel() });
const cdp = await ctx.newCDPSession(page);
const f = new Film(page, cdp, '');
/** Neue Szene: eigener Bilderordner. */
const szene = (name) => {
  const ordner = `${TMP}/.b-${name}`;
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(ordner, { recursive: true });
  f.ordner = ordner;
  f.n = 0;
  return ordner;
};
const zumJahrmarkt = async () => {
  await page.goto(URL);
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const feier = page.locator('.feier');
    if (!(await feier.count())) break;
    await feier.getByRole('button', { name: 'Weiter' }).click();
  }
};
const bude = async (titel, stufe, loesbar = async () => true) => {
  for (let versuch = 0; versuch < 8; versuch++) {
    await zumJahrmarkt();
    await page.getByRole('button', { name: new RegExp(`^${titel} öffnen`) }).click();
    await page.getByRole('radio', { name: new RegExp(stufe) }).click();
    await page.getByRole('button', { name: `${stufe} spielen` }).click();
    await page.locator('.schild').waitFor();
    await page.locator('p.laden').waitFor({ state: 'detached' }).catch(() => {});
    await page.waitForTimeout(1500);
    if (await loesbar()) return;
  }
  throw new Error(`${titel}: keine passende Aufgabe gefunden`);
};
const auswahlBude = async (name, titel, stufe, text, en, vorher, nachher) => {
  let w;
  await bude(titel, stufe, async () => (w = await richtigeAntwort(page)) !== undefined);
  const ordner = szene(name);
  await bildtext(page, text);
  await f.an();
  await f.zeige(vorher);
  const alle = await page.locator('.nur-leser button').allTextContents();
  await page.locator('.nur-leser button').nth(alle.indexOf(w)).dispatchEvent('click');
  await f.zeige(nachher);
  await f.aus();
  kodiere(ordner, name, en);
};

await karte('00-titel', `<img src="${SYMBOL}"><h1>Mathe-Jahrmarkt</h1><h2>Fit für Klasse 5</h2><p>Spielerisch vom Ende der Grundschule in die weiterführende Schule</p>`, 4.5,
  'Mathe-Jahrmarkt – Fit for Year 5. Playful maths practice for the move from primary to secondary school.');

// 1. Jahrmarkt: die Figur läuft über den Platz
{
  await zumJahrmarkt();
  const a = await zeigeWelt(page, 760, 2060);
  await page.mouse.click(a.x, a.y);
  await page.waitForTimeout(5000);
  const z = await zeigeWelt(page, 1220, 2040);
  const ordner = szene('01-jahrmarkt');
  await bildtext(page, 'Ein Jahrmarkt voller Mathe: 30 Buden auf sechs Plätzen');
  await f.an();
  await f.zeige(0.5);
  await page.mouse.click(z.x, z.y);
  await f.zeige(3.8);
  await f.aus();
  kodiere(ordner, '01-jahrmarkt', 'A fair full of maths: 30 stalls on six squares.');
}

// 2. Lageplan
{
  const ordner = szene('02-lageplan');
  await bildtext(page, 'Der Lageplan zeigt, wie weit du schon bist');
  await f.an();
  await f.zeige(0.5);
  await page.getByRole('button', { name: 'Lageplan', exact: true }).dispatchEvent('click');
  await f.zeige(3.2);
  await f.aus();
  kodiere(ordner, '02-lageplan', 'The map shows how far you have come.');
}

// 3. Stellenwerte, 4. Schriftlich rechnen, 5. Waage, 6. Spiegeln
await auswahlBude('03-dosenwerfen', 'Dosenwerfen', 'Silber', 'Stellenwerte bis zur Million', 'Place value up to one million.', 1.4, 1.9);
{
  let erg;
  await bude('Rechen-Werkstatt', 'Bronze', async () => {
    const t = (await page.locator('.aufgabe').textContent()).replace(/\s/g, '');
    const m = t.match(/^(\d+)([+−-])(\d+)$/);
    if (!m) return false;
    erg = m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
    return true;
  });
  const ordner = szene('04-schriftlich');
  await bildtext(page, 'Schriftlich rechnen – Stelle für Stelle');
  await f.an();
  await f.zeige(0.9);
  for (const z of String(erg).split('').reverse()) {
    await page.locator('.tasten button').filter({ hasText: new RegExp(`^${z}$`) }).dispatchEvent('click');
    await f.zeige(0.4);
  }
  await page.getByRole('button', { name: 'Fertig' }).dispatchEvent('click');
  await f.zeige(1.5);
  await f.aus();
  kodiere(ordner, '04-schriftlich', 'Written addition and subtraction – digit by digit.');
}
await auswahlBude('05-waage', 'Gleichgewichts-Waage', 'Silber', 'Gleichungen an der Waage', 'Balancing equations on the scales.', 1.2, 1.8);
{
  await bude('Spiegelkabinett', 'Bronze', async () => (await page.locator('.gitter rect[fill="#3c78d8"]').count()) > 0);
  const ordner = szene('06-spiegeln');
  await bildtext(page, 'Achsensymmetrie im Spiegelkabinett');
  await f.an();
  await f.zeige(0.8);
  const blau = await page.locator('.gitter rect[fill="#3c78d8"]').evaluateAll((r) => r.map((e) => [Number(e.getAttribute('x')) / 52, Number(e.getAttribute('y')) / 52]));
  for (const [x, y] of blau) {
    await page.getByRole('button', { name: `Kästchen Spalte ${4 - x}, Zeile ${y + 1}`, exact: true }).dispatchEvent('click');
    await f.zeige(0.25);
  }
  await page.getByRole('button', { name: 'Fertig' }).dispatchEvent('click');
  await f.zeige(1.4);
  await f.aus();
  kodiere(ordner, '06-spiegeln', 'Line symmetry in the hall of mirrors.');
}

// 7. Hilfe nach einem Fehler (Dartbude)
{
  await bude('Dartbude', 'Silber', async () => {
    const t = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    const [x, y] = t.split('·').map((s) => Number(s.trim()));
    return Math.min(x, y) >= 3 && x * y >= 20;
  });
  const t = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
  const [x, y] = t.split('·').map((s) => Number(s.trim()));
  const werte = await page.locator('.nur-leser button').allTextContents();
  const falsch = werte.find((w) => Number(w) !== x * y);
  const ordner = szene('07-hilfe');
  await bildtext(page, 'Fehler? Die Hilfe zeigt Schritt für Schritt, wie es geht');
  await f.an();
  await f.zeige(1.0);
  await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${falsch}$`) }).dispatchEvent('click');
  await f.zeige(2.0);
  await page.getByRole('button', { name: 'Weiter' }).dispatchEvent('click');
  await f.zeige(2.6);
  await f.aus();
  kodiere(ordner, '07-hilfe', 'A mistake? The help shows step by step how it works.');
}

// 8. Essbude: Popcorn für 2 Taler
{
  await zumJahrmarkt();
  await zeigeWelt(page, 1000, 3740);
  await page.getByRole('button', { name: /^Popcorn: für 2 Taler/ }).dispatchEvent('click');
  await page.locator('.essen-frage').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  const ordner = szene('08-popcorn');
  await bildtext(page, 'Taler verdienen – und sich mal Popcorn gönnen');
  await f.an();
  await f.zeige(1.0);
  await page.getByRole('button', { name: 'Für 2 Taler kaufen' }).dispatchEvent('click');
  await f.zeige(2.4);
  await f.aus();
  kodiere(ordner, '08-popcorn', 'Earn coins – and treat yourself to some popcorn.');
}

// 9. Bauinsel
{
  await zumJahrmarkt();
  await page.getByRole('button', { name: /^Menü/ }).click();
  await page.locator('nav.menue').getByRole('button', { name: /Bauinsel/ }).click();
  await page.locator('[data-feld="10,20,-1"]').first().waitFor({ state: 'attached' });
  await page.getByRole('radio', { name: 'Laufen', exact: true }).click();
  await page.waitForTimeout(800);
  const ordner = szene('09-bauinsel');
  await bildtext(page, 'Mit verdienten Blöcken eine eigene Insel bauen', true);
  await f.an();
  await f.zeige(0.6);
  await page.locator('[data-feld="13,19,-1"] polygon[data-seite="oben"]').first().dispatchEvent('click');
  await f.zeige(1.5);
  await page.getByRole('radio', { name: 'Bauen', exact: true }).dispatchEvent('click');
  await page.getByRole('radio', { name: 'Holz', exact: true }).dispatchEvent('click');
  await f.zeige(0.3);
  for (const [x, y, z] of [[17, 13, -1], [17, 14, -1], [17, 15, -1], [17, 13, 0], [17, 14, 0], [17, 15, 0]]) {
    await page.locator(`[data-feld="${x},${y},${z}"] polygon[data-seite="oben"]`).first().dispatchEvent('click');
    await f.zeige(0.28);
  }
  await f.zeige(1.0);
  await f.aus();
  kodiere(ordner, '09-bauinsel', 'Build your own island with the blocks you have earned.');
}

// 10. Elternbereich
{
  await zumJahrmarkt();
  await page.getByRole('button', { name: /^Menü/ }).click();
  await page.locator('nav.menue').getByRole('button', { name: 'Elternbereich' }).click();
  const sperre = await page.locator('.frage').textContent();
  const [, w1, w2] = sperre.match(/Was ist (\S+) mal (\S+)\?/);
  await page.getByLabel(sperre).fill(String(WOERTER[w1] * WOERTER[w2]));
  await page.getByRole('button', { name: 'Öffnen' }).click();
  await page.getByRole('heading', { name: /Die letzten 7 Tage/ }).waitFor();
  await page.waitForTimeout(500);
  const ordner = szene('10-eltern');
  await bildtext(page, 'Für Eltern: sehen, was schon sicher sitzt');
  await f.an();
  await f.zeige(3.4);
  await f.aus();
  kodiere(ordner, '10-eltern', 'For parents: see what your child already knows well.');
}

// 11. Pause nach 20 Minuten
{
  await zumJahrmarkt();
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
  await page.waitForTimeout(400);
  const ordner = szene('11-pause');
  await bildtext(page, 'Kurz üben, dann Pause – ohne Werbung, ohne Druck');
  await f.an();
  await f.zeige(3.2);
  await f.aus();
  kodiere(ordner, '11-pause', 'Practise briefly, then take a break – no ads, no pressure.');
}
await ctx.close();

await karte('12-schluss', `<img src="${SYMBOL}" style="width:220px;height:220px;border-radius:48px"><h1 style="font-size:96px">Mathe-Jahrmarkt</h1>
  <p>Passend zum Kerncurriculum Mathematik der Grundschule.<br>Entwickelt von einem Fachseminarleiter für Mathematik.</p>
  <div class="marken"><span class="marke">Ohne Werbung</span><span class="marke">Ohne Konto</span><span class="marke">Daten bleiben auf dem Gerät</span></div>
  <h2 style="margin-top:44px">Jetzt im App Store</h2>`, 6,
  'Matches the primary maths curriculum. Developed by a maths teacher trainer. No ads, no account, your data stays on the device. Now on the App Store.');

/* ---------- Zusammensetzen, Musik, Untertitel ---------- */
writeFileSync(`${TMP}/liste.txt`, szenen.map((s) => `file '${s.datei}'`).join('\n'));
const stumm = `${TMP}/stumm.mp4`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${TMP}/liste.txt`, '-c', 'copy', stumm]);
const gesamt = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', stumm]).toString());
const musik = `${TMP}/musik.wav`;
execFileSync('python3', ['scripts/musik.py', String(gesamt), musik]);
const ziel = `${AUS}/mathe-jahrmarkt-youtube.mp4`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', stumm, '-i', musik, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', `${ziel}.tmp.mp4`]);
renameSync(`${ziel}.tmp.mp4`, ziel);

// Englische Untertitel (SRT), je Szene ein Eintrag
const zeit = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sek = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sek).padStart(2, '0')},${String(r).padStart(3, '0')}`;
};
let t = 0;
const srt = szenen.map((s, i) => {
  const ein = `${i + 1}\n${zeit(t + 0.2)} --> ${zeit(t + s.sek - 0.2)}\n${s.untertitel}\n`;
  t += s.sek;
  return ein;
});
writeFileSync(`${AUS}/mathe-jahrmarkt-youtube.en.srt`, srt.join('\n'));
console.log(`${ziel}: ${gesamt.toFixed(1)} s, ${szenen.length} Szenen`);
rmSync(TMP, { recursive: true, force: true });
try { process.kill(-server.pid); } catch { server.kill(); }
await b.close();
process.exit(0);
