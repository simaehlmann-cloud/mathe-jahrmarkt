import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { zahlText } from '../../domain/aufgaben/stellenwert';
import type { Aufgabe, Strahl } from '../../domain/aufgaben/typen';
import { ABSCHNITTE, istBeschriftet, wertAnStrich } from '../../domain/aufgaben/zahlenstrahl';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
const SCHRIFT = 'Nunito, system-ui, sans-serif';

/**
 * Zahlenstrahl-Seilbahn: Das Seil ist der Zahlenstrahl zwischen zwei Stationen.
 * „Fahre zu …“: Gondel am Seil ziehen, sie rastet an jedem Strich ein, „Hier halten!“ bestätigt.
 * „Wo hält die Gondel?“: Die Gondel steht an einem Strich, das Kind tippt auf eine von vier Zahlen.
 */
export async function erstelleSeilbahnSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();
  const b = await erstelleBuehne(host, k.reduziert);
  const himmel = new Graphics();
  const seil = new Container();
  const gondel = new Container();
  const unten = new Container();
  b.app.stage.addChild(himmel, seil, gondel, unten);

  let aufgabe: Aufgabe | undefined;
  let strahl: Strahl = { start: 0, ende: 1000, schritt: 50, beschriftung: 100 };
  let strich = 0;
  let gesperrt = true;
  let ziehtGerade = false;
  let bewegt = false;

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const rand = Math.max(34, w * 0.07);
    const seilY = h * (h > w ? 0.36 : 0.42);
    return { w, h, links: rand, rechts: w - rand, seilY, s: Math.max(0.7, Math.min(1.3, w / 420, h / 360)) };
  };
  const xVon = (i: number) => {
    const m = masse();
    return m.links + ((m.rechts - m.links) * i) / ABSCHNITTE;
  };

  function zeichneHimmel() {
    const { w, h, links, rechts, seilY } = masse();
    himmel.clear();
    himmel.rect(0, 0, w, h).fill({ color: 0xbfe6ff });
    // Berge
    himmel.poly([0, h * 0.75, w * 0.25, h * 0.48, w * 0.5, h * 0.72, w * 0.78, h * 0.44, w, h * 0.7, w, h, 0, h]).fill({ color: 0x9cc7a0 });
    himmel.poly([w * 0.78, h * 0.44, w * 0.72, h * 0.5, w * 0.84, h * 0.5]).fill({ color: 0xffffff });
    himmel.rect(0, h * 0.82, w, h * 0.18).fill({ color: 0x8fd18a });
    // Masten unter dem Seil; die Zahlen stehen frei darüber
    for (const x of [links, rechts]) {
      himmel.rect(x - 8, seilY + 4, 16, h * 0.82 - seilY - 4).fill({ color: 0x87521f }).stroke({ width: 2, color: TINTE });
      himmel.circle(x, seilY, 9).fill({ color: 0xe23a4e }).stroke({ width: 2, color: TINTE });
    }
  }

  function zeichneSeil() {
    seil.removeChildren().forEach((c) => c.destroy({ children: true }));
    const { links, rechts, seilY, s, w } = masse();
    const g = new Graphics();
    g.moveTo(links, seilY).lineTo(rechts, seilY).stroke({ width: 4, color: 0x4a5394 });
    const klein = w < 480;
    for (let i = 0; i <= ABSCHNITTE; i++) {
      const wert = wertAnStrich(strahl, i);
      const lang = istBeschriftet(strahl, wert);
      const x = xVon(i);
      g.moveTo(x, seilY - (lang ? 14 : 8)).lineTo(x, seilY + (lang ? 14 : 8)).stroke({ width: lang ? 3 : 2, color: TINTE });
      if (lang) {
        // Bei engen Bildschirmen große Zahlen abwechselnd hoch und tief, damit sie sich nicht berühren
        const text = zahlText(wert);
        const t = new Text({ text, style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round((klein ? 13 : 15) * Math.max(s, 0.95)), fill: TINTE } });
        // Zahlen über dem Seil, damit die Gondel sie nicht verdeckt
        t.anchor.set(0.5, 1);
        const versetzt = klein && text.length > 4 && (wert - strahl.start) / strahl.beschriftung % 2 === 1;
        t.position.set(x, seilY - 18 - (versetzt ? 16 * s : 0));
        seil.addChild(t);
      }
    }
    seil.addChildAt(g, 0);
  }

  function baueGondel() {
    gondel.removeChildren().forEach((c) => c.destroy({ children: true }));
    const g = new Graphics();
    // Laufwerk am Seil, Bügel, Kabine
    g.roundRect(-14, -8, 28, 12, 4).fill({ color: 0x5b6075 }).stroke({ width: 2, color: TINTE });
    g.moveTo(0, 4).lineTo(0, 26).stroke({ width: 3, color: TINTE });
    g.roundRect(-30, 26, 60, 46, 10).fill({ color: 0xe23a4e }).stroke({ width: 3, color: TINTE });
    g.roundRect(-22, 32, 44, 18, 4).fill({ color: 0xcdefff }).stroke({ width: 2, color: TINTE });
    // Fahrgast: kleiner Pinguin
    g.circle(-6, 44, 7).fill({ color: 0x2a2f45 });
    g.circle(-6, 45, 4).fill({ color: 0xffffff });
    g.poly([-3, 45, 2, 46, -3, 47]).fill({ color: 0xffc62b });
    // Zeiger: genau unter dem Seil, damit klar ist, wo die Gondel hält
    g.poly([-7, 72, 7, 72, 0, 82]).fill({ color: 0xffc62b }).stroke({ width: 2, color: TINTE });
    gondel.addChild(g);
    gondel.eventMode = 'static';
    gondel.cursor = 'grab';
    gondel.hitArea = new Rectangle(-50, -20, 100, 110);
  }

  const gondelNach = (i: number) => {
    const { seilY, s } = masse();
    strich = Math.max(0, Math.min(ABSCHNITTE, i));
    gondel.scale.set(Math.max(1, s));
    gondel.position.set(xVon(strich), seilY);
  };

  /* ---------- Ziehen ---------- */
  let halteKnopf: Container | undefined;
  let hinweis: Text | undefined;
  function zeigeHalten(sichtbar: boolean) {
    if (halteKnopf) halteKnopf.visible = sichtbar;
    if (hinweis) hinweis.visible = !sichtbar;
  }
  function baueHinweis() {
    const { w, h, s } = masse();
    hinweis = new Text({
      text: 'Ziehe die Gondel am Seil\noder tippe auf das Seil.',
      style: { fontFamily: SCHRIFT, fontWeight: '800', fontSize: Math.round(17 * Math.max(s, 0.95)), fill: TINTE, align: 'center' },
    });
    hinweis.anchor.set(0.5);
    hinweis.position.set(w / 2, h * 0.9);
    unten.addChild(hinweis);
  }
  function baueHalten() {
    const { w, h, s } = masse();
    const c = new Container();
    const t = new Text({ text: 'Hier halten!', style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(20 * s), fill: 0xffffff } });
    t.anchor.set(0.5);
    const bw = t.width + 40;
    const bh = t.height + 18;
    c.addChild(new Graphics().roundRect(-bw / 2, -bh / 2, bw, bh, 14).fill({ color: 0x3fae6a }).stroke({ width: 3, color: TINTE }), t);
    c.position.set(w / 2, h * 0.9);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointertap', () => {
      if (gesperrt || !aufgabe || !bewegt) return;
      k.onAntwort(wertAnStrich(strahl, strich));
    });
    unten.addChild(c);
    halteKnopf = c;
  }

  b.app.stage.eventMode = 'static';
  b.app.stage.hitArea = b.app.screen;
  gondel.on('pointerdown', () => {
    if (gesperrt || aufgabe?.art !== 'zahlenstrahl' || aufgabe.form !== 'ziehen') return;
    ziehtGerade = true;
    gondel.cursor = 'grabbing';
  });
  b.app.stage.on('pointermove', (e) => {
    if (!ziehtGerade) return;
    const { links, rechts } = masse();
    const i = Math.round(((e.global.x - links) / (rechts - links)) * ABSCHNITTE);
    if (i !== strich && i >= 0 && i <= ABSCHNITTE) {
      gondelNach(i);
      bewegt = true;
      zeigeHalten(true);
      k.klang('tipp');
    }
  });
  const loslassen = () => {
    ziehtGerade = false;
    gondel.cursor = 'grab';
  };
  b.app.stage.on('pointerup', loslassen);
  b.app.stage.on('pointerupoutside', loslassen);
  // Antippen des Seils setzt die Gondel ebenfalls dorthin (hilft, wenn Ziehen schwerfällt)
  b.app.stage.on('pointertap', (e) => {
    if (gesperrt || aufgabe?.art !== 'zahlenstrahl' || aufgabe.form !== 'ziehen') return;
    const { links, rechts, seilY } = masse();
    if (Math.abs(e.global.y - seilY) > 60 || e.global.x < links - 20 || e.global.x > rechts + 20) return;
    gondelNach(Math.round(((e.global.x - links) / (rechts - links)) * ABSCHNITTE));
    bewegt = true;
    zeigeHalten(true);
    k.klang('tipp');
  });

  /* ---------- Ablesen: vier Zahlenschilder ---------- */
  function baueSchilder(a: Aufgabe) {
    const { w, h, s } = masse();
    const n = a.optionen.length;
    const zwei = w < 520;
    const spalten = zwei ? 2 : n;
    const bw = Math.min(150 * s, (w - 30) / spalten - 12);
    const bh = 54 * s;
    a.optionen.forEach((o, i) => {
      const c = new Container();
      const t = new Text({ text: zahlText(o.wert), style: { fontFamily: SCHRIFT, fontWeight: '900', fontSize: Math.round(24 * s), fill: 0xffffff } });
      t.anchor.set(0.5);
      if (t.width > bw - 12) t.scale.set((bw - 12) / t.width);
      c.addChild(new Graphics().roundRect(-bw / 2, -bh / 2, bw, bh, 12).fill({ color: 0x87521f }).stroke({ width: 3, color: TINTE }), t);
      const sp = i % spalten;
      const ze = Math.floor(i / spalten);
      const zeilen = Math.ceil(n / spalten);
      c.position.set((w / spalten) * (sp + 0.5), h - (zeilen - ze) * (bh + 12) - 8 + bh / 2);
      c.eventMode = 'static';
      c.cursor = 'pointer';
      c.on('pointertap', () => {
        if (!gesperrt && aufgabe === a) k.onAntwort(o.wert);
      });
      unten.addChild(c);
    });
  }

  function zeige(a: Aufgabe) {
    if (a.art !== 'zahlenstrahl') return;
    aufgabe = a;
    strahl = a.strahl;
    bewegt = false;
    unten.removeChildren().forEach((c) => c.destroy({ children: true }));
    halteKnopf = undefined;
    hinweis = undefined;
    zeichneHimmel();
    zeichneSeil();
    baueGondel();
    if (a.form === 'ziehen') {
      // Start an der Station links; Ziehen oder Antippen bewegt die Gondel
      gondelNach(0);
      baueHalten();
      baueHinweis();
      zeigeHalten(false);
    } else {
      gondelNach(Math.round((a.antwort - strahl.start) / strahl.schritt));
      baueSchilder(a);
    }
  }

  const abmelden = b.beiGroesse(() => {
    if (aufgabe) {
      const i = strich;
      const war = bewegt;
      zeige(aufgabe);
      bewegt = war;
      if (aufgabe.art === 'zahlenstrahl' && aufgabe.form === 'ziehen') {
        gondelNach(i);
        zeigeHalten(war);
      }
    }
  });

  const tick = b.jedesBild((zeit) => {
    if (b.reduziert || gondel.destroyed || ziehtGerade) return;
    gondel.rotation = Math.sin(zeit / 500) * 0.03;
  });

  return {
    zeige,
    async treffer() {
      k.klang('richtig');
      const y = gondel.y;
      await b.tween(500, (x) => {
        if (!gondel.destroyed) gondel.y = y - Math.sin(x * Math.PI) * 14;
      }, kurven.raus);
      zeigeHalten(false);
    },
    async daneben() {
      k.klang('fehler');
      await b.tween(500, (x) => {
        if (!gondel.destroyed) gondel.rotation = Math.sin(x * Math.PI * 6) * 0.2 * (1 - x);
      }, kurven.linear);
    },
    sperre(x) {
      gesperrt = x;
      if (x) ziehtGerade = false;
    },
    zerstoere() {
      tick();
      abmelden();
      b.zerstoere();
    },
  };
}
