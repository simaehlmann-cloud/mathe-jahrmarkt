// Die App läuft mit strenger Content-Security-Policy ohne 'unsafe-eval'.
// Dieses Modul ersetzt die Shader-Erzeugung von PixiJS durch eine Variante ohne eval.
import 'pixi.js/unsafe-eval';
import { Application, type Ticker } from 'pixi.js';

/**
 * Bühne für eine Bude: eine PixiJS-Anwendung, die ihren Container ausfüllt,
 * mit Hilfen für Animationen, die „Bewegung reduzieren“ beachten.
 */
export interface Buehne {
  readonly app: Application;
  readonly reduziert: boolean;
  breite(): number;
  hoehe(): number;
  /** Ruft schritt(t) mit t von 0 bis 1 über die Dauer auf. Bei reduzierter Bewegung sofort mit 1. */
  tween(dauerMs: number, schritt: (t: number) => void, kurve?: (t: number) => number): Promise<void>;
  warte(ms: number): Promise<void>;
  /** Läuft jeden Frame, bis die Bühne zerstört wird. Gibt eine Abmeldefunktion zurück. */
  jedesBild(fn: (ms: number) => void): () => void;
  beiGroesse(fn: () => void): () => void;
  zerstoere(): void;
}

export const kurven = {
  linear: (t: number) => t,
  raus: (t: number) => 1 - (1 - t) ** 3,
  rein: (t: number) => t * t,
  feder: (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2,
};

export async function erstelleBuehne(host: HTMLElement, reduziert: boolean): Promise<Buehne> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    preference: 'webgl',
  });
  host.appendChild(app.canvas);
  app.canvas.setAttribute('aria-hidden', 'true');

  let zerstoert = false;
  const ticker: Ticker = app.ticker;
  const groessenBeobachter = new Set<() => void>();
  const ro = new ResizeObserver(() => {
    // resizeTo reagiert auf window.resize; bei Container-Änderungen selbst nachziehen.
    app.resize();
    groessenBeobachter.forEach((f) => f());
  });
  ro.observe(host);

  const tween = (dauerMs: number, schritt: (t: number) => void, kurve: (t: number) => number = kurven.raus): Promise<void> =>
    new Promise((fertig) => {
      if (reduziert || dauerMs <= 0 || zerstoert) {
        schritt(1);
        fertig();
        return;
      }
      let vergangen = 0;
      const tick = (t: Ticker) => {
        if (zerstoert) {
          ticker.remove(tick);
          fertig();
          return;
        }
        vergangen += t.deltaMS;
        const x = Math.min(1, vergangen / dauerMs);
        schritt(kurve(x));
        if (x >= 1) {
          ticker.remove(tick);
          fertig();
        }
      };
      ticker.add(tick);
    });

  return {
    app,
    reduziert,
    breite: () => app.screen.width,
    hoehe: () => app.screen.height,
    tween,
    warte: (ms) => new Promise((r) => setTimeout(r, reduziert ? Math.min(ms, 150) : ms)),
    jedesBild(fn) {
      const tick = (t: Ticker) => fn(t.lastTime);
      ticker.add(tick);
      return () => ticker.remove(tick);
    },
    beiGroesse(fn) {
      groessenBeobachter.add(fn);
      return () => groessenBeobachter.delete(fn);
    },
    zerstoere() {
      if (zerstoert) return;
      zerstoert = true;
      ro.disconnect();
      groessenBeobachter.clear();
      app.destroy({ removeView: true }, { children: true, texture: true });
    },
  };
}
