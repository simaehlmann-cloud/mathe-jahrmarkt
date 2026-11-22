<script lang="ts">
  import type { Baustein } from '../../../domain/elternbericht';

  /** Zeigt Berichts-Bausteine auf dem Bildschirm – dieselben Inhalte wie im PDF (services/pdf.ts). */
  let { bausteine, ohneTitel = false }: { bausteine: readonly Baustein[]; ohneTitel?: boolean } = $props();
</script>

<div class="bericht">
  {#each bausteine as b, i (i)}
    {#if b.art === 'titel'}
      {#if !ohneTitel}
        <h2>{b.text}</h2>
        <p class="unter">{b.unter}</p>
      {/if}
    {:else if b.art === 'h'}
      <h3>{b.text}</h3>
    {:else if b.art === 'h3'}
      <h4>{b.text}</h4>
    {:else if b.art === 'p'}
      <p>{b.text}</p>
    {:else if b.art === 'liste'}
      <ul>{#each b.punkte as pkt, j (j)}<li>{pkt}</li>{/each}</ul>
    {:else if b.art === 'hinweis'}
      <p class="hinweis">{b.text}</p>
    {:else if b.art === 'balken'}
      <div class="balken">
        {#each b.zeilen as z, j (j)}
          {@const a = Math.max(0, Math.min(1, z.anteil))}
          <span class="name">{z.name}</span>
          <span class="spur" role="img" aria-label="{z.name}: {z.text}">
            <span class="fuell" class:neutral={b.neutral} class:voll={!b.neutral && a >= 0.99} class:halb={!b.neutral && a >= 0.5 && a < 0.99} style="width: {a > 0 ? Math.max(4, a * 100) : 0}%"></span>
          </span>
          <span class="text">{z.text}</span>
        {/each}
      </div>
    {:else if b.art === 'tabelle'}
      <div class="tabelle-huelle">
        <table>
          <thead>
            <tr>{#each b.spalten as s, j (j)}<th scope="col">{s}</th>{/each}</tr>
          </thead>
          <tbody>
            {#each b.zeilen as z, j (j)}
              <tr>
                {#each z.zellen as c, k (k)}
                  {#if k === 0}<th scope="row">{c}</th>{:else}<td class={z.ampeln?.[k] ?? ''}>{c}</td>{/if}
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/each}
</div>

<style>
  .bericht {
    display: grid;
    gap: 8px;
    min-width: 0;
  }
  h2 {
    font-size: 1.3rem;
  }
  h3 {
    font-size: 1.15rem;
    margin-top: 10px;
    padding-bottom: 2px;
    border-bottom: 3px solid var(--markise);
    justify-self: start;
  }
  h4 {
    font-size: 1rem;
    margin: 4px 0 0;
  }
  p {
    white-space: pre-line;
  }
  .unter,
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.92rem;
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
    display: grid;
    gap: 3px;
  }
  .balken {
    display: grid;
    grid-template-columns: minmax(8rem, 14rem) 1fr auto;
    gap: 5px 10px;
    align-items: center;
    font-size: 0.92rem;
  }
  .spur {
    height: 12px;
    border-radius: 6px;
    background: #e8ebf4;
    overflow: hidden;
  }
  .fuell {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: var(--markise);
  }
  .fuell.halb {
    background: #f0a202;
  }
  .fuell.voll {
    background: var(--wiese);
  }
  .fuell.neutral {
    background: #3c78d8;
  }
  .text {
    color: var(--tinte-weich);
    white-space: nowrap;
  }
  .tabelle-huelle {
    overflow-x: auto;
    max-width: 100%;
    border: 2px solid #e1e4ef;
    border-radius: 10px;
  }
  table {
    border-collapse: collapse;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  th,
  td {
    padding: 5px 8px;
    border-bottom: 1px solid #e8ebf4;
    text-align: left;
  }
  thead th {
    background: #eef0f6;
    position: sticky;
    top: 0;
  }
  tbody th {
    position: sticky;
    left: 0;
    background: var(--papier);
  }
  .gruen {
    background: #cdeed6;
  }
  .gelb {
    background: #ffecb3;
  }
  .rot {
    background: #facdd2;
  }
  .grau {
    background: #eef0f5;
    color: var(--tinte-weich);
  }
</style>
