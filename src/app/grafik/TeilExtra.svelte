<script lang="ts">
  import { aufFlaeche, feldAuf, linieAuf, type Flaeche } from './inselTeile';

  /**
   * Fenster und Tür auf den sichtbaren Seiten eines Blocks: Glas mit Sprossen bzw. Türblatt mit Griff.
   * Auf der Insel und in der Vorschau (Andenkenstand, Werkzeugleiste) dieselbe Zeichnung.
   * `nacht`: Fenster leuchten warm.
   */
  let { flaechen, art, nacht = false }: { flaechen: readonly Flaeche[]; art: 'fenster' | 'tuer' | 'tueroben'; nacht?: boolean } = $props();
  const seiten = $derived(flaechen.filter((f) => f.seite === 'links' || f.seite === 'rechts'));
</script>

<g pointer-events="none">
  {#each seiten as f, k (k)}
    {#if art === 'fenster'}
      <polygon points={feldAuf(f.punkte, 0.16, 0.16, 0.84, 0.84)} fill={nacht ? (f.seite === 'links' ? '#ffd86b' : '#ffe58f') : f.seite === 'links' ? '#8fd0f2' : '#a9dcf6'} stroke="#1f2a6b" stroke-width="1" />
      <path d="{linieAuf(f.punkte, 0.5, 0.16, 0.5, 0.84)} {linieAuf(f.punkte, 0.16, 0.5, 0.84, 0.5)}" stroke={nacht ? '#8a5a2b' : '#fffdf7'} stroke-width="2" />
      {#if !nacht}<path d={linieAuf(f.punkte, 0.25, 0.7, 0.4, 0.78)} stroke="#fff" stroke-width="1.5" opacity="0.8" />{/if}
    {:else}
      <polygon points={feldAuf(f.punkte, 0.2, 0, 0.8, art === 'tuer' ? 1 : 0.85)} fill={f.seite === 'links' ? '#6b3f17' : '#7a4a22'} stroke="#1f2a6b" stroke-width="1" />
      {#if art === 'tuer'}
        <path d="{linieAuf(f.punkte, 0.3, 0.12, 0.3, 0.88)} {linieAuf(f.punkte, 0.7, 0.12, 0.7, 0.88)}" stroke="#4f2e12" stroke-width="1" />
        {@const [gx, gy] = aufFlaeche(f.punkte, 0.68, 0.55).split(',').map(Number)}
        <circle cx={gx} cy={gy} r="2.2" fill="#ffc62b" stroke="#1f2a6b" stroke-width="0.8" />
      {:else}
        <polygon points={feldAuf(f.punkte, 0.32, 0.25, 0.68, 0.65)} fill={nacht ? '#ffd86b' : '#a9dcf6'} stroke="#1f2a6b" stroke-width="0.8" />
      {/if}
    {/if}
  {/each}
</g>
