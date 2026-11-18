// App-Vorschauvideos für den App Store (und als YouTube-Video für Google Play).
// Aufruf: npm run build && npm run store-videos   (Ergebnis in store-bilder/, eigener Ordner mit AUS=…, nur ein Gerät mit NUR=iphone)
//
// Aufgenommen wird die echte App, Bild für Bild: Die Uhr der Seite steht still und rückt pro Bild genau 1/30 s vor,
// CSS-Animationen werden auf dieselbe Zeit gesetzt. So läuft das Video flüssig, egal wie schnell der Rechner ist.
// Apple: 15–30 s, H.264, 30 fps, Tonspur (hier stumm), iPhone 886×1920, iPad 13" 1200×1600. Braucht ffmpeg.
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
const FPS = 30;

/* ---------- Beispiel-Insel: Haus mit Tür und Fenstern, Garten, Tiere ---------- */
const BREITE = 44;
const HOEHE = 58;
function beispielInsel() {
  const stapel = Array.from({ length: BREITE * HOEHE }, () => []);
  const setze = (x, y, st) => (stapel[y * BREITE + x] = st);
  const PUTZ = 8, DACH = 14, HOLZ = 2, TUER = 101, TUER_OBEN = 199, FENSTER = 102, LUFT = -1;
  // Haus 5 × 4 Felder, Wände 3 hoch, Dach darüber
  for (let x = 8; x <= 12; x++)
    for (let y = 14; y <= 17; y++) {
      const rand = x === 8 || x === 12 || y === 14 || y === 17;
      setze(x, y, rand ? [PUTZ, PUTZ, PUTZ, DACH] : [LUFT, LUFT, LUFT, DACH]);
    }
  setze(10, 17, [TUER, TUER_OBEN, PUTZ, DACH]);
  setze(9, 17, [HOLZ, FENSTER, PUTZ, DACH]);
  setze(11, 17, [HOLZ, FENSTER, PUTZ, DACH]);
  setze(12, 15, [PUTZ, FENSTER, PUTZ, DACH]);
  setze(12, 16, [PUTZ, FENSTER, PUTZ, DACH]);
  // Garten: Blumen, Sonnenblume, Bank, Apfelbäumchen, Laterne, Brunnen, Zaun
  setze(9, 18, [120]); setze(11, 18, [121]); setze(8, 18, [122]); setze(12, 18, [150]);
  setze(14, 16, [124]); setze(14, 14, [155]); setze(13, 18, [126]); setze(15, 18, [125]);
  for (const y of [13, 14, 15]) setze(16, y, [115]);
  return {
    stapel,
    inventar: { 101: 1, 102: 2, 150: 3 },
    figur: { x: 10, y: 20, z: 0 },
    tiere: [
      { art: 145, x: 14, y: 20, z: 0 },
      { art: 140, x: 15, y: 21, z: 0 },
      { art: 143, x: 13, y: 21, z: 0 },
      { art: 141, x: 8, y: 20, z: 0 },
      { art: 147, x: 16, y: 20, z: 0 },
    ],
    erledigt: [],
  };
}

