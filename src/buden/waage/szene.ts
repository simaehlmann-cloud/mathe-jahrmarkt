import { Container, Graphics, Text } from 'pixi.js';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const SCHRIFT = 'Nunito, system-ui, sans-serif';
const MAX_NEIGUNG = 0.32;

/**
 * Überschlags-Waage: Links hängt ein Sack mit der Rechnung, unten stehen vier runde Gewichte.
 * Das Kind legt ein Gewicht in die rechte Schale; die Waage neigt sich je nach Unterschied.
 * Das passende Gewicht bringt sie ungefähr ins Gleichgewicht (≈).
 */
export async function erstelleWaageSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const hinten = new Graphics();
  const waage = new Container();
  const balken = new Container();
  const schaleL = new Container();
  const schaleR = new Container();
  const gewichte = new Container();
  const anzeige = new Container();
  waage.addChild(balken, schaleL, schaleR);
  b.app.stage.addChild(hinten, waage, gewichte, anzeige);

  let aufgabe: Aufgabe | undefined;
  let gesperrt = true;
  let neigung = 0;
  let aufgelegt: { wert: number; c: Container } | undefined;

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const hoch = h > w;
    const s = Math.max(0.7, Math.min(1.35, w / 440, h / 420));
    return { w, h, s, mitteY: h * (hoch ? 0.3 : 0.34), arm: Math.min(w * 0.36, 190 * s), regalY: h * (hoch ? 0.78 : 0.8) };
  };

  function zeichneHinten() {
    const { w, h, mitteY, regalY, s } = masse();
    hinten.clear();
    hinten.rect(0, 0, w, h).fill({ color: 0xf6e7c8 });
    for (let x = 0; x < w; x += 46) hinten.rect(x, 0, 23, h).fill({ color: 0xf1dcb3 });
    // Ständer
    hinten.rect(w / 2 - 7 * s, mitteY, 14 * s, regalY - mitteY - 60 * s).fill({ color: 0x87521f }).stroke({ width: 2, color: TINTE });
    hinten.roundRect(w / 2 - 50 * s, regalY - 64 * s, 100 * s, 14 * s, 6).fill({ color: 0x87521f }).stroke({ width: 2, color: TINTE });
    // Regal für die Gewichte
    hinten.rect(w * 0.04, regalY + 34 * s, w * 0.92, 10 * s).fill({ color: 0x9a6232 }).stroke({ width: 2, color: 0x6e4220 });
  }

  function baueSchale(): Graphics {
    const { s } = masse();
    const g = new Graphics();
    g.moveTo(0, 0).lineTo(-34 * s, 70 * s).moveTo(0, 0).lineTo(34 * s, 70 * s).stroke({ width: 2, color: TINTE });
    g.ellipse(0, 72 * s, 48 * s, 10 * s).fill({ color: 0xcfa45a }).stroke({ width: 2.5, color: TINTE });
    return g;
  }

  function baueSack(a: Aufgabe): Container {
    const { s } = masse();
    const c = new Container();
    const t = new Text({ text: a.text.replace(' ≈ ?', ''), style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(17 * s), fill: TINTE, align: 'center', wordWrap: true, wordWrapWidth: 104 * s } });
    t.anchor.set(0.5);
    const bw = Math.max(96 * s, t.width + 26 * s);
    const bh = Math.max(64 * s, t.height + 30 * s);
    const g = new Graphics();
    g.roundRect(-bw / 2, -bh, bw, bh, 22 * s).fill({ color: 0xd9b98a }).stroke({ width: 3, color: TINTE });
    g.poly([-14 * s, -bh + 2, 0, -bh - 12 * s, 14 * s, -bh + 2]).fill({ color: 0xd9b98a }).stroke({ width: 3, color: TINTE });
    g.moveTo(-12 * s, -bh + 6).lineTo(12 * s, -bh + 6).stroke({ width: 3, color: 0x87521f });
    t.position.set(0, -bh / 2 + 4);
    c.addChild(g, t);
    return c;
  }

  function baueGewicht(wert: number): Container {
    const { s, w } = masse();
    const c = new Container();
    const t = new Text({ text: zahlText(wert), style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(19 * s), fill: 0xffffff } });
    t.anchor.set(0.5);
    const breite = Math.min(Math.max(70 * s, t.width + 24 * s), w / 4.6);
    if (t.width > breite - 10) t.scale.set((breite - 10) / t.width);
    const g = new Graphics();
    g.roundRect(-breite / 2, -46 * s, breite, 46 * s, 10 * s).fill({ color: 0x5b6075 }).stroke({ width: 3, color: TINTE });
    g.roundRect(-14 * s, -58 * s, 28 * s, 14 * s, 6 * s).stroke({ width: 4, color: TINTE });
    t.position.set(0, -23 * s);
    c.addChild(g, t);
    return c;
  }

  function stelleWaage() {
    const { w, mitteY, arm, s } = masse();
    waage.position.set(w / 2, mitteY);
    balken.removeChildren().forEach((c) => c.destroy());
    const g = new Graphics();
    g.roundRect(-arm - 8, -6 * s, 2 * arm + 16, 12 * s, 6).fill({ color: 0xb9763f }).stroke({ width: 3, color: TINTE });
    g.circle(0, 0, 10 * s).fill({ color: 0xffc62b }).stroke({ width: 3, color: TINTE });
    // Zeiger
    g.poly([-5 * s, -8 * s, 5 * s, -8 * s, 0, -48 * s]).fill({ color: TINTE });
    balken.addChild(g);
    setzeNeigung(neigung);
  }

  function setzeNeigung(n: number) {
    const { arm } = masse();
    neigung = n;
    balken.rotation = n;
    // Schalen hängen senkrecht an den Balkenenden
    schaleL.position.set(-Math.cos(n) * arm, -Math.sin(n) * arm);
    schaleR.position.set(Math.cos(n) * arm, Math.sin(n) * arm);
  }

  function zeige(a: Aufgabe) {
    aufgabe = a;
    aufgelegt = undefined;
    zeichneHinten();
    stelleWaage();
    for (const c of [schaleL, schaleR, gewichte, anzeige]) c.removeChildren().forEach((x) => x.destroy({ children: true }));
    schaleL.addChild(baueSchale());
    schaleR.addChild(baueSchale());
    const { s, w, regalY } = masse();
    const sack = baueSack(a);
    sack.position.set(0, 72 * s - 6);
    schaleL.addChild(sack);
    // Der Sack zieht die Waage nach links
    setzeNeigung(-MAX_NEIGUNG * 0.6);
    a.optionen.forEach((o, i) => {
      const c = baueGewicht(o.wert);
      c.position.set((w / a.optionen.length) * (i + 0.5), regalY + 34 * s);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      gewichte.addChild(c);
    });
  }

  /** Gewicht fliegt in die rechte Schale. */
  async function auflegen(wert: number): Promise<void> {
    const quelle = gewichte.children.find((c) => (c.children[1] as Text | undefined)?.text === zahlText(wert));
    if (!quelle || !aufgabe) return;
    const { s } = masse();
    const start = quelle.getGlobalPosition();
    quelle.visible = false;
    const c = baueGewicht(wert);
    c.position.set(start.x, start.y);
    anzeige.addChild(c);
    k.klang('wurf');
    const ziel = () => schaleR.getGlobalPosition();
    await b.tween(420, (x) => {
      if (c.destroyed) return;
      const z = ziel();
      c.x = start.x + (z.x - start.x) * x;
      c.y = start.y + (z.y + 72 * s - 6 - start.y) * x - Math.sin(x * Math.PI) * 60;
    }, kurven.raus);
    if (c.destroyed) return;
    anzeige.removeChild(c);
    c.position.set(0, 72 * s - 6);
    schaleR.addChild(c);
    aufgelegt = { wert, c };
  }

  /** Neigung aus dem Vergleich von genauem Ergebnis und Gewicht. */
  function zielNeigung(wert: number): number {
    if (aufgabe?.art !== 'ueberschlag') return 0;
    const genau = aufgabe.genau;
    const unterschied = (genau - wert) / Math.max(genau, wert, 1);
    return Math.max(-MAX_NEIGUNG, Math.min(MAX_NEIGUNG, -unterschied * 1.6));
  }

  async function neige(nach: number, wackeln: boolean) {
    const von = neigung;
    await b.tween(wackeln ? 900 : 700, (x) => {
      if (balken.destroyed) return;
      setzeNeigung(von + (nach - von) * x + (wackeln ? Math.sin(x * Math.PI * 4) * 0.06 * (1 - x) : 0));
    }, kurven.raus);
  }

  function zeichen(text: string, farbe: number) {
    const { w, mitteY, s } = masse();
    const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(46 * s), fill: farbe, stroke: { color: TINTE, width: 4 } } });
    t.anchor.set(0.5);
    t.position.set(w / 2, mitteY - 70 * s);
    anzeige.addChild(t);
  }

  const abmelden = b.beiGroesse(() => {
    if (!aufgabe) return;
    const n = neigung;
    const w = aufgelegt?.wert;
    zeige(aufgabe);
    if (w !== undefined) {
      const quelle = gewichte.children.find((c) => (c.children[1] as Text | undefined)?.text === zahlText(w));
      if (quelle) quelle.visible = false;
      const c = baueGewicht(w);
      c.position.set(0, 72 * masse().s - 6);
      schaleR.addChild(c);
      aufgelegt = { wert: w, c };
    }
    setzeNeigung(n);
  });

  return {
    zeige,
    async treffer(wert) {
      await auflegen(wert);
      await neige(zielNeigung(wert) * 0.25, true);
      zeichen('≈', 0x3fae6a);
      k.klang('richtig');
    },
    async daneben(wert) {
      await auflegen(wert);
      await neige(zielNeigung(wert), true);
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
