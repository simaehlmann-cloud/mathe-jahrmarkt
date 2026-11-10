<script lang="ts" module>
  export type Seite = 'oben' | 'links' | 'rechts';
</script>

<script lang="ts">
  import { BLOCKARTEN } from '../../domain/bau';
  import { BREITE, GRUNDSTUECKE, HOEHE, LANDSCHAFT, LUFT, TUER_OBEN, type InselStand } from '../../domain/insel';
  import type { Aussehen } from '../../domain/aussehen';
  import { koerperFarben } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Figur from './Figur.svelte';
  import { Tween } from 'svelte/motion';

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
    schrittMs = 200,
    ontippe,
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
    /** Dauer eines Schritts in ms (zum Gleiten der Figur). */
    schrittMs?: number;
    ontippe: (x: number, y: number, z: number, seite: Seite) => void;
  } = $props();

  const W = BREITE;
  const H = HOEHE;
  /** Größere Seite: bestimmt die Bildfläche, damit jede Drehung hineinpasst. */
  const N = Math.max(W, H);
  const A = 22;
  const C = 25;
  const r = $derived(((drehung % 4) + 4) % 4);
  /** Punkt (Plan-Koordinaten, stetig) → gedrehte Koordinaten. */
  const dreh = (x: number, y: number): [number, number] =>
    r === 1 ? [H - y, x] : r === 2 ? [W - x, H - y] : r === 3 ? [y, W - x] : [x, y];
  const P = (x: number, y: number, z: number): string => {
    const [a, b] = dreh(x, y);
    return `${(a - b) * A},${((a + b) * A) / 2 - z * C}`;
  };
  /** Reihe eines Feldes nach der Drehung (für die Zeichenreihenfolge). */
  const reihe = (x: number, y: number): number => {
    const [a, b] = dreh(x + 0.5, y + 0.5);
    return Math.floor(a) + Math.floor(b);
  };

  type Teil = { schluessel: string; x: number; y: number; z: number; flaechen: { punkte: string; farbe: string; seite?: Seite }[]; extra?: string; tippbar: boolean; durchsichtig: boolean };

  /** Quader von (x0, y0, z0) bis (x1, y1, z1) in Plan-Koordinaten: sichtbare Seiten nach der Drehung + Deckel. */
  function quader(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, oben: string, links: string, rechts: string) {
    const ecken = [dreh(x0, y0), dreh(x1, y1)];
    const ax0 = Math.min(ecken[0]![0], ecken[1]![0]);
    const ax1 = Math.max(ecken[0]![0], ecken[1]![0]);
    const ay0 = Math.min(ecken[0]![1], ecken[1]![1]);
    const ay1 = Math.max(ecken[0]![1], ecken[1]![1]);
    // In gedrehten Koordinaten zeichnen (P mit Drehung 0)
    const Q = (a: number, b: number, z: number): string => `${(a - b) * A},${((a + b) * A) / 2 - z * C}`;
    return [
      { punkte: `${Q(ax1, ay0, z0)} ${Q(ax1, ay1, z0)} ${Q(ax1, ay1, z1)} ${Q(ax1, ay0, z1)}`, farbe: links, seite: 'links' as Seite },
      { punkte: `${Q(ax0, ay1, z0)} ${Q(ax1, ay1, z0)} ${Q(ax1, ay1, z1)} ${Q(ax0, ay1, z1)}`, farbe: rechts, seite: 'rechts' as Seite },
      { punkte: `${Q(ax0, ay0, z1)} ${Q(ax1, ay0, z1)} ${Q(ax1, ay1, z1)} ${Q(ax0, ay1, z1)}`, farbe: oben, seite: 'oben' as Seite },
    ];
  }

  const GELAENDE: Record<string, [string, string, string]> = {
    gras: ['#8bd17a', '#7a5233', '#94603c'],
    sand: ['#f1dc9c', '#c9ad60', '#dcc177'],
    weg: ['#e6c995', '#b99761', '#cfae75'],
    wasser: ['#6cc3ec', '#3c8fc2', '#4aa2d4'],
    bruecke: ['#c99a5f', '#8a5a2b', '#9c6634'],
    blumen: ['#8bd17a', '#7a5233', '#94603c'],
  };

  /** Teile einer Einrichtung (Kennung ab 100) als Quader. */
  function moebel(art: number, x: number, y: number, z: number) {
    const q = (a: number, b: number, c: number, d: number, e: number, f: number, o: string, l: string, rr: string) => quader(x + a, y + b, z + c, x + d, y + e, z + f, o, l, rr);
    switch (art) {
      case 101:
        return q(0, 0, 0, 1, 1, 1, '#9c6634', '#7a4a22', '#8a5a2b');
      case TUER_OBEN:
        return q(0, 0, 0, 1, 1, 1, '#9c6634', '#7a4a22', '#8a5a2b');
      case 102:
        return q(0, 0, 0, 1, 1, 1, '#d8f1ff', '#9fd2f0', '#b8e0f6');
      case 103:
        return [...q(0, 0, 0, 1, 1, 0.5, '#d9a066', '#9c6634', '#b57a42'), ...q(0, 0, 0.5, 1, 0.5, 1, '#d9a066', '#9c6634', '#b57a42')];
      case 110:
        return [...q(0.08, 0.05, 0, 0.92, 0.95, 0.35, '#3c78d8', '#2a5aa8', '#3368bf'), ...q(0.15, 0.08, 0.35, 0.85, 0.3, 0.5, '#ffffff', '#d7dae6', '#e6e8f0')];
      case 111:
        return q(0.12, 0.2, 0, 0.88, 0.8, 1, '#b57a42', '#87521f', '#9c6634');
      case 112:
        return [
          ...q(0.15, 0.15, 0, 0.22, 0.22, 0.55, '#87521f', '#6b3f17', '#7a4a22'),
          ...q(0.78, 0.15, 0, 0.85, 0.22, 0.55, '#87521f', '#6b3f17', '#7a4a22'),
          ...q(0.15, 0.78, 0, 0.22, 0.85, 0.55, '#87521f', '#6b3f17', '#7a4a22'),
          ...q(0.78, 0.78, 0, 0.85, 0.85, 0.55, '#87521f', '#6b3f17', '#7a4a22'),
          ...q(0.08, 0.08, 0.55, 0.92, 0.92, 0.65, '#d9a066', '#9c6634', '#b57a42'),
        ];
      case 113:
        return [...q(0.42, 0.42, 0, 0.58, 0.58, 0.75, '#3a3d4f', '#2a2c3a', '#33364a'), ...q(0.3, 0.3, 0.75, 0.7, 0.7, 0.95, '#ffe57a', '#f2c41b', '#ffd54a')];
      case 114:
        return [...q(0.3, 0.3, 0, 0.7, 0.7, 0.3, '#c26a2c', '#9c4f1c', '#ad5c24'), ...q(0.2, 0.2, 0.3, 0.8, 0.8, 0.85, '#4fbf78', '#2b8550', '#3fae6a')];
      case 115:
        return [
          ...q(0.05, 0.4, 0, 0.2, 0.6, 0.7, '#b9763f', '#87521f', '#9c6634'),
          ...q(0.8, 0.4, 0, 0.95, 0.6, 0.7, '#b9763f', '#87521f', '#9c6634'),
          ...q(0, 0.45, 0.4, 1, 0.55, 0.55, '#d9a066', '#9c6634', '#b57a42'),
        ];
      case 116:
        return [...q(0.1, 0.25, 0, 0.9, 0.85, 0.35, '#e23a4e', '#a82838', '#c22f42'), ...q(0.1, 0.65, 0.35, 0.9, 0.85, 0.75, '#e23a4e', '#a82838', '#c22f42')];
      case 117:
        return [...q(0.25, 0.25, 0, 0.75, 0.75, 0.4, '#d9a066', '#9c6634', '#b57a42'), ...q(0.25, 0.65, 0.4, 0.75, 0.75, 0.9, '#d9a066', '#9c6634', '#b57a42')];
      case 118:
        return [
          ...q(0.1, 0.35, 0, 0.9, 0.65, 1, '#b57a42', '#87521f', '#9c6634'),
          ...q(0.15, 0.3, 0.3, 0.85, 0.4, 0.38, '#3c78d8', '#2a5aa8', '#3368bf'),
          ...q(0.15, 0.3, 0.65, 0.85, 0.4, 0.73, '#3fae6a', '#2b8550', '#36985c'),
        ];
      case 120:
      case 121:
      case 122: {
        const bl = art === 120 ? '#e23a4e' : art === 121 ? '#ffc62b' : '#3c78d8';
        return [...q(0.47, 0.47, 0, 0.53, 0.53, 0.5, '#3fae6a', '#2b8550', '#36985c'), ...q(0.33, 0.33, 0.5, 0.67, 0.67, 0.7, bl, bl, bl)];
      }
      case 123:
        return q(0.05, 0.2, 0, 0.95, 0.8, 0.8, '#3d9a5a', '#2b7544', '#33854e');
      case 124:
        return [
          ...q(0.1, 0.3, 0, 0.18, 0.7, 0.3, '#5a5d70', '#3a3d4f', '#4a4d60'),
          ...q(0.82, 0.3, 0, 0.9, 0.7, 0.3, '#5a5d70', '#3a3d4f', '#4a4d60'),
          ...q(0.05, 0.3, 0.3, 0.95, 0.7, 0.4, '#d9a066', '#9c6634', '#b57a42'),
          ...q(0.05, 0.62, 0.4, 0.95, 0.7, 0.75, '#d9a066', '#9c6634', '#b57a42'),
        ];
      case 125:
        return [...q(0.05, 0.05, 0, 0.95, 0.95, 0.45, '#b7bccb', '#8b90a3', '#9ca1b4'), ...q(0.18, 0.18, 0.45, 0.82, 0.82, 0.5, '#6cc3ec', '#4aa2d4', '#5ab3e0'), ...q(0.42, 0.42, 0.5, 0.58, 0.58, 0.9, '#b7bccb', '#8b90a3', '#9ca1b4')];
      case 126:
        return [...q(0.45, 0.45, 0, 0.55, 0.55, 0.85, '#3a3d4f', '#2a2c3a', '#33364a'), ...q(0.36, 0.36, 0.85, 0.64, 0.64, 1, '#ffe57a', '#f2c41b', '#ffd54a')];
      case 127:
        return [...q(0.05, 0.05, 0, 0.95, 0.95, 0.25, '#7a4a22', '#5a3416', '#6b3f1b'), ...q(0.15, 0.15, 0.25, 0.85, 0.85, 0.3, '#5a3416', '#4a2a10', '#4f2e12')];
      default:
        return q(0, 0, 0, 1, 1, 1, '#ccc', '#999', '#aaa');
    }
  }

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
  /** Nur im Haus hängt das Bild von der Figurposition ab (Schnittansicht). */
  const schnitt = $derived(istInnen ? `${fx},${fy},${fz}` : '');

  const reihen = $derived.by(() => {
    const liste: Teil[][] = Array.from({ length: W + H + 1 }, () => []);
    const [sx = 0, sy = 0, sz = 0] = schnitt ? schnitt.split(',').map(Number) : [];
    const innen = schnitt !== '';
    const f = { x: sx, y: sy, z: sz };
    const fReihe = reihe(f.x, f.y);
    const land = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < W && y < H && LANDSCHAFT.art[y * W + x] !== 'wasser';
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const h = LANDSCHAFT.hoehe[i] ?? 0;
        const art = LANDSCHAFT.art[i] ?? 'gras';
        // Offenes Meer zeichnet die große Fläche darunter; nur Wasser direkt am Land bekommt eine Kachel
        if (art === 'wasser' && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => land(x + dx, y + dy))) continue;
        const rr = reihe(x, y);
        const g = GELAENDE[art] ?? GELAENDE.gras!;
        // Gelände: Würfel für Hügel, flache Kachel für Ebene
        for (let z = 0; z < h; z++) liste[rr]!.push({ schluessel: `g${x},${y},${z}`, x, y, z, flaechen: quader(x, y, z, x + 1, y + 1, z + 1, z === h - 1 ? g[0] : '#a06b47', g[1], g[2]), tippbar: true, durchsichtig: false });
        if (h === 0) {
          const tief = art === 'wasser' ? -0.25 : 0;
          // Uferkante: Landfelder neben Wasser bekommen eine kleine Böschung
          const ufer = art !== 'wasser' && art !== 'bruecke' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dy = 0]) => !land(x + dx, y + dy));
          const farbe = (x + y) % 2 ? g[0] : shade(g[0]);
          const flaechen = ufer
            ? quader(x, y, -0.35, x + 1, y + 1, 0, farbe, g[1], g[2])
            : [{ punkte: `${P(x, y, tief)} ${P(x + 1, y, tief)} ${P(x + 1, y + 1, tief)} ${P(x, y + 1, tief)}`, farbe, seite: 'oben' as Seite }];
          // Ufer-Quader: angetippt wird wie ein Boden (z = −1)
          liste[rr]!.push({ schluessel: `b${x},${y}`, x, y, z: -1, flaechen, tippbar: art !== 'wasser', durchsichtig: false, extra: art === 'blumen' ? 'blumen' : art === 'bruecke' ? 'bruecke' : undefined });
        }
        if (LANDSCHAFT.baum[i]) {
          liste[rr]!.push({ schluessel: `t${x},${y}`, x, y, z: h, flaechen: [...quader(x + 0.4, y + 0.4, h, x + 0.6, y + 0.6, h + 1.2, '#87521f', '#6b3f17', '#7a4a22')], extra: `baum`, tippbar: false, durchsichtig: false });
        }
        // Gebautes
        (stapel[i] ?? []).forEach((a, k) => {
          const z = h + k;
          if (a === LUFT) return;
          if (innen && z >= f.z + 2) return;
          const vorne = innen && rr > fReihe && Math.abs(x - f.x) <= 3 && Math.abs(y - f.y) <= 3 && z >= f.z;
          const block = BLOCKARTEN[a];
          const flaechen = a >= 100 ? moebel(a, x, y, z) : quader(x, y, z, x + 1, y + 1, z + 1, block?.oben ?? '#ccc', block?.links ?? '#999', block?.rechts ?? '#aaa');
          liste[rr]!.push({ schluessel: `s${x},${y},${z}`, x, y, z, flaechen, tippbar: true, durchsichtig: vorne, extra: a === 102 ? 'fenster' : a === 101 ? 'tuer' : undefined });
        });
      }
    return liste;
  });

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
  const figurPunkt = $derived.by(() => {
    const [a, b] = dreh(stand.figur.x + 0.5, stand.figur.y + 0.5);
    return [(a - b) * A, ((a + b) * A) / 2 - stand.figur.z * C];
  });
  const fReihe = $derived(reihe(stand.figur.x, stand.figur.y));
  /** Gezeichnete Position gleitet zur echten (keine Sprünge beim Laufen, auch nicht beim Drehen der Ansicht). */
  const gleiten = new Tween<[number, number]>([0, 0], { duration: 0 });
  let erstes = true;
  $effect(() => {
    const ziel: [number, number] = [figurPunkt[0]!, figurPunkt[1]!];
    void gleiten.set(ziel, { duration: erstes || !laeuft ? 0 : schrittMs });
    erstes = false;
  });
  const farben = $derived(koerperFarben(figur, aussehen.fell));
  const breite = N * A;
  const oben = 9 * C + 20;
  /** Grundstücke als Umrisse auf dem Boden. */
  const umrisse = $derived(
    GRUNDSTUECKE.map((g) => ({ id: g.id, name: g.name, punkte: `${P(g.x0, g.y0, 0.02)} ${P(g.x0 + g.n, g.y0, 0.02)} ${P(g.x0 + g.n, g.y0 + g.n, 0.02)} ${P(g.x0, g.y0 + g.n, 0.02)}`, mitte: P(g.x0 + g.n / 2, g.y0 + g.n / 2, 0.02) })),
  );
  /** Tiere je Reihe. */
  const tiere = $derived(stand.tiere);
  const tierReihen = $derived.by(() => {
    const m = new Map<number, { art: number; px: number; py: number; schluessel: string }[]>();
    tiere.forEach((t, k) => {
      const [a, b] = dreh(t.x + 0.5, t.y + 0.5);
      const rr = reihe(t.x, t.y);
      const l = m.get(rr) ?? [];
      l.push({ art: t.art, px: (a - b) * A, py: ((a + b) * A) / 2 - t.z * C, schluessel: `tier${k}` });
      m.set(rr, l);
    });
    return m;
  });
  /** Mittelpunkt der Figur in Bildschirmkoordinaten (für die Kamera). */
  export function figurBildpunkt(): [number, number] {
    return [(figurPunkt[0]! + breite + 10) * massstab, (figurPunkt[1]! + oben) * massstab];
  }
