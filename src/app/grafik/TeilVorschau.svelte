<script lang="ts">
  import { tierArt } from '../../domain/insel';
  import { A, VORSCHAU_VIEWBOX, zeichner } from './inselTeile';
  import TierBild from './TierBild.svelte';
  import TeilExtra from './TeilExtra.svelte';

  /** Kleines Bild eines Inselteils (Einrichtung oder Tier) auf einer Bodenplatte, für Andenkenstand und Werkzeugleiste. */
  let { art, groesse = 56, richtung = 0 }: { art: number; groesse?: number; richtung?: number } = $props();
  const { moebel } = zeichner((x, y) => [x, y]);
  const flaechen = $derived(tierArt(art) ? [] : moebel(art, 0, 0, 0, richtung));
  const boden = `0,0 ${A},${A / 2} 0,${A} ${-A},${A / 2}`;
</script>

<svg viewBox={VORSCHAU_VIEWBOX} width={groesse} height={groesse} aria-hidden="true">
  <polygon points={boden} fill="#a8dc93" stroke="#1f2a6b" stroke-width="1" />
  {#if tierArt(art)}
    <g transform="translate(0 {A * 0.62}) scale(1.3)"><TierBild {art} /></g>
  {:else}
    {#each flaechen as f, k (k)}<polygon points={f.punkte} fill={f.farbe} stroke="#1f2a6b" stroke-width="1" stroke-linejoin="round" />{/each}
    {#if art === 101 || art === 102}<TeilExtra {flaechen} art={art === 101 ? 'tuer' : 'fenster'} />{/if}
  {/if}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
</style>
