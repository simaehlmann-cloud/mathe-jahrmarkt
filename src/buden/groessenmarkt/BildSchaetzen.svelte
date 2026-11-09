<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Schätz-Bude: großes Plakat mit dem Ding und dem passenden Messgerät. */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const art = $derived(String(d.art ?? 'laenge'));
</script>

<svg viewBox="0 0 320 200" class="bild" role="img" aria-label={String(d.ding ?? '')}>
  <rect x="20" y="14" width="280" height="172" rx="14" fill="#fffdf7" stroke="#1f2a6b" stroke-width="3" />
  <text x="160" y="58" text-anchor="middle" font-size="20" font-weight="900" fill="#1f2a6b">{d.ding}</text>
  <text x="160" y="84" text-anchor="middle" font-size="14" font-weight="700" fill="#4a5394">ungefähr wie viel?</text>
  {#if art === 'laenge'}
    <rect x="50" y="120" width="220" height="34" rx="4" fill="#ffc62b" stroke="#1f2a6b" stroke-width="2.5" />
    {#each Array.from({ length: 23 }, (_, i) => i) as i (i)}<line x1={55 + i * 9.5} y1="120" x2={55 + i * 9.5} y2={i % 5 === 0 ? 138 : 130} stroke="#1f2a6b" stroke-width="1.5" />{/each}
  {:else if art === 'zeit'}
    <circle cx="160" cy="140" r="34" fill="#fff" stroke="#1f2a6b" stroke-width="3" />
    <line x1="160" y1="140" x2="160" y2="114" stroke="#1f2a6b" stroke-width="3" stroke-linecap="round" />
    <line x1="160" y1="140" x2="178" y2="146" stroke="#e23a4e" stroke-width="3" stroke-linecap="round" />
  {:else if art === 'volumen'}
    <path d="M134 112 h52 l-6 66 h-40 z" fill="#cdefff" stroke="#1f2a6b" stroke-width="3" />
    <path d="M139 140 h42 l-3 36 h-36 z" fill="#3c78d8" opacity="0.6" />
  {:else}
    <path d="M110 170 h100 l-12 -26 h-76 z" fill="#5b6075" stroke="#1f2a6b" stroke-width="3" />
    <line x1="160" y1="144" x2="160" y2="118" stroke="#1f2a6b" stroke-width="4" />
    <rect x="120" y="110" width="80" height="10" rx="4" fill="#cfa45a" stroke="#1f2a6b" stroke-width="2" />
  {/if}
</svg>

<style>
  .bild {
    width: min(100%, 30rem);
    max-height: 100%;
  }
</style>
