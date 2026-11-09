import { Container, Graphics } from 'pixi.js';
import { mount, unmount } from 'svelte';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import { AUFGABEN_PRO_RUNDE } from '../../domain/fortschritt/fortschritt';
import { erstelleBuehne, kurven } from '../../engine/buehne';
import Ziffernfeld from '../gemeinsam/Ziffernfeld.svelte';
import { schriftBereit } from '../gemeinsam/schrift';
import type { BudeSzene, SzenenKontext } from '../typen';

const TINTE = 0x1f2a6b;
/** Zusatzpunkte für eine richtige Antwort innerhalb der Turbo-Zeit. */
export const TURBO_BONUS = 50;
/** Turbo-Zeit je Aufgabe; Gold enthält Analogaufgaben und bekommt mehr Zeit. */
export const turboZeitMs = (a: Aufgabe): number => (a.art === 'mal' && 'analog' in a && a.analog ? 8000 : 6000);

interface Feld {
  leeren(): void;
  sperre(x: boolean): void;
  zeigeErgebnis(richtig: boolean): void;
}

/**
 * Einmaleins-Turbo: Tilda, die Schildkröte, fährt Kart. Jede richtige Antwort bringt sie ein Stück
 * weiter. Im freiwilligen Turbo läuft eine Zeitleiste; wer in der Zeit richtig antwortet, zündet den Turbo.
 * Ohne Turbo gibt es keinen Zeitdruck.
 */
