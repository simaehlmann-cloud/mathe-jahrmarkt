import { Circle, Container, Graphics, Text } from 'pixi.js';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven, type Buehne } from '../../engine/buehne';
import type { BudeSzene, SzenenKontext } from '../typen';

const BALLONFARBEN = [0xe23a4e, 0xffc62b, 0x3c78d8, 0x3fae6a, 0x7b5ea7, 0xf07f2a];
const TINTE = 0x1f2a6b;

interface Ballon {
  wert: number;
  huelle: Container;
  koerper: Container;
  basisX: number;
  basisY: number;
  phase: number;
  geplatzt: boolean;
}

/** Schriftart sicher geladen, bevor PixiJS Text auf die Leinwand zeichnet. */
async function schriftBereit(): Promise<void> {
  try {
    await Promise.all([document.fonts.load('900 40px Nunito'), document.fonts.load('800 20px Nunito')]);
  } catch {
    /* Systemschrift als Rückfall */
  }
}

export async function erstelleDartSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b: Buehne = await erstelleBuehne(host, k.reduziert);
  const wand = new Graphics();
  const ballonEbene = new Container();
  const pfeilEbene = new Container();
  const funkenEbene = new Container();
  b.app.stage.addChild(wand, ballonEbene, pfeilEbene, funkenEbene);

  let ballons: Ballon[] = [];
  let gesperrt = true;
  let aufgabe: Aufgabe | undefined;

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const ry = Math.max(30, Math.min(h * 0.17, w / 7.5, 78));
    return { w, h, rx: ry * 0.86, ry };
  };

  function zeichneWand() {
    const { w, h } = masse();
    wand.clear();
    wand.rect(0, 0, w, h).fill({ color: 0xf6dfb3 });
    for (let x = 0; x < w; x += 46) wand.rect(x, 0, 3, h).fill({ color: 0xe8c890 });
    // Theke unten, von hier fliegt der Pfeil
    wand.rect(0, h - 26, w, 26).fill({ color: 0xb9763f });
    wand.rect(0, h - 26, w, 6).fill({ color: 0x87521f });
  }

  function baueBallon(wert: number, farbe: number, rx: number, ry: number): Container {
    const koerper = new Container();
    const faden = new Graphics()
      .moveTo(0, ry + 6)
      .bezierCurveTo(-8, ry + 30, 8, ry + 50, 0, ry + 74)
      .stroke({ width: 2, color: 0x4a5394 });
    const form = new Graphics()
      .ellipse(0, 0, rx, ry)
      .fill({ color: farbe })
      .stroke({ width: 3, color: TINTE })
      .poly([-7, ry - 1, 7, ry - 1, 0, ry + 9])
      .fill({ color: farbe })
      .stroke({ width: 2, color: TINTE });
    const glanz = new Graphics().ellipse(-rx * 0.38, -ry * 0.42, rx * 0.18, ry * 0.26).fill({ color: 0xffffff, alpha: 0.5 });
    const zahl = new Text({
      text: String(wert),
      style: {
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontWeight: '900',
        fontSize: Math.round(ry * (wert >= 100 ? 0.62 : 0.78)),
        fill: 0xffffff,
        stroke: { color: TINTE, width: Math.max(4, ry * 0.11), join: 'round' },
      },
    });
    zahl.anchor.set(0.5);
    zahl.y = 2;
    koerper.addChild(faden, form, glanz, zahl);
    return koerper;
  }

  function platziere() {
    const { w, h, rx, ry } = masse();
    const n = ballons.length;
    const rand = Math.max(rx + 28, w * 0.1);
    const breiteNutzbar = w - 2 * rand;
    ballons.forEach((bl, i) => {
      bl.basisX = rand + (n === 1 ? breiteNutzbar / 2 : (i / (n - 1)) * breiteNutzbar);
      bl.basisY = h * 0.4 + (i % 2 === 0 ? -1 : 1) * Math.min(h * 0.08, ry * 0.5);
      bl.huelle.position.set(bl.basisX, bl.basisY);
      bl.huelle.hitArea = new Circle(0, 0, Math.max(rx, ry) + 10);
    });
  }

  function zeige(a: Aufgabe) {
    aufgabe = a;
    ballonEbene.removeChildren().forEach((c) => c.destroy({ children: true }));
    pfeilEbene.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { rx, ry } = masse();
    const startFarbe = Math.floor(Math.random() * BALLONFARBEN.length);
    ballons = a.optionen.map((o, i) => {
      const huelle = new Container();
      const koerper = baueBallon(o.wert, BALLONFARBEN[(startFarbe + i) % BALLONFARBEN.length] as number, rx, ry);
      huelle.addChild(koerper);
      huelle.eventMode = 'static';
      huelle.cursor = 'pointer';
      huelle.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      ballonEbene.addChild(huelle);
      return { wert: o.wert, huelle, koerper, basisX: 0, basisY: 0, phase: i * 1.7, geplatzt: false };
    });
    platziere();
    // Ballons steigen von unten auf
    const { h } = masse();
    ballons.forEach((bl, i) => {
      bl.huelle.y = h + 120;
      void b.warte(i * 70).then(() =>
        b.tween(520, (t) => {
          if (bl.huelle.destroyed) return;
          bl.huelle.y = h + 120 + (bl.basisY - h - 120) * t;
        }, kurven.feder),
      );
    });
  }

  function baueDart(): Container {
    const d = new Container();
    const g = new Graphics()
      .rect(-34, -2.5, 44, 5)
      .fill({ color: 0x87521f })
      .poly([10, -5, 28, 0, 10, 5])
      .fill({ color: 0x9aa0b8 })
      .stroke({ width: 1.5, color: TINTE })
      .poly([-34, 0, -46, -12, -30, -2])
      .fill({ color: 0xe23a4e })
      .poly([-34, 0, -46, 12, -30, 2])
      .fill({ color: 0xe23a4e });
    d.addChild(g);
    return d;
  }

  async function wirf(bl: Ballon): Promise<Container> {
    const { w, h } = masse();
    const d = baueDart();
    const sx = w / 2;
    const sy = h - 20;
    const zx = bl.huelle.x;
    const zy = bl.huelle.y;
    d.position.set(sx, sy);
    d.rotation = Math.atan2(zy - sy, zx - sx);
    pfeilEbene.addChild(d);
    k.klang('wurf');
    await b.tween(260, (t) => {
      if (d.destroyed) return;
      d.x = sx + (zx - sx) * t;
      d.y = sy + (zy - sy) * t - Math.sin(t * Math.PI) * 30;
    }, kurven.linear);
    return d;
  }

  function funken(x: number, y: number, farbe: number) {
    const teile: { g: Graphics; vx: number; vy: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const g = new Graphics().circle(0, 0, 4 + Math.random() * 4).fill({ color: i % 3 === 0 ? 0xffc62b : farbe });
      g.position.set(x, y);
      const w = (i / 14) * Math.PI * 2;
      teile.push({ g, vx: Math.cos(w) * (3 + Math.random() * 3), vy: Math.sin(w) * (3 + Math.random() * 3) });
      funkenEbene.addChild(g);
    }
    void b.tween(520, (t) => {
      for (const p of teile) {
        if (p.g.destroyed) continue;
        p.g.x += p.vx;
        p.g.y += p.vy + t * 2;
        p.g.alpha = 1 - t;
      }
    }, kurven.linear).then(() => teile.forEach((p) => p.g.destroy()));
  }

  const abmelden = b.jedesBild((zeit) => {
    if (b.reduziert) return;
    for (const bl of ballons) {
      if (bl.geplatzt || bl.huelle.destroyed) continue;
      bl.koerper.y = Math.sin(zeit / 700 + bl.phase) * 6;
      bl.koerper.rotation = Math.sin(zeit / 900 + bl.phase) * 0.04;
    }
  });
  // Bei Größenänderung (Drehen des Geräts) nur Wand und Positionen anpassen, keine neuen Ballons.
  const abmeldenGroesse = b.beiGroesse(() => {
    zeichneWand();
    platziere();
  });
  zeichneWand();

  return {
    zeige,
    async treffer(wert) {
      const bl = ballons.find((x) => x.wert === wert);
      if (!bl) return;
      const d = await wirf(bl);
      bl.geplatzt = true;
      k.klang('pop');
      funken(bl.huelle.x, bl.huelle.y, 0xe23a4e);
      d.destroy();
      await b.tween(160, (t) => {
        if (bl.huelle.destroyed) return;
        bl.huelle.scale.set(1 + t * 0.4);
        bl.huelle.alpha = 1 - t;
      });
      // Die übrigen Ballons fliegen davon
      await b.tween(300, (t) => {
        for (const x of ballons) if (x !== bl && !x.huelle.destroyed) x.huelle.y -= 12 * t + 2;
      });
    },
    async daneben(wert) {
      const bl = ballons.find((x) => x.wert === wert);
      if (!bl) return;
      const d = await wirf(bl);
      // Ballon wackelt, Pfeil prallt ab und fällt
      const sx = d.x;
      const sy = d.y;
      await b.tween(450, (t) => {
        if (bl.huelle.destroyed || d.destroyed) return;
        bl.huelle.rotation = Math.sin(t * Math.PI * 5) * 0.25 * (1 - t);
        d.x = sx - 30 * t;
        d.y = sy + 260 * t * t;
        d.rotation += 0.15;
      }, kurven.linear);
      d.destroy();
      if (!bl.huelle.destroyed) bl.huelle.alpha = 0.45;
    },
    sperre(x) {
      gesperrt = x;
    },
    zerstoere() {
      abmelden();
      abmeldenGroesse();
      b.zerstoere();
    },
  };
}
