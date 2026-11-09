<script lang="ts" module>
  export type Seite = 'oben' | 'links' | 'rechts';
</script>

<script lang="ts">
  import { BLOCKARTEN } from '../../domain/bau';
  import { INSEL, LANDSCHAFT, LUFT, TUER_OBEN, type InselStand } from '../../domain/insel';
  import type { Aussehen } from '../../domain/aussehen';
  import { koerperFarben } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Figur from './Figur.svelte';

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
    ontippe,
  }: {
    stand: InselStand;
    drehung?: number;
    massstab?: number;
    figur: FigurId;
    aussehen: Aussehen;
    laeuft?: boolean;
    markiert?: { x: number; y: number } | null;
    ontippe: (x: number, y: number, z: number, seite: Seite) => void;
  } = $props();

  const N = INSEL;
  const A = 22;
  const C = 25;
  const r = $derived(((drehung % 4) + 4) % 4);
  /** Punkt (Plan-Koordinaten, stetig) → gedrehte Koordinaten. */
  const dreh = (x: number, y: number): [number, number] =>
    r === 1 ? [N - y, x] : r === 2 ? [N - x, N - y] : r === 3 ? [y, N - x] : [x, y];
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
      default:
        return q(0, 0, 0, 1, 1, 1, '#ccc', '#999', '#aaa');
    }
  }

  const istInnen = $derived.by(() => {
    const f = stand.figur;
    const i = f.y * N + f.x;
    const h = LANDSCHAFT.hoehe[i] ?? 0;
    const st = stand.stapel[i] ?? [];
    for (let z = f.z + 2; z < h + st.length; z++) if ((st[z - h] ?? LUFT) !== LUFT) return true;
    return false;
  });

  const reihen = $derived.by(() => {
    const liste: Teil[][] = Array.from({ length: 2 * N }, () => []);
    const f = stand.figur;
    const fReihe = reihe(f.x, f.y);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const h = LANDSCHAFT.hoehe[i] ?? 0;
        const art = LANDSCHAFT.art[i] ?? 'gras';
        const rr = reihe(x, y);
        const g = GELAENDE[art] ?? GELAENDE.gras!;
        // Gelände: Würfel für Hügel, flache Kachel für Ebene
        for (let z = 0; z < h; z++) liste[rr]!.push({ schluessel: `g${x},${y},${z}`, x, y, z, flaechen: quader(x, y, z, x + 1, y + 1, z + 1, z === h - 1 ? g[0] : '#a06b47', g[1], g[2]), tippbar: true, durchsichtig: false });
        if (h === 0) {
          const tief = art === 'wasser' ? -0.25 : 0;
          liste[rr]!.push({ schluessel: `b${x},${y}`, x, y, z: -1, flaechen: [{ punkte: `${P(x, y, tief)} ${P(x + 1, y, tief)} ${P(x + 1, y + 1, tief)} ${P(x, y + 1, tief)}`, farbe: (x + y) % 2 ? g[0] : shade(g[0]) }], tippbar: art !== 'wasser', durchsichtig: false });
        }
        if (LANDSCHAFT.baum[i]) {
          liste[rr]!.push({ schluessel: `t${x},${y}`, x, y, z: h, flaechen: [...quader(x + 0.4, y + 0.4, h, x + 0.6, y + 0.6, h + 1.2, '#87521f', '#6b3f17', '#7a4a22')], extra: `baum`, tippbar: false, durchsichtig: false });
        }
        // Gebautes
        (stand.stapel[i] ?? []).forEach((a, k) => {
          const z = h + k;
          if (a === LUFT) return;
          if (istInnen && z >= f.z + 2) return;
          const vorne = istInnen && rr > fReihe && Math.abs(x - f.x) <= 3 && Math.abs(y - f.y) <= 3 && z >= f.z;
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
  const farben = $derived(koerperFarben(figur, aussehen.fell));
  const breite = N * A;
  const oben = 9 * C + 20;
  /** Mittelpunkt der Figur in Bildschirmkoordinaten (für die Kamera). */
  export function figurBildpunkt(): [number, number] {
    return [(figurPunkt[0]! + breite + 10) * massstab, (figurPunkt[1]! + oben) * massstab];
  }
</script>

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
  <!-- Meer rund um die Insel -->
  <polygon points="{P(-3, -3, -0.6)} {P(N + 3, -3, -0.6)} {P(N + 3, N + 3, -0.6)} {P(-3, N + 3, -0.6)}" fill="url(#meer)" />
  <polygon points="{P(-0.6, -0.6, -0.3)} {P(N + 0.6, -0.6, -0.3)} {P(N + 0.6, N + 0.6, -0.3)} {P(-0.6, N + 0.6, -0.3)}" fill="#f1dc9c" />
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
          {#if t.extra === 'baum'}
            {@const [kx, ky] = krone(t.x, t.y, t.z)}
            <circle cx={kx - 9} cy={ky + 8} r="15" fill="#3fae6a" stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx + 9} cy={ky + 6} r="16" fill="#4fbf78" stroke="#1f2a6b" stroke-width="1.2" />
            <circle cx={kx} cy={ky - 6} r="15" fill="#5ccc85" stroke="#1f2a6b" stroke-width="1.2" />
          {/if}
        </g>
      {/each}
      {#if rr === fReihe}
        <g class="figur" class:laeuft transform="translate({figurPunkt[0]} {figurPunkt[1]})" pointer-events="none">
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="#1f2a6b" opacity="0.25" />
          <rect x="-4.5" y="-14" width="4" height="12" rx="2" fill={farben.bein} class="bein l" />
          <rect x="0.5" y="-14" width="4" height="12" rx="2" fill={farben.bein} class="bein r" />
          <path d="M-7 -28 Q0 -31 7 -28 L7 -12 Q0 -10 -7 -12 Z" fill="#3c78d8" stroke="#1f2a6b" stroke-width="1" />
          <svg x="-14" y="-56" width="28" height="28" viewBox="-4 -6 72 74" overflow="visible"><Figur {figur} {aussehen} groesse={64} /></svg>
        </g>
      {/if}
    </g>
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
  .figur.laeuft {
    animation: hops 0.3s ease-in-out infinite alternate;
  }
  @keyframes hops {
    to {
      translate: 0 -3px;
    }
  }
</style>
