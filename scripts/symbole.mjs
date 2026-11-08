/**
 * Erzeugt App-Symbol und Startbild für Android und iOS aus den SVGs in grafik-quellen/.
 * Aufruf: node scripts/symbole.mjs   (braucht Chrome; Pfad über CHROME änderbar)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const q = (d) => readFileSync(new URL(`../grafik-quellen/${d}`, import.meta.url), 'utf8');
const datenUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const schrift = readFileSync(new URL('../node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2', import.meta.url)).toString('base64');

const HINTERGRUND = q('symbol-hintergrund.svg');
const KOPF = q('flinka-kopf.svg');
const FLINKA = q('flinka.svg');
const HIMMEL = '#9fdcff';

const ANDROID = 'android/app/src/main/res';
const DICHTEN = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/** Seite mit Bild-Ebenen; jede Ebene füllt die ganze Fläche. */
const ebenen = (bilder, { rund = false } = {}) => `
  <html><body style="margin:0;background:transparent">
  <div style="position:relative;width:100vw;height:100vh;overflow:hidden;${rund ? 'border-radius:50%;' : ''}">
    ${bilder.map((b) => `<img src="${datenUrl(b)}" style="position:absolute;inset:0;width:100%;height:100%">`).join('')}
  </div></body></html>`;

/** Altes Symbol: Ausschnitt 72/108 der Mitte, wie ein Launcher das adaptive Symbol zeigt. */
const legacy = (rund) => `
  <html><body style="margin:0;background:transparent">
  <div style="width:100vw;height:100vh;overflow:hidden;position:relative;border-radius:${rund ? '50%' : '18%'}">
    ${[HINTERGRUND, KOPF].map((b) => `<img src="${datenUrl(b)}" style="position:absolute;width:150%;height:150%;left:-25%;top:-25%">`).join('')}
  </div></body></html>`;

const startbild = (b, h) => {
  const k = Math.min(b, h);
  return `
  <html><head><style>
    @font-face { font-family: Nunito; font-weight: 900; src: url(data:font/woff2;base64,${schrift}) format('woff2'); }
    body { margin:0; width:${b}px; height:${h}px; overflow:hidden;
      background: radial-gradient(circle at 50% 42%, #fff6d6 0%, ${HIMMEL} 48%, #3f9be0 100%);
      font-family: Nunito; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    img { width:${k * 0.42}px; height:${k * 0.49}px; }
    h1 { margin:${k * 0.03}px 0 0; font-size:${k * 0.085}px; color:#1f2a6b; letter-spacing:-0.01em; }
    p { margin:${k * 0.01}px 0 0; font-size:${k * 0.045}px; color:#c4302b; }
  </style></head><body>
    <img src="${datenUrl(FLINKA)}"><h1>Mathe-Jahrmarkt</h1><p>Fit für Klasse 5</p>
  </body></html>`;
};

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const seite = await browser.newPage();
let anzahl = 0;

async function bild(html, b, h, datei, { transparent = false } = {}) {
  await seite.setViewportSize({ width: b, height: h });
  await seite.setContent(html, { waitUntil: 'load' });
  await seite.evaluate(() => document.fonts.ready);
  writeFileSync(datei, await seite.screenshot({ omitBackground: transparent, type: 'png' }));
  anzahl++;
}

for (const [dichte, f] of Object.entries(DICHTEN)) {
  const ordner = `${ANDROID}/mipmap-${dichte}`;
  await bild(legacy(false), 48 * f, 48 * f, `${ordner}/ic_launcher.png`, { transparent: true });
  await bild(legacy(true), 48 * f, 48 * f, `${ordner}/ic_launcher_round.png`, { transparent: true });
  await bild(ebenen([KOPF]), 108 * f, 108 * f, `${ordner}/ic_launcher_foreground.png`, { transparent: true });
  await bild(ebenen([HINTERGRUND]), 108 * f, 108 * f, `${ordner}/ic_launcher_background.png`);
}

const START = {
  'drawable/splash.png': [480, 320],
  'drawable-port-mdpi/splash.png': [320, 480],
  'drawable-port-hdpi/splash.png': [480, 800],
  'drawable-port-xhdpi/splash.png': [720, 1280],
  'drawable-port-xxhdpi/splash.png': [960, 1600],
  'drawable-port-xxxhdpi/splash.png': [1280, 1920],
  'drawable-land-mdpi/splash.png': [480, 320],
  'drawable-land-hdpi/splash.png': [800, 480],
  'drawable-land-xhdpi/splash.png': [1280, 720],
  'drawable-land-xxhdpi/splash.png': [1600, 960],
  'drawable-land-xxxhdpi/splash.png': [1920, 1280],
};
for (const [datei, [b, h]] of Object.entries(START)) await bild(startbild(b, h), b, h, `${ANDROID}/${datei}`);

// iOS: Symbol ohne Transparenz (Apple lehnt Alpha ab), Ecken rundet das System selbst
const IOS = 'ios/App/App/Assets.xcassets';
await bild(ebenen([HINTERGRUND, KOPF]).replace('background:transparent', `background:${HIMMEL}`), 1024, 1024, `${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`);
for (const n of ['', '-1', '-2']) await bild(startbild(2732, 2732), 2732, 2732, `${IOS}/Splash.imageset/splash-2732x2732${n}.png`);

await browser.close();
console.log(`${anzahl} Bilder erzeugt.`);
