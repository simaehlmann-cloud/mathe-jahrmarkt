#!/usr/bin/env node
/**
 * Ablauftest der Schulversion im echten Browser (Produktions-Build mit Content-Security-Policy):
 * Lehrerbereich einrichten, Klasse anlegen, Kärtchen drucken, Kind meldet sich mit Bildpasswort an,
 * spielt eine Runde, meldet sich ab; Auswertung; Klassenliste an ein zweites „iPad“ weitergeben;
 * Ergebnisse dort weitergeben und auf dem ersten einsammeln; Neustart behält alles.
 *
 *   VITE_AUSGABE=schule npm run build && npm run e2e:schule
 *
 * Umgebung: CHROME_PFAD (Standard /usr/bin/google-chrome), BILDER (Ordner für Bildschirmfotos).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PFAD ?? '/usr/bin/google-chrome';
const BILDER = process.env.BILDER ?? 'e2e-bilder';
const PORT = 4181;
const PIN = '472915';
mkdirSync(BILDER, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((ok, fehler) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok());
  server.on('exit', fehler);
  setTimeout(() => fehler(new Error('Vorschau-Server startet nicht')), 20000);
});

let fehler = 0;
let letzteSeite;
const pruefe = (b, text) => {
  if (!b) {
    fehler++;
    console.error(`✗ ${text}`);
  } else console.log(`✓ ${text}`);
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
try {
  const neuesIpad = async (name, viewport = { width: 1180, height: 820 }) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: true, acceptDownloads: true });
    const page = await ctx.newPage();
    letzteSeite = page;
    page.setDefaultTimeout(20000);
    const konsole = [];
    page.on('console', (m) => m.type() === 'error' && konsole.push(m.text()));
    page.on('pageerror', (e) => konsole.push(String(e)));
    await page.addLocatorHandler(page.getByRole('alertdialog', { name: 'Pausenzeit!' }), async () => {
      await page.getByRole('button', { name: 'Noch 5 Minuten' }).click();
    });
    const foto = (n) => page.screenshot({ path: `${BILDER}/schule-${name}-${n}.png` });
    await page.goto(`http://localhost:${PORT}/`);
    return { ctx, page, konsole, foto };
  };

  /** Lehrerbereich öffnen (PIN eingeben). */
  const lehrerOeffnen = async (page, pin = PIN) => {
    await page.getByRole('button', { name: 'Lehrerbereich', exact: true }).click();
    await page.getByLabel('Lehrer-PIN').fill(pin);
    await page.getByRole('button', { name: 'Öffnen' }).click();
    await page.getByRole('heading', { name: 'Lehrerbereich' }).waitFor();
  };

  /** Datei über das Teilen-Menü (im Browser: Download) abfangen. */
  const herunterladen = async (page, knopf) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: knopf }).click()]);
    // Eine Kopie zum Ansehen neben die Bildschirmfotos
    await dl.saveAs(`${BILDER}/schule-${dl.suggestedFilename()}`);
    return { name: dl.suggestedFilename(), pfad: await dl.path() };
  };

  /** Bildpasswort eines Kindes aus der Lehreransicht lesen. */
  const passwortVon = async (page, kind) => {
    const label = await page.locator('.kinder li', { hasText: kind }).locator('.pw').getAttribute('aria-label');
    return label.replace('Bildpasswort: ', '').split(' – ');
  };

  /* ---------- iPad 1: einrichten ---------- */
  const a = await neuesIpad('ipad1');
  const p = a.page;
  await p.getByRole('heading', { name: 'Willkommen!' }).waitFor();
  await a.foto('01-start-leer');
  await p.getByRole('button', { name: 'Lehrerbereich einrichten' }).click();
  await p.getByLabel(/Name dieses iPads/).fill('iPad 1');
  await p.getByLabel(/^PIN \(/).fill('123456');
  await p.getByLabel('PIN wiederholen').fill('123456');
  await p.getByRole('button', { name: 'PIN festlegen' }).click();
  pruefe(await p.getByText(/Zahlenreihe/).isVisible(), 'Einfache PIN wird abgelehnt');
  await p.getByLabel(/^PIN \(/).fill(PIN);
  await p.getByLabel('PIN wiederholen').fill(PIN);
  await p.getByRole('button', { name: 'PIN festlegen' }).click();
  await p.getByRole('heading', { name: 'Wiederherstellungscode' }).waitFor();
  const code = (await p.locator('.code').textContent()).trim();
  pruefe(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), 'Wiederherstellungscode wird angezeigt');
  await a.foto('02-code');
  pruefe(await p.getByRole('button', { name: 'Weiter zum Lehrerbereich' }).isDisabled(), 'Weiter erst nach „notiert“');
  await p.getByLabel('Ich habe den Code notiert.').check();
  await p.getByRole('button', { name: 'Weiter zum Lehrerbereich' }).click();

  // Klasse und Kinder anlegen
  await p.getByLabel('Name der Klasse').fill('4a');
  await p.getByRole('button', { name: 'Anlegen', exact: true }).click();
  await p.getByLabel(/Kinder hinzufügen/).fill('Mia S.\nJonas K.\nAylin T.\nmia s.');
  pruefe(await p.getByRole('button', { name: '3 Kinder anlegen' }).isVisible(), 'Doppelter Name wird erkannt (3 statt 4)');
  await p.getByRole('button', { name: '3 Kinder anlegen' }).click();
  await p.getByText(/3 Kinder angelegt/).waitFor();
  await p.getByRole('button', { name: 'Passwörter zeigen' }).click();
  await a.foto('03-klasse');
  const pwMia = await passwortVon(p, 'Mia S.');
  pruefe(pwMia.length === 3, `Bildpasswort von Mia lesbar (${pwMia.join(', ')})`);

  // Kärtchen drucken
  const kaertchen = await herunterladen(p, 'Kärtchen drucken (PDF)');
  const kBytes = readFileSync(kaertchen.pfad);
  pruefe(kBytes.subarray(0, 5).toString() === '%PDF-' && kBytes.length > 5000, `Kärtchen als PDF (${Math.round(kBytes.length / 1024)} KB)`);

  // Lehrerbereich verlassen
  await p.getByRole('button', { name: 'Lehrerbereich schließen' }).click();
  await p.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  await a.foto('04-start-klasse');
  pruefe((await p.locator('.profile li').count()) === 3, 'Startbildschirm zeigt 3 Eintrittskarten');

  /* ---------- Kind meldet sich an ---------- */
  const anmelden = async (page, name, pw) => {
    await page.getByRole('button', { name: `${name}: anmelden` }).click();
    for (const s of pw) await page.getByRole('group', { name: 'Bilder' }).getByRole('button', { name: s, exact: true }).click();
  };
  const falsch = ['Ballon', 'Stern', 'Herz'].join() === pwMia.join() ? ['Herz', 'Stern', 'Ballon'] : ['Ballon', 'Stern', 'Herz'];
  await anmelden(p, 'Mia S.', falsch);
  await p.getByText('Das war nicht richtig').waitFor();
  await a.foto('05-passwort-falsch');
  for (const s of pwMia) await p.getByRole('group', { name: 'Bilder' }).getByRole('button', { name: s, exact: true }).click();
  // Beim ersten Anmelden: Figur gestalten
  await p.getByRole('heading', { name: 'Figur gestalten' }).waitFor();
  await a.foto('06-figur');
  await p.getByRole('button', { name: 'Speichern' }).click();
  await p.getByText('Ich bin Flinka').waitFor();
  for (let i = 0; i < 6 && (await p.getByRole('dialog', { name: 'Flinka sagt' }).count()); i++) await p.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  const rg = p.getByRole('dialog', { name: /Rundgang mit Flinka/ });
  await rg.waitFor();
  pruefe((await rg.textContent()).includes('abmelden'), 'Rundgang erklärt das Abmelden');
  await rg.getByRole('button', { name: 'Überspringen' }).click();
  await a.foto('07-jahrmarkt');
  // Bauinsel: Grundeinstellung „nach jeder Runde“ – vor der ersten Runde geschlossen
  await p.getByRole('button', { name: 'Teleporter zur Bauinsel' }).click();
  await p.getByText(/Spiel erst eine Runde an einer Bude/).waitFor();
  pruefe(true, 'Bauinsel vor der ersten Runde geschlossen');
  // Alles freigeschaltet: Silber ist an der Dartbude nicht gesperrt (aber braucht Bronze)
  await p.getByRole('button', { name: 'Dartbude öffnen' }).click();
  await p.getByText('Willkommen in der Zahlengasse').waitFor();
  await p.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  await p.getByRole('button', { name: 'Bronze spielen' }).waitFor();
  pruefe(!(await p.getByText('Gehört zum Zusatzpaket').count()), 'Kein Hinweis aufs Zusatzpaket');
  pruefe(!(await p.getByText(/Bestenliste/).count()), 'Keine Bestenliste (ausgeschaltet)');
  await p.getByRole('button', { name: 'Bronze spielen' }).click();
  await p.locator('canvas').waitFor();
  await p.waitForTimeout(900);
  const loese = async () => {
    const text = (await p.locator('.aufgabe').textContent()).replace('= ?', '').trim();
    const [x, y] = text.split('·').map((z) => Number(z.trim()));
    await p.waitForTimeout(1000);
    const id = await p.locator('.schild').getAttribute('data-aufgabe');
    await p.locator('.nur-leser button').filter({ hasText: new RegExp(`^${x * y}$`) }).dispatchEvent('click');
    await p.waitForFunction((alt) => document.querySelector('.schild')?.getAttribute('data-aufgabe') !== alt || document.querySelector('[role=dialog]'), id, { timeout: 20000 });
  };
  await loese(); // Probewurf
  for (let i = 0; i < 10; i++) await loese();
  await p.getByText('Bronze geschafft!').waitFor();
  await p.getByRole('button', { name: 'Zur Bude' }).click();
  await p.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  // Nach der Runde ist die Bauinsel 10 Minuten offen
  await p.getByRole('button', { name: 'Zurück' }).first().click();
  await p.locator('.welt .bude').first().waitFor();
  await p.getByRole('button', { name: 'Teleporter zur Bauinsel' }).click();
  await p.getByText(/Bauzeit: noch 10 Minuten/).waitFor();
  await p.getByRole('heading', { name: 'Bauinsel' }).waitFor();
  await p.getByRole('button', { name: 'Zurück' }).first().click();
  await a.foto('07b-insel-offen');
  pruefe(true, 'Nach einer Runde: Bauinsel offen mit Hinweis auf die Bauzeit');

  // Abmelden über den Knopf oben
  await p.getByRole('button', { name: /^Abmelden, jetzt spielt Mia S\./ }).click();
  await p.getByRole('heading', { name: 'Abmelden?' }).waitFor();
  await a.foto('08-abmelden');
  await p.getByRole('dialog').getByRole('button', { name: 'Abmelden' }).click();
  await p.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  pruefe(true, 'Nach dem Abmelden wieder der Startbildschirm');

  // Lehrkraft gibt Mia einen Auftrag (Dartbude, beliebige Stufe)
  await lehrerOeffnen(p);
  await p.getByRole('button', { name: 'Aufträge', exact: true }).click();
  await p.getByLabel('Was?').selectOption('dartbude');
  await p.getByLabel('Einzelne Kinder').check();
  await p.getByLabel('Mia S.').check();
  await p.getByRole('button', { name: 'Auftrag erteilen' }).click();
  await p.getByText('0 von 1 erledigt').waitFor();
  await a.foto('08b-auftrag');
  await p.getByRole('button', { name: 'Lehrerbereich schließen' }).click();

  // Zweites Anmelden: gleich auf den Jahrmarkt, Flinka sagt den Auftrag an
  await anmelden(p, 'Mia S.', pwMia);
  await p.getByText('Deine Lehrkraft hat dir einen Auftrag gegeben!').waitFor();
  pruefe(!(await p.getByRole('heading', { name: 'Figur gestalten' }).count()), 'Beim zweiten Anmelden keine Figur-Gestaltung mehr');
  pruefe(true, 'Flinka sagt den Auftrag der Lehrkraft an');
  for (let i = 0; i < 4 && (await p.getByRole('dialog', { name: 'Flinka sagt' }).count()); i++) await p.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  pruefe((await p.locator('.auftrag-fahne.lehrer').count()) === 1, 'Blaues Fähnchen an der Dartbude');
  await a.foto('08c-fahne');
  // Auftrag erledigen: noch eine Runde an der Dartbude
  await p.getByRole('button', { name: 'Dartbude öffnen' }).click();
  await p.getByRole('radio', { name: /Bronze/ }).first().click();
  await p.getByRole('button', { name: 'Bronze spielen' }).click();
  await p.locator('canvas').waitFor();
  await p.waitForTimeout(900);
  await loese();
  for (let i = 0; i < 10; i++) await loese();
  await p.getByRole('button', { name: 'Zur Bude' }).click();
  await p.getByRole('button', { name: 'Zurück' }).first().click();
  await p.locator('.welt .bude').first().waitFor();
  pruefe((await p.locator('.auftrag-fahne.lehrer').count()) === 0, 'Nach der Runde ist das Fähnchen weg');
  await p.getByRole('button', { name: 'Menü' }).click();
  pruefe(!(await p.locator('nav.menue').getByText('Elternbereich').count()) && !(await p.locator('nav.menue').getByText('Geschwister-Duell').count()), 'Menü ohne Eltern- und Duell-Punkt');
  await p.locator('nav.menue').getByRole('button', { name: 'Abmelden' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Abmelden' }).click();

  /* ---------- Auswertung ---------- */
  await lehrerOeffnen(p);
  await p.getByRole('button', { name: 'Aufträge', exact: true }).click();
  await p.getByText('1 von 1 erledigt').waitFor();
  pruefe(true, 'Lehrkraft sieht den Auftrag als erledigt');
  await p.getByRole('button', { name: 'Auswertung' }).click();
  await p.locator('table').first().waitFor();
  await a.foto('09-auswertung');
  const zeileMia = await p.locator('tbody tr', { hasText: 'Mia S.' }).first().textContent();
  pruefe(zeileMia.includes('1 / 0 / 0'), 'Klassenübersicht zeigt Bronze bei Mia');
  const klassePdf = await herunterladen(p, 'Als PDF');
  pruefe(readFileSync(klassePdf.pfad).subarray(0, 5).toString() === '%PDF-', 'Klassenübersicht als PDF');
  await p.getByRole('button', { name: 'Einzelbericht' }).click();
  await p.getByRole('heading', { name: /Fehlermuster/ }).waitFor();
  await a.foto('10-einzelbericht');

  // Hilfe: Elternbrief und Kurzanleitung als PDF
  await p.getByRole('button', { name: 'Hilfe', exact: true }).click();
  await p.getByLabel('Schule').fill('GS am Park');
  await p.getByLabel('Lehrkraft').fill('Frau Muster');
  const brief = await herunterladen(p, 'Elternbrief als PDF');
  pruefe(readFileSync(brief.pfad).subarray(0, 5).toString() === '%PDF-', 'Elternbrief als PDF');
  await a.foto('10b-hilfe');
  // Bauinsel-Regel ändern (wandert mit der Klassenliste)
  await p.getByRole('button', { name: 'Einstellungen', exact: true }).click();
  await p.getByLabel('Geschlossen').check();

  // Klassenliste weitergeben
  await p.getByRole('button', { name: 'Daten austauschen' }).click();
  const liste = await herunterladen(p, 'Klassenliste weitergeben');
  pruefe(liste.name.endsWith('.jahrmarkt') && !readFileSync(liste.pfad, 'utf8').includes('Mia'), `Klassenliste verschlüsselt (${liste.name})`);
  // Eigene Ergebnisse lassen sich nicht hier einsammeln
  const eigene = await herunterladen(p, 'Ergebnisse weitergeben');
  await p.locator('input[type=file]').setInputFiles(eigene.pfad);
  await p.getByText(/Ergebnisse dieses iPads/).waitFor();
  pruefe(true, 'Eigene Ergebnisse werden erkannt');
  await a.foto('11-austausch');

  /* ---------- iPad 2: Klassenliste übernehmen, spielen, Ergebnisse weitergeben ---------- */
  const b = await neuesIpad('ipad2', { width: 820, height: 1180 });
  const q = b.page;
  await q.getByRole('button', { name: 'Lehrerbereich einrichten' }).click();
  await q.getByLabel(/Name dieses iPads/).fill('iPad 2');
  await q.getByLabel(/^PIN \(/).fill('583920');
  await q.getByLabel('PIN wiederholen').fill('583920');
  await q.getByRole('button', { name: 'PIN festlegen' }).click();
  await q.getByLabel('Ich habe den Code notiert.').check();
  await q.getByRole('button', { name: 'Weiter zum Lehrerbereich' }).click();
  await q.getByRole('button', { name: 'Daten austauschen' }).click();
  await q.locator('input[type=file]').setInputFiles(liste.pfad);
  // Andere PIN: erst nachfragen
  await q.getByLabel('PIN des anderen iPads').waitFor();
  await q.getByLabel('PIN des anderen iPads').fill('111111');
  await q.getByRole('button', { name: 'Öffnen', exact: true }).click();
  await q.getByText(/nicht alle Dateien öffnen/).waitFor();
  await q.getByLabel('PIN des anderen iPads').fill(PIN);
  await q.getByRole('button', { name: 'Öffnen', exact: true }).click();
  await q.getByRole('button', { name: 'Übernehmen' }).click();
  await q.getByText(/3 neu/).waitFor();
  await b.foto('01-liste-uebernommen');
  await q.getByRole('button', { name: 'Lehrerbereich schließen' }).click();
  pruefe((await q.locator('.profile li').count()) === 3, 'iPad 2 zeigt nach der Klassenliste 3 Karten');
  // Jonas spielt auf iPad 2 mit dem Bildpasswort aus der Liste (gelesen auf iPad 1)
  await p.getByRole('button', { name: 'Klassen', exact: true }).click();
  await p.getByRole('button', { name: 'Passwörter zeigen' }).click();
  const pwJonas = await passwortVon(p, 'Jonas K.');
  await p.getByRole('button', { name: 'Daten austauschen' }).click();
  // Bauinsel-Regel kam mit der Liste: geschlossen
  await lehrerOeffnen(q, '583920');
  await q.getByRole('button', { name: 'Einstellungen', exact: true }).click();
  pruefe(await q.getByLabel('Geschlossen').isChecked(), 'Bauinsel-Regel kam mit der Klassenliste');
  // Klasse ohne Passwort: Aylin meldet sich nur mit Bestätigen an
  await q.getByRole('button', { name: 'Klassen', exact: true }).click();
  await q.getByLabel(/Anmelden ohne Bildpasswort/).check();
  await q.getByRole('button', { name: 'Lehrerbereich schließen' }).click();
  await q.getByRole('button', { name: 'Aylin T.: anmelden' }).click();
  await q.getByRole('heading', { name: 'Bist du Aylin T.?' }).waitFor();
  await b.foto('01b-ohne-passwort');
  await q.getByRole('button', { name: 'Ja, das bin ich' }).click();
  await q.getByRole('heading', { name: 'Figur gestalten' }).waitFor();
  pruefe(true, 'Klasse ohne Passwort: Anmelden mit Bestätigen');
  await q.getByRole('button', { name: 'Speichern' }).click();
  await q.getByText('Ich bin Flinka').waitFor();
  await q.reload();
  await q.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  await lehrerOeffnen(q, '583920');
  await q.getByRole('button', { name: 'Klassen', exact: true }).click();
  await q.getByLabel(/Anmelden ohne Bildpasswort/).uncheck();
  await q.getByRole('button', { name: 'Lehrerbereich schließen' }).click();

  await anmelden(q, 'Jonas K.', pwJonas);
  await q.getByRole('heading', { name: 'Figur gestalten' }).waitFor();
  await q.getByRole('button', { name: 'Speichern' }).click();
  await q.getByText('Ich bin Flinka').waitFor();
  pruefe(true, 'Jonas meldet sich auf iPad 2 mit dem Passwort aus der Liste an');
  // App „schließen“ und neu öffnen: Spielstand bleibt, Kind ist abgemeldet
  await q.reload();
  await q.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  pruefe((await q.locator('.profile li').count()) === 3, 'Nach dem Neustart: alle Kinder da, niemand angemeldet');
  await lehrerOeffnen(q, '583920');
  await q.getByRole('button', { name: 'Einstellungen' }).click();
  await q.getByLabel('Neue PIN (6 bis 8 Ziffern)').fill(PIN);
  await q.getByLabel('Neue PIN wiederholen').fill(PIN);
  await q.getByRole('button', { name: 'PIN ändern' }).click();
  await q.getByText(/neue PIN gilt ab sofort/).waitFor();
  await q.getByRole('button', { name: 'Daten austauschen' }).click();
  const ergebnisse2 = await herunterladen(q, 'Ergebnisse weitergeben');
  await b.foto('02-austausch');

  /* ---------- iPad 1: Ergebnisse einsammeln ---------- */
  await p.locator('input[type=file]').setInputFiles(ergebnisse2.pfad);
  await p.getByText(/Ergebnisse von iPad 2 eingesammelt \(3 Kinder\)/).waitFor();
  pruefe(await p.getByText(/iPad 2 · 3 Kinder/).isVisible(), 'Eingesammelte Ergebnisse stehen in der Liste');
  await p.getByRole('button', { name: 'Auswertung' }).click();
  await p.getByText(/Daten von diesem iPad und 1 weiteren iPad/).first().waitFor();
  await a.foto('12-auswertung-gesammelt');
  pruefe(true, 'Auswertung nutzt die eingesammelten Ergebnisse');

  // Auto-Schließen: Uhr vorstellen geht nicht; stattdessen Neustart → Lehrerbereich ist zu
  await p.reload();
  await p.getByRole('heading', { name: /Wer spielt/ }).waitFor();
  pruefe(!(await p.getByRole('heading', { name: 'Lehrerbereich' }).count()), 'Nach dem Neustart ist der Lehrerbereich geschlossen');
  // Fehlversuche bei der PIN
  await p.getByRole('button', { name: 'Lehrerbereich', exact: true }).click();
  for (let i = 0; i < 5; i++) {
    await p.getByLabel('Lehrer-PIN').fill('999999');
    await p.getByRole('button', { name: 'Öffnen' }).click();
    await p.getByText(/stimmt nicht|Fehlversuche/).first().waitFor();
  }
  pruefe(await p.getByText(/Zu viele Fehlversuche/).isVisible(), 'Nach 5 falschen PINs Wartezeit');
  await a.foto('13-pin-sperre');

  for (const [n, k] of [['iPad 1', a.konsole], ['iPad 2', b.konsole]]) pruefe(k.length === 0, `${n}: keine Fehler in der Konsole${k.length ? `: ${k.join(' | ')}` : ''}`);
} catch (e) {
  fehler++;
  console.error('✗ Ablauf abgebrochen:', e.message);
  if (letzteSeite) await letzteSeite.screenshot({ path: `${BILDER}/schule-abbruch.png` }).catch(() => {});
} finally {
  await browser.close();
  process.kill(-server.pid);
}
console.log(fehler ? `${fehler} Fehler` : 'Ablauftest Schulversion ohne Fehler');
process.exit(fehler ? 1 : 0);
