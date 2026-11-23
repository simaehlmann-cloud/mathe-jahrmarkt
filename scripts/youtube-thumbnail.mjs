// Vorschaubild (Thumbnail) für YouTube: 1280×720, JPEG unter 2 MB.
// Aufruf: node scripts/youtube-thumbnail.mjs   (braucht store-bilder/roh/ipad-1-jahrmarkt.png aus npm run store-bilder)
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const AUS = process.env.AUS ?? 'youtube';
mkdirSync(AUS, { recursive: true });
const schrift = (g) => readFileSync(`node_modules/@fontsource/nunito/files/nunito-latin-${g}-normal.woff2`).toString('base64');
const bild = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const SYMBOL = bild('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const JAHRMARKT = bild('store-bilder/roh/ipad-1-jahrmarkt.png');
const AUFGABE = bild('store-bilder/roh/telefon-2-dartbude.png');

const b = await chromium.launch({ executablePath: process.env.CHROME_PFAD ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.setContent(`<style>
@font-face{font-family:N;font-weight:900;src:url(data:font/woff2;base64,${schrift(900)})}
*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;overflow:hidden;font-family:N;color:#fff;
background:radial-gradient(120% 100% at 30% 30%, #8f6fd6 0%, #5a3fa8 55%, #2b2470 100%)}
.text{position:absolute;left:56px;top:70px;width:640px}
.symbol{width:150px;height:150px;border-radius:34px;box-shadow:0 8px 0 rgba(31,42,107,.55)}
h1{font-size:92px;line-height:.98;margin:26px 0 0;font-weight:900;text-shadow:0 6px 0 #1f2a6b}
.gelb{display:inline-block;margin-top:22px;font-size:58px;font-weight:900;color:#1f2a6b;background:#ffc62b;border:6px solid #1f2a6b;border-radius:22px;padding:4px 26px;box-shadow:0 6px 0 #1f2a6b;transform:rotate(-2deg)}
.unten{margin-top:30px;font-size:34px;font-weight:900;text-shadow:0 3px 0 #1f2a6b}
.tablet{position:absolute;right:-60px;top:70px;width:560px;height:746px;border-radius:40px;border:14px solid #1f2a6b;overflow:hidden;transform:rotate(6deg);box-shadow:0 18px 0 rgba(31,42,107,.5);background:#fff}
.tablet img{width:100%;height:100%;object-fit:cover;object-position:top}
.telefon{position:absolute;right:400px;top:300px;width:250px;height:520px;border-radius:38px;border:12px solid #1f2a6b;overflow:hidden;transform:rotate(-7deg);box-shadow:0 16px 0 rgba(31,42,107,.5);background:#fff}
.telefon img{width:100%;height:100%;object-fit:cover;object-position:top}
</style>
<div class="tablet"><img src="${JAHRMARKT}"></div>
<div class="telefon"><img src="${AUFGABE}"></div>
<div class="text"><img class="symbol" src="${SYMBOL}"><h1>Mathe-<br>Jahrmarkt</h1><div class="gelb">Fit für Klasse 5</div><div class="unten">Mathe üben mit Spaß</div></div>`);
await p.waitForTimeout(500);
await p.screenshot({ path: `${AUS}/mathe-jahrmarkt-thumbnail.jpg`, type: 'jpeg', quality: 90 });
await b.close();
console.log(`${AUS}/mathe-jahrmarkt-thumbnail.jpg`);
