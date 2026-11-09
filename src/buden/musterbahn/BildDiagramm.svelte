<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Diagramm-Reporter: Strichliste, Säulen- oder Balkendiagramm; gefragte Einträge sind markiert. */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const namen = $derived((d.namen as string[] | undefined) ?? []);
  const werte = $derived((d.werte as number[] | undefined) ?? []);
  const schritt = $derived(Number(d.schritt ?? 1));
  const art = $derived(String(d.art ?? 'saeulen'));
  const markiert = $derived((d.markiert as number[] | undefined) ?? []);
  const max = $derived(Math.max(...werte, schritt) / schritt);
  const kaestchen = $derived(Math.ceil(max) + 1);
  const FARBE = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2a31b'];
  // Säulen/Balken: Kästchenraster, Skala alle zwei Kästchen beschriftet
  const K = 22;
</script>

<figure aria-label="{String(d.titel ?? '')}: {namen.map((n, i) => `${n} ${werte[i]}`).join(', ')}">
  <figcaption>{d.titel}</figcaption>
  {#if art === 'strichliste'}
    <table>
      <tbody>
        {#each namen as n, i (i)}
          <tr class:mark={markiert.includes(i)}>
            <th>{n}</th>
            <td>
              {#each Array(Math.floor((werte[i] ?? 0) / 5)) as _, b (b)}<span class="buendel">||||</span>{/each}<span class="rest">{'|'.repeat((werte[i] ?? 0) % 5)}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if art === 'saeulen'}
    {@const h = kaestchen * K}
    <svg viewBox="-34 -10 {namen.length * 56 + 44} {h + 40}" role="img" aria-hidden="true">
      {#each Array(kaestchen + 1) as _, k (k)}
        <line x1="0" x2={namen.length * 56} y1={h - k * K} y2={h - k * K} stroke="#c9cde3" />
        {#if k % 2 === 0}<text x="-6" y={h - k * K + 5} text-anchor="end" font-size="13" font-weight="800" fill="#232a5c">{k * schritt}</text>{/if}
      {/each}
      {#each namen as n, i (i)}
        {@const v = ((werte[i] ?? 0) / schritt) * K}
        <rect x={i * 56 + 10} y={h - v} width="36" height={v} fill={FARBE[i]} stroke="#232a5c" stroke-width={markiert.includes(i) ? 4 : 2} />
        <text x={i * 56 + 28} y={h + 20} text-anchor="middle" font-size="13" font-weight={markiert.includes(i) ? 900 : 700} fill="#232a5c">{n}</text>
      {/each}
      <line x1="0" x2="0" y1="0" y2={h} stroke="#232a5c" stroke-width="2" />
    </svg>
  {:else}
    {@const w = kaestchen * K}
    <svg viewBox="-96 -6 {w + 110} {namen.length * 40 + 30}" role="img" aria-hidden="true">
      {#each Array(kaestchen + 1) as _, k (k)}
        <line y1="0" y2={namen.length * 40} x1={k * K} x2={k * K} stroke="#c9cde3" />
        {#if k % 2 === 0}<text y={namen.length * 40 + 18} x={k * K} text-anchor="middle" font-size="13" font-weight="800" fill="#232a5c">{k * schritt}</text>{/if}
      {/each}
      {#each namen as n, i (i)}
        <rect y={i * 40 + 8} x="0" height="26" width={((werte[i] ?? 0) / schritt) * K} fill={FARBE[i]} stroke="#232a5c" stroke-width={markiert.includes(i) ? 4 : 2} />
        <text x="-8" y={i * 40 + 26} text-anchor="end" font-size="14" font-weight={markiert.includes(i) ? 900 : 700} fill="#232a5c">{n}</text>
      {/each}
    </svg>
  {/if}
</figure>

<style>
  figure {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 6px;
    width: 100%;
  }
  figcaption {
    font-weight: 900;
    font-size: 1.1rem;
  }
  svg {
    width: 100%;
    max-width: 22rem;
    max-height: 34vh;
  }
  table {
    border-collapse: collapse;
    background: #fff;
    font-weight: 800;
  }
  th,
  td {
    border: 2px solid var(--tinte);
    padding: 4px 10px;
    text-align: left;
  }
  td {
    min-width: 9rem;
    font-size: 1.3rem;
    letter-spacing: 1px;
  }
  tr.mark {
    background: #fff4c2;
  }
  .buendel {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    margin-right: 8px;
  }
</style>
