import { Container, Graphics, Text } from 'pixi.js';
import { RELATION, termText, termWert } from '../../domain/aufgaben/gleichheit';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe, GleichheitAufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const SCHRIFT = 'Nunito, system-ui, sans-serif';
const MAX_NEIGUNG = 0.3;

/**
 * Gleichgewichts-Waage. Auf beiden Schalen liegt ein Sack mit einem Rechenausdruck.
 * Fehlende Zahl: Das Kind legt ein Gewicht auf die Seite mit dem „?“; die Waage ist nur bei genau
 * gleichen Werten im Gleichgewicht. Vergleichen: Ein Holzkeil hält die Waage fest, das Kind wählt <, = oder >,
 * dann wird der Keil gezogen und die Waage zeigt die echte Beziehung.
 */
export async function erstelleWaageSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const hinten = new Graphics();
  const waage = new Container();
  const balken = new Container();
  const schaleL = new Container();
  const schaleR = new Container();
  const keil = new Graphics();
  const auswahl = new Container();
  const oben = new Container();
  waage.addChild(balken, schaleL, schaleR);
  b.app.stage.addChild(hinten, waage, keil, auswahl, oben);

  let aufgabe: GleichheitAufgabe | undefined;
  let gesperrt = true;
  let neigung = 0;
  let gelegt: number | undefined;

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const hoch = h > w;
    const s = Math.max(0.75, Math.min(1.35, w / 440, h / 420));
    return { w, h, s, mitteY: h * (hoch ? 0.27 : 0.3), arm: Math.min(w * 0.34, 200 * s), regalY: h * (hoch ? 0.8 : 0.82) };
  };

  function zeichneHinten() {
    const { w, h, mitteY, regalY, s } = masse();
    hinten.clear();
    hinten.rect(0, 0, w, h).fill({ color: 0xe8f4ee });
    for (let x = 0; x < w; x += 46) hinten.rect(x, 0, 23, h).fill({ color: 0xdcefe5 });
    hinten.rect(w / 2 - 7 * s, mitteY, 14 * s, regalY - mitteY - 70 * s).fill({ color: 0x87521f }).stroke({ width: 2, color: TINTE });
    hinten.roundRect(w / 2 - 54 * s, regalY - 74 * s, 108 * s, 14 * s, 6).fill({ color: 0x87521f }).stroke({ width: 2, color: TINTE });
    hinten.rect(w * 0.04, regalY + 34 * s, w * 0.92, 10 * s).fill({ color: 0x9a6232 }).stroke({ width: 2, color: 0x6e4220 });
  }

  function baueSchale(): Graphics {
    const { s } = masse();
    const g = new Graphics();
    g.moveTo(0, 0).lineTo(-36 * s, 74 * s).moveTo(0, 0).lineTo(36 * s, 74 * s).stroke({ width: 2, color: TINTE });
    g.ellipse(0, 76 * s, 54 * s, 10 * s).fill({ color: 0xcfa45a }).stroke({ width: 2.5, color: TINTE });
    return g;
  }

  /** Sack mit Ausdruck; die gesuchte Zahl erscheint als Lücke, nach dem Auflegen als Zahl. */
  function baueSack(text: string): Container {
    const { s } = masse();
    const c = new Container();
    const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(19 * s), fill: TINTE, align: 'center' } });
    t.anchor.set(0.5);
    const bw = Math.max(92 * s, t.width + 28 * s);
    if (bw > 150 * s) t.scale.set((150 * s - 28 * s) / t.width);
    const breite = Math.min(bw, 150 * s);
    const bh = 64 * s;
    const g = new Graphics();
    g.roundRect(-breite / 2, -bh, breite, bh, 20 * s).fill({ color: 0xd9b98a }).stroke({ width: 3, color: TINTE });
    g.poly([-14 * s, -bh + 2, 0, -bh - 12 * s, 14 * s, -bh + 2]).fill({ color: 0xd9b98a }).stroke({ width: 3, color: TINTE });
    t.position.set(0, -bh / 2 + 2);
    c.addChild(g, t);
    return c;
  }

  function baueGewicht(text: string, farbe = 0x5b6075): Container {
    const { s, w } = masse();
    const c = new Container();
    const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(22 * s), fill: 0xffffff } });
    t.anchor.set(0.5);
    const breite = Math.min(Math.max(66 * s, t.width + 26 * s), w / 4.6);
    if (t.width > breite - 10) t.scale.set((breite - 10) / t.width);
    const g = new Graphics();
    g.roundRect(-breite / 2, -46 * s, breite, 46 * s, 10 * s).fill({ color: farbe }).stroke({ width: 3, color: TINTE });
    g.roundRect(-14 * s, -58 * s, 28 * s, 14 * s, 6 * s).stroke({ width: 4, color: TINTE });
    t.position.set(0, -23 * s);
    c.addChild(g, t);
    return c;
  }

  function setzeNeigung(n: number) {
    const { arm } = masse();
    neigung = n;
    balken.rotation = n;
    schaleL.position.set(-Math.cos(n) * arm, -Math.sin(n) * arm);
    schaleR.position.set(Math.cos(n) * arm, Math.sin(n) * arm);
  }

  /** Neigung zum Vergleich zweier Werte: links schwerer → links unten (negativ). Kleine Unterschiede bleiben sichtbar. */
  const neigungFuer = (links: number, rechts: number): number => {
    if (links === rechts) return 0;
    const rel = Math.abs(links - rechts) / Math.max(Math.abs(links), Math.abs(rechts), 1);
    return Math.sign(rechts - links) * Math.min(MAX_NEIGUNG, 0.09 + rel * 1.4);
  };

  function zeichneBalken() {
    const { w, mitteY, arm, s } = masse();
    waage.position.set(w / 2, mitteY);
    balken.removeChildren().forEach((c) => c.destroy());
    const g = new Graphics();
    g.roundRect(-arm - 8, -6 * s, 2 * arm + 16, 12 * s, 6).fill({ color: 0xb9763f }).stroke({ width: 3, color: TINTE });
    g.circle(0, 0, 10 * s).fill({ color: 0xffc62b }).stroke({ width: 3, color: TINTE });
    g.poly([-5 * s, -8 * s, 5 * s, -8 * s, 0, -48 * s]).fill({ color: TINTE });
    balken.addChild(g);
  }

  function zeichneKeil(sichtbar: boolean) {
    const { w, mitteY, s } = masse();
    keil.clear();
    if (!sichtbar) return;
    // Holzkeile unter beiden Balkenenden halten die Waage waagerecht
    for (const x of [-1, 1]) {
      const kx = w / 2 + x * masse().arm * 0.55;
      keil.poly([kx - 16 * s, mitteY + 60 * s, kx + 16 * s, mitteY + 60 * s, kx, mitteY + 8 * s]).fill({ color: 0xb9763f }).stroke({ width: 2, color: TINTE });
    }
  }

  const sackText = (seite: 'links' | 'rechts'): string => {
    if (!aufgabe) return '';
    const t = aufgabe[seite];
    const text = termText(t);
    return gelegt !== undefined ? text.replace('?', zahlText(gelegt)) : text;
  };

  function belade() {
    if (!aufgabe) return;
    const { s } = masse();
    for (const c of [schaleL, schaleR]) c.removeChildren().forEach((x) => x.destroy({ children: true }));
    schaleL.addChild(baueSchale());
    schaleR.addChild(baueSchale());
    const sl = baueSack(sackText('links'));
    sl.position.set(0, 76 * s - 6);
    schaleL.addChild(sl);
    const sr = baueSack(sackText('rechts'));
    sr.position.set(0, 76 * s - 6);
    schaleR.addChild(sr);
  }

  function zeigeAuswahl(a: GleichheitAufgabe) {
    auswahl.removeChildren().forEach((x) => x.destroy({ children: true }));
    const { w, s, regalY } = masse();
    a.optionen.forEach((o, i) => {
      const vergleich = a.form === 'vergleichen';
      const c = baueGewicht(vergleich ? (RELATION[o.wert] ?? '?') : zahlText(o.wert), vergleich ? 0xe23a4e : 0x5b6075);
      if (vergleich) c.scale.set(1.25);
      c.position.set((w / a.optionen.length) * (i + 0.5), regalY + 34 * s);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.label = String(o.wert);
      c.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      auswahl.addChild(c);
    });
  }

  function zeige(allgemein: Aufgabe) {
    if (allgemein.art !== 'gleichheit') return;
    const a = allgemein;
    aufgabe = a;
    gelegt = undefined;
    oben.removeChildren().forEach((x) => x.destroy({ children: true }));
    zeichneHinten();
    zeichneBalken();
    belade();
    zeigeAuswahl(a);
    if (a.form === 'vergleichen') {
      setzeNeigung(0);
      zeichneKeil(true);
    } else {
      zeichneKeil(false);
      // Die Seite mit der Lücke ist leichter
      const luecke = termText(a.links).includes('?') ? 'links' : 'rechts';
      setzeNeigung(luecke === 'links' ? MAX_NEIGUNG * 0.7 : -MAX_NEIGUNG * 0.7);
    }
  }

  async function neige(nach: number) {
    const von = neigung;
    await b.tween(900, (x) => {
      if (balken.destroyed) return;
      setzeNeigung(von + (nach - von) * x + Math.sin(x * Math.PI * 4) * 0.05 * (1 - x));
    }, kurven.raus);
  }

  function zeichen(text: string, farbe: number) {
    const { w, mitteY, s } = masse();
    const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(54 * s), fill: farbe, stroke: { color: TINTE, width: 5 } } });
    t.anchor.set(0.5);
    t.position.set(w / 2, mitteY - 76 * s);
    oben.addChild(t);
  }

  /** Gewicht oder Zeichen auflegen und die Waage die echte Beziehung zeigen lassen. */
  async function pruefen(wert: number) {
    const a = aufgabe;
    if (!a) return;
    const c = auswahl.children.find((x) => x.label === String(wert));
    if (c) {
      const sx = c.x;
      const sy = c.y;
      k.klang('wurf');
      await b.tween(380, (x) => {
        if (c.destroyed) return;
        c.y = sy - Math.sin(x * Math.PI) * 30;
        c.alpha = 1 - x * 0.6;
      }, kurven.raus);
      if (!c.destroyed) {
        c.x = sx;
        c.y = sy;
      }
    }
    if (a.form === 'vergleichen') {
      zeichen(RELATION[wert] ?? '', 0xffffff);
      zeichneKeil(false);
      await neige(neigungFuer(termWert(a.links), termWert(a.rechts)));
    } else {
      gelegt = wert;
      belade();
      await neige(neigungFuer(termWert(a.links, wert), termWert(a.rechts, wert)));
    }
  }

  const abmelden = b.beiGroesse(() => {
    if (!aufgabe) return;
    const n = neigung;
    const g = gelegt;
    zeige(aufgabe);
    gelegt = g;
    belade();
    setzeNeigung(n);
  });

  return {
    zeige,
    async treffer(wert) {
      await pruefen(wert);
      if (aufgabe?.form !== 'vergleichen') zeichen('=', 0x3fae6a);
      k.klang('richtig');
    },
    async daneben(wert) {
      await pruefen(wert);
      if (aufgabe?.form !== 'vergleichen') zeichen('≠', 0xe23a4e);
      k.klang('fehler');
    },
    sperre(x) {
      gesperrt = x;
    },
    zerstoere() {
      abmelden();
      b.zerstoere();
    },
  };
}

