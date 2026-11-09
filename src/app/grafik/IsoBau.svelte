<script lang="ts">
  import { BLOCKARTEN } from '../../domain/bau';

  /**
   * Würfelgebäude in isometrischer Ansicht. `stapel`: je Feld (Index y · n + x) die Blockarten von unten nach oben.
   * Der Betrachter steht an der Ecke rechts unten im Bauplan; `drehung` (0–3) dreht das Gebäude in Vierteldrehungen.
   * `fest` sind vorgegebene Höhen (z. B. die gegebene Hälfte beim Spiegelbau), sie werden hell gezeichnet.
   */
  let {
    n,
    stapel,
    fest = [],
    drehung = 0,
    achse = false,
    beschriftung = 'Würfelgebäude',
    max = 8,
  }: { n: number; stapel: readonly (readonly number[])[]; fest?: readonly number[]; drehung?: number; achse?: boolean; beschriftung?: string; max?: number } = $props();

  const A = 22;
  const C = 25;
  const P = (x: number, y: number, z: number): string => `${(x - y) * A},${((x + y) * A) / 2 - z * C}`;
  const dreh = (x: number, y: number, r: number): [number, number] =>
    r === 1 ? [n - 1 - y, x] : r === 2 ? [n - 1 - x, n - 1 - y] : r === 3 ? [y, n - 1 - x] : [x, y];

  type Wuerfel = { x: number; y: number; z: number; art: number; geist: boolean };
  const wuerfel = $derived.by(() => {
    const liste: Wuerfel[] = [];
    for (let i = 0; i < n * n; i++) {
      const [x, y] = dreh(i % n, Math.floor(i / n), ((drehung % 4) + 4) % 4);
      const st = stapel[i] ?? [];
      st.forEach((art, z) => liste.push({ x, y, z, art, geist: false }));
      const f = fest[i] ?? 0;
      for (let z = st.length; z < f; z++) liste.push({ x, y, z, art: 1, geist: true });
    }
    return liste.sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z || a.x - b.x);
  });
  const anzahl = $derived(stapel.reduce((s, st) => s + st.length, 0));
  // Spiegelachse: senkrechte Mittellinie im Bauplan (x = n/2), mit gedreht
  const achsePunkte = $derived.by(() => {
    const r = ((drehung % 4) + 4) % 4;
    const ende = (x: number, y: number): [number, number] => {
      // Ecke (x, y) im Plan → gedrehte Ecke; Ecken liegen auf ganzzahligen Gitterpunkten
      const [a, b] = r === 1 ? [n - y, x] : r === 2 ? [n - x, n - y] : r === 3 ? [y, n - x] : [x, y];
      return [a, b];
    };
    const [x1, y1] = ende(n / 2, 0);
    const [x2, y2] = ende(n / 2, n);
    return `${P(x1, y1, 0)} ${P(x2, y2, 0)}`;
  });
  const breite = $derived(n * A);
  const oben = $derived(max * C + 10);
</script>

<svg viewBox="{-breite - 4} {-oben} {2 * breite + 8} {oben + n * A + 6}" role="img" aria-label="{beschriftung} aus {anzahl} Würfeln">
  <!-- Boden -->
  {#each Array(n * n) as _, i (i)}
    {@const x = i % n}
    {@const y = Math.floor(i / n)}
    <polygon points="{P(x, y, 0)} {P(x + 1, y, 0)} {P(x + 1, y + 1, 0)} {P(x, y + 1, 0)}" fill={(x + y) % 2 ? '#cfe8c4' : '#c2e0b6'} stroke="#a9cf9c" stroke-width="1" />
  {/each}
  {#if achse}<polyline points={achsePunkte} stroke="#e23a4e" stroke-width="4" stroke-dasharray="8 5" fill="none" />{/if}
  {#each wuerfel as w, i (i)}
    {@const art = BLOCKARTEN[w.art] ?? BLOCKARTEN[0]}
    <g opacity={w.geist ? 0.55 : 1}>
      <polygon points="{P(w.x + 1, w.y, w.z)} {P(w.x + 1, w.y + 1, w.z)} {P(w.x + 1, w.y + 1, w.z + 1)} {P(w.x + 1, w.y, w.z + 1)}" fill={w.geist ? '#c7cbd8' : art?.links} stroke="#1f2a6b" stroke-width="1.4" stroke-linejoin="round" />
      <polygon points="{P(w.x, w.y + 1, w.z)} {P(w.x + 1, w.y + 1, w.z)} {P(w.x + 1, w.y + 1, w.z + 1)} {P(w.x, w.y + 1, w.z + 1)}" fill={w.geist ? '#d6d9e3' : art?.rechts} stroke="#1f2a6b" stroke-width="1.4" stroke-linejoin="round" />
      <polygon points="{P(w.x, w.y, w.z + 1)} {P(w.x + 1, w.y, w.z + 1)} {P(w.x + 1, w.y + 1, w.z + 1)} {P(w.x, w.y + 1, w.z + 1)}" fill={w.geist ? '#eef0f5' : art?.oben} stroke="#1f2a6b" stroke-width="1.4" stroke-linejoin="round" />
    </g>
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
