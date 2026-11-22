/**
 * App-Symbol der Schulversion: das normale Symbol mit einem Band „SCHULE“ unten.
 * Aufruf: node scripts/symbol-schule.mjs   (braucht Chrome; vorher scripts/symbole.mjs für das normale Symbol)
 * Ergebnis: ios-schule/AppIcon-512@2x.png – der Workflow „iOS TestFlight Schule“ kopiert es ins iOS-Projekt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';
const symbol = readFileSync(new URL('../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', import.meta.url)).toString('base64');
const schrift = readFileSync(new URL('../node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2', import.meta.url)).toString('base64');

const html = `<html><head><style>
@font-face { font-family: N; src: url(data:font/woff2;base64,${schrift}); }
body { margin: 0; }
.band { position: absolute; left: 0; right: 0; bottom: 0; height: 210px; background: #1f2a6b; display: grid; place-items: center;
  font: 900 150px N; letter-spacing: 12px; color: #ffc62b; border-top: 14px solid #ffc62b; }
</style></head><body>
<div style="position:relative;width:1024px;height:1024px;overflow:hidden">
<img src="data:image/png;base64,${symbol}" style="width:1024px;height:1024px;display:block">
<div class="band">SCHULE</div></div></body></html>`;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
writeFileSync('ios-schule/AppIcon-512@2x.png', await page.screenshot({ omitBackground: false }));
await browser.close();
console.log('ios-schule/AppIcon-512@2x.png geschrieben');
