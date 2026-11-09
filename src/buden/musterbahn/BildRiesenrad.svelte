<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Riesenrad-Techniker: Rad mit Gondeln (Plätze pro Gondel als Punkte) oder Preistabelle. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const tabelle = $derived(d.tabelle as [number, number][] | undefined);
  const verdeckt = $derived(d.verdeckt === true && zustand !== 'richtig');
  const gondeln = $derived(verdeckt ? 8 : Math.min(Number(d.gondeln ?? 8), 14));
  const pro = $derived(Number(d.pro ?? 4));
  const R = 92;
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2a31b'];
</script>

{#if tabelle}
  <table aria-label="Preistabelle">
    <thead><tr><th>Fahrten</th><th>Preis</th></tr></thead>
    <tbody>
      {#each tabelle as [n, p] (n)}<tr><td>{n}</td><td>{p} €</td></tr>{/each}
      <tr class="dots"><td>…</td><td>…</td></tr>
      <tr class="frage"><td>{d.n}</td><td>{zustand === 'richtig' ? `${aufgabe.antwort} €` : '?'}</td></tr>
    </tbody>
  </table>
{:else}
  <svg viewBox="-125 -125 250 270" role="img" aria-label={verdeckt ? 'Riesenrad mit leeren Gondeln' : `Riesenrad mit ${gondeln} Gondeln, je ${pro} Plätze`}>
    <path d="M-60 140 L0 0 L60 140" fill="none" stroke="#232a5c" stroke-width="7" />
    <circle r={R} fill="none" stroke="#232a5c" stroke-width="5" />
    {#each Array(gondeln) as _, i (i)}
      {@const w = (i / gondeln) * Math.PI * 2}
      {@const x = Math.cos(w) * R}
      {@const y = Math.sin(w) * R}
      <line x1="0" y1="0" x2={x} y2={y} stroke="#232a5c" stroke-width="2" />
      <g transform="translate({x} {y + 4})">
        <rect x="-15" y="0" width="30" height="20" rx="5" fill={FARBEN[i % 4]} stroke="#232a5c" stroke-width="2.5" />
        {#each Array(verdeckt ? 0 : pro) as _, k (k)}<circle cx={-10 + (k % 4) * 6.7} cy={6 + Math.floor(k / 4) * 8} r="2.6" fill="#fff" />{/each}
      </g>
    {/each}
    <circle r="10" fill="#f2a31b" stroke="#232a5c" stroke-width="3" />
  </svg>
{/if}

<style>
  svg {
    width: min(100%, 20rem);
    max-height: 40vh;
  }
  table {
    border-collapse: collapse;
    font-weight: 900;
    font-size: 1.25rem;
    background: #fff;
    border: 3px solid var(--tinte);
  }
  th,
  td {
    border: 2px solid var(--tinte);
    padding: 6px 18px;
    text-align: center;
  }
  th {
    background: #f6e7c8;
  }
  .frage td:last-child {
    background: #fff4c2;
  }
</style>
