<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Würfelnetz-Werkstatt: das Netz auf Karopapier; bei „gegenüber“ mit Buchstaben. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const netz = $derived((d.netz as [number, number][] | undefined) ?? []);
  const breite = $derived(Math.max(...netz.map(([x]) => x)) + 1);
  const hoehe = $derived(Math.max(...netz.map(([, y]) => y)) + 1);
  const buchstaben = $derived(aufgabe.art === 'auswahl' && aufgabe.form === 'gegenueber');
  const K = 50;
  const B = ['A', 'B', 'C', 'D', 'E', 'F'];
</script>

<svg viewBox="-10 -10 {breite * K + 20} {hoehe * K + 20}" class="netz" role="img" aria-label="Würfelnetz aus 6 Quadraten">
  {#each netz as [x, y], i (i)}
    {@const markiert = buchstaben && (i === d.frage || (zustand === 'richtig' && i === d.gegen))}
    <rect x={x * K} y={y * K} width={K} height={K} fill={markiert ? '#ffe57a' : '#cdefff'} stroke="#1f2a6b" stroke-width="3" />
    {#if buchstaben}<text x={x * K + K / 2} y={y * K + K / 2 + 8} text-anchor="middle" font-size="24" font-weight="900" fill="#1f2a6b">{B[i]}</text>{/if}
  {/each}
</svg>

<style>
  .netz {
    width: min(100%, 22rem);
    max-height: 38vh;
  }
</style>
