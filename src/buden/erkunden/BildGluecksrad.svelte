<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Glücksrad: ein Rad mit farbigen Feldern (dreht sich zur Begrüßung einmal) oder drei Räder A, B, C
   * mit einer Strichliste daneben.
   */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const FARBE = ['#e23a4e', '#3c78d8', '#f2c41b', '#3fae6a'];
  const NAME = ['rot', 'blau', 'gelb', 'grün'];
  const raeder = $derived(((d.raeder as number[][] | undefined) ?? [(d.felder as number[] | undefined) ?? []]).filter((r) => r.length));
  const striche = $derived(d.striche as [number, number] | undefined);
  const einzeln = $derived(raeder.length === 1);

  function feldPfad(i: number, n: number, r = 46): string {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const p = (a: number) => `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
    return `M50,50 L${p(a0)} A${r},${r} 0 ${n === 1 ? 1 : 0} 1 ${p(a1)} Z`;
  }
  const zaehle = (r: number[]) => FARBE.map((_, f) => r.filter((x) => x === f).length);
  const beschreibe = (r: number[]) =>
    zaehle(r)
      .map((n, f) => (n ? `${n} ${NAME[f]}` : ''))
      .filter(Boolean)
      .join(', ');
  /** Strichliste: Fünferbündel. */
  const buendel = (n: number) => ({ fuenfer: Math.floor(n / 5), rest: n % 5 });
</script>

<figure class="raeder" class:einzeln aria-label={raeder.map((r, i) => `${einzeln ? 'Glücksrad' : `Rad ${'ABC'[i]}`}: ${beschreibe(r)}`).join('. ')}>
  <div class="reihe">
    {#each raeder as r, i (i)}
      <div class="rad">
        <svg viewBox="0 -8 100 112" role="img" aria-hidden="true">
          <g class="scheibe" class:dreht={einzeln}>
            {#each r as f, j (j)}
              <path d={feldPfad(j, r.length)} fill={FARBE[f]} stroke="#fff" stroke-width="1.5" />
            {/each}
            <circle cx="50" cy="50" r="46" fill="none" stroke="#1f2a6b" stroke-width="3" />
          </g>
          <circle cx="50" cy="50" r="6" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2.5" />
          <polygon points="43,-6 57,-6 50,10" fill="#1f2a6b" />
        </svg>
        {#if !einzeln}<strong>Rad {'ABC'[i]}</strong>{/if}
      </div>
    {/each}
  </div>
  {#if striche}
    <table class="strichliste">
      <tbody>
        {#each striche as n, f (f)}
          {@const b = buendel(n)}
          <tr>
            <th style="color: {FARBE[f]}">{NAME[f]}</th>
            <td aria-label="{n} Striche">
              {#each Array.from({ length: b.fuenfer }) as _, k (k)}<span class="fuenf">||||</span>{/each}{#if b.rest}<span class="rest">{'|'.repeat(b.rest)}</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</figure>

<style>
  .raeder {
    margin: 0;
    display: grid;
    gap: 8px;
    justify-items: center;
  }
  .reihe {
    display: flex;
    gap: 10px;
    justify-content: center;
    width: 100%;
  }
  .rad {
    flex: 1 1 0;
    max-width: 8rem;
    text-align: center;
  }
  .einzeln .rad {
    max-width: 14rem;
  }
  svg {
    width: 100%;
    overflow: visible;
  }
  .scheibe {
    transform-origin: 50px 50px;
  }
  .scheibe.dreht {
    animation: drehen 1.6s cubic-bezier(0.2, 0.7, 0.2, 1) 1;
  }
  @keyframes drehen {
    from {
      transform: rotate(-540deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .scheibe.dreht {
      animation: none;
    }
  }
  .strichliste {
    border-collapse: collapse;
    font-size: 1.1rem;
  }
  th {
    text-align: left;
    padding: 2px 10px 2px 0;
  }
  td {
    letter-spacing: 1px;
    font-weight: 900;
    color: #1f2a6b;
  }
  .fuenf {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    margin-right: 8px;
  }
</style>
