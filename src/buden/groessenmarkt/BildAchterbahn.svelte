<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Achterbahn-Architekt: Gleisstücke als farbige Abschnitte; das fehlende Stück ist gestrichelt. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const teile = $derived((d.teile as number[] | undefined) ?? []);
  const rechteck = $derived(d.rechteck === true);
  const summe = $derived(teile.reduce((s, t) => s + t, 0) || 1);
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#7b5ea7'];
</script>

<svg viewBox="0 0 320 190" class="bild" role="img" aria-label="Achterbahn">
  <rect width="320" height="190" fill="#bfe6ff" rx="12" />
  <rect y="150" width="320" height="40" fill="#8fd18a" />
  {#if rechteck}
    <rect x="50" y="40" width="220" height="100" rx="10" fill="none" stroke="#1f2a6b" stroke-width="10" />
    <rect x="50" y="40" width="220" height="100" rx="10" fill="none" stroke="#ffc62b" stroke-width="4" stroke-dasharray="8 8" />
    <text x="160" y="32" text-anchor="middle" font-size="16" font-weight="900" fill="#1f2a6b">{teile[0]} m</text>
    <text x="284" y="96" font-size="16" font-weight="900" fill="#1f2a6b">{teile[1]} m</text>
    <circle cx="80" cy="140" r="9" fill="#e23a4e" stroke="#1f2a6b" stroke-width="2" />
  {:else}
    {#each teile as t, i (i)}
      {@const x0 = 20 + (280 * teile.slice(0, i).reduce((s, v) => s + v, 0)) / summe}
      {@const b = (280 * t) / summe}
      {@const fehlt = i === teile.length - 1}
      <path
        d="M{x0} {120 - Math.sin(i * 1.3) * 40} Q{x0 + b / 2} {60 - (i % 2) * 30} {x0 + b} {120 - Math.sin((i + 1) * 1.3) * 40}"
        fill="none"
        stroke={fehlt && zustand !== 'richtig' ? '#9aa0b8' : (FARBEN[i % FARBEN.length] ?? '#e23a4e')}
        stroke-width="9"
        stroke-dasharray={fehlt && zustand !== 'richtig' ? '10 8' : 'none'}
        stroke-linecap="round"
      />
      <text x={x0 + b / 2} y="170" text-anchor="middle" font-size="14" font-weight="900" fill="#1f2a6b">{fehlt && zustand !== 'richtig' ? '?' : `${t}`}</text>
    {/each}
  {/if}
</svg>

<style>
  .bild {
    width: min(100%, 30rem);
    max-height: 100%;
  }
</style>
