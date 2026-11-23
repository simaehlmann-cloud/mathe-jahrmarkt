// Store-Material der Schulversion „Mathe-Jahrmarkt Schule“: iPad-Bildschirmfotos und App-Vorschauvideo, beides quer.
// Aufruf: VITE_AUSGABE=schule npm run build && npm run store-schule   (Ergebnis in store-schule/, eigener Ordner mit AUS=…)
//         NUR=bilder oder NUR=video für einen Teil.
//
// Die Beispielklasse 4a (23 Kinder, keine echten Daten) entsteht wie im Unterricht: Die Lehrkraft richtet das iPad ein,
// gibt die Klassenliste weiter, und scripts/schule-beispiel.ts macht daraus Ergebnisdateien von sechs „Kinder-iPads“,
// die hier eingesammelt werden. So zeigen Klassenübersicht, Einzelbericht und Aufträge echte Auswertungen der App.
//
// Apple (iPad 13"): Bildschirmfotos 2752 × 2064 (quer), Vorschauvideo 1600 × 1200, 15–30 s, 30 fps, H.264. Braucht ffmpeg.
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const AUS = process.env.AUS ?? 'store-schule';
const ROH = `${AUS}/roh`;
const DATEIEN = `${AUS}/.dateien`;
mkdirSync(ROH, { recursive: true });
mkdirSync(DATEIEN, { recursive: true });
const NUR = process.env.NUR;
const PORT = 4997;
const PIN = '472915';
const ZEIT = new Date('2026-06-16T10:30:00');
const FPS = 30;

// Der Erzeuger ist TypeScript und nutzt den Code der App: einmal bündeln
execFileSync('npx', ['rolldown', 'scripts/schule-beispiel.ts', '--file', `${DATEIEN}/schule-beispiel.mjs`, '--platform', 'node', '--format', 'esm'], { stdio: 'ignore' });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((ok) => server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok()));
const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const URL = `http://localhost:${PORT}/`;

const KINDER = ['Mia S.', 'Jonas K.', 'Aylin T.', 'Ben M.', 'Emma R.', 'Noah W.', 'Lina H.', 'Elias B.', 'Sofia D.', 'Paul F.', 'Hannah L.', 'Luca G.',
  'Lea N.', 'Finn O.', 'Ella P.', 'Mats J.', 'Zoe A.', 'Emil C.', 'Leni V.', 'Yusuf E.', 'Clara U.', 'Anton I.', 'Mila Z.'];

