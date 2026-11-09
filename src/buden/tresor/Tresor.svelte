<script lang="ts">
  import type { Aufgabe, TresorAufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Zahlenrätsel-Tresor: Hinweiskarten links, das Zahlenschloss rechts. Jedes Rädchen lässt sich
   * mit ▲ und ▼ drehen. „Öffnen“ probiert den Code.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<TresorAufgabe | undefined>();
  let raeder = $state<number[]>([]);
  let gesperrt = $state(true);
  let zustand = $state<'' | 'offen' | 'falsch'>('');
  let abgehakt = $state<boolean[]>([]);

  export function zeige(neu: Aufgabe) {
    if (neu.art !== 'tresor') return;
    a = neu;
    raeder = Array.from({ length: neu.stellen }, () => 0);
    abgehakt = neu.hinweise.map(() => false);
    zustand = '';
  }
  export async function treffer() {
    zustand = 'offen';
    kontext.klang('jubel');
    await warte(1100);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
    zustand = '';
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }

  function drehe(i: number, d: number) {
    if (gesperrt) return;
    const r = [...raeder];
    r[i] = ((r[i] ?? 0) + d + 10) % 10;
    raeder = r;
    kontext.klang('tipp');
  }
  function oeffnen() {
    if (gesperrt) return;
    kontext.onAntwort(Number(raeder.join('')));
  }
</script>

{#if a}
  <div class="raum">
    <section class="hinweise" aria-label="Hinweise">
      <h3>{a.form === 'kombinatorik' ? 'Rätsel' : 'Hinweise'}</h3>
      <ul>
        {#each a.hinweise as h, i (i)}
          <li>
            <button class="karte" class:erledigt={abgehakt[i]} onclick={() => (abgehakt = abgehakt.map((x, j) => (j === i ? !x : x)))} aria-pressed={abgehakt[i]}>
              <span class="haken" aria-hidden="true">{abgehakt[i] ? '✓' : i + 1}</span>{h}
            </button>
          </li>
        {/each}
      </ul>
      <p class="tipp">Tipp: Hinweise abhaken, die du schon benutzt hast.</p>
    </section>

    <section class="tresor" class:offen={zustand === 'offen'} class:falsch={zustand === 'falsch'} aria-label="Zahlenschloss">
      <div class="tuer">
        <div class="lampe" aria-hidden="true"></div>
        <div class="raeder">
          {#each raeder as r, i (i)}
            <div class="rad">
              <button onclick={() => drehe(i, 1)} aria-label="Rad {i + 1} höher" disabled={gesperrt}>▲</button>
              <output aria-label="Rad {i + 1}" aria-live="polite">{r}</output>
              <button onclick={() => drehe(i, -1)} aria-label="Rad {i + 1} tiefer" disabled={gesperrt}>▼</button>
            </div>
          {/each}
        </div>
        <button class="ticket" onclick={oeffnen} disabled={gesperrt}>Öffnen</button>
      </div>
      <div class="schatz" aria-hidden="true"><span class="muenze">★</span></div>
    </section>
  </div>
{/if}

<style>
  .raum {
    min-height: 100%;
    display: grid;
    gap: 12px;
    padding: 12px;
    align-content: center;
    background: linear-gradient(#3b3f5c, #2a2d45);
  }
  @media (orientation: landscape) and (min-width: 640px) {
    .raum {
      grid-template-columns: 1fr auto;
      align-items: center;
    }
  }
  .hinweise h3 {
    color: #ffe57a;
    margin: 0 0 6px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .karte {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: baseline;
    text-align: left;
    background: #fff8e6;
    border: 3px solid #b9763f;
    border-radius: 10px;
    padding: 6px 10px;
    font: inherit;
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--tinte);
  }
  .karte.erledigt {
    opacity: 0.55;
  }
  .haken {
    flex: none;
    font-weight: 900;
    color: var(--markise);
    min-width: 1.2em;
  }
  .tipp {
    color: #d7dae6;
    font-size: 0.9rem;
    margin: 6px 0 0;
  }
  .tresor {
    position: relative;
    justify-self: center;
    perspective: 800px;
  }
  .tuer {
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 18px 22px;
    background: linear-gradient(145deg, #9aa0b8, #6b7190);
    border: 5px solid var(--tinte);
    border-radius: 18px;
    transform-origin: left center;
    transition: transform 0.9s ease;
  }
  .offen .tuer {
    transform: rotateY(-75deg);
  }
  .falsch .tuer {
    animation: wackeln 0.4s;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .schatz {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: #1d1f33;
    border-radius: 18px;
  }
  .muenze {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--senf);
    border: 4px solid #c58a10;
    color: #fff;
    font-size: 2rem;
  }
  .lampe {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #d7dae6;
    border: 2px solid var(--tinte);
  }
  .falsch .lampe {
    background: var(--markise);
  }
  .offen .lampe {
    background: var(--wiese);
  }
  .raeder {
    display: flex;
    gap: 8px;
  }
  .rad {
    display: grid;
    gap: 4px;
    justify-items: center;
  }
  .rad button {
    width: 54px;
    height: 40px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #f1e6cf;
    font-size: 1.1rem;
    color: var(--tinte);
  }
  .rad output {
    width: 54px;
    height: 64px;
    display: grid;
    place-items: center;
    background: #1f2a6b;
    color: #fff;
    font-weight: 900;
    font-size: 2.4rem;
    border-radius: 10px;
    font-variant-numeric: tabular-nums;
  }
</style>