/* ---------- Aufnahme Bild für Bild ---------- */
class Film {
  constructor(page, cdp, ordner) {
    Object.assign(this, { page, cdp, ordner, n: 0, rest: 0 });
  }
  async an() {
    const jetzt = await this.page.evaluate(() => Date.now());
    await this.page.clock.pauseAt(jetzt + 1000); // etwas Vorlauf: die Seitenuhr läuft weiter, bis der Befehl ankommt
    await this.page.evaluate(() => {
      // CSS-Animationen an die angehaltene Uhr koppeln
      const start = new WeakMap();
      window.__film = (t) => {
        for (const a of document.getAnimations()) {
          if (!start.has(a)) start.set(a, t - (Number(a.currentTime) || 0));
          a.pause();
          a.currentTime = (t - start.get(a)) * (a.playbackRate || 1);
        }
      };
      window.__filmLos = () => document.getAnimations().forEach((a) => a.play());
    });
  }
  async aus() {
    await this.page.evaluate(() => window.__filmLos?.()).catch(() => {});
    await this.page.clock.resume();
  }
  /** Ein Bild: Uhr 1/30 s vor, Animationen nachziehen, Bildschirm fotografieren. */
  async bild() {
    this.rest += 1000 / FPS;
    const ms = Math.floor(this.rest);
    this.rest -= ms;
    await this.page.clock.runFor(ms);
    await this.page.evaluate(() => window.__film?.(performance.now()));
    const { data } = await this.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    writeFileSync(`${this.ordner}/b${String(this.n++).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'));
  }
  async zeige(sek) {
    for (let i = 0; i < Math.round(sek * FPS); i++) await this.bild();
  }
}

/** Bildtext als Band am unteren Rand (oder oben, wo unten Bedienelemente liegen); die Aufgabe oben bleibt frei. */
const bildtext = (page, text, oben = false) =>
  page.evaluate(([text, oben]) => {
    document.getElementById('film-text')?.remove();
    if (!text) return;
    const d = document.createElement('div');
    d.id = 'film-text';
    d.textContent = text;
    Object.assign(d.style, {
      position: 'fixed', left: '0', right: '0', [oben ? 'top' : 'bottom']: '0', zIndex: '9999', pointerEvents: 'none',
      padding: '16px 16px 18px', textAlign: 'center',
      font: '900 clamp(22px, 4.2vw, 40px)/1.15 Nunito, system-ui, sans-serif', color: '#fff', background: '#5a3fa8',
      boxShadow: oben ? '0 3px 0 #1f2a6b' : '0 -3px 0 #1f2a6b',
    });
    document.body.append(d);
  }, [text, oben]);

/* ---------- Lösen ---------- */
const zahl = (s) => Number(String(s).replace(/[^\d-]/g, ''));
/** Richtige Antwort unter den Antwortknöpfen einer Bude finden. */
async function richtigeAntwort(page) {
  const text = (await page.locator('.aufgabe').textContent()).trim();
  const werte = await page.locator('.nur-leser button').allTextContents();
  // Stellenwerte: „8 H 1 Z 9 E“, auch T, ZT, HT, M
  const st = { M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
  const teile = [...text.matchAll(/(\d+)\s*(HT|ZT|M|T|H|Z|E)(?![a-zäöü])/g)];
  if (teile.length) return werte.find((w) => zahl(w) === teile.reduce((s, [, n, e]) => s + Number(n) * st[e], 0));
  // „Fahre zu 80“
  const ziel = text.match(/zu\s+([\d\s.]+)/);
  if (ziel) return werte.find((w) => zahl(w) === zahl(ziel[1]));
  // Gleichung mit „?“: jeden Knopf einsetzen und prüfen (nur Ziffern und Rechenzeichen)
  const rechne = (a) => {
    const s = a.replace(/[−–]/g, '-').replace(/·/g, '*').replace(/:/g, '/').replace(/(\d)\s+(?=\d)/g, '$1');
    if (!/^[\d\s+\-*/().]+$/.test(s)) throw new Error('kein Term');
    return Function(`return (${s})`)();
  };
  if (text.includes('?') && text.includes('=')) {
    const [l, r] = text.split('=');
    return werte.find((w) => {
      try {
        return Math.abs(rechne(l.replace('?', String(zahl(w)))) - rechne(r.replace('?', String(zahl(w))))) < 1e-9;
      } catch {
        return false;
      }
    });
  }
  return undefined;
}

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

  // 1. Jahrmarkt
  await karte();
  await bildtext(page, '30 Buden für den Weg in Klasse 5');
  await page.waitForTimeout(300);
  await f.an();
  await f.zeige(2.4);
  await f.aus();

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
  await auswahlBude('Zahlenstrahl-Seilbahn', 'Silber', 'Orientierung am Zahlenstrahl', 0.9, 2.0);

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
