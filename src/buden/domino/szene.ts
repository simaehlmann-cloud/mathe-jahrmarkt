import { Container, Graphics, Text, type FederatedPointerEvent } from 'pixi.js';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const SCHRIFT = 'Nunito, system-ui, sans-serif';

/** Platz eines Steins in der Schlange: Mitte (in Einheiten der Steinlänge L), waagerecht oder senkrecht, Laufrichtung. */
interface Platz {
  x: number;
  y: number;
  senkrecht: boolean;
  /** Richtung, in der die Kette weiterläuft: Ergebnis-Hälfte liegt hinten, Aufgaben-Hälfte vorne. */
  richtung: 'rechts' | 'links' | 'runter';
}

/**
 * Die gelegte Figur: drei Steine nach rechts, einer nach unten, drei nach links, einer nach unten, drei nach rechts.
 * Elf Plätze: Startstein und zehn Aufgaben ergeben zusammen eine Schlange.
 */
export function schlange(): Platz[] {
  const p: Platz[] = [];
  for (let r = 0; r < 3; r++) {
    const top = r * 1.5;
    const nachRechts = r % 2 === 0;
    for (let c = 0; c < 3; c++) {
      const spalte = nachRechts ? c : 2 - c;
      p.push({ x: spalte + 0.5, y: top + 0.25, senkrecht: false, richtung: nachRechts ? 'rechts' : 'links' });
    }
    if (r < 2) p.push({ x: nachRechts ? 2.75 : 0.25, y: top + 1, senkrecht: true, richtung: 'runter' });
  }
  return p;
}
const PLAETZE = schlange();

/**
 * Rechendomino: Das Kind zieht den Stein mit dem richtigen Ergebnis an das offene Ende der Kette
 * (Antippen geht auch). Die Kette legt sich in Schlangenlinien zu einer Figur.
 */
