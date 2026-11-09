// Store-Screenshots: Telefon 1320×2868 (6,9 Zoll) und iPad 2064×2752 (13 Zoll). Aufruf: npm run build && npm run store-bilder
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const AUS = process.env.AUS ?? 'store-bilder';
mkdirSync(AUS, { recursive: true });
const server = spawn('npx', ['vite', 'preview', '--port', '4995', '--strictPort'], { detached: true });
await new Promise((r) => setTimeout(r, 2500));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const WOERTER = { zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20, einundzwanzig: 21, zweiundzwanzig: 22, dreiundzwanzig: 23, vierundzwanzig: 24, fünfundzwanzig: 25, sechsundzwanzig: 26, siebenundzwanzig: 27, achtundzwanzig: 28, neunundzwanzig: 29 };

for (const [geraet, viewport, dsf] of [
  ['telefon', { width: 440, height: 956 }, 3],
  ['ipad', { width: 1032, height: 1376 }, 2],
]) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dsf, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const foto = (n) => page.screenshot({ path: `${AUS}/${geraet}-${n}.png` });
  const menue = async (punkt) => {
    await page.getByRole('button', { name: /^Menü/ }).click();
    await page.locator('nav.menue').getByRole('button', { name: punkt }).click();
  };
  await page.goto('http://localhost:4995/');
  await page.getByPlaceholder('Spitzname').fill('Lea');
  await page.getByPlaceholder('Spitzname').press('Enter');
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  for (let i = 0; i < 6 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  await page.goto('about:blank');
  await page.addInitScript(() => {
    const k = 'CapacitorStorage.mathe-jahrmarkt.daten';
    const d = JSON.parse(localStorage.getItem(k) ?? 'null');
    if (!d || d.paket.gekauft) return;
    d.paket = { gekauft: true, seit: 1 };
    const p = d.profile[0];
    const st = { geschafft: true, rekord: 900, gespielt: 2, verlauf: [700, 900] };
    for (const id of ['dartbude', 'einmaleins-turbo', 'dosenwerfen', 'seilbahn', 'waage', 'rechendomino', 'kasse', 'schaetzbude', 'uhrkarussell', 'spiegelkabinett', 'wuerfelnetz', 'zahlenfolgenzug', 'rechenmauer', 'murmellabor']) p.fortschritt[id] = { bronze: st, silber: st };
    for (const id of ['rechenwerkstatt', 'fehlerdetektiv', 'tresor', 'umrechnungsmemory', 'achterbahn', 'labyrinth', 'formensortierer', 'riesenradtechniker', 'diagrammreporter']) p.fortschritt[id] = { bronze: st };
    p.taler = 86;
    p.bau.bloecke = 140;
    p.gesehen.gassen = ['zahlengasse', 'groessenmarkt', 'spiegelzelt', 'musterbahn', 'forschergasse'];
    p.gesehen.hinweise = ['auftraege'];
    // Drei Wochen Spielverlauf für Bericht und Lernprofil
    const jetzt = Date.now();
    const K = ['kopfrechnen', 'stellenwert', 'halbschriftlich', 'groessen', 'raum', 'muster', 'zahlverstaendnis', 'operationsverstaendnis'];
    const B = { kopfrechnen: 'dartbude', stellenwert: 'dosenwerfen', halbschriftlich: 'rechendomino', groessen: 'kasse', raum: 'spiegelkabinett', muster: 'zahlenfolgenzug', zahlverstaendnis: 'seilbahn', operationsverstaendnis: 'waage' };
    for (let tag = 20; tag >= 0; tag--) {
      if (tag % 3 === 1) continue;
      const t0 = jetzt - tag * 86400000 - 3600000;
      for (const [j, k] of K.entries()) {
        if ((tag + j) % 2) continue;
        p.runden.push({ bude: B[k], stufe: 'silber', start: t0 + j * 300000, dauerMs: 240000 + j * 20000, punkte: 700, richtig: 8, gesamt: 10 });
        for (let i = 0; i < 10; i++) p.ereignisse.push({ t: t0 + j * 300000 + i * 20000, bude: B[k], kompetenz: k, dimension: i % 3 ? 'sicherheit' : 'wissen', richtig: (i + tag + j) % 5 !== 0, ms: 4000, gewertet: true });
      }
    }
    localStorage.setItem(k, JSON.stringify(d));
  });
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const f = page.locator('.feier');
    if (!(await f.count())) break;
    await f.getByRole('button', { name: 'Weiter' }).click();
  }
  await page.waitForTimeout(1200);
  await foto('1-jahrmarkt');

  // Dartbude, Silber, mitten in der Runde
  await page.getByRole('button', { name: 'Dartbude öffnen' }).click();
  await page.getByRole('radio', { name: /Silber/ }).click();
  await page.getByRole('button', { name: 'Silber spielen' }).click();
  await page.locator('.nur-leser button').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(1800);
  await foto('2-dartbude');
  await page.getByRole('button', { name: 'Zurück' }).first().click();
  await page.waitForTimeout(400);
  if (await page.getByRole('button', { name: /Runde beenden|Ja, beenden|Beenden/ }).count()) await page.getByRole('button', { name: /Runde beenden|Ja, beenden|Beenden/ }).first().click();
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();

  // Uhr-Karussell
  await page.getByRole('button', { name: 'Uhr-Karussell öffnen' }).click();
  for (let i = 0; i < 4 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  await page.getByRole('radio', { name: /Silber/ }).click();
  await page.getByRole('button', { name: 'Silber spielen' }).click();
  await page.waitForTimeout(2200);
  await foto('3-uhr');
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();

  // Knobelzelt
  await page.getByRole('button', { name: 'Knobelzelt' }).click();
  await page.getByRole('button', { name: /^Mittel/ }).click();
  await page.locator('.geschichte').waitFor();
  await page.waitForTimeout(400);
  await foto('4-knobelzelt');
  await page.getByRole('button', { name: 'Zurück' }).first().click();
  await page.getByRole('button', { name: 'Zurück' }).first().click().catch(() => {});
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();

  // Sammelalbum
  await menue(/Sammelalbum/);
  await page.waitForTimeout(800);
  await foto('5-sammelalbum');
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();

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
  await page.goto('http://localhost:4995/');
  await page.getByRole('heading', { name: 'Jahrmarkt' }).waitFor();

  // Elternbereich: Lernprofil
  await menue('Elternbereich');
  const sperre = await page.locator('.frage').textContent();
  const [, w1, w2] = sperre.match(/Was ist (\S+) mal (\S+)\?/);
  await page.getByLabel(sperre).fill(String(WOERTER[w1] * WOERTER[w2]));
  await page.getByRole('button', { name: 'Öffnen' }).click();
  await page.getByRole('heading', { name: /Die letzten 7 Tage/ }).waitFor();
  await page.waitForTimeout(400);
  await foto('7-eltern');
  await ctx.close();
}
console.log('fertig');
try { process.kill(-server.pid); } catch { server.kill(); } // ganze Prozessgruppe, sonst läuft vite weiter (Windows: nur der Startprozess)
await b.close();
process.exit(0);
