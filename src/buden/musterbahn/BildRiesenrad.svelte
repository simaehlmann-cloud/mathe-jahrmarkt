<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Riesenrad-Techniker: Rad mit Gondeln (Plätze pro Gondel als Punkte) oder Preistabelle. */
  let { aufgabe, zustand, gewaehlt }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const tabelle = $derived(d.tabelle as [number, number][] | undefined);
  const gondeln = $derived(d.verdeckt === true && zustand !== 'richtig' ? 8 : Math.min(Number(d.gondeln ?? 8), 14));
  const pro = $derived(Number(d.pro ?? 4));
  // Division mit Rest: Nach der Antwort steigen die Kinder in so viele Gondeln, wie das Kind gesagt hat
  const kinder = $derived(Number(d.kinder ?? 0));
  const verteilen = $derived(d.verdeckt === true && zustand !== '' && gewaehlt !== null && kinder > 0);
  const anzahl = $derived(verteilen ? Math.max(1, Math.min(14, Math.round(gewaehlt ?? 1))) : gondeln);
  const besetzt = (i: number): number => (verteilen ? Math.max(0, Math.min(pro, kinder - i * pro)) : pro);
  const uebrig = $derived(verteilen ? Math.max(0, kinder - anzahl * pro) : 0);
  const verdeckt = $derived(d.verdeckt === true && zustand !== 'richtig' && !verteilen);
  const leer = $derived(verteilen ? Array.from({ length: anzahl }, (_, i) => besetzt(i)).filter((n) => n === 0).length : 0);
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
  <svg viewBox="-125 -125 250 {verteilen ? 310 : 270}" role="img" aria-label={verdeckt ? 'Riesenrad mit leeren Gondeln' : verteilen ? `${anzahl} Gondeln für ${kinder} Kinder${uebrig ? `, ${uebrig} Kinder passen nicht mehr hinein` : ''}` : `Riesenrad mit ${gondeln} Gondeln, je ${pro} Plätze`}>
    <path d="M-60 140 L0 0 L60 140" fill="none" stroke="#232a5c" stroke-width="7" />
    <circle r={R} fill="none" stroke="#232a5c" stroke-width="5" />
    {#each Array(anzahl) as _, i (i)}
      {@const w = (i / anzahl) * Math.PI * 2}
      {@const x = Math.cos(w) * R}
      {@const y = Math.sin(w) * R}
      <line x1="0" y1="0" x2={x} y2={y} stroke="#232a5c" stroke-width="2" />
      <g transform="translate({x} {y + 4})">
        <rect x="-15" y="0" width="30" height="20" rx="5" fill={FARBEN[i % 4]} stroke="#232a5c" stroke-width="2.5" />
        {#each Array(verdeckt ? 0 : besetzt(i)) as _, k (k)}<circle cx={-10 + (k % 4) * 6.7} cy={6 + Math.floor(k / 4) * 8} r="2.6" fill="#fff" />{/each}
      </g>
    {/each}
    <circle r="10" fill="#f2a31b" stroke="#232a5c" stroke-width="3" />
    {#if verteilen}
      {#if uebrig}
        <!-- Die Warteschlange: Diese Kinder haben keinen Platz mehr -->
        {#each Array(Math.min(uebrig, 10)) as _, k (k)}<circle cx={-((Math.min(uebrig, 10) - 1) * 9) + k * 18} cy="150" r="6" fill="#e23a4e" stroke="#232a5c" stroke-width="2" />{/each}
        <text x="0" y="178" text-anchor="middle" font-size="15" font-weight="900" fill="#b3122c">{uebrig} {uebrig === 1 ? 'Kind passt' : 'Kinder passen'} nicht mehr hinein</text>
      {:else if leer}
        <text x="0" y="170" text-anchor="middle" font-size="15" font-weight="900" fill="#b3122c">{leer} {leer === 1 ? 'Gondel bleibt' : 'Gondeln bleiben'} leer</text>
      {:else}
        <text x="0" y="170" text-anchor="middle" font-size="15" font-weight="900" fill="#2f7d47">Alle {kinder} Kinder fahren mit!</text>
      {/if}
    {/if}
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