/** Ein „Lehrer-iPad“ mit fertig eingerichteter Klasse 4a, Aufträgen und eingesammelten Ergebnissen. */
async function eingerichtetesIpad(viewport, dsf) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.clock.install({ time: ZEIT });
  page.setDefaultTimeout(30000);
  await page.addLocatorHandler(page.getByRole('alertdialog', { name: 'Pausenzeit!' }), async () => {
    await page.getByRole('button', { name: 'Noch 5 Minuten' }).click();
  });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Lehrerbereich einrichten' }).click();
  await page.getByLabel(/Name dieses iPads/).fill('Lehrer-iPad');
  await page.getByLabel(/^PIN \(/).fill(PIN);
  await page.getByLabel('PIN wiederholen').fill(PIN);
  await page.getByRole('button', { name: 'PIN festlegen' }).click();
  await page.getByLabel('Ich habe den Code notiert.').check();
  await page.getByRole('button', { name: 'Weiter zum Lehrerbereich' }).click();
  await page.getByLabel('Name der Klasse').fill('4a');
  await page.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await page.getByLabel(/Kinder hinzufügen/).fill(KINDER.join('\n'));
  await page.getByRole('button', { name: `${KINDER.length} Kinder anlegen` }).click();
  await page.getByText(new RegExp(`${KINDER.length} Kinder angelegt`)).waitFor();

  // Ein Auftrag an die ganze Klasse: Uhr-Karussell, Bronze (Silber und Gold erspielen sich die Kinder nacheinander)
  await page.getByRole('button', { name: 'Aufträge', exact: true }).click();
  const neu = page.getByRole('button', { name: '+ Neuer Auftrag' });
  if (await neu.count()) await neu.click();
  await page.getByLabel('Was?').selectOption('uhrkarussell');
  await page.getByLabel('Stufe').selectOption('bronze');
  await page.getByRole('button', { name: 'Auftrag erteilen' }).click();
  await page.getByText(/0 von 23 erledigt/).waitFor();
  // Gezielt: Rechen-Werkstatt für drei Kinder, dazu der Jahrmarkt-Check für alle
  await page.getByRole('button', { name: '+ Neuer Auftrag' }).click();
  await page.getByLabel('Was?').selectOption('rechenwerkstatt');
  await page.getByLabel('Einzelne Kinder').check();
  for (const k of ['Aylin T.', 'Emma R.', 'Finn O.']) await page.getByLabel(k, { exact: true }).check();
  await page.getByRole('button', { name: 'Auftrag erteilen' }).click();
  await page.getByText(/0 von 3 erledigt/).waitFor();
  await page.getByRole('button', { name: '+ Neuer Auftrag' }).click();
  await page.getByLabel('Was?').selectOption('check');
  await page.getByRole('button', { name: 'Auftrag erteilen' }).click();
  await page.waitForTimeout(300);

  // Klassenliste weitergeben (im Browser: Download) und daraus die Beispieldaten erzeugen
  await page.getByRole('button', { name: 'Daten austauschen' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Klassenliste weitergeben' }).click()]);
  const liste = `${DATEIEN}/klassenliste.jahrmarkt`;
  await dl.saveAs(liste);
  for (const f of readdirSync(DATEIEN)) if (f.startsWith('ergebnisse-') || f.startsWith('klassenliste-figuren')) rmSync(`${DATEIEN}/${f}`);
  const jetzt = await page.evaluate(() => Date.now());
  execFileSync('node', [`${DATEIEN}/schule-beispiel.mjs`, liste, PIN, DATEIEN, String(jetzt)], { stdio: 'inherit' });

  // Figuren der Kinder übernehmen (als hätten sie sie beim ersten Anmelden gestaltet)
  await page.locator('input[type=file]').setInputFiles(`${DATEIEN}/klassenliste-figuren.jahrmarkt`);
  await page.getByLabel(/Bildpasswörter auf diesem iPad dürfen ersetzt werden/).check();
  await page.getByRole('button', { name: 'Übernehmen' }).click();
  await page.getByText(/aktualisiert/).first().waitFor();
  // Ergebnisse der sechs Kinder-iPads einsammeln (alle auf einmal)
  const ergebnisse = readdirSync(DATEIEN).filter((f) => f.startsWith('ergebnisse-')).sort().map((f) => `${DATEIEN}/${f}`);
  await page.locator('input[type=file]').setInputFiles(ergebnisse);
  await page.getByText(/iPad 7 · 3 Kinder/).waitFor();
  return { ctx, page };
}

const lehrerOeffnen = async (page) => {
  await page.getByRole('button', { name: 'Lehrerbereich', exact: true }).click();
  await page.getByLabel('Lehrer-PIN').fill(PIN);
  await page.getByRole('button', { name: 'Öffnen' }).click();
  await page.getByRole('heading', { name: 'Lehrerbereich' }).waitFor();
};
const lehrerZu = (page) => page.getByRole('button', { name: 'Lehrerbereich schließen' }).click();

/** Bildpasswort eines Kindes aus der Lehreransicht (Klassen → Passwörter zeigen). */
async function passwortVon(page, kind) {
  await page.getByRole('button', { name: 'Klassen', exact: true }).click();
  const zeigen = page.getByRole('button', { name: 'Passwörter zeigen' });
  if (await zeigen.count()) await zeigen.click();
  const label = await page.locator('.kinder li', { hasText: kind }).locator('.pw').getAttribute('aria-label');
  return label.replace('Bildpasswort: ', '').split(' – ');
}

/** Flinkas Begrüßung, Rundgang und Ansagen wegtippen, bis der Jahrmarkt eine Weile frei ist. */
async function jahrmarktFrei(page) {
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  let ruhig = 0;
  for (let i = 0; i < 80 && ruhig < 8; i++) {
    await page.waitForTimeout(300);
    const ueber = page.getByRole('button', { name: 'Überspringen' });
    const weiter = page.getByRole('button', { name: /^(Weiter|Los geht’s|Los geht's|Alles klar|Verstanden|Fertig)$/ });
    if (await ueber.count()) await ueber.first().click({ timeout: 3000 }).catch(() => {});
    else if (await weiter.count()) await weiter.last().click({ timeout: 3000 }).catch(() => {});
    else {
      ruhig++;
      continue;
    }
    ruhig = 0;
  }
}

/** Bude öffnen, Begrüßungen wegtippen, Stufe wählen und Runde starten. */
async function budeSpielen(page, titel, stufe) {
  await page.getByRole('button', { name: new RegExp(`^${titel} öffnen`) }).click();
  const radio = page.getByRole('radio', { name: new RegExp(stufe) });
  for (let i = 0; i < 60 && !(await radio.count()); i++) {
    const w = page.getByRole('button', { name: /^(Weiter|Los geht’s|Los geht's)$/ });
    if (await w.count()) await w.last().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < 20; i++) {
    await radio.first().click({ timeout: 2000 }).catch(() => {});
    const los = page.getByRole('button', { name: `${stufe} spielen` });
    if ((await los.count()) && (await los.click({ timeout: 2000 }).then(() => true).catch(() => false))) return;
    const w = page.getByRole('button', { name: /^(Weiter|Los geht’s|Los geht's)$/ });
    if (await w.count()) await w.last().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${AUS}/fehler-${titel}.png` });
  throw new Error(`${titel}: Runde ließ sich nicht starten`);
}

async function anmelden(page, kind, pw, bisZum = 3) {
  await page.getByRole('button', { name: `${kind}: anmelden` }).click();
  for (const s of pw.slice(0, bisZum)) await page.getByRole('group', { name: 'Bilder' }).getByRole('button', { name: s, exact: true }).click();
}

/* ======================= Bildschirmfotos ======================= */

/** Reihenfolge = Reihenfolge im Store; die ersten drei sieht man in der Suche. */
const BILDER = [
  ['1-start', 'Bis zu 32 Kinder auf einem iPad'],
  ['2b-klasse-tabelle', 'Klassenübersicht mit Ampel je Kompetenz'],
  ['3-jahrmarkt', '30 Buden – und Aufträge von der Lehrkraft'],
  ['4-bude', 'Uhr, Geld und Längen zum Anfassen'],
  ['5-hilfe', 'Fehler? Hilfe in kleinen Schritten'],
  ['6-einzel', 'Einzelbericht für jedes Kind – auch als PDF'],
  ['7-auftraege', 'Aufträge an die Klasse oder einzelne Kinder'],
  ['8-passwort', 'Anmelden mit drei Bildern'],
  ['9-austausch', 'Ergebnisse einsammeln – ohne Server, ohne Konto'],
];

async function bilder() {
  const { ctx, page } = await eingerichtetesIpad({ width: 1376, height: 1032 }, 2);
  const foto = (n) => page.screenshot({ path: `${ROH}/${n}.png` });
  const nachOben = () => page.evaluate(() => document.querySelectorAll('*').forEach((e) => e.scrollTop > 0 && (e.scrollTop = 0)));
  // Meldungen abwarten, dann die Liste der eingesammelten iPads zeigen
  await page.getByRole('button', { name: 'Klassen', exact: true }).click();
  await page.waitForTimeout(7000);
  await page.getByRole('button', { name: 'Daten austauschen' }).click();
  await page.getByRole('heading', { name: 'Eingesammelte Ergebnisse' }).evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(600);
  await foto('9-austausch');

  // Auswertung: Klassenübersicht und Einzelbericht
  await page.getByRole('button', { name: 'Auswertung' }).click();
  await page.locator('table').first().waitFor();
  await nachOben();
  await page.waitForTimeout(500);
  await foto('2-klasse');
  await page.locator('table').first().evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);
  await foto('2b-klasse-tabelle');
  await page.getByRole('button', { name: 'Einzelbericht' }).click();
  await page.getByLabel('Kind').selectOption({ label: 'Mia S.' });
  await page.getByRole('heading', { name: /Fehlermuster/ }).waitFor();
  await nachOben();
  await page.waitForTimeout(500);
  await foto('6-einzel');

  // Aufträge
  await page.getByRole('button', { name: 'Aufträge', exact: true }).click();
  await page.getByText(/von 23 erledigt/).waitFor();
  await page.waitForTimeout(400);
  await foto('7-auftraege');

  const pwMia = await passwortVon(page, 'Mia S.');
  const pwNoah = await passwortVon(page, 'Noah W.');
  await lehrerZu(page);
  await page.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  await page.waitForTimeout(600);
  await foto('1-start');

  // Bildpasswort: zwei von drei Bildern getippt
  await anmelden(page, 'Mia S.', pwMia, 2);
  await page.waitForTimeout(500);
  await foto('8-passwort');
  await page.getByRole('group', { name: 'Bilder' }).getByRole('button', { name: pwMia[2], exact: true }).click();
  await jahrmarktFrei(page);
  await page.waitForTimeout(800);
  // Ansicht zum Größenmarkt schieben: Uhr-Karussell mit dem blauen Fähnchen der Lehrkraft
  await page.getByRole('button', { name: /^Uhr-Karussell öffnen/ }).evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(1200);
  await foto('3-jahrmarkt');
  await page.getByRole('button', { name: /^Tagesaufträge/ }).click();
  await page.getByText('Von deiner Lehrkraft').waitFor();
  await page.waitForTimeout(500);
  await foto('3b-auftraege-kind');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Schließen|✕/ }).first().click().catch(() => {});
  await page.waitForTimeout(400);

  // Auftrag erledigen: Uhr-Karussell
  await budeSpielen(page, 'Uhr-Karussell', 'Bronze');
  await page.waitForTimeout(2200);
  await foto('4-bude');

  // Hilfe nach einem Fehler: Noah an der Dartbude
  await page.goto(URL); // Neustart meldet in der Schulversion ab
  await page.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  await anmelden(page, 'Noah W.', pwNoah);
  await jahrmarktFrei(page);
  await budeSpielen(page, 'Dartbude', 'Bronze');
  await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(1500);
  {
    // Erst der Probewurf (zählt nicht), dann absichtlich daneben, bis die Hilfe kommt
    const hilfe = page.getByText('Schauen wir genau hin');
    for (let i = 0; i < 12 && !(await hilfe.count()); i++) {
      const text = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
      const [x, y] = text.split('·').map((s) => Number(s.trim()));
      const werte = await page.locator('.nur-leser button').allTextContents();
      // Daneben erst bei einer Aufgabe, die etwas hermacht (nicht 1 · 8)
      const zeigen = i > 0 && Math.min(x, y) >= 2 && x * y >= 12;
      const wahl = zeigen || i === 11 ? werte.find((w) => Number(w) !== x * y) : String(x * y);
      const id = await page.locator('.schild').getAttribute('data-aufgabe');
      await page.waitForTimeout(1100);
      await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${wahl}$`) }).dispatchEvent('click');
      await page.waitForFunction((alt) => document.querySelector('.schild')?.getAttribute('data-aufgabe') !== alt || document.body.innerText.includes('Schauen wir genau hin'), id, { timeout: 20000 });
      await page.waitForTimeout(600);
    }
    await hilfe.waitFor();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.waitForTimeout(900);
    await foto('5-hilfe');
  }
  await ctx.close();
}

const schrift = (gewicht) => readFileSync(`node_modules/@fontsource/nunito/files/nunito-latin-${gewicht}-normal.woff2`).toString('base64');
const SCHRIFT = `@font-face{font-family:N;font-weight:900;src:url(data:font/woff2;base64,${schrift(900)})}`;
const bildUrl = (pfad) => `data:image/png;base64,${readFileSync(pfad).toString('base64')}`;
const HINTERGRUND = 'radial-gradient(120% 90% at 50% 25%, #8f6fd6 0%, #5a3fa8 55%, #2b2470 100%)';

/** Gerahmtes Store-Bild quer: Bildtext oben, Aufnahme darunter. Ein kleines Band „Schulversion“ links oben. */
async function rahmen(roh, text, breite, hoehe, ziel) {
  const p = await b.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
  const kopf = Math.round(hoehe * 0.17);
  const gross = Math.round(Math.min(breite * 0.052, hoehe * 0.07));
  await p.setContent(`<html><head><style>${SCHRIFT}
    html,body{margin:0;width:${breite}px;height:${hoehe}px;overflow:hidden;background:${HINTERGRUND}}
    h1{position:absolute;left:6%;right:6%;top:0;height:${kopf}px;margin:0;display:flex;align-items:center;justify-content:center;text-align:center;
      font:900 ${gross}px/1.1 N;color:#fff;letter-spacing:-0.01em;text-wrap:balance;text-shadow:0 ${hoehe * 0.005}px 0 #1f2a6b}
    img{position:absolute;left:50%;transform:translateX(-50%);border-radius:${hoehe * 0.03}px;border:${Math.max(4, hoehe * 0.006)}px solid #1f2a6b;
      box-shadow:0 ${hoehe * 0.012}px 0 #1f2a6b, 0 ${hoehe * 0.03}px ${hoehe * 0.05}px #0006}
  </style></head><body><h1>${text}</h1><img id="b" src="${bildUrl(roh)}"></body></html>`);
  await p.evaluate(({ kopf, breite, hoehe }) => {
    const img = document.getElementById('b');
    const s = Math.min((breite * 0.9) / img.naturalWidth, (hoehe * 0.97 - kopf) / img.naturalHeight);
    img.style.width = `${img.naturalWidth * s}px`;
    img.style.height = `${img.naturalHeight * s}px`;
    img.style.top = `${kopf}px`;
  }, { kopf, breite, hoehe });
  await p.screenshot({ path: ziel });
  await p.close();
}

/* ======================= Vorschauvideo ======================= */

class Film {
  constructor(page, cdp, ordner) {
    Object.assign(this, { page, cdp, ordner, n: 0, rest: 0 });
  }
  async an() {
    const jetzt = await this.page.evaluate(() => Date.now());
    await this.page.clock.pauseAt(jetzt + 1000);
    await this.page.evaluate(() => {
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

const bildtext = (page, text, oben = false) =>
  page.evaluate(([text, oben]) => {
    document.getElementById('film-text')?.remove();
    if (!text) return;
    const d = document.createElement('div');
    d.id = 'film-text';
    d.textContent = text;
    Object.assign(d.style, {
      position: 'fixed', left: '0', right: '0', [oben ? 'top' : 'bottom']: '0', zIndex: '9999', pointerEvents: 'none',
      padding: '14px 16px 16px', textAlign: 'center',
      font: '900 34px/1.15 Nunito, system-ui, sans-serif', color: '#fff', background: '#5a3fa8',
      boxShadow: oben ? '0 3px 0 #1f2a6b' : '0 -3px 0 #1f2a6b',
    });
    document.body.append(d);
  }, [text, oben]);

async function video() {
  const viewport = { width: 1200, height: 900 };
  const dsf = 4 / 3;
  const ordner = `${AUS}/.bilder-video`;
  rmSync(ordner, { recursive: true, force: true });
  mkdirSync(ordner, { recursive: true });
  const { ctx, page } = await eingerichtetesIpad(viewport, dsf);
  const pw = await passwortVon(page, 'Lina H.');
  await lehrerZu(page);
  await page.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  const cdp = await ctx.newCDPSession(page);
  const f = new Film(page, cdp, ordner);
  const tippe = async (loc, sek) => {
    await loc.dispatchEvent('click');
    await f.zeige(sek);
  };

  // 1. Startbildschirm, Kind meldet sich mit Bildpasswort an
  await page.waitForTimeout(500);
  await bildtext(page, 'Bis zu 32 Kinder auf einem iPad');
  await f.an();
  await f.zeige(1.6);
  await tippe(page.getByRole('button', { name: 'Lina H.: anmelden' }), 0.7);
  await bildtext(page, 'Anmelden mit drei Bildern');
  for (const s of pw) await tippe(page.getByRole('group', { name: 'Bilder' }).getByRole('button', { name: s, exact: true }), 0.45);
  await f.zeige(0.2);
  await f.aus();
  await jahrmarktFrei(page);

  // 2. Jahrmarkt mit Auftrag der Lehrkraft: Ansicht zum Uhr-Karussell mit dem blauen Fähnchen
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Uhr-Karussell öffnen/ }).evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(800);
  await bildtext(page, '30 Buden – das blaue Fähnchen ist der Auftrag');
  await f.an();
  await f.zeige(2.4);
  await f.aus();

  // 3. Dartbude: eine Aufgabe sichtbar lösen
  await budeSpielen(page, 'Dartbude', 'Bronze');
  await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(1500);
  await bildtext(page, 'Einmaleins mit Pfeil und Ballon');
  {
    const text = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    let ziel;
    if (text.includes('·')) {
      const [x, y] = text.split('·').map((s) => Number(s.trim()));
      ziel = x * y;
    } else if (text.includes(':')) {
      const [x, y] = text.split(':').map((s) => Number(s.trim()));
      ziel = x / y;
    }
    await f.an();
    await f.zeige(1.1);
    const alle = await page.locator('.nur-leser button').allTextContents();
    const i = alle.findIndex((w) => Number(w) === ziel);
    await page.locator('.nur-leser button').nth(i >= 0 ? i : 0).dispatchEvent('click');
    await f.zeige(1.6);
    await f.aus();
  }

  // 4. Abmelden, Lehrerbereich: Klassenübersicht, Einzelbericht, Aufträge
  await page.goto(URL); // Neustart meldet in der Schulversion ab
  await page.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  await lehrerOeffnen(page);
  await page.getByRole('button', { name: 'Auswertung' }).click();
  await page.locator('table').first().waitFor();
  await page.waitForTimeout(500);
  await bildtext(page, 'Klassenübersicht mit Ampel je Kompetenz');
  await f.an();
  await f.zeige(2.0);
  // langsam nach unten scrollen
  const bereich = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible' && e.clientHeight > 300);
    if (el) el.setAttribute('data-film-scroll', '1');
    return !!el;
  });
  for (let i = 0; i < 45; i++) {
    await page.evaluate((b) => (b ? document.querySelector('[data-film-scroll]') : document.scrollingElement)?.scrollBy(0, 9), bereich);
    await f.bild();
  }
  await f.zeige(0.8);
  await f.aus();
  await page.getByRole('button', { name: 'Einzelbericht' }).click();
  await page.getByLabel('Kind').selectOption({ label: 'Mia S.' });
  await page.getByRole('heading', { name: /Fehlermuster/ }).waitFor();
  await page.waitForTimeout(400);
  await bildtext(page, 'Einzelbericht für jedes Kind');
  await f.an();
  await f.zeige(2.4);
  await f.aus();
  await page.getByRole('button', { name: 'Aufträge', exact: true }).click();
  await page.getByText(/von 23 erledigt/).waitFor();
  await page.waitForTimeout(400);
  await bildtext(page, 'Aufträge an die Klasse oder einzelne Kinder');
  await f.an();
  await f.zeige(2.4);
  await f.aus();
  await page.getByRole('button', { name: 'Daten austauschen' }).click();
  await page.waitForTimeout(400);
  await bildtext(page, 'Ohne Server, ohne Konto, ohne Werbung');
  await f.an();
  await f.zeige(2.6);
  await f.aus();
  await ctx.close();

  const ziel = `${AUS}/vorschau-ipad-quer.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${ordner}/b%05d.jpg`,
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-vf', 'scale=1600:1200,format=yuv420p', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-preset', 'slow', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', ziel]);
  const sek = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ziel]).toString());
  if (sek < 15 || sek > 30) throw new Error(`${ziel}: ${sek.toFixed(1)} s – Apple verlangt 15 bis 30 Sekunden`);
  console.log(`${ziel}: ${sek.toFixed(1)} s, 1600×1200`);
  // Vorschaubild (Poster) für App Store Connect: ein ruhiges Bild aus der Mitte
  rmSync(ordner, { recursive: true, force: true });
}

try {
  if (!NUR || NUR === 'bilder') {
    if (!process.env.NUR_RAHMEN) await bilder();
    for (const [i, [name, text]] of BILDER.entries()) await rahmen(`${ROH}/${name}.png`, text, 2752, 2064, `${AUS}/ipad-quer-${i + 1}.png`);
    console.log(`${BILDER.length} Bildschirmfotos 2752×2064`);
  }
  if (!NUR || NUR === 'video') await video();
} finally {
  try { process.kill(-server.pid); } catch { server.kill(); }
  await b.close();
}
process.exit(0);