export async function erstelleDominoSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const tisch = new Graphics();
  const kette = new Container();
  const ziel = new Graphics();
  const auswahl = new Container();
  const funken = new Container();
  b.app.stage.addChild(tisch, kette, ziel, auswahl, funken);

  let aufgabe: Aufgabe | undefined;
  let gesperrt = true;
  /** Gelegte Steine: Ergebnis (hinten) und Aufgabe (vorne). */
  let steine: { ergebnis: string; aufgabe: string }[] = [{ ergebnis: 'Start', aufgabe: '' }];

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const quer = w > h * 1.15;
    // Figur 3 L breit, 3,5 L hoch; daneben (quer) oder darunter (hoch) die Auswahl
    const L = quer ? Math.min((w * 0.58) / 3, (h * 0.92) / 3.5) : Math.min((w * 0.92) / 3, (h * 0.62) / 3.5);
    const ox = quer ? w * 0.04 + (w * 0.58 - 3 * L) / 2 : (w - 3 * L) / 2;
    const oy = quer ? (h - 3.5 * L) / 2 : h * 0.03;
    return { w, h, L, ox, oy, quer };
  };

  const platzMitte = (i: number) => {
    const { L, ox, oy } = masse();
    const p = PLAETZE[i % PLAETZE.length] as Platz;
    return { x: ox + p.x * L, y: oy + p.y * L, p };
  };

  function zeichneTisch() {
    const { w, h } = masse();
    tisch.clear();
    tisch.rect(0, 0, w, h).fill({ color: 0x2f8a57 });
    tisch.rect(8, 8, w - 16, h - 16).stroke({ width: 4, color: 0x226b43 });
  }

  /** Stein der Länge `laenge`; `hinten` liegt zur Kette hin, `vorne` am offenen Ende. */
  function baueStein(hinten: string, vorne: string, laenge: number, hervor = false): Container {
    const c = new Container();
    const breite = laenge / 2;
    const g = new Graphics();
    g.roundRect(-laenge / 2, -breite / 2, laenge, breite, 9).fill({ color: 0xfffdf7 }).stroke({ width: 3, color: TINTE });
    g.moveTo(0, -breite / 2 + 6).lineTo(0, breite / 2 - 6).stroke({ width: 2.5, color: TINTE });
    if (hervor) g.roundRect(3, -breite / 2 + 3, laenge / 2 - 6, breite - 6, 7).stroke({ width: 3, color: 0xffc62b });
    c.addChild(g);
    const feld = (text: string, x: number, farbe: number) => {
      if (!text) {
        for (const [px, py] of [[-0.1, -0.12], [0.1, 0.12], [0, 0]] as const) g.circle(x + px * laenge, py * laenge, laenge * 0.025).fill({ color: TINTE, alpha: 0.3 });
        return;
      }
      const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(breite * 0.42), fill: farbe } });
      t.anchor.set(0.5);
      const platz = laenge / 2 - 10;
      if (t.width > platz) t.scale.set(platz / t.width);
      t.position.set(x, 0);
      c.addChild(t);
    };
    feld(hinten, -laenge / 4, 0x2f8a57);
    feld(vorne, laenge / 4, TINTE);
    return c;
  }

  /** Drehung je Laufrichtung, damit „hinten“ immer zur Kette zeigt. Text bleibt lesbar. */
  function richte(c: Container, p: Platz) {
    if (p.richtung === 'links') {
      c.rotation = Math.PI;
      for (const t of c.children) if (t instanceof Text) t.rotation = Math.PI;
    } else if (p.richtung === 'runter') {
      c.rotation = Math.PI / 2;
      for (const t of c.children) if (t instanceof Text) t.rotation = -Math.PI / 2;
    }
  }

  function zeichneKette() {
    kette.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { L } = masse();
    const start = Math.floor((steine.length - 1) / PLAETZE.length) * PLAETZE.length;
    steine.slice(start).forEach((st, i) => {
      const neu = start + i === steine.length - 1;
      const { x, y, p } = platzMitte(i);
      const c = baueStein(st.ergebnis, st.aufgabe, L, neu);
      richte(c, p);
      c.position.set(x, y);
      kette.addChild(c);
    });
    // Offener Platz für den nächsten Stein
    const naechster = (steine.length - start) % PLAETZE.length;
    const { x, y, p } = platzMitte(naechster);
    ziel.clear();
    const lw = p.senkrecht ? L / 2 : L;
    const lh = p.senkrecht ? L : L / 2;
    ziel.roundRect(x - lw / 2, y - lh / 2, lw, lh, 9).stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
    ziel.position.set(0, 0);
  }

  const zielMitte = () => {
    const start = Math.floor((steine.length - 1) / PLAETZE.length) * PLAETZE.length;
    return platzMitte((steine.length - start) % PLAETZE.length);
  };

  /* ---------- Auswahl mit Ziehen ---------- */
  let gezogen: { c: Container; wert: number; sx: number; sy: number; dx: number; dy: number; bewegt: boolean } | undefined;

  function zeigeAuswahl(a: Aufgabe) {
    auswahl.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { w, h, L, quer } = masse();
    const sb = quer ? Math.min(w * 0.17, L * 1.1) : Math.min((w - 40) / 2 - 8, L * 1.15);
    const sh = sb / 2;
    a.optionen.forEach((o, i) => {
      const c = baueStein(zahlText(o.wert), '', sb);
      const sp = i % 2;
      const ze = Math.floor(i / 2);
      if (quer) c.position.set(w * 0.66 + sp * (sb + 14) + sb / 2, h / 2 + (ze - 0.5) * (sh + 22));
      else c.position.set(w / 2 + (sp === 0 ? -1 : 1) * (sb / 2 + 8), h * 0.72 + ze * (sh + 16));
      c.eventMode = 'static';
      c.cursor = 'grab';
      c.label = String(o.wert);
      c.on('pointerdown', (e: FederatedPointerEvent) => {
        if (gesperrt || aufgabe !== a) return;
        gezogen = { c, wert: o.wert, sx: c.x, sy: c.y, dx: e.global.x - c.x, dy: e.global.y - c.y, bewegt: false };
        auswahl.addChild(c); // nach oben
        c.scale.set(1.08);
      });
      auswahl.addChild(c);
    });
  }

  b.app.stage.eventMode = 'static';
  b.app.stage.hitArea = b.app.screen;
  b.app.stage.on('pointermove', (e: FederatedPointerEvent) => {
    if (!gezogen) return;
    const nx = e.global.x - gezogen.dx;
    const ny = e.global.y - gezogen.dy;
    if (Math.hypot(nx - gezogen.sx, ny - gezogen.sy) > 8) gezogen.bewegt = true;
    gezogen.c.position.set(nx, ny);
  });
  const loslassen = () => {
    const g = gezogen;
    gezogen = undefined;
    if (!g) return;
    g.c.scale.set(1);
    const z = zielMitte();
    const { L } = masse();
    const angelegt = !g.bewegt || Math.hypot(g.c.x - z.x, g.c.y - z.y) < L * 0.8;
    if (angelegt) {
      k.onAntwort(g.wert);
    } else {
      // Zurück an den Platz
      const x = g.c.x;
      const y = g.c.y;
      void b.tween(220, (t) => {
        if (!g.c.destroyed) g.c.position.set(x + (g.sx - x) * t, y + (g.sy - y) * t);
      }, kurven.raus);
    }
  };
  b.app.stage.on('pointerup', loslassen);
  b.app.stage.on('pointerupoutside', loslassen);

  function feiern() {
    const { w, h } = masse();
    for (let i = 0; i < 24; i++) {
      const s = new Graphics().star(0, 0, 5, 8, 4).fill({ color: [0xffc62b, 0xffffff, 0xe23a4e][i % 3] ?? 0xffc62b });
      s.position.set(Math.random() * w, Math.random() * h * 0.7);
      funken.addChild(s);
    }
    void b.tween(1200, (t) => funken.children.forEach((s) => (s.alpha = 1 - t)), kurven.linear).then(() => funken.removeChildren().forEach((s) => s.destroy()));
  }

  function zeige(a: Aufgabe) {
    aufgabe = a;
    const letzter = steine[steine.length - 1];
    if (letzter) letzter.aufgabe = a.text;
    zeichneTisch();
    zeichneKette();
    zeigeAuswahl(a);
  }

  const abmelden = b.beiGroesse(() => {
    if (aufgabe) zeige(aufgabe);
  });

  return {
    zeige,
    async treffer(wert) {
      const c = auswahl.children.find((x) => x.label === String(wert));
      const z = zielMitte();
      const { L } = masse();
      if (c) {
        const sx = c.x;
        const sy = c.y;
        const faktor = L / ((c.width || L) / (c.scale.x || 1));
        const zielRot = z.p.richtung === 'links' ? Math.PI : z.p.richtung === 'runter' ? Math.PI / 2 : 0;
        k.klang('pop');
        await b.tween(380, (x) => {
          if (c.destroyed) return;
          c.position.set(sx + (z.x - sx) * x, sy + (z.y - sy) * x);
          c.scale.set(1 + (faktor - 1) * x);
          c.rotation = zielRot * x;
        }, kurven.raus);
      }
      steine.push({ ergebnis: zahlText(wert), aufgabe: '' });
      zeichneKette();
      const imBild = (steine.length - 1) % PLAETZE.length;
      if (imBild === 0) {
        feiern();
        k.klang('jubel');
      } else k.klang('richtig');
    },
    async daneben(wert) {
      const c = auswahl.children.find((x) => x.label === String(wert));
      k.klang('fehler');
      if (!c) return;
      const z = zielMitte();
      const sx = c.x;
      const sy = c.y;
      await b.tween(260, (x) => {
        if (!c.destroyed) c.position.set(sx + (z.x - sx) * x * 0.6, sy + (z.y - sy) * x * 0.6);
      }, kurven.raus);
      await b.tween(420, (x) => {
        if (c.destroyed) return;
        c.position.set(sx + (z.x - sx) * 0.6 * (1 - x) + Math.sin(x * Math.PI * 6) * 6 * (1 - x), sy + (z.y - sy) * 0.6 * (1 - x));
      }, kurven.linear);
      if (!c.destroyed) c.alpha = 0.45;
    },
    sperre(x) {
      gesperrt = x;
      if (x) gezogen = undefined;
    },
    zerstoere() {
      abmelden();
      b.zerstoere();
      steine = [];
    },
  };
}
