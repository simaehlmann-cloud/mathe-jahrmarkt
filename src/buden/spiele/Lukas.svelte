<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import Wahlknoepfe from '../gemeinsam/Wahlknoepfe.svelte';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Hau den Lukas: Die Kraft am Regler einstellen (Ziehen an der Skala oder ▲▼), dann „Hau!“.
   * Der Puck fliegt genau so hoch, wie eingestellt. Treffer: die Glocke läutet.
   * Beim Vergleichen (Silber) wird der Spieler gewählt, der am höchsten gehauen hat.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let schritt = $state(0);
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  let fliegt = $state(false);
  let gewaehlt = $state<number | null>(null);
  let skala = $state<SVGSVGElement>();
  let zieht = false;
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const auswahl = $derived(a?.eingabe !== 'ziffern');
  const raster = $derived(Number(d.raster ?? 10));
  const von = $derived(Number(d.von ?? 0));
  const hundertstel = $derived(raster === 20);
  const H = 300;
  const y = (s: number): number => H - (s / raster) * H;
  // Antwortwert: Zehntel (von · 10 + Schritte) oder Hundertstel (Schritte · 5)
  const wert = $derived(hundertstel ? schritt * 5 : von * 10 + schritt);
  const anzeige = $derived(hundertstel ? `0,${String(schritt * 5).padStart(2, '0')}`.replace(/(,\d)0$/, '$1').replace('0,100', '1') : '');

  export function zeige(neu: Aufgabe) {
    a = neu;
    schritt = 0;
    zustand = '';
    fliegt = false;
    gewaehlt = null;
  }
  export async function treffer(w: number) {
    zustand = 'richtig';
    if (auswahl) gewaehlt = w;
    kontext.klang(auswahl ? 'jubel' : 'glocke');
    await warte(kontext.reduziert ? 500 : 1100);
  }
  export async function daneben(w: number) {
    zustand = 'falsch';
    if (auswahl) gewaehlt = w;
    kontext.klang('fehler');
    await warte(900);
    fliegt = false;
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function setzeAus(e: PointerEvent) {
    if (!skala) return;
    const r = skala.getBoundingClientRect();
    // Skala im SVG: y von 30 bis 330 bei Höhe viewBox 380
    const anteil = 1 - ((e.clientY - r.top) / r.height * 380 - 30) / H;
    schritt = Math.max(0, Math.min(raster, Math.round(anteil * raster)));
    zustand = '';
    fliegt = false;
  }
  function runter(e: PointerEvent) {
    if (gesperrt || auswahl) return;
    zieht = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setzeAus(e);
  }
  function bewege(e: PointerEvent) {
    if (zieht && !gesperrt) setzeAus(e);
  }
  function stufe(delta: number) {
    if (gesperrt) return;
    schritt = Math.max(0, Math.min(raster, schritt + delta));
    zustand = '';
    fliegt = false;
    kontext.klang('tipp');
  }
  function hau() {
    if (gesperrt || schritt === 0) return;
    fliegt = true;
    kontext.klang('wurf');
    setTimeout(() => kontext.onAntwort(wert), kontext.reduziert ? 0 : 650);
  }
</script>

{#if a}
  <div class="lukas spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    {#if auswahl}
      <p class="frage">Vier Kinder haben gehauen. Wer kam am höchsten?</p>
      <Wahlknoepfe aufgabe={a} {gesperrt} markiert={gewaehlt} richtig={zustand === 'richtig'} spalten={2} onwahl={(w) => !gesperrt && kontext.onAntwort(w)} />
    {:else}
      <div class="turm">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <svg bind:this={skala} viewBox="-90 0 200 380" onpointerdown={runter} onpointermove={bewege} onpointerup={() => (zieht = false)} onpointercancel={() => (zieht = false)} role="img" aria-label="Skala von {von} bis {von + 1}">
          <circle cx="0" cy="18" r="16" fill={zustand === 'richtig' ? '#ffe57a' : '#f2c41b'} stroke="#1f2a6b" stroke-width="3" class="glocke" />
          <rect x="-12" y="22" width="24" height={H + 16} rx="10" fill="#fff" stroke="#1f2a6b" stroke-width="3" />
          <g transform="translate(0 30)">
            {#each Array(raster + 1) as _, k (k)}
              {@const gross = hundertstel ? k % 2 === 0 : k % 5 === 0}
              <line x1={gross ? -24 : -14} x2="14" y1={y(k)} y2={y(k)} stroke="#1f2a6b" stroke-width={k % (raster / 2) === 0 ? 3.5 : gross ? 2.5 : 1.5} />
            {/each}
            <text x="-32" y={y(0) + 7} text-anchor="end" font-size="22" font-weight="900" fill="#fff">{von}</text>
            <text x="-32" y={y(raster) + 7} text-anchor="end" font-size="22" font-weight="900" fill="#fff">{von + 1}</text>
            <!-- Kraftregler: Pfeil rechts an der Skala -->
            <g transform="translate(0 {y(schritt)})" class="regler">
              <polygon points="18,0 40,-12 40,12" fill="#3c78d8" stroke="#1f2a6b" stroke-width="2.5" />
              <rect x="40" y="-14" width="52" height="28" rx="8" fill="#3c78d8" stroke="#1f2a6b" stroke-width="2.5" />
              <text x="66" y="7" text-anchor="middle" font-size="15" font-weight="900" fill="#fff">{hundertstel ? anzeige : 'Kraft'}</text>
            </g>
            <!-- Puck -->
            <rect x="-20" y="-8" width="40" height="16" rx="6" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" class="puck" style="transform: translateY({fliegt ? y(schritt) : y(0)}px)" />
          </g>
          <rect x="-44" y="352" width="88" height="22" rx="4" fill="#b8763f" stroke="#1f2a6b" stroke-width="3" />
        </svg>
        <div class="regler-knoepfe">
          <button onclick={() => stufe(1)} disabled={gesperrt} aria-label="Mehr Kraft">▲</button>
          <button onclick={() => stufe(-1)} disabled={gesperrt} aria-label="Weniger Kraft">▼</button>
        </div>
      </div>
      <p class="tipp">Zieh den blauen Regler auf die richtige Höhe. Dann: Hau!</p>
      <button class="ticket rot hau" onclick={hau} disabled={gesperrt || schritt === 0}>🔨 Hau!</button>
    {/if}
  </div>
{/if}

<style>
  .lukas {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 12px;
    background: linear-gradient(#2b2f5e, #4b4f8a 70%, #b8763f 70%);
    color: #fff;
  }
  .turm {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  svg {
    height: min(52vh, 24rem);
    touch-action: none;
    cursor: ns-resize;
  }
  .puck {
    transition: transform 0.6s cubic-bezier(0.2, 1.4, 0.4, 1);
  }
  .richtig .glocke {
    animation: laeuten 0.25s 4 alternate;
    transform-origin: 0 18px;
  }
  @keyframes laeuten {
    from {
      transform: rotate(-14deg);
    }
    to {
      transform: rotate(14deg);
    }
  }
  .falsch svg {
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
  .regler-knoepfe {
    display: grid;
    gap: 8px;
  }
  .regler-knoepfe button {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    border: 3px solid var(--tinte);
    background: var(--papier);
    color: var(--tinte);
    font-size: 1.4rem;
  }
  .tipp {
    margin: 0;
    font-size: 0.95rem;
    text-align: center;
  }
  .frage {
    margin: 0;
    font-weight: 900;
    font-size: 1.15rem;
    text-align: center;
  }
  .lukas :global(.wahlen) {
    width: min(100%, 24rem);
  }
</style>
