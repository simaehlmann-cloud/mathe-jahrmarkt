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

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
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
  // NUR=hoch oder NUR=quer beschränkt den Lauf auf eine Ausrichtung (schneller beim Entwickeln)
  for (const [name, viewport] of [
    ['quer', { width: 1180, height: 820 }],
    ['hoch', { width: 390, height: 844 }],
  ].filter(([n]) => !process.env.NUR || process.env.NUR === n)) {
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
    const menue = async (punkt) => {
      await page.getByRole('button', { name: 'Menü' }).click();
      await page.locator('nav.menue').getByRole('button', { name: punkt }).click();
    };
    // Bude antippen; beim ersten Besuch einer Gasse begrüßt Flinka (Sprechblase wegtippen)
    const oeffne = async (titel) => {
      await page.getByRole('button', { name: `${titel} öffnen` }).click();
      const spielen = page.getByRole('button', { name: /spielen$/ });
      const blase = page.getByRole('button', { name: /Weiter|Los geht/ });
      await Promise.race([spielen.first().waitFor(), blase.first().waitFor()]);
      for (let i = 0; i < 4 && (await blase.count()); i++) await blase.last().click();
    };
    // TEIL=2 überspringt den ersten Durchgang (schneller beim Entwickeln)
    if (process.env.TEIL !== '2') {

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
    // Intro: so lange „Weiter“, bis die Sprechblase weg ist
    for (let i = 0; i < 6 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await weiter();
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
    await menue('Elternbereich');
    const sperre = await page.locator('.frage').textContent();
    const [, w1, w2] = sperre.match(/Was ist (\S+) mal (\S+)\?/);
    await page.getByLabel(sperre).fill(String(WOERTER[w1] * WOERTER[w2]));
    await page.getByRole('button', { name: 'Öffnen' }).click();
    await page.getByRole('heading', { name: /Die letzten 7 Tage/ }).waitFor();
    await foto('13-eltern-bericht');
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Bericht als PDF' }).click()]);
    pruefe(/^mathe-jahrmarkt-bericht-.*\.pdf$/.test(pdf.suggestedFilename()), `${name}: Eltern-Bericht als PDF (${pdf.suggestedFilename()})`);
    await page.getByRole('button', { name: 'Zusatzpaket' }).click();
    await foto('14-eltern-paket');
    await page.getByRole('button', { name: /freischalten/ }).click();
    await page.getByText('Der Kauf ist gerade nicht möglich').waitFor();
    pruefe(true, 'Web-Version ohne Store bietet keinen Scheinkauf an');
    await page.getByRole('button', { name: 'Elternbereich schließen' }).click();
    await menue('Mein Mathe-Profil');
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
    await menue('Spieler wechseln');
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
      await oeffne(titel);
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
      await oeffne(titel);
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

    // Auswahl-Buden: so lange antippen, bis eine Antwort falsch ist und die Hilfe kommt
    const auswahlBudeTesten = async (titel, kurz) => {
      await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await oeffne(titel);
      await page.getByRole('button', { name: 'Bronze spielen' }).click();
      await page.locator('.wahl').first().waitFor();
      await page.waitForTimeout(700);
      await foto(`${kurz}-aufgabe`);
      let hilfe = false;
      let probeFalsch = 0;
      for (let i = 0; i < 14 && !hilfe; i++) {
        await page.waitForTimeout(900);
        const knoepfe = await page.locator('.wahl:not(.falsch):not([disabled])').all();
        const k = knoepfe[probeFalsch % Math.max(1, knoepfe.length)] ?? knoepfe[0];
        if (!k) continue;
        await k.click();
        await page.waitForTimeout(1500);
        hilfe = await page.getByText('Schauen wir genau hin').isVisible();
        // Falsche Probe wird wiederholt: dann den nächsten Knopf versuchen
        if (!hilfe && (await page.getByText('Probewurf').isVisible())) probeFalsch++;
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
    for (const [titel, kurz] of [
      ['Schätz-Bude', '32-schaetzen'],
      ['Umrechnungs-Memory', '34-memory'],
      ['Würfelnetz-Werkstatt', '37-netz'],
      ['Labyrinth-Robo', '38-labyrinth'],
      ['Formen-Sortierer', '39-formen'],
      ['Zelt-Dekorateur', '40-band'],
      ['Zahlenfolgen-Zug', '41-folge'],
      ['Murmel-Labor', '44-murmeln'],
      ['Diagramm-Reporter', '45-diagramm'],
    ]) await auswahlBudeTesten(titel, kurz);

    // Spiegelkabinett: Probe richtig spiegeln (blaue Kästchen an der senkrechten Achse), dann leer abgeben
    const spiegeln = async () => {
      const blau = await page.locator('.gitter rect[fill="#3c78d8"]').evaluateAll((r) => r.map((e) => [Number(e.getAttribute('x')) / 52, Number(e.getAttribute('y')) / 52]));
      for (const [x, y] of blau) await page.getByRole('button', { name: `Kästchen Spalte ${4 - x}, Zeile ${y + 1}`, exact: true }).click();
      await page.getByRole('button', { name: 'Fertig' }).click();
    };
    await eigeneBude('Spiegelkabinett', '36-spiegel', spiegeln, () => page.getByRole('button', { name: 'Fertig' }).click());

    pruefe(konsole.length === 0, `${name}: keine Fehler in der Konsole${konsole.length ? `: ${konsole.join(' | ')}` : ''}`);
    }
    await ctx.close();

    // ---------- Zweiter Durchgang mit Zusatzpaket und Silber überall: Spiel-Buden, Sternenmarkt, Bauplatz, Check, Aufträge ----------
    {
      const ctx2 = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true });
      const page = await ctx2.newPage();
      letzteSeite = page;
      page.setDefaultTimeout(20000);
      const konsole2 = (globalThis.konsole = []);
      page.on('console', (m) => m.type() === 'error' && konsole2.push(m.text()));
      page.on('pageerror', (e) => konsole2.push(String(e)));
      const foto = (n) => page.screenshot({ path: `${BILDER}/${name}-${n}.png` });
      const menue = async (punkt) => {
        await page.getByRole('button', { name: 'Menü' }).click();
        await page.locator('nav.menue').getByRole('button', { name: punkt }).click();
      };
      await page.goto(`http://localhost:${PORT}/`);
      await page.getByPlaceholder('Spitzname').fill('Sam');
      await page.getByPlaceholder('Spitzname').press('Enter');
      await page.getByText('Roboter', { exact: true }).click();
      await page.getByText('Cap', { exact: true }).click();
      await foto('50-roboter');
      await page.getByRole('button', { name: 'Los geht’s' }).click();
      for (let i = 0; i < 6 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
      await page.getByRole('button', { name: /Tagesaufträge/ }).click();
      pruefe((await page.locator('.auftraege li').count()) === 3, `${name}: drei Tagesaufträge`);
      await foto('51-auftraege');
      await page.getByRole('button', { name: 'Schließen' }).click();
      // Bestand mit Paket und Silber an allen Buden einspielen (wie nach langem Spielen)
      await page.goto('about:blank');
      await page.addInitScript(() => {
        const k = 'CapacitorStorage.mathe-jahrmarkt.daten';
        const d = JSON.parse(localStorage.getItem(k) ?? 'null');
        if (!d || d.paket.gekauft) return;
        d.paket = { gekauft: true, seit: 1 };
        const st = { geschafft: true, rekord: 900, gespielt: 1, verlauf: [900] };
        const ids = ['dartbude', 'einmaleins-turbo', 'dosenwerfen', 'seilbahn', 'waage', 'rechendomino', 'rechenwerkstatt', 'fehlerdetektiv', 'tresor', 'kasse', 'schaetzbude', 'uhrkarussell', 'umrechnungsmemory', 'achterbahn', 'spiegelkabinett', 'wuerfelnetz', 'labyrinth', 'formensortierer', 'zeltdekorateur', 'zahlenfolgenzug', 'rechenmauer', 'riesenradtechniker', 'murmellabor', 'diagrammreporter'];
        for (const id of ids) d.profile[0].fortschritt[id] = { bronze: st, silber: st };
        for (const id of ['geisterbahn', 'pizzabaeckerei']) d.profile[0].fortschritt[id] = { bronze: st };
        d.profile[0].fortschritt.hauDenLukas = { bronze: st, silber: st };
        d.profile[0].gesehen.gassen = ['zahlengasse', 'groessenmarkt', 'spiegelzelt', 'musterbahn', 'forschergasse', 'abendmarkt'];
        localStorage.setItem(k, JSON.stringify(d));
      });
      await page.goto(`http://localhost:${PORT}/`);
      await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
      // Alle Gassen laufen: Feiern für jede Gasse und das Sommerfest
      let feiern = 0;
      for (let i = 0; i < 10; i++) {
        const f = page.locator('.feier');
        await page.waitForTimeout(500);
        if (!(await f.count())) break;
        if (feiern === 0) await foto('52a-gassenfeier');
        if (await page.getByText('Das Sommerfest kann beginnen!').isVisible()) await foto('52b-sommerfest');
        await f.getByRole('button', { name: 'Weiter' }).click();
        feiern++;
      }
      pruefe(feiern === 6, `${name}: fünf Gassenfeiern und das Sommerfest (${feiern})`);
      // Sammelalbum: neue Karten
      await page.getByRole('button', { name: /Menü, \d+ neue Sammelkarten/ }).click();
      await page.locator('nav.menue').getByRole('button', { name: /Sammelalbum/ }).click();
      await page.locator('.raster .platz').first().waitFor();
      await page.waitForTimeout(900);
      await foto('52c-album');
      pruefe((await page.locator('.raster .karte.offen').count()) >= 30, `${name}: Sammelalbum zeigt die gesammelten Karten`);
      await page.locator('.raster .platz').first().click();
      await foto('52d-karte');
      await page.getByRole('button', { name: 'Schließen' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      pruefe((await page.getByRole('button', { name: /neue Sammelkarten/ }).count()) === 0, `${name}: angesehene Karten sind nicht mehr neu`);
      // Blitzrechnen: eine Minute, Aufgaben aus dem Text lösen
      await page.getByRole('button', { name: 'Menü' }).click();
      await page.locator('nav.menue').getByRole('button', { name: 'Blitzrechnen' }).click();
      await page.getByRole('button', { name: /^Leicht/ }).click();
      await page.locator('.aufgabe').waitFor({ timeout: 8000 });
      let geloest = 0;
      const ablauf = Date.now() + 15000;
      while (Date.now() < ablauf) {
        const t = (await page.locator('.aufgabe span').textContent()).trim();
        const m = /^(\d+) ([·+−]) (\d+)$/.exec(t);
        if (!m) break;
        const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
        const ergebnis = op === '·' ? a * b : op === '+' ? a + b : a - b;
        for (const z of String(ergebnis)) await page.getByRole('button', { name: `Ziffer ${z}` }).click();
        geloest++;
      }
      await foto('52e-blitz');
      await page.getByText('Zeit um!').or(page.getByText('Neuer Rekord!')).waitFor({ timeout: 70000 });
      await foto('52f-blitz-ende');
      pruefe(geloest >= 5 && (await page.locator('.gross').textContent()).includes(`${geloest} richtig`), `${name}: Blitzrechnen zählt ${geloest} richtige`);
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      // Knobelzelt: über die Karte erreichbar; jeder Schritt wird nach drei Fehlversuchen gezeigt
      await page.getByRole('button', { name: 'Knobelzelt' }).click();
      await page.getByRole('button', { name: /^Leicht/ }).click();
      await page.locator('.geschichte').waitFor();
      await foto('52g-knobel');
      for (let i = 0; i < 60 && !(await page.getByText('Knobelrunde geschafft!').isVisible()); i++) {
        if (await page.getByRole('button', { name: /Nächste Aufgabe|^Fertig$/ }).isVisible()) {
          if (i < 8) await foto('52h-knobel-geloest');
          await page.getByRole('button', { name: /Nächste Aufgabe|^Fertig$/ }).click();
          continue;
        }
        await page.getByRole('button', { name: 'Ziffer 9' }).click();
        await page.getByRole('button', { name: 'Ziffer 9' }).click();
        await page.getByRole('button', { name: 'Ziffer 9' }).click();
        await page.locator('.tasten button.ok').click();
        await page.waitForTimeout(120);
      }
      pruefe(await page.getByText('Knobelrunde geschafft!').isVisible(), `${name}: Knobelrunde bis zum Ende spielbar`);
      await page.getByRole('button', { name: 'Noch eine Runde' }).click();
      await page.getByRole('button', { name: /Rätsel der Woche/ }).click();
      await page.getByRole('button', { name: 'Tipp 1' }).click();
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Ziffer 1' }).click();
        await page.getByRole('button', { name: 'Ziffer 1' }).click();
        await page.getByRole('button', { name: 'Ziffer 1' }).click();
        await page.locator('.tasten button.ok').click();
      }
      await page.getByRole('button', { name: 'Lösung zeigen' }).click();
      await foto('52i-raetsel');
      pruefe(await page.getByText('Die Lösung:').isVisible(), `${name}: Rätsel der Woche mit Tipps und Lösung`);
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
      await page.getByRole('button', { name: 'Menü' }).click();
      pruefe(await page.getByText('Jahrmarkt-Manager').isVisible(), `${name}: Rang aus 48 Sternen ist Jahrmarkt-Manager`);
      await foto('52-menue');
      await page.locator('nav.menue').getByRole('button', { name: 'Bauplatz' }).click();

      // Bauplatz: Blöcke setzen und abbauen
      const lager = async () => Number((await page.locator('.lager').textContent()).match(/(\d+)/)?.[1]);
      const vorher = await lager();
      for (const f of ['Spalte 4, Reihe 4', 'Spalte 4, Reihe 4', 'Spalte 5, Reihe 4']) await page.getByRole('button', { name: new RegExp(`Feld ${f},`) }).click();
      pruefe((await lager()) === vorher - 3, `${name}: Bauplatz – drei Blöcke gesetzt`);
      await page.getByRole('button', { name: 'Abbauen' }).click();
      await page.getByRole('button', { name: /Feld Spalte 4, Reihe 4,/ }).click();
      pruefe((await lager()) === vorher - 2, `${name}: Bauplatz – ein Block zurück ins Lager`);
      await foto('53-bauplatz');
      // Bauauftrag: Zielhöhen aus dem Bauplan ablesen und bauen, dann die Würfelfrage
      await page.getByRole('tab', { name: 'Bauaufträge' }).click();
      await page.getByRole('img', { name: /^Bauplan:/ }).waitFor();
      const plan = (await page.getByRole('img', { name: /^Bauplan:/ }).getAttribute('aria-label')).replace('Bauplan: ', '').split(', ').map(Number);
      await page.getByRole('button', { name: '+ Würfel' }).click();
      for (let i = 0; i < plan.length; i++) for (let k = 0; k < plan[i]; k++) await page.getByRole('button', { name: new RegExp(`^Feld Spalte ${(i % 4) + 1}, Reihe ${Math.floor(i / 4) + 1},`) }).click();
      await page.getByRole('button', { name: 'Prüfen' }).click();
      await page.getByText('Wie viele Würfel hast du verbaut?').waitFor();
      const summe = plan.reduce((a, b) => a + b, 0);
      await page.locator('.optionen button').filter({ hasText: new RegExp(`^${summe}$`) }).click();
      await page.getByRole('button', { name: 'Nächster Auftrag' }).waitFor();
      pruefe(true, `${name}: Bauauftrag nach Bauplan gelöst`);
      await foto('54-bauauftrag');
      await page.getByRole('button', { name: 'Nächster Auftrag' }).click();
      await foto('55-bauauftrag-2');
      await page.getByRole('button', { name: 'Zurück' }).first().click();

      // Bauinsel: Block setzen, daraufsetzen, wieder abbauen, Landschaft bleibt, laufen
      await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
      await menue(/Bauinsel/);
      await page.locator('[data-feld="12,19,-1"]').first().waitFor({ state: 'attached' });
      const inselFeld = (x, y, z, seite = 'oben') => page.locator(`[data-feld="${x},${y},${z}"] polygon[data-seite="${seite}"]`).first().dispatchEvent('click');
      const inselLager = async () => Number((await page.locator('.lager').textContent()).match(/(\d+)/)?.[1]);
      const inselVorher = await inselLager();
      await page.getByRole('radio', { name: 'Bauen', exact: true }).click();
      await inselFeld(10, 19, -1);
      await inselFeld(10, 19, 0);
      await inselFeld(10, 19, 1, 'links');
      pruefe((await inselLager()) === inselVorher - 3, `${name}: Bauinsel – drei Blöcke gesetzt (auch seitlich)`);
      await page.getByRole('radio', { name: 'Abbauen', exact: true }).click();
      await inselFeld(10, 19, 1);
      pruefe((await inselLager()) === inselVorher - 2, `${name}: Bauinsel – ein Block zurück ins Lager`);
      await page.locator('[data-feld="4,4,1"]').first().waitFor({ state: 'attached' }).catch(() => {});
      const huegel = page.locator('[data-feld^="4,4,"] polygon[data-seite="oben"]').last();
      if (await huegel.count()) {
        await huegel.dispatchEvent('click');
        pruefe((await inselLager()) === inselVorher - 2, `${name}: Bauinsel – Landschaft lässt sich nicht abbauen`);
      }
      await page.getByRole('radio', { name: 'Laufen', exact: true }).click();
      await inselFeld(12, 17, -1);
      await page.waitForTimeout(1200);
      await foto('55b-bauinsel');
      await page.getByRole('button', { name: 'Ansicht drehen' }).click();
      await page.getByRole('button', { name: 'Wo bin ich?' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();

      // Jahrmarkt-Check
      await menue('Jahrmarkt-Check');
      await page.getByRole('button', { name: 'Check starten' }).click();
      for (let i = 0; i < 12; i++) {
        await page.locator('.aufgabe .wahl').first().waitFor();
        if (i === 3) await foto('56-check');
        await page.locator('.aufgabe .wahl').last().click();
        await page.waitForTimeout(550);
      }
      await page.getByText('Das bringt dich jetzt weiter').waitFor();
      pruefe((await page.locator('.empfehlung button').count()) === 3, `${name}: Check empfiehlt drei Buden`);
      await foto('57-check-ergebnis');
      await page.getByRole('button', { name: 'Zum Jahrmarkt' }).click();

      // Spiel-Buden: Probe über die Antwortknöpfe für Bildschirmleser lösen, eine Bedienung ausprobieren, Hilfe erreichen
      const leserKnoepfe = () => page.locator('.nur-leser button');
      const spielBude = async (titel, kurz, stufe, bedienen) => {
        await page.getByRole('button', { name: `${titel} öffnen` }).click();
        await page.getByRole('radio', { name: new RegExp(stufe) }).click();
        await page.getByRole('button', { name: `${stufe} spielen` }).click();
        await leserKnoepfe().first().waitFor({ state: 'attached' });
        await page.waitForTimeout(900);
        await foto(`${kurz}-probe`);
        // Bedienung ausprobieren (Antwort ist dabei meist falsch: Die Probe wird dann wiederholt)
        await bedienen();
        await page.waitForTimeout(1600);
        await foto(`${kurz}-bedient`);
        let hilfe = await page.getByText('Schauen wir genau hin').isVisible();
        let n = 0;
        for (let i = 0; i < 16 && !hilfe; i++) {
          await page.waitForTimeout(900);
          const k = leserKnoepfe();
          const anzahl = await k.count();
          if (!anzahl) continue;
          await k.nth(n % anzahl).dispatchEvent('click');
          await page.waitForTimeout(1500);
          hilfe = await page.getByText('Schauen wir genau hin').isVisible();
          if (!hilfe && (await page.getByText('Probewurf').isVisible())) n++;
        }
        if (hilfe) {
          await page.getByRole('button', { name: 'Weiter' }).click();
          await foto(`${kurz}-hilfe`);
          await page.getByRole('button', { name: 'Weiter' }).click();
          for (const knopf of await page.locator('.hilfe .auswahl button').all()) {
            if (await page.getByText('Super!').isVisible()) break;
            await knopf.click();
          }
          await page.getByRole('button', { name: 'Nochmal probieren' }).click();
        }
        pruefe(hilfe, `${name}: ${titel} (${stufe}) spielbar, Hilfe erscheint`);
        await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
        await page.getByRole('button', { name: 'Zurück' }).first().click();
      };
      const klick = (n) => page.getByRole('button', { name: n, exact: true }).click();
      const tippen = async (zahl, ok = 'OK') => {
        for (const z of String(zahl)) await page.getByRole('button', { name: `Ziffer ${z}` }).click();
        await page.locator('.tasten button.ok').click();
      };
      await spielBude('Süßigkeitenkasse', '60-kasse', 'Bronze', async () => {
        await klick('1 € hinlegen');
        await klick('50 ct hinlegen');
        await klick('1 € zurücklegen');
        await klick('Bezahlen');
      });
      // Abgebrochene Runde: beim nächsten Besuch weiterspielen
      await page.getByRole('button', { name: 'Süßigkeitenkasse öffnen' }).click();
      await page.getByRole('radio', { name: /Bronze/ }).click();
      await page.getByRole('button', { name: 'Bronze spielen' }).click();
      await page.getByRole('heading', { name: 'Weiterspielen?' }).waitFor();
      await foto('60b-weiterspielen');
      await page.getByRole('button', { name: /^Weiterspielen/ }).click();
      await leserKnoepfe().first().waitFor({ state: 'attached' });
      pruefe((await page.locator('li.richtig, li.falsch').count()) > 0 && !(await page.getByText('Probewurf').isVisible()), `${name}: Runde wird ohne Probewurf mit dem alten Stand fortgesetzt`);
      await page.getByRole('button', { name: 'Runde beenden und zurück' }).click();
      await page.getByRole('button', { name: 'Zurück' }).first().click();
      await spielBude('Uhr-Karussell', '61-uhr', 'Gold', async () => {
        await klick('Eine Stunde vor');
        await klick('5 Minuten vor');
        const uhr = await page.locator('svg.uhr').boundingBox();
        await page.mouse.move(uhr.x + uhr.width / 2, uhr.y + uhr.height * 0.1);
        await page.mouse.down();
        await page.mouse.move(uhr.x + uhr.width * 0.9, uhr.y + uhr.height / 2, { steps: 5 });
        await page.mouse.up();
        await klick('Fertig');
      });
      await spielBude('Achterbahn-Architekt', '62-achterbahn', 'Bronze', async () => {
        await klick('Schiene 10 m legen');
        await klick('Schiene 5 m legen');
        await klick('Testfahrt!');
      });
      await spielBude('Rechenmauer', '63-mauer', 'Silber', async () => {
        for (let i = 0; i < 3; i++) await tippen(12);
      });
      await spielBude('Riesenrad-Techniker', '64-riesenrad', 'Silber', async () => tippen(5));
      await spielBude('Geisterbahn', '65-geisterbahn', 'Silber', async () => tippen(1));
      await spielBude('Pizzabäckerei', '66-pizza', 'Silber', async () => {
        for (let i = 0; i < 4; i++) await klick('Mehr Stücke');
        await page.getByRole('button', { name: 'Stück 1', exact: true }).click();
        await page.getByRole('button', { name: 'Stück 3', exact: true }).click();
        await klick('In den Ofen!');
      });
      await spielBude('Hau den Lukas', '67-lukas', 'Bronze', async () => {
        for (let i = 0; i < 3; i++) await klick('Mehr Kraft');
        await klick('🔨 Hau!');
      });
      await spielBude('Hau den Lukas', '68-lukas-gold', 'Gold', async () => {
        await klick('Mehr Kraft');
        await klick('🔨 Hau!');
      });
      pruefe(konsole2.length === 0, `${name}: zweiter Durchgang ohne Fehler in der Konsole${konsole2.length ? `: ${konsole2.join(' | ')}` : ''}`);
      await ctx2.close();
    }
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
  try { process.kill(-server.pid); } catch { server.kill(); } // ganze Prozessgruppe, sonst läuft vite weiter (Windows: nur der Startprozess)
}
console.log(fehler ? `${fehler} Fehler` : 'Alles in Ordnung');
process.exit(fehler ? 1 : 0);
