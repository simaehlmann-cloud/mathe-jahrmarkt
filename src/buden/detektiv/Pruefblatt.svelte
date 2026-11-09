<script lang="ts">
  import { STIMMT, kontrollUeberschlag } from '../../domain/aufgaben/detektiv';
  import { ziffer } from '../../domain/aufgaben/schriftlich';
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { Aufgabe, DetektivAufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Fehlerdetektiv: Eine fertige Rechnung liegt unter der Lupe. Erst überlegen „Kann das stimmen?“
   * (Überschlag auf Knopfdruck), dann entweder „Alles richtig“ oder die falsche Ergebnisziffer antippen.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<DetektivAufgabe | undefined>();
  let gesperrt = $state(true);
  let ueberschlag = $state(false);
  let markiert = $state<number | null>(null);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');

  const breite = $derived(a ? Math.max(String(a.gezeigt).length, ...a.zahlen.map((z) => String(z).length)) + 1 : 4);
  const spalten = $derived(Array.from({ length: breite }, (_, i) => breite - 1 - i));
  const u = $derived(a ? kontrollUeberschlag(a.op, a.zahlen[0] ?? 0, a.zahlen[1] ?? 0) : undefined);
  const zeigeZiffer = (n: number, s: number): string => (s < String(n).length ? String(ziffer(n, s)) : '');

  export function zeige(neu: Aufgabe) {
    if (neu.art !== 'detektiv') return;
    a = neu;
    ueberschlag = false;
    markiert = null;
    zustand = '';
  }
  export async function treffer(wert: number) {
    markiert = wert;
    zustand = 'richtig';
    kontext.klang('richtig');
    await warte(900);
  }
  export async function daneben(wert: number) {
    markiert = wert;
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  const waehle = (code: number) => {
    if (!gesperrt) kontext.onAntwort(code);
  };
</script>

{#if a}
  <div class="detektiv">
    <div class="lupe" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
      <div class="blatt" style="--n: {breite}">
        {#if a.op === '·'}
          <div class="zeile rechts"><span class="text">{zahlText(a.zahlen[0] ?? 0)} · {zahlText(a.zahlen[1] ?? 0)}</span></div>
        {:else}
          {#each a.zahlen as z, zi (zi)}
            <div class="zeile">
              {#each spalten as s (s)}<span class="k">{s === breite - 1 ? (zi === 1 ? a.op : '') : zeigeZiffer(z, s)}</span>{/each}
            </div>
          {/each}
        {/if}
        <div class="linie"></div>
        <div class="zeile">
          {#each spalten as s (s)}
            {#if s < String(a.gezeigt).length}
              <button
                class="k ziffer"
                class:markiert={markiert === s + 1}
                onclick={() => waehle(s + 1)}
                disabled={gesperrt}
                aria-label="Ziffer {ziffer(a.gezeigt, s)} an Stelle {s + 1} ist falsch"
              >
                {ziffer(a.gezeigt, s)}
                {#if zustand === 'richtig' && markiert === s + 1}<span class="korrektur">{ziffer(a.richtig, s)}</span>{/if}
              </button>
            {:else}
              <span class="k"></span>
            {/if}
          {/each}
        </div>
      </div>
      {#if zustand === 'richtig' && markiert === STIMMT}<div class="stempel">Geprüft ✓</div>{/if}
    </div>

    <div class="werkzeuge">
      <button class="ticket hell" onclick={() => (ueberschlag = !ueberschlag)} aria-expanded={ueberschlag}>Kann das stimmen? Überschlag</button>
      {#if ueberschlag && u}
        <p class="ueberschlag">
          ≈ {zahlText(u.a)} {a.op} {zahlText(u.b)} = <strong>{zahlText(u.ergebnis)}</strong>
        </p>
      {/if}
      <button class="ticket gruen" onclick={() => waehle(STIMMT)} disabled={gesperrt}>Alles richtig</button>
      <p class="tipp">Findest du einen Fehler? Tippe auf die falsche Ziffer im Ergebnis.</p>
    </div>
  </div>
{/if}

<style>
  .detektiv {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 14px;
    padding: 12px;
    background: radial-gradient(circle at 50% 35%, #fff8e6 0 40%, #f0ddb4 100%);
  }
  .lupe {
    position: relative;
    padding: 22px 26px;
    border: 10px solid #5b4b8a;
    border-radius: 50%;
    background: #fbfdff;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    box-shadow: 0 6px 0 rgb(31 42 107 / 0.25);
  }
  .lupe::after {
    content: '';
    position: absolute;
    right: -46px;
    bottom: -30px;
    width: 70px;
    height: 20px;
    background: #87521f;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    transform: rotate(40deg);
  }
  .falsch {
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
  .blatt {
    display: grid;
    gap: 2px;
    --k: clamp(28px, min(9vw, 6vh), 42px);
    font-variant-numeric: tabular-nums;
  }
  .zeile {
    display: flex;
    gap: 2px;
  }
  .zeile.rechts {
    justify-content: flex-end;
  }
  .text {
    font-weight: 900;
    font-size: calc(var(--k) * 0.62);
    color: var(--tinte);
  }
  .k {
    width: var(--k);
    height: var(--k);
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: calc(var(--k) * 0.62);
    color: var(--tinte);
    position: relative;
  }
  .ziffer {
    border: 2px solid transparent;
    border-radius: 50%;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 900;
    font-size: calc(var(--k) * 0.62);
    color: var(--tinte);
  }
  .ziffer:hover:not(:disabled) {
    border-color: #c9b8f0;
  }
  .ziffer.markiert {
    border-color: var(--markise);
    border-width: 3px;
  }
  .korrektur {
    position: absolute;
    top: -55%;
    font-size: 0.7em;
    color: var(--wiese);
  }
  .linie {
    height: 6px;
    background: linear-gradient(var(--tinte) 0 2px, transparent 2px 4px, var(--tinte) 4px);
  }
  .stempel {
    position: absolute;
    bottom: 12%;
    transform: rotate(-12deg);
    border: 3px solid var(--wiese);
    color: var(--wiese);
    font-weight: 900;
    padding: 2px 10px;
    border-radius: 8px;
    background: rgb(255 255 255 / 0.8);
  }
  .werkzeuge {
    display: grid;
    gap: 8px;
    justify-items: center;
  }
  .ueberschlag {
    margin: 0;
    font-size: 1.2rem;
    background: #fff;
    border: 2px dashed #5b4b8a;
    border-radius: 10px;
    padding: 4px 12px;
  }
  .tipp {
    margin: 0;
    font-size: 0.95rem;
    text-align: center;
  }
</style>
