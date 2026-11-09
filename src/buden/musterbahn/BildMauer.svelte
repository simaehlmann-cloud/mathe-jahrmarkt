<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Rechenmauer: Zeilen von unten nach oben, `null` ist der gesuchte Stein. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const zeilen = $derived((d.zeilen as (number | null)[][] | undefined) ?? []);
  const loesung = $derived((d.loesung as number[][] | undefined) ?? []);
  const B = 76;
  const H = 46;
  const breite = $derived((zeilen[0]?.length ?? 1) * B);
  const hoehe = $derived(zeilen.length * H);
</script>

<svg viewBox="-4 -4 {breite + 8} {hoehe + 8}" role="img" aria-label="Rechenmauer">
  {#each zeilen as zeile, r (r)}
    {#each zeile as v, s (s)}
      {@const x = s * B + (r * B) / 2}
      {@const y = hoehe - (r + 1) * H}
      <g>
        <rect {x} {y} width={B - 4} height={H - 4} rx="6" fill={v === null ? (zustand === 'richtig' ? '#c9f2d6' : '#fff4c2') : '#f3d2b3'} stroke="#232a5c" stroke-width="3" stroke-dasharray={v === null && zustand !== 'richtig' ? '7 5' : undefined} />
        <text x={x + (B - 4) / 2} y={y + H / 2 + 5} text-anchor="middle" font-size="22" font-weight="900" fill="#232a5c">{v === null ? (zustand === 'richtig' ? (loesung[r]?.[s] ?? aufgabe.antwort) : '?') : v}</text>
      </g>
    {/each}
  {/each}
</svg>

<style>
  svg {
    width: min(100%, 26rem);
    max-height: 36vh;
  }
</style>