</script>

{#snippet tierBild(art: number)}
  <ellipse cx="0" cy="0" rx="9" ry="3.5" fill="#1f2a6b" opacity="0.22" />
  {#if art === 140}
    <g class="wackeln"><ellipse cx="0" cy="-9" rx="10" ry="7" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="-6" cy="-14" r="4" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1" /><circle cx="2" cy="-15" r="4" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1" /><ellipse cx="10" cy="-12" rx="4" ry="3.4" fill="#3a3d4f" /><rect x="-6" y="-3" width="2" height="4" fill="#3a3d4f" /><rect x="4" y="-3" width="2" height="4" fill="#3a3d4f" /></g>
  {:else if art === 141}
    <g class="wackeln"><ellipse cx="0" cy="-8" rx="9" ry="5.5" fill="#c98a4b" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="9" cy="-13" r="4.5" fill="#c98a4b" stroke="#1f2a6b" stroke-width="1.2" /><ellipse cx="7" cy="-16" rx="1.8" ry="3" fill="#87521f" /><path d="M-9 -9 Q-14 -15 -12 -18" stroke="#c98a4b" stroke-width="2.4" fill="none" class="schwanz" /><rect x="-6" y="-4" width="2.2" height="5" fill="#87521f" /><rect x="4" y="-4" width="2.2" height="5" fill="#87521f" /><circle cx="10.5" cy="-14" r="0.9" fill="#1f2a6b" /></g>
  {:else if art === 142}
    <g class="wackeln"><ellipse cx="0" cy="-7" rx="7" ry="5" fill="#6b6f86" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="7" cy="-12" r="4" fill="#6b6f86" stroke="#1f2a6b" stroke-width="1.2" /><path d="M4.5 -15 L5.5 -18.5 L7.5 -15.5 M8 -15.5 L10 -18.5 L10.5 -14.5" fill="#6b6f86" stroke="#1f2a6b" stroke-width="0.8" /><path d="M-7 -8 Q-12 -14 -9 -19" stroke="#6b6f86" stroke-width="2.2" fill="none" class="schwanz" /></g>
  {:else}
    <g class="picken"><ellipse cx="0" cy="-6" rx="5.5" ry="5" fill="#fff" stroke="#1f2a6b" stroke-width="1.1" /><circle cx="4" cy="-11" r="3" fill="#fff" stroke="#1f2a6b" stroke-width="1" /><path d="M6.6 -11.4 L9 -10.6 L6.6 -10" fill="#f2b705" /><path d="M3 -14 Q4 -16 5 -14" fill="#e23a4e" /><line x1="-1" y1="-1" x2="-1" y2="1.5" stroke="#f2b705" stroke-width="1.2" /><line x1="2" y1="-1" x2="2" y2="1.5" stroke="#f2b705" stroke-width="1.2" /></g>
  {/if}
{/snippet}

<svg
  viewBox="{-breite - 10} {-oben} {2 * breite + 20} {oben + N * A + 20}"
  width={(2 * breite + 20) * massstab}
  height={(oben + N * A + 20) * massstab}
  role="application"
  aria-label="Bauinsel"
>
  <defs>
    <radialGradient id="meer"><stop offset="0.6" stop-color="#5fb7e6" /><stop offset="1" stop-color="#3c8fc2" /></radialGradient>
  </defs>
  <!-- Meer rund um die Inseln -->
  <polygon points="{P(-3, -3, -0.6)} {P(W + 3, -3, -0.6)} {P(W + 3, H + 3, -0.6)} {P(-3, H + 3, -0.6)}" fill="url(#meer)" />
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
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          {#each t.flaechen as f, k (k)}<polygon
              points={f.punkte}
              fill={f.farbe}
              stroke="#1f2a6b"
              stroke-width={t.z < 0 ? 0.4 : 1.2}
              stroke-linejoin="round"
              data-seite={f.seite ?? 'oben'}
              onclick={() => t.tippbar && ontippe(t.x, t.y, t.z, f.seite ?? 'oben')}
            />{/each}
          {#if t.extra === 'blumen'}
            {@const [bx, by] = krone(t.x, t.y, -1.6)}
            <g pointer-events="none">
              <circle cx={bx - 8} cy={by - 2} r="2.6" fill="#e23a4e" /><circle cx={bx + 7} cy={by + 1} r="2.6" fill="#ffc62b" /><circle cx={bx} cy={by + 6} r="2.6" fill="#fff" /><circle cx={bx + 2} cy={by - 6} r="2.4" fill="#3c78d8" />
            </g>
          {/if}
          {#if t.extra === 'bruecke'}
            {@const [bx, by] = krone(t.x, t.y, -1.6)}
            <g pointer-events="none" stroke="#6b3f17" stroke-width="1.4">
              <line x1={bx - 16} y1={by - 6} x2={bx + 16} y2={by + 10} /><line x1={bx - 8} y1={by - 10} x2={bx + 12} y2={by} />
            </g>
          {/if}
          {#if t.extra === 'baum'}
            {@const [kx, ky] = krone(t.x, t.y, t.z)}
            <circle cx={kx - 9} cy={ky + 8} r="15" fill="#3fae6a" stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx + 9} cy={ky + 6} r="16" fill="#4fbf78" stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx} cy={ky - 6} r="15" fill="#5ccc85" stroke="#1f2a6b" stroke-width="1.2" />
          {/if}
        </g>
      {/each}
      {#each tierReihen.get(rr) ?? [] as t (t.schluessel)}
        <g class="tier" style="transform: translate({t.px}px, {t.py}px)" pointer-events="none">{@render tierBild(t.art)}</g>
      {/each}
      {#if rr === fReihe}
        <g class="figur" transform="translate({gleiten.current[0]} {gleiten.current[1]})" pointer-events="none">
          <g class:laeuft>
            <ellipse cx="0" cy="0" rx="9" ry="4" fill="#1f2a6b" opacity="0.25" />
            <rect x="-4.5" y="-14" width="4" height="12" rx="2" fill={farben.bein} class="bein l" />
            <rect x="0.5" y="-14" width="4" height="12" rx="2" fill={farben.bein} class="bein r" />
            <path d="M-7 -28 Q0 -31 7 -28 L7 -12 Q0 -10 -7 -12 Z" fill="#3c78d8" stroke="#1f2a6b" stroke-width="1" />
            <svg x="-14" y="-56" width="28" height="28" viewBox="-4 -6 72 74" overflow="visible"><Figur {figur} {aussehen} groesse={64} /></svg>
          </g>
        </g>
      {/if}
    </g>
  {/each}
  <!-- Grundstücke für Bauaufträge (über allem, nur als Markierung) -->
  {#each umrisse as u (u.id)}
    <polygon points={u.punkte} fill={grundstueck === u.id ? 'rgb(255 198 43 / 0.28)' : 'rgb(255 255 255 / 0.08)'} stroke={grundstueck === u.id ? '#e23a4e' : '#fff'} stroke-width="2" stroke-dasharray="6 4" pointer-events="none" class="umriss" />
    {@const [mx, my] = u.mitte.split(',').map(Number)}
    <text x={mx} y={(my ?? 0) + 6} text-anchor="middle" font-size="18" font-weight="900" fill={grundstueck === u.id ? '#e23a4e' : '#fff'} stroke="#1f2a6b" stroke-width="0.8" pointer-events="none" opacity="0.9">{u.id.toUpperCase()}</text>
  {/each}
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
  .figur .laeuft {
    animation: hops 0.22s ease-in-out infinite alternate;
  }
  .figur .laeuft .bein.l {
    animation: bein 0.22s ease-in-out infinite alternate;
  }
  .figur .laeuft .bein.r {
    animation: bein 0.22s ease-in-out infinite alternate-reverse;
  }
  @keyframes hops {
    to {
      translate: 0 -2px;
    }
  }
  @keyframes bein {
    from {
      translate: 0 -2px;
    }
    to {
      translate: 0 0;
    }
  }
  .wackeln {
    animation: wackeln 2.4s ease-in-out infinite;
    transform-origin: 0 0;
  }
  .picken {
    animation: picken 1.6s ease-in-out infinite;
    transform-origin: 0 0;
  }
  @keyframes wackeln {
    0%, 100% { rotate: 0deg; }
    50% { rotate: 3deg; }
  }
  @keyframes picken {
    0%, 60%, 100% { rotate: 0deg; }
    75% { rotate: 18deg; }
  }
  @media (prefers-reduced-motion: reduce) {
    .tier { animation: none; }
    .wackeln, .picken, .figur .laeuft, .figur .laeuft .bein.l, .figur .laeuft .bein.r { animation: none; }
  }
</style>
