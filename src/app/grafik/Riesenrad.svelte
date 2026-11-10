<script lang="ts">
  import type { Stufe } from '../../domain/buden';

  /**
   * Fortschrittsanzeige: eine Gondel pro Tagesbude, gefärbt nach der höchsten geschafften Stufe.
   * Das Rad dreht sich – je mehr Gondeln leuchten, desto schneller. Die Gondeln hängen dabei immer senkrecht
   * (Gegendrehung um ihren Aufhängepunkt, reines CSS, kein Neuzeichnen).
   * Ohne Größe füllt das Rad die Breite seines Containers.
   */
  let { gondeln, groesse, dreht = true, markiert = -1 }: { gondeln: (Stufe | undefined)[]; groesse?: number; dreht?: boolean; markiert?: number } = $props();

  const R = 80;
  const C = 100;
  const FARBE: Record<Stufe | 'leer', string> = { leer: '#d7dae6', bronze: '#c98a4b', silber: '#a9b4c4', gold: '#f2b705' };
  let punkte = $derived(
    gondeln.map((s, i) => {
      const w = (i / gondeln.length) * Math.PI * 2 - Math.PI / 2;
      return { x: C + R * Math.cos(w), y: C + R * Math.sin(w), f: FARBE[s ?? 'leer'], an: s !== undefined };
    }),
  );
  let geschafft = $derived(gondeln.filter((g) => g).length);
  /** Eine Umdrehung: 140 s ohne Licht, 40 s wenn alle Gondeln leuchten. */
  function dauer(an: number, alle: number): number {
    return Math.round(140 - (100 * an) / Math.max(1, alle));
  }
  let sekunden = $derived(dauer(geschafft, gondeln.length));
</script>

<svg viewBox="0 0 200 240" width={groesse} height={groesse ? groesse * 1.2 : undefined} role="img" aria-label="Riesenrad: {geschafft} von {gondeln.length} Gondeln leuchten">
  <!-- Gestell -->
  <path d="M100 100 L52 232 M100 100 L148 232" stroke="#4a5394" stroke-width="7" stroke-linecap="round" />
  <rect x="40" y="228" width="120" height="8" rx="4" fill="#4a5394" />
  <g class="rad" class:dreht style="--d: {sekunden}s">
    <circle cx={C} cy={C} r={R} fill="none" stroke="#1f2a6b" stroke-width="4" />
    <circle cx={C} cy={C} r={R - 14} fill="none" stroke="#1f2a6b" stroke-width="1.5" opacity="0.5" />
    {#each punkte as p, i (i)}
      <line x1={C} y1={C} x2={p.x} y2={p.y} stroke="#1f2a6b" stroke-width="1.5" opacity="0.6" />
    {/each}
    {#each punkte as p, i (i)}
      <g class="gondel" style="transform-origin: {p.x}px {p.y}px">
        <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + 5} stroke="#1f2a6b" stroke-width="1.5" />
        <rect x={p.x - 7} y={p.y + 4} width="14" height="11" rx="3" fill={p.f} stroke={i === markiert ? '#e23a4e' : '#1f2a6b'} stroke-width={i === markiert ? 3 : 1.5} class:an={p.an} />
      </g>
    {/each}
  </g>
  <circle cx={C} cy={C} r="9" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" />
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
    width: 100%;
    height: auto;
  }
  .rad {
    transform-origin: 100px 100px;
  }
  .rad.dreht {
    animation: drehen var(--d) linear infinite;
  }
  .rad.dreht .gondel {
    animation: drehen var(--d) linear infinite reverse;
  }
  @keyframes drehen {
    to {
      transform: rotate(360deg);
    }
  }
  .an {
    filter: drop-shadow(0 0 3px #ffe57a);
  }
  @media (prefers-reduced-motion: reduce) {
    .rad.dreht,
    .rad.dreht .gondel {
      animation: none;
    }
  }
</style>
