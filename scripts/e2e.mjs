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
    const konsole = (globalThis.konsole = []);
    page.on('console', (m) => m.type() === 'error' && konsole.push(m.text()));
    page.on('pageerror', (e) => konsole.push(String(e)));
    const foto = (n) => page.screenshot({ path: `${BILDER}/${name}-${n}.png` });
    const weiter = async () => page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();

    await page.goto(`http://localhost:${PORT}/`);
    await page.getByText('Wie heißt du?').waitFor();
    await foto('01-start');
    await page.getByPlaceholder('Spitzname').fill('Alex');
    // Enter auf der Tastatur führt zum Baukasten, nicht direkt ins Spiel
    await page.getByPlaceholder('Spitzname').press('Enter');
    await page.getByText('Gestalte deine Figur, Alex!').waitFor();
    await foto('01b-figur-anlegen');
    const vorschau = await page.locator('.vorschau').boundingBox();
    pruefe(!!vorschau && vorschau.y >= 0 && vorschau.y + vorschau.height <= page.viewportSize().height, `${name}: Figur beim Anlegen sichtbar`);
    const los = await page.getByRole('button', { name: 'Los geht’s' }).boundingBox();
    pruefe(!!los && los.y + los.height <= page.viewportSize().height, `${name}: „Los geht’s“ ohne Blättern sichtbar`);
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await page.getByText('Ich bin Flinka').waitFor();
    await foto('02-intro');
    for (let i = 0; i < 4; i++) await weiter();
    await foto('03-jahrmarkt');

    // Begehbarer Jahrmarkt: Tippen auf die Bude, die Figur läuft hin
    await page.getByRole('button', { name: 'Dartbude öffnen' }).click();
    await page.waitForTimeout(400);
    await foto('04-laufen');
    await page.getByText('Willkommen in der Zahlengasse').waitFor();
    await weiter();
    await page.getByRole('button', { name: 'Bronze spielen' }).waitFor();
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
    await page.locator('.karte').waitFor();
    await page.waitForTimeout(500);
    await foto('12-karte-licht-katze');
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

    // Figuren-Baukasten: Eule mit Brille und blauem Tuch
    await page.getByRole('button', { name: 'Figur gestalten' }).click();
    await page.getByText('Eule', { exact: true }).click();
    await page.getByText('Brille', { exact: true }).click();
    await page.getByText('Blau', { exact: true }).click();
    await foto('16-baukasten');
    // Auch mit großer Systemschrift (wie auf vielen Handys) bleiben Vorschau und Speichern sichtbar, ohne zu blättern
    await page.evaluate(() => (document.documentElement.style.fontSize = '125%'));
    await page.waitForTimeout(200);
    await foto('16b-baukasten-grosse-schrift');
    const imBild = async (loc) => {
      const b = await loc.boundingBox();
      const v = page.viewportSize();
      return !!b && b.y >= 0 && b.y + b.height <= v.height + 1 && b.x >= 0 && b.x + b.width <= v.width + 1;
    };
    pruefe(await imBild(page.getByRole('button', { name: 'Speichern' })), `${name}: „Speichern“ bei großer Schrift sichtbar`);
    pruefe(await imBild(page.locator('.vorschau')), `${name}: Vorschau bei großer Schrift sichtbar`);
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByRole('heading', { name: 'Mein Mathe-Profil' }).waitFor();

    // Daten überstehen das Neuladen
    await page.reload();
    await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
    pruefe(await page.getByText('1 von 24').isVisible(), `${name}: Fortschritt bleibt nach Neustart erhalten`);
    const gespeichert = await page.evaluate(() => {
      const roh = localStorage.getItem('CapacitorStorage.mathe-jahrmarkt.daten');
      return roh ? JSON.parse(roh).profile[0] : null;
    });
    pruefe(gespeichert?.figur === 'eule' && gespeichert?.aussehen?.extra === 'brille' && gespeichert?.aussehen?.tuch === 'blau', `${name}: Figur aus dem Baukasten bleibt gespeichert`);

    // Baukasten ist auch direkt vom Startbildschirm aus erreichbar
    await page.locator('header button.figur').click();
    await page.getByRole('heading', { name: 'Wer spielt?' }).waitFor();
    await foto('17-wer-spielt');
    await page.getByRole('button', { name: /^Figur von .* gestalten$/ }).first().click();
    await page.getByRole('button', { name: 'Speichern' }).waitFor();
    pruefe(true, `${name}: Figur gestalten vom Startbildschirm erreichbar`);

    // Neue Buden: Einmaleins-Turbo (Ziffernfeld) und Dosenwerfen (Stellenwert)
    await page.reload();
    await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
    await page.getByRole('button', { name: 'Einmaleins-Turbo öffnen' }).click();
    await page.getByRole('button', { name: 'Bronze spielen' }).click();
    await page.locator('.turbo-bahn canvas').waitFor();
    await page.waitForTimeout(600);
    const tippe = async (zahl) => {
      for (const z of String(zahl)) await page.locator('.tasten button').filter({ hasText: new RegExp(`^${z}$`) }).click();
      await page.getByRole('button', { name: 'Fertig' }).click();
    };
    const turboLoesen = async (falsch = false) => {
      const text = (await page.locator('.aufgabe').textContent()).replace('= ?', '').trim();
      const [a, b] = text.split('·').map((x) => Number(x.trim()));
      const id = await page.locator('.schild').getAttribute('data-aufgabe');
      await tippe(falsch ? a * b + 1 : a * b);
      return id;
    };
    await foto('18-turbo-probe');
    await abwarten(await turboLoesen()); // Probe
    await page.getByRole('button', { name: /Turbo aus/ }).click();
    pruefe(await page.getByRole('button', { name: 'Turbo an' }).isVisible(), `${name}: Turbo lässt sich einschalten`);
    await abwarten(await turboLoesen());
    await foto('19-turbo-fahrt');
    await turboLoesen(true);
    await page.getByText('Schauen wir genau hin').waitFor();
    await foto('20-turbo-hilfe');
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.getByRole('button', { name: 'Weiter' }).click();
    for (const knopf of await page.locator('.hilfe .auswahl button').all()) {
      if (await page.getByText('Super!').isVisible()) break;
      await knopf.click();
    }
    await page.getByRole('button', { name: 'Nochmal probieren' }).click();
    await abwarten(await turboLoesen());
    pruefe(true, `${name}: Einmaleins-Turbo mit Ziffernfeld spielbar`);
    await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
    await page.getByRole('button', { name: 'Zurück' }).first().click();
    await page.locator('.karte').waitFor();
    await foto('20b-karte-vor-turbo');

    await page.getByRole('button', { name: 'Dosenwerfen öffnen' }).click();
    await page.getByRole('button', { name: 'Bronze spielen' }).click();
    await page.locator('canvas').waitFor();
    await page.waitForTimeout(900);
    await foto('21-dosen-probe');
    const tippeDose = async (wert) => {
      await page.waitForTimeout(1000);
      const id = await page.locator('.schild').getAttribute('data-aufgabe');
      await page.locator('.nur-leser button').filter({ hasText: new RegExp(`^${wert}$`) }).dispatchEvent('click');
      return id;
    };
    await abwarten(await tippeDose(235)); // Probe: 2 H 3 Z 5 E
    await foto('22-dosen-aufgabe');
    // Immer die erste Dose, bis eine falsch ist und die Hilfe kommt
    let hilfeGesehen = false;
    for (let i = 0; i < 8; i++) {
      const [w] = await page.locator('.nur-leser button').allTextContents();
      const id = await tippeDose(w);
      await page.waitForTimeout(1500);
      if (await page.getByText('Schauen wir genau hin').isVisible()) {
        hilfeGesehen = true;
        break;
      }
      await abwarten(id);
    }
    if (hilfeGesehen) {
      await foto('23-dosen-hilfe');
      await page.getByRole('button', { name: 'Weiter' }).click();
      await foto('24-dosen-hilfe-null');
      await page.getByRole('button', { name: 'Weiter' }).click();
      for (const knopf of await page.locator('.hilfe .auswahl button').all()) {
        if (await page.getByText('Super!').isVisible()) break;
        await knopf.click();
      }
      await page.getByRole('button', { name: 'Nochmal probieren' }).click();
    }
    pruefe(hilfeGesehen, `${name}: Dosenwerfen mit Stellenwert-Hilfe spielbar`);

    // Seilbahn, Waage, Domino: Probe lösen, dann bis zur Hilfe spielen und sie durchlaufen
    const budeTesten = async (titel, kurz, probe) => {
      await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await page.getByRole('button', { name: `${titel} öffnen` }).click();
      await page.getByRole('button', { name: 'Bronze spielen' }).click();
      await page.locator('canvas').waitFor();
      await page.waitForTimeout(900);
      await foto(`${kurz}-probe`);
      await abwarten(await tippeDose(probe));
      await page.waitForTimeout(400);
      await foto(`${kurz}-aufgabe`);
      let hilfe = false;
      for (let i = 0; i < 8 && !hilfe; i++) {
        const [w] = await page.locator('.nur-leser button').allTextContents();
        const id = await tippeDose(w);
        await page.waitForTimeout(1600);
        hilfe = await page.getByText('Schauen wir genau hin').isVisible();
        if (!hilfe) await abwarten(id);
      }
      if (hilfe) {
        await foto(`${kurz}-hilfe-1`);
        await page.getByRole('button', { name: 'Weiter' }).click();
        await foto(`${kurz}-hilfe-2`);
        await page.getByRole('button', { name: 'Weiter' }).click();
        for (const knopf of await page.locator('.hilfe .auswahl button').all()) {
          if (await page.getByText('Super!').isVisible()) break;
          await knopf.click();
        }
        await page.getByRole('button', { name: 'Nochmal probieren' }).click();
      }
      pruefe(hilfe, `${name}: ${titel} spielbar, Hilfe erscheint`);
    };
    await budeTesten('Zahlenstrahl-Seilbahn', '25-seilbahn', '500');
    await budeTesten('Gleichgewichts-Waage', '26-waage', '200');
    await budeTesten('Rechendomino', '27-domino', '270');

    // Buden mit eigener Bedienung: Rechenblatt, Lupe, Zahlenschloss
    const eigeneBude = async (titel, kurz, probe, falsch) => {
      await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await page.getByRole('button', { name: `${titel} öffnen` }).click();
      await page.getByRole('button', { name: 'Bronze spielen' }).click();
      await page.locator('.schild').waitFor();
      await page.waitForTimeout(900);
      await foto(`${kurz}-probe`);
      let id = await page.locator('.schild').getAttribute('data-aufgabe');
      await probe();
      await abwarten(id);
      await page.waitForTimeout(400);
      await foto(`${kurz}-aufgabe`);
      let hilfe = false;
      for (let i = 0; i < 8 && !hilfe; i++) {
        await page.waitForTimeout(1000);
        id = await page.locator('.schild').getAttribute('data-aufgabe');
        await falsch();
        await page.waitForTimeout(1600);
        hilfe = await page.getByText('Schauen wir genau hin').isVisible();
        if (!hilfe) await abwarten(id);
      }
      if (hilfe) {
        await foto(`${kurz}-hilfe-1`);
        await page.getByRole('button', { name: 'Weiter' }).click();
        await foto(`${kurz}-hilfe-2`);
        await page.getByRole('button', { name: 'Weiter' }).click();
        for (const knopf of await page.locator('.hilfe .auswahl button').all()) {
          if (await page.getByText('Super!').isVisible()) break;
          await knopf.click();
        }
        await page.getByRole('button', { name: 'Nochmal probieren' }).click();
      }
      pruefe(hilfe, `${name}: ${titel} spielbar, Hilfe erscheint`);
    };
    const taste = (z) => page.locator('.tasten button').filter({ hasText: new RegExp(`^${z}$`) }).click();
    await eigeneBude(
      'Rechen-Werkstatt',
      '28-werkstatt',
      async () => {
        for (const z of ['6', '8', '3']) await taste(z); // 234 + 152 = 386, von rechts nach links
        await page.getByRole('button', { name: 'Fertig' }).click();
      },
      async () => {
        await taste('1');
        await page.getByRole('button', { name: 'Fertig' }).click();
      },
    );
    await eigeneBude(
      'Fehlerdetektiv',
      '29-detektiv',
      () => page.getByRole('button', { name: 'Ziffer 8 an Stelle 2 ist falsch' }).click(), // 345 + 132 = 487 statt 477
      async () => {
        await page.getByRole('button', { name: 'Kann das stimmen? Überschlag' }).click();
        await page.getByRole('button', { name: 'Alles richtig' }).click();
      },
    );
    await eigeneBude(
      'Zahlenrätsel-Tresor',
      '30-tresor',
      async () => {
        for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Rad 1 höher' }).click();
        await page.getByRole('button', { name: 'Öffnen' }).click();
      },
      () => page.getByRole('button', { name: 'Öffnen' }).click(),
    );

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
    console.error('  Konsole:', JSON.stringify(globalThis.konsole ?? []));
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(fehler ? `${fehler} Fehler` : 'Alles in Ordnung');
process.exit(fehler ? 1 : 0);