export async function erstelleTurboSzene(host: HTMLElement, k: SzenenKontext): Promise<BudeSzene> {
  await schriftBereit();

  // Aufteilung: oben (bzw. links) die Rennbahn, unten (bzw. rechts) Turbo-Schalter und Ziffernfeld
  const rahmen = document.createElement('div');
  rahmen.className = 'turbo-rahmen';
  const bahn = document.createElement('div');
  bahn.className = 'turbo-bahn';
  const bedienung = document.createElement('div');
  bedienung.className = 'turbo-bedienung';
  const schalter = document.createElement('button');
  schalter.type = 'button';
  schalter.className = 'turbo-schalter';
  const leiste = document.createElement('div');
  leiste.className = 'turbo-zeit';
  leiste.setAttribute('aria-hidden', 'true');
  const fuellung = document.createElement('div');
  leiste.appendChild(fuellung);
  const feldOrt = document.createElement('div');
  bedienung.append(schalter, leiste, feldOrt);
  rahmen.append(bahn, bedienung);
  host.appendChild(rahmen);

  const stil = document.createElement('style');
  stil.textContent = `
    .turbo-rahmen { position: absolute; inset: 0; display: flex; flex-direction: column; }
    .turbo-bahn { position: relative; flex: 1 1 38%; min-height: 110px; }
    .turbo-bedienung { flex: 0 0 auto; padding: 8px 10px 10px; display: grid; gap: 8px; background: rgb(255 253 247 / 0.92); border-top: 4px solid var(--holz-dunkel); }
    @media (orientation: landscape) and (min-width: 640px) {
      .turbo-rahmen { flex-direction: row; }
      .turbo-bedienung { flex: 0 0 min(46%, 23rem); border-top: 0; border-left: 4px solid var(--holz-dunkel); align-content: center; }
    }
    .turbo-schalter { justify-self: center; display: inline-flex; gap: 8px; align-items: center; font: inherit; font-weight: 900; font-size: 1rem;
      border: 3px solid var(--tinte); border-radius: 20px; padding: 4px 14px; background: #fff; color: var(--tinte); min-height: 40px; }
    .turbo-schalter[aria-pressed="true"] { background: var(--markise); color: #fff; }
    .turbo-zeit { height: 10px; border-radius: 6px; background: #e6e2d6; overflow: hidden; visibility: hidden; }
    .turbo-zeit.an { visibility: visible; }
    .turbo-zeit > div { height: 100%; width: 100%; background: linear-gradient(90deg, var(--markise), var(--senf)); transform-origin: left; }
  `;
  host.appendChild(stil);

  let turbo = false;
  let gesperrt = true;
  let gezeigtUm = 0;
  let aufgabe: Aufgabe | undefined;
  let bonusLetzte = 0;
  let geschafft = 0;

  const schalterText = () => {
    schalter.setAttribute('aria-pressed', String(turbo));
    schalter.textContent = turbo ? 'Turbo an' : 'Turbo aus · in Ruhe rechnen';
  };
  schalterText();

  const zeitStarten = () => {
    leiste.classList.toggle('an', turbo);
    fuellung.style.transition = 'none';
    fuellung.style.transform = 'scaleX(1)';
    if (!turbo || !aufgabe) return;
    const dauer = turboZeitMs(aufgabe);
    void fuellung.offsetWidth;
    fuellung.style.transition = `transform ${dauer}ms linear`;
    fuellung.style.transform = 'scaleX(0)';
  };
  const zeitAnhalten = () => {
    const jetzt = getComputedStyle(fuellung).transform;
    fuellung.style.transition = 'none';
    fuellung.style.transform = jetzt === 'none' ? 'scaleX(1)' : jetzt;
  };

  schalter.addEventListener('click', () => {
    turbo = !turbo;
    schalterText();
    k.klang('tipp');
    gezeigtUm = performance.now();
    zeitStarten();
  });

  const feld = mount(Ziffernfeld, {
    target: feldOrt,
    props: {
      maxStellen: 6,
      ontaste: () => k.klang('tipp'),
      onok: (wert: number) => {
        if (gesperrt || !aufgabe) return;
        const ms = performance.now() - gezeigtUm;
        bonusLetzte = turbo && ms <= turboZeitMs(aufgabe) && wert === aufgabe.antwort ? TURBO_BONUS : 0;
        zeitAnhalten();
        k.onAntwort(wert, bonusLetzte);
      },
    },
  }) as unknown as Feld;

  /* ---------- Rennbahn ---------- */
  const b = await erstelleBuehne(bahn, k.reduziert);
  const hintergrund = new Graphics();
  const ziel = new Container();
  const kart = new Container();
  const effekte = new Container();
  b.app.stage.addChild(hintergrund, ziel, kart, effekte);

  const masse = () => {
    const w = b.breite();
    const h = b.hoehe();
    const strasseY = h * 0.72;
    const s = Math.max(0.55, Math.min(1.25, h / 190, w / 420));
    return { w, h, strasseY, s, startX: w * 0.12, zielX: Math.min(w * 0.84, w - 60) };
  };

  function zeichneBahn() {
    const { w, h, strasseY, zielX } = masse();
    hintergrund.clear();
    hintergrund.rect(0, 0, w, h).fill({ color: 0xbfe6ff });
    // Tribüne mit Wimpeln
    hintergrund.rect(0, strasseY - h * 0.42, w, h * 0.18).fill({ color: 0xe9d3a6 });
    for (let x = 0; x < w; x += 22) hintergrund.circle(x + 11, strasseY - h * 0.33, 6).fill({ color: [0xe23a4e, 0x3c78d8, 0xffc62b, 0x3fae6a][(x / 22) % 4] ?? 0xe23a4e });
    hintergrund.moveTo(0, strasseY - h * 0.4);
    for (let x = 0; x <= w; x += 30) hintergrund.lineTo(x, strasseY - h * 0.4 + (x % 60 === 0 ? 0 : 10));
    hintergrund.stroke({ width: 2, color: TINTE, alpha: 0.5 });
    for (let x = 0; x < w; x += 30) hintergrund.poly([x, strasseY - h * 0.4, x + 15, strasseY - h * 0.4 + 5, x + 7, strasseY - h * 0.4 + 16]).fill({ color: x % 60 === 0 ? 0xe23a4e : 0xffffff });
    // Wiese und Straße
    hintergrund.rect(0, strasseY - h * 0.24, w, h * 0.24).fill({ color: 0x8fd18a });
    hintergrund.rect(0, strasseY - 6, w, h - strasseY + 6).fill({ color: 0x5b6075 });
    hintergrund.rect(0, strasseY - 8, w, 5).fill({ color: 0xffffff });
    for (let x = 8; x < w; x += 44) hintergrund.rect(x, strasseY + (h - strasseY) * 0.5, 22, 4).fill({ color: 0xffffff, alpha: 0.8 });
    // Zehn Markierungen, eine je Aufgabe
    for (let i = 1; i <= AUFGABEN_PRO_RUNDE; i++) {
      const x = position(i);
      hintergrund.rect(x - 1.5, strasseY - 16, 3, 10).fill({ color: i <= geschafft ? 0xffc62b : 0xffffff, alpha: 0.9 });
    }
    // Zielflagge
    ziel.removeChildren().forEach((c) => c.destroy({ children: true }));
    const flagge = new Graphics();
    flagge.rect(zielX + 18, strasseY - h * 0.55, 4, h * 0.55).fill({ color: TINTE });
    const f = Math.max(5, h * 0.04);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) flagge.rect(zielX + 22 + c * f, strasseY - h * 0.55 + r * f, f, f).fill({ color: (r + c) % 2 ? 0xffffff : TINTE });
    ziel.addChild(flagge);
  }

  const position = (schritte: number): number => {
    const { startX, zielX } = masse();
    return startX + ((zielX - startX) * Math.min(schritte, AUFGABEN_PRO_RUNDE)) / AUFGABEN_PRO_RUNDE;
  };

  function baueKart(): void {
    kart.removeChildren().forEach((c) => c.destroy({ children: true }));
    const g = new Graphics();
    // Wagen
    g.roundRect(-38, -22, 76, 20, 8).fill({ color: 0xe23a4e }).stroke({ width: 3, color: TINTE });
    g.poly([26, -22, 44, -12, 38, -2, 26, -2]).fill({ color: 0xe23a4e }).stroke({ width: 3, color: TINTE });
    g.rect(-30, -16, 10, 6).fill({ color: 0xffc62b });
    // Schildkröte: Panzer, Kopf, Helm
    g.ellipse(-4, -30, 22, 15).fill({ color: 0x3fae6a }).stroke({ width: 3, color: TINTE });
    g.poly([-16, -36, -4, -42, 8, -36, -4, -28]).fill({ color: 0x2b8550 });
    g.circle(22, -36, 10).fill({ color: 0x8ed081 }).stroke({ width: 3, color: TINTE });
    g.arc(22, -38, 11, Math.PI, 0).fill({ color: 0xffc62b }).stroke({ width: 3, color: TINTE });
    g.circle(26, -35, 2.2).fill({ color: TINTE });
    // Räder
    for (const x of [-24, 24]) g.circle(x, 0, 10).fill({ color: 0x2a2f45 }).circle(x, 0, 4).fill({ color: 0xcfd3e2 });
    kart.addChild(g);
  }

  function platziere() {
    const { strasseY, s } = masse();
    kart.scale.set(s);
    kart.position.set(position(geschafft), strasseY + 2);
    zeichneBahn();
  }

  function staub(x: number, y: number, farbe: number, anzahl: number) {
    const teile: { g: Graphics; vx: number; vy: number }[] = [];
    for (let i = 0; i < anzahl; i++) {
      const g = new Graphics().circle(0, 0, 4 + Math.random() * 6).fill({ color: farbe, alpha: 0.8 });
      g.position.set(x, y);
      teile.push({ g, vx: -1 - Math.random() * 3, vy: -Math.random() * 2 });
      effekte.addChild(g);
    }
    void b
      .tween(600, (t) => {
        for (const p of teile) {
          if (p.g.destroyed) continue;
          p.g.x += p.vx;
          p.g.y += p.vy;
          p.g.alpha = 1 - t;
          p.g.scale.set(1 + t);
        }
      }, kurven.linear)
      .then(() => teile.forEach((p) => p.g.destroy()));
  }

  function flammen(): Graphics {
    const g = new Graphics();
    g.poly([-40, -14, -70, -8, -40, -2]).fill({ color: 0xffc62b });
    g.poly([-40, -12, -58, -8, -40, -4]).fill({ color: 0xe23a4e });
    kart.addChild(g);
    return g;
  }

  async function fahre(nach: number, turboFahrt: boolean) {
    const { strasseY, s } = masse();
    const von = kart.x;
    const zielX = position(nach);
    const f = turboFahrt ? flammen() : undefined;
    k.klang(turboFahrt ? 'jubel' : 'wurf');
    await b.tween(turboFahrt ? 520 : 700, (t) => {
      if (kart.destroyed) return;
      kart.x = von + (zielX - von) * t;
      kart.y = strasseY + 2 - Math.abs(Math.sin(t * Math.PI * (turboFahrt ? 2 : 3))) * 4 * s;
      kart.rotation = turboFahrt ? -0.05 : 0;
      if (Math.random() < 0.3) staub(kart.x - 40 * s, strasseY, 0xd8d2c0, 1);
    }, turboFahrt ? kurven.raus : kurven.linear);
    kart.rotation = 0;
    f?.destroy();
  }

  const abmeldenGroesse = b.beiGroesse(platziere);
  baueKart();
  platziere();

  const tick = b.jedesBild((zeit) => {
    if (b.reduziert || gesperrt || kart.destroyed) return;
    // Motor tuckert im Stand
    kart.y = masse().strasseY + 2 + Math.sin(zeit / 90) * 0.8;
  });

  return {
    zeige(a) {
      aufgabe = a;
      bonusLetzte = 0;
      feld.leeren();
      gezeigtUm = performance.now();
      zeitStarten();
    },
    async treffer() {
      feld.zeigeErgebnis(true);
      geschafft++;
      await fahre(geschafft, bonusLetzte > 0);
      if (bonusLetzte > 0) staub(kart.x + 30, kart.y - 60, 0xffc62b, 8);
      zeichneBahn();
    },
    async daneben() {
      feld.zeigeErgebnis(false);
      k.klang('fehler');
      // Motor stottert: kleines Rauchwölkchen, Kart ruckelt
      staub(kart.x - 30, kart.y - 10, 0x9aa0b8, 6);
      const x = kart.x;
      await b.tween(420, (t) => {
        if (!kart.destroyed) kart.x = x + Math.sin(t * Math.PI * 6) * 4 * (1 - t);
      }, kurven.linear);
    },
    sperre(x) {
      gesperrt = x;
      feld.sperre(x);
    },
    zerstoere() {
      tick();
      abmeldenGroesse();
      b.zerstoere();
      void unmount(feld as unknown as Record<string, unknown>);
      rahmen.remove();
      stil.remove();
    },
  };
}
