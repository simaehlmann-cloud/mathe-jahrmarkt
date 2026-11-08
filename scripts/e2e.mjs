#!/usr/bin/env node
/**
 * Ablauftest im echten Browser (Produktions-Build mit Content-Security-Policy).
 * Spielt eine komplette Bronze-Runde mit einem absichtlichen Fehler durch.
 *
 *   npm run build && npm run e2e
 *
 * Umgebung: CHROME_PFAD (Standard /usr/bin/google-chrome), BILDER (Ordner für Bildschirmfotos).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PFAD ?? '/usr/bin/google-chrome';
const BILDER = process.env.BILDER ?? 'e2e-bilder';
const PORT = 4179;
mkdirSync(BILDER, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((ok, fehler) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok());
  server.on('exit', fehler);
  setTimeout(() => fehler(new Error('Vorschau-Server startet nicht')), 20000);
});

const WOERTER = {
  zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
  zwanzig: 20, einundzwanzig: 21, zweiundzwanzig: 22, dreiundzwanzig: 23, vierundzwanzig: 24,
  fünfundzwanzig: 25, sechsundzwanzig: 26, siebenundzwanzig: 27, achtundzwanzig: 28, neunundzwanzig: 29,
};

let fehler = 0;
/** Für ein Bildschirmfoto, falls der Ablauf abbricht. */
let letzteSeite;
const pruefe = (b, text) => {
  if (!b) {
    fehler++;
    console.error(`✗ ${text}`);
  } else console.log(`✓ ${text}`);
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', ...(process.env.DROSSEL ? ['--disable-gpu'] : [])] });
try {
  for (const [name, viewport] of [
    ['quer', { width: 1180, height: 820 }],
    ['hoch', { width: 390, height: 844 }],
  ]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true });
    const page = await ctx.newPage();
    letzteSeite = page;
    // Großzügige Zeiten: CI-Rechner haben keine Grafikkarte und sind langsamer.
    page.setDefaultTimeout(20000);
    if (process.env.DROSSEL) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.DROSSEL) });
    }
    const konsole = [];
    page.on('console', (m) => m.type() === 'error' && konsole.push(m.text()));
    page.on('pageerror', (e) => konsole.push(String(e)));
    const foto = (n) => page.screenshot({ path: `${BILDER}/${name}-${n}.png` });
    const weiter = async () => page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();

    await page.goto(`http://localhost:${PORT}/`);
    await page.getByText('Wie heißt du?').waitFor();
    await foto('01-start');
    await page.getByPlaceholder('Spitzname').fill('Alex');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await page.getByText('Ich bin Flinka').waitFor();
    await foto('02-intro');
    for (let i = 0; i < 3; i++) await weiter();
    await foto('03-jahrmarkt');

    await page.getByRole('button', { name: /Zahlengasse/ }).click();
    await page.getByText('Willkommen in der Zahlengasse').waitFor();
    await weiter();
    await foto('04-gasse');
    await page.getByRole('button', { name: 'Dartbude öffnen' }).click();
    await foto('05-vorplatz');
    pruefe(await page.getByRole('radio', { name: /Silber/ }).getAttribute('aria-checked') === 'false', 'Silber ist ohne Paket nicht gewählt');

    await page.getByRole('button', { name: 'Bronze spielen' }).click();
    await page.locator('canvas').waitFor();
    await page.waitForTimeout(900);
    await foto('06-probewurf');

    const loese = async (falsch = false, doppelt = false) => {
      const text = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
      const [a, b] = text.split('·').map((x) => Number(x.trim()));
      const richtig = a * b;
      const knoepfe = page.locator('.nur-leser button');
      const werte = await knoepfe.allTextContents();
      const ziel = falsch ? werte.find((w) => Number(w) !== richtig) : String(richtig);
      await page.waitForTimeout(1300); // nicht „zu schnell getippt“ (Grenze 900 ms)
      const id = await page.locator('.schild').getAttribute('data-aufgabe');
      await knoepfe.filter({ hasText: new RegExp(`^${ziel}$`) }).dispatchEvent('click');
      // Doppelt tippen darf nicht doppelt zählen
      if (doppelt) await knoepfe.filter({ hasText: new RegExp(`^${ziel}$`) }).dispatchEvent('click');
      return { a, b, richtig, id };
    };
    /** Wartet, bis eine neue Aufgabe oder ein Dialog erscheint. */
    const abwarten = async (id) => {
      await page.waitForFunction(
        (alt) => document.querySelector('.schild')?.getAttribute('data-aufgabe') !== alt || document.querySelector('[role=dialog]'),
        id,
        { timeout: 20000 },
      );
    };

    await abwarten((await loese()).id); // Probewurf
    pruefe((await page.locator('.marke').count()) === 0, 'Nach dem Probewurf beginnt die Runde');
    // Erste Aufgabe absichtlich falsch → Hilfe
    await loese(true);
    await page.getByText('Schauen wir genau hin').waitFor();
    await foto('07-hilfe-zeigen');
    await page.getByRole('button', { name: 'Weiter' }).click();
    await foto('08-hilfe-hervorheben');
    await page.getByRole('button', { name: 'Weiter' }).click();
    const frage = await page.locator('.hilfe .frage').textContent();
    const loesung = frage.replace('= ?', '').split('+').reduce((s, x) => {
      const [a, b] = x.split('·').map((y) => Number(y.trim()));
      return s + (Number.isNaN(b) ? a : a * b);
    }, 0);
    await page.locator('.hilfe .auswahl button').filter({ hasText: new RegExp(`^${loesung}$`) }).click();
    await foto('09-hilfe-geschafft');
    await page.getByRole('button', { name: 'Nochmal probieren' }).click();
    pruefe((await page.locator('.marke').textContent())?.includes('ähnliche'), 'Nach der Hilfe kommt eine ähnliche Aufgabe');
    await abwarten((await loese()).id);
    for (let i = 0; i < 9; i++) await abwarten((await loese(false, i === 0)).id);
    await page.getByText('Bronze geschafft!').waitFor();
    await foto('10-ende');
    pruefe(await page.getByText('9 von 10').isVisible(), 'Ergebnis zeigt 9 von 10');
    await page.getByRole('button', { name: 'Zur Bude' }).click();
    await page.getByText(/Lichter der Dartbude brennen wieder/).waitFor();
    await foto('11-flinka-lob');
    await weiter();
    await page.getByRole('button', { name: 'Zurück' }).click();
    await foto('12-gasse-licht-katze');
    pruefe(await page.getByRole('button', { name: 'Katze auf dem Dach' }).isVisible(), 'Katze erscheint nach Bronze');

    // Elternbereich
    await page.getByRole('button', { name: 'Elternbereich' }).click();
    const sperre = await page.locator('.frage').textContent();
    const [, w1, w2] = sperre.match(/Was ist (\S+) mal (\S+)\?/);
    await page.getByLabel(sperre).fill(String(WOERTER[w1] * WOERTER[w2]));
    await page.getByRole('button', { name: 'Öffnen' }).click();
    await page.getByRole('heading', { name: /Die letzten 7 Tage/ }).waitFor();
    await foto('13-eltern-bericht');
    await page.getByRole('button', { name: 'Zusatzpaket' }).click();
    await foto('14-eltern-paket');
    await page.getByRole('button', { name: /freischalten/ }).click();
    await page.getByText('noch nicht verfügbar').waitFor();
    pruefe(true, 'Store-Version bietet ohne native Anbindung keinen Scheinkauf an');
    await page.getByRole('button', { name: 'Elternbereich schließen' }).click();
    await page.getByRole('button', { name: 'Mein Mathe-Profil' }).click();
    await foto('15-mathe-profil');

    // Daten überstehen das Neuladen
    await page.reload();
    await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
    pruefe(await page.getByText('1 von 24').isVisible(), `${name}: Fortschritt bleibt nach Neustart erhalten`);

    pruefe(konsole.length === 0, `${name}: keine Fehler in der Konsole${konsole.length ? `: ${konsole.join(' | ')}` : ''}`);
    await ctx.close();
  }
} catch (e) {
  fehler++;
  console.error('✗ Ablauf abgebrochen:', e.message);
  if (letzteSeite) {
    await letzteSeite.screenshot({ path: `${BILDER}/abbruch.png` }).catch(() => {});
    const hinweis = await letzteSeite.locator('.hinweis').allTextContents().catch(() => []);
    console.error('  Hinweise auf dem Bildschirm:', JSON.stringify(hinweis));
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(fehler ? `${fehler} Fehler` : 'Alles in Ordnung');
process.exit(fehler ? 1 : 0);
