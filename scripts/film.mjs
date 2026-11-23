// Gemeinsame Bausteine für die Videoaufnahmen (App-Vorschau und YouTube): Bild-für-Bild-Film, Bildtext,
// Lösungshilfe für Buden, Beispiel-Insel.
import { writeFileSync } from 'node:fs';

export const FPS = 30;

/* ---------- Beispiel-Insel: Haus mit Tür und Fenstern, Garten, Tiere ---------- */
const BREITE = 44;
const HOEHE = 58;
export function beispielInsel() {
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
export class Film {
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
export const bildtext = (page, text, oben = false) =>
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
const rechneTerm = (a) => {
  const s = a.replace(/[−–]/g, '-').replace(/·/g, '*').replace(/:/g, '/').replace(/(\d)\s+(?=\d)/g, '$1');
  if (!/^[\d\s+\-*/().]+$/.test(s)) throw new Error('kein Term');
  return Function(`return (${s})`)();
};
/** Richtige Antwort unter den Antwortknöpfen einer Bude finden. */
export async function richtigeAntwort(page) {
  const text = (await page.locator('.aufgabe').textContent()).trim();
  const werte = await page.locator('.nur-leser button').allTextContents();
  // Stellenwerte: „8 H 1 Z 9 E“, auch T, ZT, HT, M
  const st = { M: 1e6, HT: 1e5, ZT: 1e4, T: 1e3, H: 100, Z: 10, E: 1 };
  const teile = [...text.matchAll(/(\d+)\s*(HT|ZT|M|T|H|Z|E)(?![a-zäöü])/g)];
  if (teile.length) return werte.find((w) => zahl(w) === teile.reduce((s, [, n, e]) => s + Number(n) * st[e], 0));
  // „Wert der 8 in 80 067“ (die Ziffer kommt genau einmal vor)
  const wert = text.match(/Wert der (\d) in ([\d\s.]+)/);
  if (wert) {
    const ziffern = String(zahl(wert[2]));
    const i = ziffern.indexOf(wert[1]);
    if (i >= 0 && ziffern.lastIndexOf(wert[1]) === i) return werte.find((w) => zahl(w) === Number(wert[1]) * 10 ** (ziffern.length - 1 - i));
    return undefined;
  }
  // Vergleich „608 − 119 ○ 610 − 121“ mit <, =, >
  if (text.includes('○')) {
    const [l, r] = text.split('○');
    try {
      const a = rechneTerm(l), c = rechneTerm(r);
      return werte.find((w) => w.trim() === (a < c ? '<' : a > c ? '>' : '='));
    } catch {
      return undefined;
    }
  }
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

/** Weltpunkt (Jahrmarkt-Koordinaten) in die Bildmitte holen; gibt seine Bildschirmposition zurück. */
export async function zeigeWelt(page, wx, wy) {
  const punkt = await page.evaluate(([wx, wy]) => {
    const k = document.querySelector('.karte');
    const m = document.querySelector('.huelle').offsetWidth / 1640;
    k.scrollTo({ left: wx * m - k.clientWidth / 2, top: wy * m - k.clientHeight / 2 });
    const r = k.getBoundingClientRect();
    return { x: r.left + wx * m - k.scrollLeft, y: r.top + wy * m - k.scrollTop };
  }, [wx, wy]);
  await page.waitForTimeout(300);
  return punkt;
}

