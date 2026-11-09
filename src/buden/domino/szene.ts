import { Container, Graphics, Text } from 'pixi.js';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const SCHRIFT = 'Nunito, system-ui, sans-serif';

/**
 * Rechendomino: Oben liegt die Kette. Am offenen Ende steht eine Aufgabe; unten liegen vier Steine
 * mit Ergebnissen. Der passende Stein legt sich an, und auf seiner rechten Hälfte erscheint die nächste Aufgabe.
 */
export async function erstelleDominoSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const tisch = new Graphics();
  const kette = new Container();
  const auswahl = new Container();
  b.app.stage.addChild(tisch, kette, auswahl);

  let aufgabe: Aufgabe | undefined;
  let gesperrt = true;
  /** Gelegte Steine; der letzte trägt rechts die aktuelle Aufgabe. */
  const steine: { links: string; rechts: string }[] = [{ links: 'Start', rechts: '' }];

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const s = Math.max(0.7, Math.min(1.3, w / 420, h / 440));
    const sb = Math.min(w * 0.8, 300 * s);
    return { w, h, s, sb, sh: sb * 0.42, ketteY: h * 0.26 };
  };

  function zeichneTisch() {
    const { w, h } = masse();
    tisch.clear();
    tisch.rect(0, 0, w, h).fill({ color: 0x2f8a57 });
    tisch.rect(10, 10, w - 20, h - 20).stroke({ width: 4, color: 0x226b43 });
    for (let i = 0; i < 18; i++) tisch.circle((i * 97) % w, (i * 151) % h, 1.6).fill({ color: 0xffffff, alpha: 0.12 });
  }

  function baueStein(links: string, rechts: string, breite: number, hervor = false): Container {
    const c = new Container();
    const hoehe = breite * 0.42;
    const g = new Graphics();
    g.roundRect(-breite / 2, -hoehe / 2, breite, hoehe, 12).fill({ color: 0xfffdf7 }).stroke({ width: 3, color: TINTE });
    g.moveTo(0, -hoehe / 2 + 8).lineTo(0, hoehe / 2 - 8).stroke({ width: 3, color: TINTE });
    if (hervor) g.roundRect(4, -hoehe / 2 + 4, breite / 2 - 8, hoehe - 8, 8).stroke({ width: 3, color: 0xffc62b });
    c.addChild(g);
    const feld = (text: string, x: number, farbe: number) => {
      if (!text) {
        // Rückseite der rechten Hälfte: Punkte wie beim Domino
        for (const [px, py] of [[-0.12, -0.12], [0.12, 0.12], [0, 0]] as const) g.circle(x + px * breite, py * breite, breite * 0.025).fill({ color: TINTE, alpha: 0.35 });
        return;
      }
      const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(hoehe * 0.36), fill: farbe } });
      t.anchor.set(0.5);
      const platz = breite / 2 - 14;
      if (t.width > platz) t.scale.set(platz / t.width);
      t.position.set(x, 0);
      c.addChild(t);
    };
    feld(links, -breite / 4, 0x3fae6a);
    feld(rechts, breite / 4, TINTE);
    return c;
  }

  /** Die letzten zwei Steine der Kette, der neueste in der Mitte. */
  function zeichneKette() {
    kette.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { w, sb, ketteY } = masse();
    const sichtbar = steine.slice(-2);
    sichtbar.forEach((st, i) => {
      const neu = i === sichtbar.length - 1;
      const c = baueStein(st.links, st.rechts, sb, neu);
      c.position.set(w / 2 - (sichtbar.length - 1 - i) * (sb + 6), ketteY);
      if (!neu) c.alpha = 0.55;
      kette.addChild(c);
    });
  }

  const steinBreite = () => {
    const { w, s } = masse();
    return Math.min((w - 40) / 2 - 10, 190 * s);
  };

  function zeigeAuswahl(a: Aufgabe) {
    auswahl.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { w, h } = masse();
    const bw = steinBreite();
    const bh = bw * 0.42;
    a.optionen.forEach((o, i) => {
      const c = baueStein(zahlText(o.wert), '', bw);
      const sp = i % 2;
      const ze = Math.floor(i / 2);
      c.position.set(w / 2 + (sp === 0 ? -1 : 1) * (bw / 2 + 8), h * 0.56 + ze * (bh + 18));
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      c.label = String(o.wert);
      auswahl.addChild(c);
    });
  }

  function zeige(a: Aufgabe) {
    aufgabe = a;
    const letzter = steine[steine.length - 1];
    if (letzter) letzter.rechts = a.text;
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
      const { w, sb, ketteY } = masse();
      if (c) {
        const sx = c.x;
        const sy = c.y;
        const faktor = sb / steinBreite();
        k.klang('pop');
        await b.tween(420, (x) => {
          if (c.destroyed) return;
          c.x = sx + (w / 2 + sb + 6 - sx) * x;
          c.y = sy + (ketteY - sy) * x;
          c.scale.set(1 + (faktor - 1) * x);
        }, kurven.raus);
      }
      steine.push({ links: zahlText(wert), rechts: '' });
      // Kette rückt nach links
      const alt = kette.x;
      await b.tween(260, (x) => {
        if (!kette.destroyed) kette.x = alt - (sb + 6) * x;
      }, kurven.raus);
      kette.x = 0;
      zeichneKette();
      k.klang('richtig');
    },
    async daneben(wert) {
      const c = auswahl.children.find((x) => x.label === String(wert));
      k.klang('fehler');
      if (!c) return;
      const sx = c.x;
      const sy = c.y;
      const { ketteY } = masse();
      await b.tween(300, (x) => {
        if (!c.destroyed) c.y = sy + (ketteY + 60 - sy) * x * 0.5;
      }, kurven.raus);
      await b.tween(420, (x) => {
        if (c.destroyed) return;
        c.y = sy + (ketteY + 60 - sy) * 0.5 * (1 - x);
        c.x = sx + Math.sin(x * Math.PI * 6) * 8 * (1 - x);
      }, kurven.linear);
      if (!c.destroyed) c.alpha = 0.45;
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
