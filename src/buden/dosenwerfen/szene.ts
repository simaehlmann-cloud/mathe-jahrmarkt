import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const DOSENFARBEN: [number, number][] = [
  [0xe23a4e, 0xffc62b],
  [0x3c78d8, 0xffffff],
  [0x3fae6a, 0xffc62b],
  [0x7b5ea7, 0xffffff],
];

interface Turm {
  wert: number;
  huelle: Container;
  dosen: Container[];
  schild: Container;
  getroffen: boolean;
}

/**
 * Dosenwerfen: vier Dosentürme, jeder mit einer Zahl auf dem Schild. Das Kind tippt auf den Turm,
 * Kalle wirft den Ball. Hoch: zwei Regale mit je zwei Türmen, quer: ein Regal mit vier.
 */
export async function erstelleDosenSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const wand = new Graphics();
  const regal = new Graphics();
  const turmEbene = new Container();
  const ballEbene = new Container();
  b.app.stage.addChild(wand, regal, turmEbene, ballEbene);

  let tuerme: Turm[] = [];
  let gesperrt = true;
  let aufgabe: Aufgabe | undefined;

  const raster = () => {
    const w = b.breite();
    const h = b.hoehe();
    const spalten = w < 520 ? 2 : 4;
    const zeilen = 4 / spalten;
    const zelleB = w / spalten;
    const nutzH = h - 70; // unten die Theke
    const zelleH = nutzH / zeilen;
    const dose = Math.max(18, Math.min(zelleB * 0.24, zelleH * 0.22, 60));
    return { w, h, spalten, zeilen, zelleB, zelleH, dose };
  };

  /** Mitte unten (Regalbrett) eines Turms. */
  const ort = (i: number) => {
    const r = raster();
    const sp = i % r.spalten;
    const ze = Math.floor(i / r.spalten);
    return { x: (sp + 0.5) * r.zelleB, y: (ze + 0.62) * r.zelleH + 8 };
  };

  function zeichneWand() {
    const r = raster();
    wand.clear();
    // Zeltbahnen in Rot und Creme
    const bahn = Math.max(36, r.w / 10);
    for (let x = 0, i = 0; x < r.w; x += bahn, i++) wand.rect(x, 0, bahn, r.h).fill({ color: i % 2 ? 0xfbeedd : 0xf6c7b6 });
    // Girlande
    wand.moveTo(0, 10);
    for (let x = 0; x <= r.w; x += 40) wand.quadraticCurveTo(x + 20, 24, x + 40, 10);
    wand.stroke({ width: 2, color: TINTE, alpha: 0.4 });
    // Theke
    wand.rect(0, r.h - 34, r.w, 34).fill({ color: 0xb9763f });
    wand.rect(0, r.h - 34, r.w, 7).fill({ color: 0x87521f });
    // Regalbretter
    regal.clear();
    for (let ze = 0; ze < r.zeilen; ze++) {
      const y = (ze + 0.62) * r.zelleH + 8;
      regal.rect(r.w * 0.04, y, r.w * 0.92, 10).fill({ color: 0x9a6232 }).stroke({ width: 2, color: 0x6e4220 });
    }
  }

  function baueDose(farbe: [number, number], d: number): Container {
    const c = new Container();
    const g = new Graphics();
    const bw = d;
    const bh = d * 1.28;
    g.roundRect(-bw / 2, -bh, bw, bh, 4).fill({ color: farbe[0] }).stroke({ width: 2.5, color: TINTE });
    g.rect(-bw / 2 + 2, -bh * 0.62, bw - 4, bh * 0.26).fill({ color: farbe[1] });
    g.ellipse(0, -bh, bw / 2, 3.5).fill({ color: 0xcfd3e2 }).stroke({ width: 2, color: TINTE });
    g.rect(-bw / 2 + 4, -bh + 5, 3, bh - 10).fill({ color: 0xffffff, alpha: 0.4 });
    c.addChild(g);
    return c;
  }

  function baueSchild(wert: number, breite: number): Container {
    const c = new Container();
    const text = zahlText(wert);
    const groesse = Math.max(14, Math.min(30, (breite * 1.55) / Math.max(3, text.length)));
    const t = new Text({
      text,
      style: { fontFamily: 'Nunito, system-ui, sans-serif', fontWeight: '900', fontSize: groesse, fill: 0xffffff },
    });
    t.anchor.set(0.5);
    const bw = Math.max(t.width + 18, breite * 0.7);
    const bh = t.height + 8;
    const g = new Graphics().roundRect(-bw / 2, -bh / 2, bw, bh, 8).fill({ color: 0x87521f }).stroke({ width: 3, color: TINTE });
    c.addChild(g, t);
    return c;
  }

  function stelleTuerme() {
    const r = raster();
    tuerme.forEach((t, i) => {
      const o = ort(i);
      t.huelle.position.set(o.x, o.y);
      const d = r.dose;
      const bh = d * 1.28;
      const lage: [number, number][] = [
        [-d * 0.55, 0],
        [d * 0.55, 0],
        [0, -bh - 1],
      ];
      t.dosen.forEach((dose, j) => {
        if (t.getroffen) return;
        const [x, y] = lage[j] ?? [0, 0];
        dose.position.set(x, y);
        dose.rotation = 0;
        dose.alpha = 1;
      });
      t.schild.position.set(0, 10 + t.schild.height / 2 + 4);
      t.huelle.hitArea = new Rectangle(-r.zelleB / 2 + 4, -bh * 2 - 12, r.zelleB - 8, bh * 2 + 30 + t.schild.height);
    });
  }

  function zeige(a: Aufgabe) {
    aufgabe = a;
    turmEbene.removeChildren().forEach((c) => c.destroy({ children: true }));
    ballEbene.removeChildren().forEach((c) => c.destroy({ children: true }));
    const r = raster();
    tuerme = a.optionen.map((o, i) => {
      const huelle = new Container();
      const farbe = DOSENFARBEN[i % DOSENFARBEN.length] as [number, number];
      const dosen = [0, 1, 2].map(() => baueDose(farbe, r.dose));
      const schild = baueSchild(o.wert, r.zelleB * 0.9);
      huelle.addChild(...dosen, schild);
      huelle.eventMode = 'static';
      huelle.cursor = 'pointer';
      huelle.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      turmEbene.addChild(huelle);
      return { wert: o.wert, huelle, dosen, schild, getroffen: false };
    });
    stelleTuerme();
    // Türme plumpsen von oben ins Regal
    tuerme.forEach((t, i) => {
      const zielY = t.huelle.y;
      t.huelle.y = zielY - 40;
      t.huelle.alpha = 0;
      void b.warte(i * 60).then(() =>
        b.tween(380, (x) => {
          if (t.huelle.destroyed) return;
          t.huelle.y = zielY - 40 * (1 - x);
          t.huelle.alpha = x;
        }, kurven.feder),
      );
    });
  }

  async function wirf(t: Turm): Promise<Graphics> {
    const r = raster();
    const ball = new Graphics().circle(0, 0, Math.max(8, r.dose * 0.36)).fill({ color: 0xf2f2f2 }).stroke({ width: 3, color: TINTE });
    ball.moveTo(-6, -2).quadraticCurveTo(0, 4, 6, -2).stroke({ width: 2, color: 0xe23a4e });
    const sx = r.w / 2;
    const sy = r.h - 30;
    const zx = t.huelle.x;
    const zy = t.huelle.y - r.dose * 1.3;
    ball.position.set(sx, sy);
    ballEbene.addChild(ball);
    k.klang('wurf');
    await b.tween(360, (x) => {
      if (ball.destroyed) return;
      ball.x = sx + (zx - sx) * x;
      ball.y = sy + (zy - sy) * x - Math.sin(x * Math.PI) * 50;
      ball.scale.set(1 - x * 0.3);
      ball.rotation += 0.3;
    }, kurven.linear);
    return ball;
  }

  const abmeldenGroesse = b.beiGroesse(() => {
    zeichneWand();
    stelleTuerme();
  });
  zeichneWand();

  return {
    zeige,
    async treffer(wert) {
      const t = tuerme.find((x) => x.wert === wert);
      if (!t) return;
      const ball = await wirf(t);
      t.getroffen = true;
      k.klang('pop');
      // Dosen fliegen auseinander und fallen
      const flug = t.dosen.map((d, j) => ({ d, vx: (j - 1) * 3 + (Math.random() - 0.5) * 4, vy: -5 - Math.random() * 4, vr: (Math.random() - 0.5) * 0.4 }));
      await b.tween(700, (x) => {
        for (const f of flug) {
          if (f.d.destroyed) continue;
          f.d.x += f.vx;
          f.d.y += f.vy;
          f.vy += 0.9;
          f.d.rotation += f.vr;
          f.d.alpha = 1 - x * 0.8;
        }
        if (!ball.destroyed) {
          ball.y += 6;
          ball.alpha = 1 - x;
        }
      }, kurven.linear);
      ball.destroy();
      // Schild leuchtet
      if (!t.schild.destroyed) t.schild.scale.set(1.12);
    },
    async daneben(wert) {
      const t = tuerme.find((x) => x.wert === wert);
      if (!t) return;
      const ball = await wirf(t);
      // Der Turm wackelt, bleibt aber stehen; der Ball prallt ab
      const sx = ball.x;
      const sy = ball.y;
      await b.tween(480, (x) => {
        if (t.huelle.destroyed || ball.destroyed) return;
        t.dosen.forEach((d, j) => (d.rotation = Math.sin(x * Math.PI * 5 + j) * 0.12 * (1 - x)));
        ball.x = sx + 40 * x;
        ball.y = sy + 200 * x * x;
      }, kurven.linear);
      ball.destroy();
      if (!t.huelle.destroyed) t.huelle.alpha = 0.45;
    },
    sperre(x) {
      gesperrt = x;
    },
    zerstoere() {
      abmeldenGroesse();
      b.zerstoere();
    },
  };
}

