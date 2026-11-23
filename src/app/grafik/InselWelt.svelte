<script lang="ts" module>
  export type { Seite } from './inselTeile';
  import type { Aktion } from '../../domain/insel';
  /** Figur sitzt, liegt oder spielt an einem Spielgerät (Feld des Teils, Ebene, Höhe in Ebenen, Drehung des Teils). */
  export type Pose = { x: number; y: number; z: number; typ: 'sitzen' | 'liegen' | Aktion; hoehe: number; richtung?: number };
</script>

<script lang="ts">
  import { BLOCKARTEN } from '../../domain/bau';
  import { untrack } from 'svelte';
  import { AUFTRAGSINSELN, BOOT, BREITE, BRUECKE, GRUNDSTUECKE, HAUPTWELT, HOEHE, LANDSCHAFT, LUFT, RUDERBOOT, TUER_OBEN, drehbar, imBereich, ruderbootAn, type Bereich, type InselStand } from '../../domain/insel';
  import { dunkel, LAMPEN } from './nacht';
  import type { Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import InselFigur from './InselFigur.svelte';
  import type { Ansicht } from './Figur.svelte';
  import TierBild from './TierBild.svelte';
  import TeilExtra from './TeilExtra.svelte';
  import { A, C, KAKTUS, ZAUNARTIG, ZAUN_PARTNER, zeichner, type Nachbarn, type Seite } from './inselTeile';

  /**
   * Die Bauinsel in isometrischer Ansicht. Alles wird in Diagonalreihen (x + y) von hinten nach vorne gezeichnet,
   * die Figur steht in ihrer Reihe. Ist die Figur in einem Haus (etwas über dem Kopf), wird alles ab Kopfhöhe
   * ausgeblendet und die Wände davor werden durchsichtig.
   * `ontippe(x, y, z)`: angetippter Block (z = Ebene des Blocks; bei Boden z = Geländehöhe − 1).
   */
  let {
    stand,
    drehung = 0,
    massstab = 1,
    figur,
    aussehen,
    laeuft = false,
    markiert = null,
    grundstueck = null,
    bauen = false,
    gleitPos = null,
    funkeln = false,
    pose = null,
    gestreichelt = null,
    licht = 1,
    frei = false,
    drehMarken = false,
    bereich = HAUPTWELT,
    jubel = false,
    ontippe,
    onboot,
    onruderboot,
    onschild,
  }: {
    stand: InselStand;
    drehung?: number;
    massstab?: number;
    figur: FigurId;
    aussehen: Aussehen;
    laeuft?: boolean;
    markiert?: { x: number; y: number } | null;
    /** Hervorgehobenes Grundstück (Bauauftrag). */
    grundstueck?: string | null;
    /** Bauen/Abbauen: Schild durchsichtig und nicht antippbar, damit man am Bauplatz bauen kann. */
    bauen?: boolean;
    /** Stetige Position der Figur beim Laufen (Plan-Koordinaten); null = sie steht auf ihrem Feld. */
    gleitPos?: { x: number; y: number; z: number } | null;
    /** Kurzes Glitzern um die Figur (Ankunft mit dem Teleporter). */
    funkeln?: boolean;
    /** Figur sitzt oder liegt auf einem Möbel (Feld des Möbels, Ebene, Sitz-/Liegehöhe). */
    pose?: Pose | null;
    /** Angetipptes Tier (Nummer in stand.tiere) mit seinem Laut: hüpft und zeigt eine Sprechblase. */
    gestreichelt?: { nr: number; laut: string } | null;
    /** Tageslicht: 1 = Tag, 0 = tiefe Nacht (seit 0.14). Lampen und Fenster leuchten dann. */
    licht?: number;
    /** Freie Version (ohne Zusatzpaket): Tor mit Schild am Anfang der Brücke zur zweiten Insel. */
    frei?: boolean;
    /** Modus „Drehen“: über jedem drehbaren Möbel ein kleines ↻. */
    drehMarken?: boolean;
    /**
     * Gezeichneter Ausschnitt (seit 0.19): die Hauptwelt oder eine Auftragsinsel. Fest für die Lebensdauer
     * der Ansicht – zum Wechseln wird die Ansicht neu angelegt.
     */
    bereich?: Bereich;
    /** Bauauftrag geschafft (seit 0.19): Figur jubelt, Sterne steigen über dem Bauplatz auf. */
    jubel?: boolean;
    ontippe: (x: number, y: number, z: number, seite: Seite) => void;
    /** Boot am Steg angetippt (zurück zum Jahrmarkt). */
    onboot?: () => void;
    /** Ruderboot angetippt (zur Auftragsinsel oder zurück); ohne Rückruf kein Ruderboot. */
    onruderboot?: () => void;
    /** Schild des Bauplatzes angetippt (Auftrag zeigen). */
    onschild?: () => void;
  } = $props();

  /** Breite des ganzen Bauplans (für die Feldnummern); gezeichnet wird nur der Ausschnitt. */
  const W = BREITE;
  const H = HOEHE;
  const B = untrack(() => bereich);
  const BX = B.x0;
  const BY = B.y0;
  const BW = B.x1 - B.x0;
  const BH = B.y1 - B.y0;
  /** Größere Seite: bestimmt die Bildfläche, damit jede Drehung hineinpasst. */
  const N = Math.max(BW, BH);
  const r = $derived(((drehung % 4) + 4) % 4);
  /** Punkt (Plan-Koordinaten, stetig) → gedrehte Koordinaten im Ausschnitt. */
  const dreh = (gx: number, gy: number): [number, number] => {
    const x = gx - BX;
    const y = gy - BY;
    return r === 1 ? [BH - y, x] : r === 2 ? [BW - x, BH - y] : r === 3 ? [y, BW - x] : [x, y];
  };
  /** Auftragsinsel, die gerade gezeigt wird (oder keine). */
  const auftragsinsel = AUFTRAGSINSELN.find((a) => a.x0 === BX && a.y0 === BY);
  const P = (x: number, y: number, z: number): string => {
    const [a, b] = dreh(x, y);
    return `${(a - b) * A},${((a + b) * A) / 2 - z * C}`;
  };
  /** Reihe eines Feldes nach der Drehung (für die Zeichenreihenfolge). */
  const reihe = (x: number, y: number): number => {
    const [a, b] = dreh(x + 0.5, y + 0.5);
    return Math.floor(a) + Math.floor(b);
  };

  type Teil = { schluessel: string; x: number; y: number; z: number; flaechen: { punkte: string; farbe: string; seite?: Seite }[]; extra?: string; tippbar: boolean; durchsichtig: boolean; marke?: boolean };

  const { quader, moebel } = zeichner(dreh);

  const GELAENDE: Record<string, [string, string, string]> = {
    gras: ['#8bd17a', '#7a5233', '#94603c'],
    sand: ['#f1dc9c', '#c9ad60', '#dcc177'],
    weg: ['#e6c995', '#b99761', '#cfae75'],
    wasser: ['#6cc3ec', '#3c8fc2', '#4aa2d4'],
    bruecke: ['#c99a5f', '#8a5a2b', '#9c6634'],
    blumen: ['#8bd17a', '#7a5233', '#94603c'],
    wueste: ['#f2c67e', '#c8955a', '#dba86a'],
  };

  // Einzelne Teile des Stands als eigene Werte: Läuft nur die Figur, wird die Landschaft nicht neu berechnet.
  const stapel = $derived(stand.stapel);
  const fx = $derived(stand.figur.x);
  const fy = $derived(stand.figur.y);
  const fz = $derived(stand.figur.z);
  const istInnen = $derived.by(() => {
    const i = fy * W + fx;
    const h = LANDSCHAFT.hoehe[i] ?? 0;
    const st = stapel[i] ?? [];
    for (let z = fz + 2; z < h + st.length; z++) if ((st[z - h] ?? LUFT) !== LUFT) return true;
    return false;
  });
  const richtungen = $derived(stand.richtung);
  /**
   * Offene Tür: Steht oder geht die Figur durch ein Türfeld (oder direkt davor), ist diese Tür offen.
   * Seit 0.18.1 gilt das auch für Gartentore.
   * Nur der Schlüssel wird verglichen – das Bild wird nur neu berechnet, wenn eine Tür auf- oder zugeht.
   */
  const tuerAuf = $derived.by(() => {
    const pos = gleitPos ?? stand.figur;
    const zf = Math.round(pos.z);
    for (let y = Math.floor(pos.y) - 1; y <= Math.ceil(pos.y) + 1; y++)
      for (let x = Math.floor(pos.x) - 1; x <= Math.ceil(pos.x) + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        const h = LANDSCHAFT.hoehe[i] ?? 0;
        const teil = (stapel[i] ?? [])[zf - h];
        if (teil !== 101 && teil !== 105) continue;
        if (Math.abs(pos.x - x) <= 1.05 && Math.abs(pos.y - y) <= 1.05 && Math.abs(pos.x - x) + Math.abs(pos.y - y) <= 1.05) return `${x},${y},${zf}`;
      }
    return '';
  });
  /** Schaukelt die Figur, zeichnet sie Sitz und Ketten selbst (sie schwingen mit). */
  const schaukelFeld = $derived(pose?.typ === 'schaukeln' ? `${pose.x},${pose.y},${pose.z}` : '');
  /** Nacht in Stufen, damit das Bild nicht in jedem Takt neu berechnet wird. */
  const lichtStufe = $derived(Math.round(Math.max(0, Math.min(1, licht)) * 10) / 10);
  const nacht = $derived(lichtStufe < 0.5);
  const d = (farbe: string): string => dunkel(farbe, lichtStufe);

  /** Nur im Haus hängt das Bild von der Figurposition ab (Schnittansicht). */
  const schnitt = $derived(istInnen ? `${fx},${fy},${fz}` : '');

  /**
   * Seit 0.19 wird nur noch die aktuelle Drehung im Speicher gehalten (vorher alle vier): Auf älteren iPads
   * mit wenig Arbeitsspeicher wurde die App sonst beim Öffnen der Insel vom System neu gestartet.
   */
  const reihen = $derived.by(() => {
    void stapel;
    void richtungen;
    void schnitt;
    void tuerAuf;
    void schaukelFeld;
    void lichtStufe;
    void frei;
    void drehMarken;
    void r;
    return berechneReihen();
  });
  function berechneReihen(): Teil[][] {
    const liste: Teil[][] = Array.from({ length: BW + BH + 1 }, () => []);
    const [sx = 0, sy = 0, sz = 0] = schnitt ? schnitt.split(',').map(Number) : [];
    /** Teil in Ebene z (absolut) auf einem Nachbarfeld. */
    const teilBei = (nx: number, ny: number, nz: number): number => {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) return LUFT;
      const ni = ny * W + nx;
      return (stapel[ni] ?? [])[nz - (LANDSCHAFT.hoehe[ni] ?? 0)] ?? LUFT;
    };
    /** Zaun und Gartentor schließen an Zaun, Tor, Hecke und Mauern an. Hecken verbinden sich nicht (seit 0.18.1). */
    const passt = (b: number): boolean => b !== LUFT && (BLOCKARTEN.some((k) => k.id === b) || ZAUN_PARTNER.has(b));
    const nachbarnVon = (nx: number, ny: number, nz: number): Nachbarn => ({
      px: passt(teilBei(nx + 1, ny, nz)),
      mx: passt(teilBei(nx - 1, ny, nz)),
      py: passt(teilBei(nx, ny + 1, nz)),
      my: passt(teilBei(nx, ny - 1, nz)),
    });
    const offen = tuerAuf;
    const sperre = frei;
    const schaukel = schaukelFeld;
    const rtg = richtungen ?? {};
    const L = lichtStufe;
    const dd = (farbe: string): string => dunkel(farbe, L);
    const dunkler = (fl: { punkte: string; farbe: string; seite?: Seite }[]) => (L >= 1 ? fl : fl.map((f) => ({ ...f, farbe: dd(f.farbe) })));
    const innen = schnitt !== '';
    const f = { x: sx, y: sy, z: sz };
    const fReihe = reihe(f.x, f.y);
    const land = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && LANDSCHAFT.art[y * W + x] !== 'wasser';
    for (let y = BY; y < BY + BH; y++)
      for (let x = BX; x < BX + BW; x++) {
        const i = y * W + x;
        const h = LANDSCHAFT.hoehe[i] ?? 0;
        const art = LANDSCHAFT.art[i] ?? 'gras';
        // Offenes Meer zeichnet die große Fläche darunter; nur Wasser direkt am Land bekommt eine Kachel
        if (art === 'wasser' && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => land(x + dx, y + dy))) continue;
        const rr = reihe(x, y);
        const g = GELAENDE[art] ?? GELAENDE.gras!;
        // Gelände: Würfel für Hügel, flache Kachel für Ebene
        for (let z = 0; z < h; z++) liste[rr]!.push({ schluessel: `g${x},${y},${z}`, x, y, z, flaechen: dunkler(quader(x, y, z, x + 1, y + 1, z + 1, z === h - 1 ? g[0] : '#a06b47', g[1], g[2])), tippbar: true, durchsichtig: false });
        if (h === 0) {
          const tief = art === 'wasser' ? -0.25 : 0;
          // Uferkante: Landfelder neben Wasser bekommen eine kleine Böschung
          const ufer = art !== 'wasser' && art !== 'bruecke' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => !land(x + dx, y + dy));
          const farbe = (x + y) % 2 ? g[0] : shade(g[0]);
          const flaechen = ufer
            ? quader(x, y, -0.35, x + 1, y + 1, 0, farbe, g[1], g[2])
            : [{ punkte: `${P(x, y, tief)} ${P(x + 1, y, tief)} ${P(x + 1, y + 1, tief)} ${P(x, y + 1, tief)}`, farbe, seite: 'oben' as Seite }];
          // Ufer-Quader: angetippt wird wie ein Boden (z = −1)
          liste[rr]!.push({ schluessel: `b${x},${y}`, x, y, z: -1, flaechen: dunkler(flaechen), tippbar: art !== 'wasser', durchsichtig: false, extra: art === 'blumen' ? 'blumen' : art === 'bruecke' ? 'bruecke' : undefined });
        }
        if (LANDSCHAFT.baum[i]) {
          const pf = LANDSCHAFT.pflanze[i];
          if (pf === 'kaktus') {
            // Kaktus: grüne Säule mit zwei Armen
            const k = (a: number, b: number, c: number, e: number, f: number, g2: number) => quader(x + a, y + b, h + c, x + e, y + f, h + g2, KAKTUS[0], KAKTUS[1], KAKTUS[2]);
            liste[rr]!.push({ schluessel: `t${x},${y}`, x, y, z: h, flaechen: dunkler([...k(0.4, 0.4, 0, 0.6, 0.6, 1.5), ...k(0.18, 0.45, 0.55, 0.4, 0.55, 0.7), ...k(0.18, 0.45, 0.7, 0.3, 0.55, 1.1), ...k(0.6, 0.45, 0.75, 0.8, 0.55, 0.9), ...k(0.7, 0.45, 0.9, 0.8, 0.55, 1.25)]), tippbar: false, durchsichtig: false });
          } else if (pf === 'palme') {
            liste[rr]!.push({ schluessel: `t${x},${y}`, x, y, z: h, flaechen: dunkler(quader(x + 0.44, y + 0.44, h, x + 0.56, y + 0.56, h + 1.7, '#b5834f', '#87521f', '#9c6634')), extra: 'palme', tippbar: false, durchsichtig: false });
          } else {
            liste[rr]!.push({ schluessel: `t${x},${y}`, x, y, z: h, flaechen: dunkler(quader(x + 0.4, y + 0.4, h, x + 0.6, y + 0.6, h + 1.2, '#87521f', '#6b3f17', '#7a4a22')), extra: `baum`, tippbar: false, durchsichtig: false });
          }
        }
        // Freie Version: geschlossenes Tor am Anfang der Brücke
        if (sperre && x === BRUECKE.x0 && (y === BRUECKE.y || y === BRUECKE.y + 1))
          liste[rr]!.push({ schluessel: `sp${x},${y}`, x, y, z: 0, flaechen: dunkler([...moebel(105, x, y, 0, 1), ...quader(x + 0.4, y, 0.8, x + 0.6, y + 1, 0.9, '#d9a066', '#9c6634', '#b57a42')]), tippbar: true, durchsichtig: false, extra: y === BRUECKE.y + 1 ? 'sperrschild' : undefined });
        // Gebautes
        (stapel[i] ?? []).forEach((a, k) => {
          const z = h + k;
          if (a === LUFT) return;
          if (innen && z >= f.z + 2) return;
          const vorne = innen && rr > fReihe && Math.abs(x - f.x) <= 3 && Math.abs(y - f.y) <= 3 && z >= f.z;
          const block = BLOCKARTEN[a];
          // Offene Tür: nur das aufgeklappte Türblatt an der Seite, der Durchgang ist frei
          const tuerUnten = a === 101 ? z : a === TUER_OBEN ? z - 1 : null;
          if (tuerUnten !== null && offen === `${x},${y},${tuerUnten}`) {
            const wandX = [x - 1, x + 1].some((nx) => nx >= 0 && nx < W && ((stapel[y * W + nx] ?? [])[tuerUnten - (LANDSCHAFT.hoehe[y * W + nx] ?? 0)] ?? LUFT) !== LUFT);
            const blatt = wandX ? quader(x, y, z, x + 0.1, y + 0.85, z + 1, '#9c6634', '#7a4a22', '#8a5a2b') : quader(x, y, z, x + 0.85, y + 0.1, z + 1, '#9c6634', '#7a4a22', '#8a5a2b');
            liste[rr]!.push({ schluessel: `s${x},${y},${z}`, x, y, z, flaechen: dunkler(blatt), tippbar: true, durchsichtig: vorne, extra: 'tuerauf' });
            return;
          }
          const stelle = `${x},${y},${z}`;
          const flaechen = a >= 100 ? moebel(a, x, y, z, rtg[stelle] ?? 0, schaukel === stelle ? 'sitz' : a === 105 && offen === stelle ? 'offen' : undefined, ZAUNARTIG.has(a) ? nachbarnVon(x, y, z) : undefined) : quader(x, y, z, x + 1, y + 1, z + 1, block?.oben ?? '#ccc', block?.links ?? '#999', block?.rechts ?? '#aaa');
          const lampe = LAMPEN.has(a);
          liste[rr]!.push({
            schluessel: `s${x},${y},${z}`,
            x,
            y,
            z,
            flaechen: L >= 1 ? flaechen : flaechen.map((f) => (lampe && f.farbe.startsWith('#ff') ? f : { ...f, farbe: dd(f.farbe) })),
            tippbar: true,
            durchsichtig: vorne,
            extra: a === 102 ? 'fenster' : a === 101 ? 'tuer' : a === TUER_OBEN ? 'tueroben' : lampe && L < 0.5 ? 'leuchte' : undefined,
            marke: drehMarken && drehbar(a),
          });
        });
      }
    return liste;
  }

  function shade(farbe: string): string {
    // leicht dunklere Variante für das Schachbrettmuster
    const n = parseInt(farbe.slice(1), 16);
    const f = (v: number) => Math.max(0, Math.round(v * 0.94));
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
  }

  /** Baumkrone über dem Stamm. */
  function krone(x: number, y: number, h: number): [number, number] {
    const [a, b] = dreh(x + 0.5, y + 0.5);
    return [(a - b) * A, ((a + b) * A) / 2 - (h + 1.6) * C];
  }
  /** Bildpunkt (SVG-Koordinaten) einer stetigen Plan-Position, Fußpunkt der Figur. */
  const punktVon = (x: number, y: number, z: number): [number, number] => {
    const [a, b] = dreh(x + 0.5, y + 0.5);
    return [(a - b) * A, ((a + b) * A) / 2 - z * C];
  };
  /**
   * Beim Laufen kommt die Position Bild für Bild von außen (gleitPos), sonst steht die Figur auf ihrem Feld.
   * Gezeichnet wird sie in der Reihe des Feldes, dem sie gerade am nächsten ist.
   */
  /**
   * Liegen: Die Figur liegt längs auf der Matratze, Kopf am Kissen (kleines y im Plan), Füße am Fußende.
   * Drehwinkel und Größe folgen aus den beiden Bildpunkten, damit es in jeder Ansicht passt.
   */
  const liegen = $derived.by(() => {
    if (pose?.typ !== 'liegen') return null;
    // Gedrehtes Bett (seit 0.14): Kissen und Fußende drehen mit
    const dreheVersatz = (du: number, dv: number): [number, number] => {
      let a = du;
      let b = dv;
      for (let i = 0; i < (pose.richtung ?? 0) % 4; i++) [a, b] = [-b, a];
      return [a, b];
    };
    const [kx, ky] = dreheVersatz(0, -0.32);
    const [fx2, fy2] = dreheVersatz(0, 0.4);
    const kopf = punktVon(pose.x + kx, pose.y + ky, pose.z + pose.hoehe);
    const fuss = punktVon(pose.x + fx2, pose.y + fy2, pose.z + pose.hoehe);
    const dx = kopf[0] - fuss[0];
    const dy = kopf[1] - fuss[1];
    const laenge = Math.hypot(dx, dy);
    // Figur zeigt nach oben (0, −1): so drehen, dass sie zum Kissen zeigt; Länge 56 auf die Bettlänge bringen
    const winkel = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return { fuss, kopf: [dx, dy] as const, winkel, skala: Math.max(0.45, Math.min(1, laenge / 50)) };
  });
  /**
   * Rutschen (seit 0.18.1): Die Figur startet oben auf der Rutsche und gleitet zum unteren Ende.
   * Punkte im Feld werden wie das Teil selbst gedreht (Viertelumdrehungen um die Feldmitte).
   */
  const rutsche = $derived.by(() => {
    if (pose?.typ !== 'rutschen') return null;
    const imFeld = (u: number, v: number, h: number): [number, number] => {
      let a = u;
      let b = v;
      for (let i = 0; i < (pose.richtung ?? 0) % 4; i++) [a, b] = [1 - b, a];
      const [p, q] = dreh(pose.x + a, pose.y + b);
      return [(p - q) * A, ((p + q) * A) / 2 - (pose.z + h) * C];
    };
    const start = imFeld(0.28, 0.78, 1.0);
    const ende = imFeld(0.95, 0.78, 0.12);
    return { start, weg: [ende[0] - start[0], ende[1] - start[1]] as const };
  });
  const figurPunkt = $derived(
    rutsche
      ? rutsche.start
      : liegen
      ? liegen.fuss
      : pose
      ? punktVon(pose.x, pose.y, pose.z + pose.hoehe)
      : gleitPos
        ? punktVon(gleitPos.x, gleitPos.y, gleitPos.z)
        : punktVon(stand.figur.x, stand.figur.y, stand.figur.z),
  );
  const fReihe = $derived(pose ? reihe(pose.x, pose.y) : reihe(stand.figur.x, stand.figur.y));
  /**
   * Blickrichtung beim Laufen wie auf dem Jahrmarkt: nach oben im Bild von hinten, nach unten seitlich
   * (nach links gespiegelt). Im Stehen schaut die Figur nach vorne.
   */
  let blick = $state<{ ansicht: Ansicht; links: boolean }>({ ansicht: 'vorne', links: false });
  let vorher: [number, number] | null = null;
  $effect(() => {
    const [px, py] = figurPunkt;
    if (!laeuft || !gleitPos) {
      vorher = null;
      if (blick.ansicht !== 'vorne') blick = { ansicht: 'vorne', links: false };
      return;
    }
    if (vorher) {
      const dx = px - vorher[0];
      const dy = py - vorher[1];
      if (Math.abs(dx) + Math.abs(dy) > 0.5) {
        const neu = { ansicht: (dy < 0 ? 'hinten' : 'seite') as Ansicht, links: dx < 0 };
        if (neu.ansicht !== blick.ansicht || neu.links !== blick.links) blick = neu;
      }
    }
    vorher = [px, py];
  });
  const breite = N * A;
  const oben = 9 * C + 20;
  /** Nur der Bauplatz des offenen Auftrags wird markiert: Umriss auf dem Boden und ein Holzschild davor. */
  const umrisse = $derived(
    GRUNDSTUECKE.filter((g) => g.id === grundstueck && imBereich(B, g.x0, g.y0)).map((g) => {
      // Schild an der vorderen Ecke (nach der Drehung die unterste Ecke im Bild)
      const ecken: [number, number][] = [[g.x0, g.y0], [g.x0 + g.n, g.y0], [g.x0 + g.n, g.y0 + g.n], [g.x0, g.y0 + g.n]];
      const vorne = ecken.map(([x, y]) => P(x, y, 0).split(',').map(Number) as [number, number]).reduce((a, b) => (b[1] > a[1] ? b : a));
      return { id: g.id, name: g.name, punkte: ecken.map(([x, y]) => P(x, y, 0.02)).join(' '), schild: vorne };
    }),
  );
  /** Jubel-Sterne über dem Bauplatz: Versatz und Größe. */
  const STERNE: [number, number, number][] = [[-50, 0, 9], [40, -8, 11], [-20, -20, 8], [10, 6, 12], [60, 10, 8], [-64, -14, 7], [24, -30, 9], [-36, 14, 10], [0, -40, 8]];
  const FUNKEN: [number, number][] = [[-18, -50], [16, -44], [-12, -18], [20, -14], [0, -66], [-24, -32], [24, -30]];
  /** Boot am Ende des Stegs (nur in der Hauptwelt). */
  const mitBoot = imBereich(B, BOOT.x, BOOT.y);
  const bootReihe = $derived(mitBoot ? reihe(BOOT.x, BOOT.y) : -1);
  const bootPunkt = $derived(punktVon(BOOT.x, BOOT.y, -0.2));
  /** Ruderboot: in der Hauptwelt neben dem Steg, auf einer Auftragsinsel an ihrem Steg. */
  const ruderOrt = auftragsinsel ? ruderbootAn(auftragsinsel) : RUDERBOOT;
  const ruderReihe = $derived(onruderboot ? reihe(ruderOrt.x, ruderOrt.y) : -1);
  const ruderPunkt = $derived(punktVon(ruderOrt.x, ruderOrt.y, -0.2));
  /** Mitte des markierten Bauplatzes (für die Jubel-Sterne), sonst die Figur. */
  const jubelPunkt = $derived.by(() => {
    const g = GRUNDSTUECKE.find((q) => q.id === grundstueck && imBereich(B, q.x0, q.y0));
    return g ? punktVon(g.x0 + g.n / 2 - 0.5, g.y0 + g.n / 2 - 0.5, 1.5) : figurPunkt;
  });
  /** Tiere je Reihe. */
  const tiere = $derived(stand.tiere);

  const tierReihen = $derived.by(() => {
    const m = new Map<number, { art: number; px: number; py: number; schluessel: string; nr: number }[]>();
    tiere.forEach((t, k) => {
      if (!imBereich(B, t.x, t.y)) return;
      const [a, b] = dreh(t.x + 0.5, t.y + 0.5);
      const rr = reihe(t.x, t.y);
      const l = m.get(rr) ?? [];
      l.push({ art: t.art, px: (a - b) * A, py: ((a + b) * A) / 2 - t.z * C, schluessel: `tier${k}`, nr: k });
      m.set(rr, l);
    });
    return m;
  });
  /**
   * Ein einziger Klick-Empfänger für alle Flächen (seit 0.19, spart Speicher bei tausenden Flächen):
   * Feld und Ebene stehen am Teil (data-feld), die Seite an der Fläche (data-seite).
   */
  function geklickt(e: MouseEvent) {
    const ziel = e.target as Element | null;
    const flaeche = ziel?.closest?.('polygon[data-seite]');
    const teil = flaeche?.closest('g.teil');
    if (!flaeche || !teil || !teil.classList.contains('tippbar')) return;
    const [x = 0, y = 0, z = 0] = (teil.getAttribute('data-feld') ?? '').split(',').map(Number);
    ontippe(x, y, z, (flaeche.getAttribute('data-seite') ?? 'oben') as Seite);
  }
  /** Mittelpunkt der Figur in Bildschirmkoordinaten (für die Kamera). */
  export function figurBildpunkt(): [number, number] {
    return [(figurPunkt[0] + breite + 10) * massstab, (figurPunkt[1] + oben) * massstab];
  }
  /** Umkehrung von bildpunkt: Bildschirmpunkt → Plan-Position auf Höhe 0 (für Drehen um die Bildmitte). */
  export function planpunkt(sx: number, sy: number): { x: number; y: number } {
    const px = sx / massstab - breite - 10;
    const py = sy / massstab - oben;
    const a = (2 * py) / A / 2 + px / A / 2;
    const b = (2 * py) / A / 2 - px / A / 2;
    // gedrehte Koordinaten (a, b) zurück in den Ausschnitt, dann in den ganzen Plan
    const [x, y] = r === 1 ? [b, BH - a] : r === 2 ? [BW - a, BH - b] : r === 3 ? [BW - b, a] : [a, b];
    return { x: x + BX - 0.5, y: y + BY - 0.5 };
  }
  /** Winkel (Grad, im Uhrzeigersinn von oben), in den auf dem Bildschirm „Norden“ des Plans zeigt (für den Kompass). */
  export function nordWinkel(): number {
    const [x0, y0] = punktVon(BX + BW / 2, BY + BH / 2, 0);
    const [x1, y1] = punktVon(BX + BW / 2, BY + BH / 2 - 1, 0);
    return (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI;
  }
  /** Bildschirmkoordinaten einer stetigen Plan-Position (Kamera folgt der Figur Bild für Bild). */
  export function bildpunkt(x: number, y: number, z: number): [number, number] {
    const [px, py] = punktVon(x, y, z);
    return [(px + breite + 10) * massstab, (py + oben) * massstab];
  }
</script>



<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<svg
  onclick={geklickt}
  viewBox="{-breite - 10} {-oben} {2 * breite + 20} {oben + N * A + 20}"
  width={(2 * breite + 20) * massstab}
  height={(oben + N * A + 20) * massstab}
  role="application"
  aria-label="Bauinsel"
>
  <defs>
    <radialGradient id="meer"><stop offset="0.6" stop-color={d('#5fb7e6')} /><stop offset="1" stop-color={d('#3c8fc2')} /></radialGradient>
    <radialGradient id="schein"><stop offset="0" stop-color="#ffe57a" stop-opacity="0.75" /><stop offset="1" stop-color="#ffe57a" stop-opacity="0" /></radialGradient>
  </defs>
  <!-- Meer rund um die Inseln -->
  <polygon points="{P(BX - 3, BY - 3, -0.6)} {P(BX + BW + 3, BY - 3, -0.6)} {P(BX + BW + 3, BY + BH + 3, -0.6)} {P(BX - 3, BY + BH + 3, -0.6)}" fill="url(#meer)" />
  {#each reihen as teile, rr (rr)}
    <g>
      {#each teile as t (t.schluessel)}
        <g
          class="teil"
          class:tippbar={t.tippbar}
          class:mark={markiert && markiert.x === t.x && markiert.y === t.y}
          opacity={t.durchsichtig ? 0.3 : 1}
          data-feld="{t.x},{t.y},{t.z}"
        >
          {#each t.flaechen as f, k (k)}<polygon
              points={f.punkte}
              fill={f.farbe}
              stroke="#1f2a6b"
              stroke-width={t.z < 0 ? 0.4 : 1.2}
              stroke-linejoin="round"
              data-seite={f.seite ?? 'oben'}
            />{/each}
          {#if t.extra === 'fenster' || t.extra === 'tuer' || t.extra === 'tueroben'}
            <TeilExtra flaechen={t.flaechen} art={t.extra} {nacht} />
          {/if}
          {#if t.extra === 'leuchte'}
            {@const [lx, ly] = krone(t.x, t.y, t.z - 0.9)}
            <circle cx={lx} cy={ly} r="34" fill="url(#schein)" pointer-events="none" />
          {/if}
          {#if t.extra === 'blumen'}
            {@const [bx, by] = krone(t.x, t.y, -1.6)}
            <g pointer-events="none">
              <circle cx={bx - 8} cy={by - 2} r="2.6" fill={d('#e23a4e')} /><circle cx={bx + 7} cy={by + 1} r="2.6" fill={d('#ffc62b')} /><circle cx={bx} cy={by + 6} r="2.6" fill={d('#ffffff')} /><circle cx={bx + 2} cy={by - 6} r="2.4" fill={d('#3c78d8')} />
            </g>
          {/if}
          {#if t.extra === 'bruecke'}
            {@const [bx, by] = krone(t.x, t.y, -1.6)}
            <g pointer-events="none" stroke={d('#6b3f17')} stroke-width="1.4">
              <line x1={bx - 16} y1={by - 6} x2={bx + 16} y2={by + 10} /><line x1={bx - 8} y1={by - 10} x2={bx + 12} y2={by} />
            </g>
          {/if}
          {#if t.marke}
            {@const [mx, my] = krone(t.x, t.y, t.z - 0.5)}
            <g pointer-events="none" class="drehmarke" transform="translate({mx} {my})">
              <circle r="11" fill="#fff6d6" stroke="#1f2a6b" stroke-width="2" />
              <text y="5" text-anchor="middle" font-size="15" font-weight="900" fill="#1f2a6b">↻</text>
            </g>
          {/if}
          {#if t.extra === 'sperrschild'}
            {@const [sx2, sy2] = krone(t.x, t.y - 0.5, 0.3)}
            <g pointer-events="none" transform="translate({sx2} {sy2})">
              <rect x="-2" y="0" width="4" height="26" fill={d('#87521f')} />
              <rect x="-58" y="-26" width="116" height="30" rx="5" fill={d('#d9a066')} stroke="#1f2a6b" stroke-width="2" />
              <text x="0" y="-6" text-anchor="middle" font-size="13" font-weight="900" fill="#1f2a6b">Zusatzpaket</text>
            </g>
          {/if}
          {#if t.extra === 'palme'}
            {@const [kx, ky] = krone(t.x, t.y, t.z + 0.15)}
            <g pointer-events="none" stroke="#1f2a6b" stroke-width="1.2" fill={d('#4fbf78')}>
              <path d="M{kx} {ky} q-14 -10 -30 2 q16 -4 30 -2 Z" /><path d="M{kx} {ky} q14 -10 30 2 q-16 -4 -30 -2 Z" />
              <path d="M{kx} {ky} q-10 4 -20 18 q12 -10 20 -18 Z" /><path d="M{kx} {ky} q10 4 20 18 q-12 -10 -20 -18 Z" />
              <path d="M{kx} {ky} q-4 -14 4 -24 q-2 12 -4 24 Z" />
              <circle cx={kx - 3} cy={ky + 3} r="3" fill={d('#8a5a2b')} /><circle cx={kx + 3} cy={ky + 4} r="3" fill={d('#8a5a2b')} />
            </g>
          {/if}
          {#if t.extra === 'baum'}
            {@const [kx, ky] = krone(t.x, t.y, t.z)}
            <circle cx={kx - 9} cy={ky + 8} r="15" fill={d('#3fae6a')} stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx + 9} cy={ky + 6} r="16" fill={d('#4fbf78')} stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx} cy={ky - 6} r="15" fill={d('#5ccc85')} stroke="#1f2a6b" stroke-width="1.2" />
          {/if}
        </g>
      {/each}
      {#if rr === bootReihe && onboot}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <g class="boot" transform="translate({bootPunkt[0]} {bootPunkt[1]})" onclick={onboot} data-boot="1" style={lichtStufe < 1 ? `filter: brightness(${(0.5 + 0.5 * lichtStufe).toFixed(2)})` : undefined}>
          <g class="schaukeln">
            <path d="M-26 -6 L26 -6 L18 8 L-18 8 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="2" stroke-linejoin="round" />
            <rect x="-2" y="-40" width="3.5" height="34" fill="#1f2a6b" />
            <path d="M1.5 -38 L22 -12 L1.5 -12 Z" fill="#fffdf7" stroke="#1f2a6b" stroke-width="1.5" />
            <path d="M-2 -40 L-14 -36 L-2 -32 Z" fill="#ffc62b" />
          </g>
        </g>
      {/if}
      {#if rr === ruderReihe && onruderboot}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <g class="boot" transform="translate({ruderPunkt[0]} {ruderPunkt[1]})" onclick={onruderboot} data-ruderboot="1" style={lichtStufe < 1 ? `filter: brightness(${(0.5 + 0.5 * lichtStufe).toFixed(2)})` : undefined}>
          <g class="schaukeln">
            <path d="M-24 -4 Q0 -10 24 -4 L17 7 Q0 11 -17 7 Z" fill="#b5834f" stroke="#1f2a6b" stroke-width="2" stroke-linejoin="round" />
            <path d="M-18 -3 Q0 -7 18 -3" fill="none" stroke="#8a5a2b" stroke-width="2" />
            <line x1="-30" y1="6" x2="-8" y2="-6" stroke="#87521f" stroke-width="3" stroke-linecap="round" />
            <line x1="30" y1="6" x2="8" y2="-6" stroke="#87521f" stroke-width="3" stroke-linecap="round" />
            <ellipse cx="-31" cy="7" rx="5" ry="2.5" fill="#d9a066" stroke="#1f2a6b" stroke-width="1" />
            <ellipse cx="31" cy="7" rx="5" ry="2.5" fill="#d9a066" stroke="#1f2a6b" stroke-width="1" />
          </g>
          <g transform="translate(34 -22)">
            <rect x="-30" y="-14" width="60" height="18" rx="5" fill="#fffdf7" stroke="#1f2a6b" stroke-width="1.5" />
            <text x="0" y="0" text-anchor="middle" font-size="11" font-weight="900" fill="#1f2a6b">{auftragsinsel ? 'Zurück' : 'Bauauftrag'}</text>
          </g>
        </g>
      {/if}
      {#each tierReihen.get(rr) ?? [] as t (t.schluessel)}
        <g class="tier" style="transform: translate({t.px}px, {t.py}px){lichtStufe < 1 ? `; filter: brightness(${(0.55 + 0.45 * lichtStufe).toFixed(2)})` : ''}" pointer-events="none">
          {#if gestreichelt?.nr === t.nr}
            <g class="freut"><TierBild art={t.art} /></g>
            <g class="laut" aria-hidden="true">
              <rect x="-26" y="-46" width="52" height="20" rx="10" fill="#fffdf7" stroke="#1f2a6b" stroke-width="1.5" />
              <text x="0" y="-32" text-anchor="middle">{gestreichelt.laut}</text>
              <path d="M20 -54 c-3 -5 -10 -2 -6 3 l6 6 l6 -6 c4 -5 -3 -8 -6 -3 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="1" />
            </g>
          {:else}
            <TierBild art={t.art} />
          {/if}
        </g>
      {/each}
      {#if rr === fReihe}
        <g class="figur" transform="translate({figurPunkt[0]} {figurPunkt[1]})" pointer-events="none" style={lichtStufe < 1 ? `filter: brightness(${(0.65 + 0.35 * lichtStufe).toFixed(2)})` : undefined}>
          {#if pose?.typ === 'schaukeln'}
            <!-- Schaukeln: Sitz, Ketten und Figur schwingen gemeinsam um die Stange -->
            <g class="schaukel" style="transform-origin: 0px {(-(1.2 - pose.hoehe) * C).toFixed(1)}px">
              <line x1="-7" y1="0" x2="-7" y2={-(1.2 - pose.hoehe) * C} stroke={d('#3a3d4f')} stroke-width="1.6" />
              <line x1="7" y1="0" x2="7" y2={-(1.2 - pose.hoehe) * C} stroke={d('#3a3d4f')} stroke-width="1.6" />
              <g class="sitzt"><InselFigur {figur} {aussehen} sitzt g={48} /></g>
              <rect x="-10" y="-1" width="20" height="4" rx="1" fill={d('#d9a066')} stroke="#1f2a6b" stroke-width="1" />
            </g>
          {:else if pose?.typ === 'springen'}
            <!-- Trampolin: hoch und runter -->
            <g class="springt"><InselFigur {figur} {aussehen} ansicht="vorne" /></g>
          {:else if pose?.typ === 'rutschen' && rutsche}
            <!-- Rutsche: kurz oben sitzen, dann hinunter -->
            <g class="rutscht" style="--rx: {rutsche.weg[0].toFixed(1)}px; --ry: {rutsche.weg[1].toFixed(1)}px"><g class="sitzt"><InselFigur {figur} {aussehen} sitzt ansicht="vorne" /></g></g>
          {:else if pose?.typ === 'buddeln'}
            <!-- Sandkasten: sitzen und buddeln, Sand fliegt -->
            <g class="sitzt"><InselFigur {figur} {aussehen} sitzt ansicht="vorne" /></g>
            <g class="sand" aria-hidden="true">
              {#each [[-14, -4], [12, -6], [-4, -2], [16, -2], [-18, -8]] as [sx, sy], k (k)}
                <circle cx={sx} cy={sy} r="2.2" fill={d('#e8cf86')} stroke={d('#b8994e')} stroke-width="0.6" style="animation-delay: {k * 180}ms" />
              {/each}
            </g>
          {:else if jubel && !pose}
            <!-- Bauauftrag geschafft: zweimal hüpfen, Arme hoch -->
            <g class="hopst"><InselFigur {figur} {aussehen} jubelt ansicht="vorne" /></g>
          {:else}
            <g class:sitzt={pose?.typ === 'sitzen'} transform={liegen ? `rotate(${liegen.winkel.toFixed(1)}) scale(${liegen.skala.toFixed(2)})` : undefined}>
              <InselFigur {figur} {aussehen} laeuft={laeuft && !pose} sitzt={pose?.typ === 'sitzen'} ansicht={pose ? 'vorne' : blick.ansicht} links={!pose && blick.links} />
            </g>
          {/if}
          {#if liegen}
            <g class="zzz" aria-hidden="true" transform="translate({liegen.kopf[0].toFixed(1)} {(liegen.kopf[1] + 24).toFixed(1)})"><text x="10" y="-30">z</text><text x="18" y="-40">z</text><text x="27" y="-52">Z</text></g>
          {/if}
          {#if funkeln}
            <g class="funkeln" aria-hidden="true">
              {#each FUNKEN as [sx, sy], k (k)}
                <path d="M{sx} {sy - 6} L{sx + 2} {sy - 2} L{sx + 6} {sy} L{sx + 2} {sy + 2} L{sx} {sy + 6} L{sx - 2} {sy + 2} L{sx - 6} {sy} L{sx - 2} {sy - 2} Z" fill={k % 2 ? '#ffe57a' : '#a6e3ff'} style="animation-delay: {k * 70}ms" />
              {/each}
            </g>
          {/if}
        </g>
      {/if}
    </g>
  {/each}
  <!-- Bauplatz des offenen Auftrags (über allem, nur als Markierung) mit Holzschild -->
  {#each umrisse as u (u.id)}
    <polygon points={u.punkte} fill={bauen ? 'rgb(255 198 43 / 0.12)' : 'rgb(255 198 43 / 0.25)'} stroke="#e23a4e" stroke-width={bauen ? 3 : 2} stroke-dasharray="6 4" pointer-events="none" class="umriss" />
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <g class="schild" class:leise={bauen} transform="translate({u.schild[0]} {u.schild[1] + 6})" onclick={() => onschild?.()} data-schild={u.id} pointer-events={bauen ? 'none' : undefined}>
      <rect x="-3" y="-40" width="6" height="40" fill="#87521f" />
      <rect x="-58" y="-74" width="116" height="36" rx="5" fill="#d9a066" stroke="#1f2a6b" stroke-width="2.5" />
      <text x="0" y="-50" text-anchor="middle" font-size="18" font-weight="900" fill="#1f2a6b">{u.name}</text>
    </g>
  {/each}
  {#if jubel}
    <g class="jubelsterne" transform="translate({jubelPunkt[0]} {jubelPunkt[1]})" pointer-events="none" aria-hidden="true">
      {#each STERNE as [sx, sy, gr], k (k)}
        <path d="M{sx} {sy - gr} L{sx + gr * 0.3} {sy - gr * 0.3} L{sx + gr} {sy} L{sx + gr * 0.3} {sy + gr * 0.3} L{sx} {sy + gr} L{sx - gr * 0.3} {sy + gr * 0.3} L{sx - gr} {sy} L{sx - gr * 0.3} {sy - gr * 0.3} Z" fill={k % 3 === 0 ? '#ffc62b' : k % 3 === 1 ? '#ffe57a' : '#ff9ec7'} stroke="#1f2a6b" stroke-width="1" style="animation-delay: {k * 110}ms" />
      {/each}
    </g>
  {/if}
</svg>

<style>
  svg {
    display: block;
  }
  .teil.tippbar {
    cursor: pointer;
  }
  .teil.mark polygon {
    stroke: #e23a4e;
    stroke-width: 3;
  }
  /* Die Figur gleitet von Feld zu Feld statt zu springen */
  .tier {
    animation: hupfer 0.4s ease-out;
  }
  @keyframes hupfer {
    40% {
      translate: 0 -4px;
    }
  }
  /* Bauauftrag geschafft: zweimal hüpfen, Sterne steigen auf (seit 0.19) */
  .hopst {
    animation: hopsen 0.55s cubic-bezier(0.3, 0, 0.4, 1) 2;
  }
  @keyframes hopsen {
    0%,
    100% {
      translate: 0 0;
    }
    45% {
      translate: 0 -26px;
    }
  }
  .jubelsterne path {
    opacity: 0;
    animation: steigen 1.8s ease-out forwards;
  }
  @keyframes steigen {
    0% {
      opacity: 0;
      translate: 0 10px;
      scale: 0.4;
    }
    20% {
      opacity: 1;
      scale: 1;
    }
    100% {
      opacity: 0;
      translate: 0 -110px;
      scale: 1.1;
    }
  }
  /* Sitzen: etwas tiefer in den Sitz */
  .sitzt {
    translate: 0 6px;
  }
  /* Schaukeln: vor und zurück um die Stange (etwa eine Runde in 3,6 Sekunden) */
  .schaukel {
    animation: schwung 1.2s ease-in-out infinite alternate;
  }
  .schaukel .sitzt {
    translate: 0 2px;
  }
  @keyframes schwung {
    from {
      rotate: -20deg;
    }
    to {
      rotate: 20deg;
    }
  }
  /* Trampolin: springen (seit 0.18.1) */
  .springt {
    animation: springen 0.8s cubic-bezier(0.3, 0, 0.4, 1) infinite;
  }
  @keyframes springen {
    0%,
    100% {
      translate: 0 0;
      scale: 1.06 0.94;
    }
    12% {
      scale: 1;
    }
    50% {
      translate: 0 -34px;
    }
  }
  /* Rutsche: oben kurz sitzen, dann hinunter */
  .rutscht {
    animation: rutschen 2.4s ease-in forwards;
  }
  @keyframes rutschen {
    0%,
    30% {
      translate: 0 0;
    }
    85%,
    100% {
      translate: var(--rx) var(--ry);
    }
  }
  /* Sandkasten: Sandkörner fliegen hoch */
  .sand circle {
    opacity: 0;
    animation: sand 0.9s ease-out infinite;
  }
  @keyframes sand {
    0% {
      opacity: 1;
      translate: 0 0;
    }
    100% {
      opacity: 0;
      translate: 0 -18px;
    }
  }
  /* Tier antippen: hüpft und sagt etwas */
  .freut {
    animation: freut 0.45s ease-out 3;
  }
  @keyframes freut {
    40% {
      translate: 0 -9px;
    }
  }
  .laut {
    animation: laut 1.6s ease-out forwards;
  }
  .laut text {
    font: 900 11px Nunito, sans-serif;
    fill: #1f2a6b;
  }
  @keyframes laut {
    0% {
      opacity: 0;
      translate: 0 6px;
    }
    15%,
    80% {
      opacity: 1;
      translate: 0 0;
    }
    100% {
      opacity: 0;
    }
  }
  .zzz text {
    font: 900 11px Nunito, sans-serif;
    fill: #fffdf7;
    stroke: #1f2a6b;
    stroke-width: 0.6;
    animation: zzz 2.4s ease-in-out infinite;
  }
  .zzz text:nth-child(2) {
    animation-delay: 0.4s;
  }
  .zzz text:nth-child(3) {
    animation-delay: 0.8s;
  }
  @keyframes zzz {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
  .boot,
  .schild {
    cursor: pointer;
  }
  .schild.leise {
    opacity: 0.3;
  }
  .schaukeln {
    animation: schaukeln 3s ease-in-out infinite;
  }
  @keyframes schaukeln {
    50% {
      rotate: -3deg;
      translate: 0 2px;
    }
  }
  .funkeln path {
    opacity: 0;
    animation: funkeln 0.9s ease-out 2;
  }
  @keyframes funkeln {
    30% {
      opacity: 1;
      scale: 1.3;
    }
    100% {
      opacity: 0;
      scale: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .tier { animation: none; }
    .schaukeln, .schaukel, .springt, .freut, .laut { animation: none; }
    .rutscht { animation: none; translate: var(--rx) var(--ry); }
    .sand circle { animation: none; opacity: 0; }
    .funkeln path { animation: none; opacity: 0; }
  }
</style>
