<script lang="ts">
  import { GITTER, freieZellen, istGegeben, type Achse } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Spiegelkabinett: Gitter mit Achse. Gegeben ist eine Seite, die andere färbt das Kind.
   * Mit `zustand = 'richtig'` (Hilfe) wird die Lösung gezeigt.
   */
  let {
    aufgabe,
    zustand,
    gefaerbt = new Set<string>(),
    ontipp,
  }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null; gefaerbt?: ReadonlySet<string>; ontipp?: (k: string) => void } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const achse = $derived((d.achse as Achse | undefined) ?? 'senkrecht');
  const gegeben = $derived(new Set(((d.gegeben as [number, number][] | undefined) ?? []).map((z) => z.join(','))));
  const loesung = $derived(new Set(freieZellen(achse).filter((_, i) => ((aufgabe.antwort - 1) >> i) & 1).map((z) => z.join(','))));
  const zellen = Array.from({ length: GITTER * GITTER }, (_, i) => [i % GITTER, Math.floor(i / GITTER)] as const);
  const K = 52;
</script>

<svg viewBox="-6 -6 {GITTER * K + 12} {GITTER * K + 12}" class="gitter" role="img" aria-label="Spiegelgitter">
  {#each zellen as [x, y] (`${x},${y}`)}
    {@const k = `${x},${y}`}
    {@const frei = !istGegeben(x, y, achse) && !(achse === 'schraeg' && x === y)}
    {@const an = gegeben.has(k) || (zustand === 'richtig' && !ontipp ? loesung.has(k) : gefaerbt.has(k))}
    {@const farbe = an ? (gegeben.has(k) ? '#3c78d8' : '#e23a4e') : frei ? '#fffdf7' : '#e6ebf5'}
    {#if frei && ontipp}
      <rect
        x={x * K}
        y={y * K}
        width={K}
        height={K}
        fill={farbe}
        stroke="#9cb6d6"
        stroke-width="2"
        role="button"
        tabindex="0"
        aria-label="Kästchen Spalte {x + 1}, Zeile {y + 1}{an ? ', gefärbt' : ''}"
        onclick={() => ontipp?.(k)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && ontipp?.(k)}
      />
    {:else}
      <rect x={x * K} y={y * K} width={K} height={K} fill={farbe} stroke="#9cb6d6" stroke-width="2" />
    {/if}
  {/each}
  {#if achse === 'senkrecht'}
    <line x1={(GITTER * K) / 2} y1="-6" x2={(GITTER * K) / 2} y2={GITTER * K + 6} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {:else if achse === 'waagerecht'}
    <line x1="-6" y1={(GITTER * K) / 2} x2={GITTER * K + 6} y2={(GITTER * K) / 2} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {:else}
    <line x1="-6" y1="-6" x2={GITTER * K + 6} y2={GITTER * K + 6} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {/if}
</svg>

<style>
  .gitter {
    width: min(100%, 22rem, 46vh);
  }
  rect[role='button'] {
    cursor: pointer;
  }
</style>
