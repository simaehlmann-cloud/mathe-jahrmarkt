<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';

  /**
   * Antwortknöpfe für Buden mit Svelte-Bühne. Beschriftung aus `aufgabe.labels` oder `format`.
   * `markiert` zeigt nach dem Antippen richtig/falsch an.
   */
  let {
    aufgabe,
    gesperrt,
    onwahl,
    format = (n: number) => String(n),
    markiert = null,
    richtig = false,
    spalten = 2,
  }: {
    aufgabe: Aufgabe;
    gesperrt: boolean;
    onwahl: (wert: number) => void;
    format?: (n: number) => string;
    markiert?: number | null;
    richtig?: boolean;
    spalten?: number;
  } = $props();
</script>

<div class="wahlen" style="--sp: {spalten}">
  {#each aufgabe.optionen as o (o.wert)}
    <button
      class="wahl"
      data-wert={o.wert}
      class:richtig={markiert === o.wert && richtig}
      class:falsch={markiert === o.wert && !richtig}
      disabled={gesperrt}
      onclick={() => onwahl(o.wert)}
    >
      {aufgabe.labels?.[o.wert] ?? format(o.wert)}
    </button>
  {/each}
</div>

<style>
  .wahlen {
    display: grid;
    grid-template-columns: repeat(var(--sp), minmax(0, 1fr));
    gap: 8px;
    width: min(100%, 34rem);
  }
  .wahl {
    min-height: 54px;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: clamp(1.05rem, 4.4vw, 1.4rem);
    box-shadow: 0 4px 0 var(--tinte);
    padding: 6px 8px;
    touch-action: manipulation;
  }
  .wahl:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--tinte);
  }
  .wahl.richtig {
    background: #c9f2d4;
  }
  .wahl.falsch {
    background: #ffe2a8;
    animation: wackeln 0.4s;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>
