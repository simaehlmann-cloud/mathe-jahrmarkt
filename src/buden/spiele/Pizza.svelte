<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import Belag from '../sternenmarkt/Belag.svelte';
  import type { SzenenKontext } from '../typen';

  /**
   * Pizzabäckerei: Mit „Schneiden“ die Pizza in gleich große Stücke teilen, Stücke antippen zum Belegen,
   * dann „In den Ofen“. Antwort: Stückzahl · 100 + belegte Stücke.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let n = $state(1);
  let belegt = $state<Set<number>>(new Set());
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const R = 100;

  export function zeige(neu: Aufgabe) {
    a = neu;
    n = 1;
    belegt = new Set();
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    await warte(kontext.reduziert ? 500 : 1100);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function schneide(delta: number) {
    if (gesperrt) return;
    const neu = Math.max(1, Math.min(12, n + delta));
    if (neu === n) return;
    n = neu;
    belegt = new Set();
    zustand = '';
    kontext.klang('tipp');
  }
  function tippe(i: number) {
    if (gesperrt || n < 2) return;
    const s = new Set(belegt);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    belegt = s;
    zustand = '';
    kontext.klang('pop');
  }
  function backen() {
    if (gesperrt || n < 2 || belegt.size === 0) return;
    kontext.onAntwort(n * 100 + belegt.size);
  }
  const stueck = (i: number): string => {
    const w1 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const w2 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
    return `M0 0 L${Math.cos(w1) * R} ${Math.sin(w1) * R} A${R} ${R} 0 0 1 ${Math.cos(w2) * R} ${Math.sin(w2) * R} Z`;
  };
  const salami = (i: number): [number, number][] => {
    const w = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    const f = n > 8 ? [0.66] : n > 4 ? [0.68, 0.38] : [0.7, 0.45, 0.22];
    return f.map((r) => [Math.cos(w) * R * r, Math.sin(w) * R * r]);
  };
</script>

{#if a}
  <div class="baeckerei spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    <div class="bestellung">
      <span>Bestellung</span>
      {#if d.bestellung}
        {@const [z, m] = d.bestellung as [number, number]}
        <span class="bruch"><b>{z}</b><b>{m}</b></span>
        {#if d.stuecke}<small>in {d.stuecke} Stücken</small>{/if}
      {/if}
    </div>
    <svg viewBox="-115 -115 230 230" class="pizza" role="group" aria-label="Pizza mit {n} {n === 1 ? 'Stück' : 'Stücken'}, {belegt.size} belegt">
      <circle r={R + 10} fill="#e9b26a" stroke="#1f2a6b" stroke-width="4" />
      {#if n === 1}
        <circle r={R} fill="#f6e3b4" stroke="#1f2a6b" stroke-width="2.5" />
      {:else}
        {#each Array(n) as _, i (i)}
          <path
            d={stueck(i)}
            fill={belegt.has(i) ? '#f7d36b' : '#f6e3b4'}
            stroke="#1f2a6b"
            stroke-width="2.5"
            role="button"
            tabindex={gesperrt ? -1 : 0}
            aria-label="Stück {i + 1}{belegt.has(i) ? ', belegt' : ''}"
            aria-pressed={belegt.has(i)}
            onclick={() => tippe(i)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tippe(i))}
          />
          {#if belegt.has(i)}{#each salami(i) as [x, y], k (k)}<Belag art={String(d.belag ?? 'Salami')} {x} {y} r={n > 8 ? 6 : 9} />{/each}{/if}
        {/each}
      {/if}
    </svg>
    <div class="messer" role="group" aria-label="Schneiden">
      <button onclick={() => schneide(-1)} disabled={gesperrt || n <= 1} aria-label="Weniger Stücke">−</button>
      <span><b>{n}</b> {n === 1 ? 'Stück' : 'Stücke'}</span>
      <button onclick={() => schneide(1)} disabled={gesperrt || n >= 12} aria-label="Mehr Stücke">+</button>
    </div>
    <p class="tipp">{n < 2 ? 'Schneide zuerst mit + in gleich große Stücke.' : `Tippe Stücke an, um sie mit ${String(d.belag ?? 'Salami')} zu belegen.`}</p>
    <button class="ticket rot" onclick={backen} disabled={gesperrt || n < 2 || belegt.size === 0}>In den Ofen!</button>
  </div>
{/if}

<style>
  .baeckerei {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 12px;
    background: repeating-linear-gradient(45deg, #fff8e6 0 20px, #fbeed2 20px 40px);
  }
  .bestellung {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 14px;
    background: #fff;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    font-weight: 900;
  }
  .bruch {
    display: inline-grid;
    text-align: center;
    font-size: 1.4rem;
    line-height: 1.1;
  }
  .bruch b:first-child {
    border-bottom: 3px solid var(--tinte);
    padding: 0 4px;
  }
  .pizza {
    width: min(70vw, 36vh, 17rem);
  }
  .pizza path {
    cursor: pointer;
    outline: none;
  }
  .pizza path:focus-visible {
    stroke: #e23a4e;
    stroke-width: 5;
  }
  .richtig .pizza {
    animation: ofen 1s ease-in-out;
  }
  .falsch .pizza {
    animation: wackeln 0.4s;
  }
  @keyframes ofen {
    50% {
      transform: scale(1.08);
      filter: brightness(1.15) saturate(1.3);
    }
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .messer {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 1.2rem;
  }
  .messer button {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: var(--papier);
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--tinte);
  }
  .tipp {
    margin: 0;
    font-size: 0.95rem;
    text-align: center;
  }
</style>
