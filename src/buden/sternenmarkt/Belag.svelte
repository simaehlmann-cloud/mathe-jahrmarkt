<script lang="ts">
  /** Ein Stück Pizzabelag an (x, y). Fünf Sorten, damit die Bestellungen abwechslungsreich aussehen. */
  let { art = 'Salami', x, y, r }: { art?: string; x: number; y: number; r: number } = $props();
</script>

<g transform="translate({x} {y})" pointer-events="none">
  {#if art === 'Pilzen'}
    <rect x={-r * 0.3} y={-r * 0.1} width={r * 0.6} height={r * 0.8} rx={r * 0.2} fill="#efe3cf" stroke="#8a6a4a" stroke-width="1.2" />
    <path d="M{-r} {r * 0.05} A{r} {r * 0.85} 0 0 1 {r} {r * 0.05} Z" fill="#c9a77c" stroke="#8a6a4a" stroke-width="1.2" />
  {:else if art === 'Paprika'}
    <circle r={r * 0.85} fill="none" stroke="#3c9a4a" stroke-width={r * 0.4} />
  {:else if art === 'Ananas'}
    <polygon points="{-r * 0.8},{r * 0.6} {r * 0.8},{r * 0.6} 0,{-r * 0.8}" fill="#f6cc3f" stroke="#c99a15" stroke-width="1.2" />
  {:else if art === 'Tomaten'}
    <circle r={r} fill="#e8573a" stroke="#b8361f" stroke-width="1.2" />
    <circle r={r * 0.55} fill="#f2896d" />
  {:else}
    <circle r={r} fill="#d9433f" stroke="#a52a27" stroke-width="1.5" />
  {/if}
</g>
