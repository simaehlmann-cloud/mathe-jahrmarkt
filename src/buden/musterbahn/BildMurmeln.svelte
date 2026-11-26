<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Murmel-Labor: eine Tüte mit Murmeln oder zwei Tüten (rot/blau) zum Vergleichen.
   * Nach der Antwort wird 20-mal gezogen (die Murmel kommt jedes Mal zurück) und als Strichliste notiert.
   * Echter Zufall: Kommt einmal etwas anderes heraus als meistens, sagt das Bild das auch.
   */
  let {
    aufgabe,
    zustand,
    reduziert = false,
  }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null; reduziert?: boolean } = $props();
  const ZUEGE = 20;
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const FARBE = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2c41b'];
  const NAME = ['rot', 'blau', 'grün', 'gelb'];
  const tueten = $derived.by((): { titel: string; anzahl: number[] }[] => {
    const t = d.tueten as [number, number][] | undefined;
    if (t) return t.map(([r, b], i) => ({ titel: i === 0 ? 'Tüte A' : 'Tüte B', anzahl: [r, b, 0, 0] }));
    return [{ titel: '', anzahl: (d.anzahl as number[] | undefined) ?? [] }];
  });
  const kugeln = (anzahl: number[]): number[] => anzahl.flatMap((n, f) => Array<number>(n).fill(f));

  /** Gezogene Farben je Tüte (in Zugreihenfolge) und wie viele davon schon gezeigt sind. */
  let zuege = $state<number[][]>([]);
  let gezeigt = $state(0);
  $effect(() => {
    if (zustand === '') {
      zuege = [];
      gezeigt = 0;
      return;
    }
    zuege = tueten.map((t) => {
      const k = kugeln(t.anzahl);
      return Array.from({ length: ZUEGE }, () => k[Math.floor(Math.random() * k.length)] ?? 0);
    });
    if (reduziert) {
      gezeigt = ZUEGE;
      return;
    }
    gezeigt = 0;
    const t = setInterval(() => {
      if (gezeigt >= ZUEGE) clearInterval(t);
      else gezeigt++;
    }, 65);
    return () => clearInterval(t);
  });
  const zaehle = (z: number[], f: number): number => z.slice(0, gezeigt).filter((x) => x === f).length;
  /** Was bei vielen Zügen meistens herauskommt, und ob es diesmal auch so war. */
  const hinweis = $derived.by(() => {
    if (gezeigt < ZUEGE || !zuege.length) return '';
    if (tueten.length === 2) {
      const [a, b] = tueten.map((t) => t.anzahl[0]! / Math.max(1, t.anzahl[0]! + t.anzahl[1]!));
      const [ra, rb] = zuege.map((z) => zaehle(z, 0));
      const besser = (a ?? 0) > (b ?? 0) ? 0 : 1;
      const diesmal = (ra ?? 0) === (rb ?? 0) ? -1 : (ra ?? 0) > (rb ?? 0) ? 0 : 1;
      return diesmal === besser ? '' : `Zufall! Diesmal war es anders – bei vielen Zügen kommt aus Tüte ${besser ? 'B' : 'A'} öfter Rot.`;
    }
    const anzahl = tueten[0]?.anzahl ?? [];
    const max = Math.max(...anzahl);
    if (anzahl.filter((n) => n > 0).length < 2 || anzahl.filter((n) => n === max).length > 1) return '';
    const meist = anzahl.indexOf(max);
    const z = zuege[0] ?? [];
    const top = Math.max(...anzahl.map((_, f) => zaehle(z, f)));
    return zaehle(z, meist) === top ? '' : `Zufall! Diesmal kam ${NAME[meist]} nicht am häufigsten – bei vielen Zügen meistens schon.`;
  });
</script>

<div class="tueten">
  {#each tueten as t, ti (t.titel)}
    <figure aria-label="{t.titel} {t.anzahl.map((n, i) => (n ? `${n} ${NAME[i]}` : '')).filter(Boolean).join(', ')}">
      <div class="tuete">
        {#each kugeln(t.anzahl) as f, i (i)}<span style="background: {FARBE[f]}"></span>{/each}
      </div>
      {#if zuege.length}
        {@const z = zuege[ti] ?? []}
        <div class="liste" aria-label="{ZUEGE}-mal gezogen: {t.anzahl.map((n, f) => (n ? `${NAME[f]} ${zaehle(z, f)}-mal` : '')).filter(Boolean).join(', ')}">
          {#each t.anzahl as n, f (f)}
            {#if n || zaehle(z, f)}
              <div class="zeile">
                <span class="kugel" style="background: {FARBE[f]}"></span>
                <span class="striche">
                  {#each Array.from({ length: Math.ceil(zaehle(z, f) / 5) }, (_, g) => g) as g (g)}
                    {@const im = Math.min(5, zaehle(z, f) - g * 5)}
                    <span class="gruppe" class:voll={im === 5}>{#each Array(Math.min(4, im)) as _, k (k)}<i></i>{/each}</span>
                  {/each}
                </span>
                <b>{zaehle(z, f)}</b>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
      <figcaption>
        {#if t.titel}<strong>{t.titel}</strong><br />{/if}
        {#each t.anzahl as n, i (i)}{#if n}<em style="--f: {FARBE[i]}">{n} {NAME[i]}</em>{/if}{/each}
      </figcaption>
    </figure>
  {/each}
</div>
{#if zuege.length}
  <p class="gezogen">{gezeigt < ZUEGE ? `Ziehen … ${gezeigt} von ${ZUEGE}` : `${ZUEGE}-mal gezogen, die Murmel kam jedes Mal zurück.`}{#if hinweis}<br /><strong>{hinweis}</strong>{/if}</p>
{/if}

<style>
  .liste {
    margin-top: 6px;
    display: grid;
    gap: 3px;
    justify-items: start;
    min-width: 11rem;
  }
  .zeile {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
  }
  .kugel {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--tinte);
  }
  .striche {
    display: flex;
    gap: 6px;
    min-width: 7.5rem;
  }
  .gruppe {
    position: relative;
    display: flex;
    gap: 3px;
  }
  .gruppe i {
    width: 2.5px;
    height: 18px;
    background: var(--tinte);
    border-radius: 2px;
  }
  /* Der fünfte Strich geht quer durch */
  .gruppe.voll::after {
    content: '';
    position: absolute;
    left: -3px;
    right: -3px;
    top: 8px;
    height: 2.5px;
    background: var(--tinte);
    transform: rotate(-28deg);
  }
  .zeile b {
    min-width: 1.4rem;
    font-weight: 900;
  }
  .gezogen {
    margin: 6px 0 0;
    text-align: center;
    font-weight: 700;
    font-size: 0.95rem;
  }
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
