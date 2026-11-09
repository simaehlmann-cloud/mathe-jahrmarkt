<script lang="ts">
  import { STELLEN_KURZ, STELLEN_NAME } from '../../domain/aufgaben/stellenwert';
  import type { Baustein } from '../../domain/aufgaben/typen';

  /**
   * Stellenwerttafel wie im Schulbuch. Leere Felder bleiben leer, außer `nullen` ist gesetzt.
   * Felder mit 10 und mehr (vor dem Entbündeln) werden markiert.
   */
  let {
    bausteine,
    stellen,
    nullen = false,
    hervor,
  }: { bausteine: readonly Baustein[]; stellen: number; nullen?: boolean; hervor?: number | undefined } = $props();

  const FARBEN = ['var(--stelle-e)', 'var(--stelle-z)', 'var(--stelle-h)', 'var(--stelle-t)', '#c45a12', '#5b4b8a'];
  const spalten = $derived(Array.from({ length: stellen }, (_, i) => stellen - 1 - i));
  const anzahl = (s: number): number | undefined => bausteine.find((b) => b.stelle === s)?.anzahl;
</script>

<table class="tafel-stw" aria-label="Stellenwerttafel">
  <thead>
    <tr>
      {#each spalten as s (s)}
        <th style="--f: {FARBEN[s]}" scope="col"><abbr title={STELLEN_NAME[s]}>{STELLEN_KURZ[s]}</abbr></th>
      {/each}
    </tr>
  </thead>
  <tbody>
    <tr>
      {#each spalten as s (s)}
        {@const n = anzahl(s)}
        <td class:hervor={hervor === s} class:zuviel={(n ?? 0) >= 10} class:null={n === undefined && nullen} style="--f: {FARBEN[s]}">
          {n ?? (nullen ? 0 : '')}
        </td>
      {/each}
    </tr>
  </tbody>
</table>

<style>
  .tafel-stw {
    border-collapse: separate;
    border-spacing: 4px;
    justify-self: center;
    font-variant-numeric: tabular-nums;
  }
  th {
    background: var(--f);
    color: #fff;
    font-weight: 900;
    font-size: 1.05rem;
    border-radius: 8px 8px 0 0;
    padding: 4px 8px;
    min-width: 2.4rem;
  }
  abbr {
    text-decoration: none;
  }
  td {
    border: 3px solid var(--f);
    background: #fff;
    border-radius: 0 0 8px 8px;
    height: 2.6rem;
    text-align: center;
    font-weight: 900;
    font-size: 1.5rem;
    color: var(--tinte);
    transition: background 0.3s;
  }
  td.null {
    color: var(--markise);
  }
  td.hervor {
    background: #fff3c4;
    box-shadow: 0 0 0 3px var(--senf);
  }
  td.zuviel {
    background: #ffe2e6;
  }
</style>
