<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Murmel-Labor: eine Tüte mit Murmeln oder zwei Tüten (rot/blau) zum Vergleichen. */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const FARBE = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2c41b'];
  const NAME = ['rot', 'blau', 'grün', 'gelb'];
  const tueten = $derived.by((): { titel: string; anzahl: number[] }[] => {
    const t = d.tueten as [number, number][] | undefined;
    if (t) return t.map(([r, b], i) => ({ titel: i === 0 ? 'Tüte A' : 'Tüte B', anzahl: [r, b, 0, 0] }));
    return [{ titel: '', anzahl: (d.anzahl as number[] | undefined) ?? [] }];
  });
  const kugeln = (anzahl: number[]): number[] => anzahl.flatMap((n, f) => Array<number>(n).fill(f));
</script>

<div class="tueten">
  {#each tueten as t (t.titel)}
    <figure aria-label="{t.titel} {t.anzahl.map((n, i) => (n ? `${n} ${NAME[i]}` : '')).filter(Boolean).join(', ')}">
      <div class="tuete">
        {#each kugeln(t.anzahl) as f, i (i)}<span style="background: {FARBE[f]}"></span>{/each}
      </div>
      <figcaption>
        {#if t.titel}<strong>{t.titel}</strong><br />{/if}
        {#each t.anzahl as n, i (i)}{#if n}<em style="--f: {FARBE[i]}">{n} {NAME[i]}</em>{/if}{/each}
      </figcaption>
    </figure>
  {/each}
</div>

<style>
  .tueten {
    display: flex;
    gap: 18px;
    justify-content: center;
    flex-wrap: wrap;
  }
  figure {
    margin: 0;
    text-align: center;
  }
  .tuete {
    width: 11rem;
    min-height: 8rem;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-end;
    justify-content: center;
    gap: 4px;
    padding: 18px 10px 10px;
    background: #f6e7c8;
    border: 3px solid var(--tinte);
    border-radius: 14px 14px 40px 40px;
  }
  .tuete span {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--tinte);
    box-shadow: inset -4px -4px 0 rgb(0 0 0 / 0.18);
  }
  figcaption {
    margin-top: 6px;
    font-weight: 800;
  }
  em {
    font-style: normal;
    margin: 0 4px;
    border-bottom: 4px solid var(--f);
  }
</style>
