<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import Belag from './Belag.svelte';
  /** Pizzabäckerei: Pizza in n gleiche Stücke geschnitten, z davon belegt. Nach der Lösung ggf. zweite Pizza. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const pizzen = $derived.by(() => {
    const p = [...((d.pizzen as [number, number][] | undefined) ?? [])];
    const l = d.loesung as [number, number] | undefined;
    if (l && zustand === 'richtig') p.push(l);
    return p;
  });
  const R = 70;
  const stueck = (i: number, n: number): string => {
    const w1 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const w2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const gross = n === 1 ? 1 : 0;
    return `M0 0 L${Math.cos(w1) * R} ${Math.sin(w1) * R} A${R} ${R} 0 ${gross} 1 ${Math.cos(w2) * R} ${Math.sin(w2) * R} Z`;
  };
  // Salami-Scheiben in der Mitte jedes belegten Stücks
  const belag = (i: number, n: number): [number, number][] => {
    const w = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    return [0.62, 0.36].map((f) => [Math.cos(w) * R * f, Math.sin(w) * R * f]);
  };
</script>

<div class="reihe">
  {#each pizzen as [z, n], p (p)}
    <svg viewBox="-80 -80 160 160" width="170" role="img" aria-label="Pizza mit {n} Stücken, {z} belegt">
      <circle r={R + 6} fill="#e9b26a" stroke="#232a5c" stroke-width="3" />
      {#each Array(n) as _, i (i)}
        <path d={stueck(i, n)} fill={i < z ? '#f7d36b' : '#f6e3b4'} stroke="#232a5c" stroke-width="2.5" />
        {#if i < z}{#each belag(i, n) as [x, y], k (k)}<Belag art={String(d.belag ?? 'Salami')} {x} {y} r={n > 8 ? 5 : 7} />{/each}{/if}
      {/each}
    </svg>
  {/each}
</div>

<style>
  .reihe {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  svg {
    max-width: 44vw;
    height: auto;
  }
</style>
