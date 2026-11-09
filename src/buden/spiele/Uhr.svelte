<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Uhr-Karussell: Die Zeiger selbst stellen. Ziehen am langen Zeiger stellt die Minuten (über die 12 hinaus
   * läuft die Stunde mit), Ziehen am kurzen Zeiger die Stunde. Knöpfe für ±5 min und ±1 h (auch für die Tastatur).
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  /** Minuten auf dem 12-Stunden-Zifferblatt, 0 bis 719 (0 = 12:00). */
  let t = $state(0);
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  let zieht = $state<'minute' | 'stunde' | null>(null);
  let svg = $state<SVGSVGElement>();
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const raster = $derived(Number(d.raster ?? 5));
  const R = 120;

  export function zeige(neu: Aufgabe) {
    a = neu;
    const start = neu.art === 'auswahl' && typeof neu.daten.start === 'number' ? neu.daten.start : 0;
    t = ((start % 720) + 720) % 720;
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

  const norm = (x: number): number => ((x % 720) + 720) % 720;
  function winkel(e: PointerEvent): number {
    if (!svg) return 0;
    const r = svg.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  }
  function runter(e: PointerEvent) {
    if (gesperrt) return;
    const w = winkel(e);
    const wMin = ((t % 60) * 6) % 360;
    const wStd = ((t / 60) * 30) % 360;
    const abstand = (x: number, y: number): number => Math.min(Math.abs(x - y), 360 - Math.abs(x - y));
    // Näher am kurzen Zeiger und nah an der Mitte → Stunde, sonst Minute
    const r = svg?.getBoundingClientRect();
    const naheMitte = r ? Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width * 0.27 : false;
    zieht = abstand(w, wStd) < abstand(w, wMin) && naheMitte ? 'stunde' : 'minute';
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    bewege(e);
  }
  function bewege(e: PointerEvent) {
    if (!zieht || gesperrt) return;
    const w = winkel(e);
    zustand = '';
    if (zieht === 'minute') {
      const m = (Math.round(w / 6 / raster) * raster) % 60;
      const alt = t % 60;
      let h = Math.floor(t / 60);
      if (m - alt < -30) h++;
      else if (m - alt > 30) h--;
      t = norm(h * 60 + m);
    } else {
      const h = Math.round(w / 30) % 12;
      t = norm(h * 60 + (t % 60));
    }
  }
  function los() {
    zieht = null;
  }
  function schritt(min: number) {
    if (gesperrt) return;
    t = norm(t + min);
    zustand = '';
    kontext.klang('tipp');
  }
  function fertig() {
    if (gesperrt || !a) return;
    // Die analoge Uhr kennt kein Vormittag/Nachmittag: in dieselbe Tageshälfte wie die Lösung legen
    kontext.onAntwort(t + Math.floor(a.antwort / 720) * 720);
  }
  const zeiger = (grad: number, laenge: number): string => {
    const r = (grad * Math.PI) / 180;
    return `M0 0 L${Math.sin(r) * laenge} ${-Math.cos(r) * laenge}`;
  };
</script>

{#if a}
  <div class="karussell spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    {#if typeof d.start === 'number'}
      <p class="fahrplan"><span>Abfahrt <b>{Math.floor((d.start as number) / 60) % 24}:{String((d.start as number) % 60).padStart(2, '0')} Uhr</b></span><span>Fahrt <b>{d.dauer} min</b></span></p>
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      bind:this={svg}
      viewBox="-140 -140 280 280"
      class="uhr"
      class:zieht={zieht !== null}
      onpointerdown={runter}
      onpointermove={bewege}
      onpointerup={los}
      onpointercancel={los}
      role="img"
      aria-label="Uhr mit Zeigern zum Stellen"
    >
      <circle r={R + 12} fill="#e23a4e" stroke="#1f2a6b" stroke-width="5" />
      <circle r={R} fill="#fffdf7" stroke="#1f2a6b" stroke-width="3" />
      {#each Array(60) as _, i (i)}
        {@const w = (i * 6 * Math.PI) / 180}
        <line x1={Math.sin(w) * (i % 5 ? R - 8 : R - 14)} y1={-Math.cos(w) * (i % 5 ? R - 8 : R - 14)} x2={Math.sin(w) * (R - 2)} y2={-Math.cos(w) * (R - 2)} stroke="#1f2a6b" stroke-width={i % 5 ? 1.5 : 3.5} />
      {/each}
      {#each Array(12) as _, i (i)}
        {@const w = ((i + 1) * 30 * Math.PI) / 180}
        <text x={Math.sin(w) * (R - 32)} y={-Math.cos(w) * (R - 32) + 8} text-anchor="middle" font-size="22" font-weight="900" fill="#1f2a6b">{i + 1}</text>
      {/each}
      <path d={zeiger((t / 60) * 30, R * 0.5)} stroke="#1f2a6b" stroke-width="11" stroke-linecap="round" class="stunde" />
      <path d={zeiger((t % 60) * 6, R * 0.82)} stroke="#3c78d8" stroke-width="7" stroke-linecap="round" class="minute" />
      <circle r="9" fill="#ffc62b" stroke="#1f2a6b" stroke-width="3" />
    </svg>
    <div class="knoepfe" role="group" aria-label="Zeiger stellen">
      <button onclick={() => schritt(-60)} disabled={gesperrt} aria-label="Eine Stunde zurück">−1 h</button>
      <button onclick={() => schritt(-raster)} disabled={gesperrt} aria-label="{raster} Minuten zurück">−{raster} min</button>
      <button onclick={() => schritt(raster)} disabled={gesperrt} aria-label="{raster} Minuten vor">+{raster} min</button>
      <button onclick={() => schritt(60)} disabled={gesperrt} aria-label="Eine Stunde vor">+1 h</button>
    </div>
    <p class="tipp">Zieh am langen Zeiger für die Minuten, am kurzen für die Stunde.</p>
    <button class="ticket gruen" onclick={fertig} disabled={gesperrt}>Fertig</button>
  </div>
{/if}

<style>
  .karussell {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 12px;
    background: radial-gradient(circle at 50% 35%, #fff4cc, #e8f4ee 70%);
  }
  .uhr {
    width: min(78vw, 42vh, 19rem);
    touch-action: none;
    cursor: grab;
  }
  .uhr.zieht {
    cursor: grabbing;
  }
  .richtig .uhr {
    animation: drehen 0.9s ease-in-out;
  }
  .falsch .uhr {
    animation: wackeln 0.4s;
  }
  @keyframes drehen {
    50% {
      transform: scale(1.06) rotate(-4deg);
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
  .knoepfe {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    width: min(100%, 22rem);
  }
  .knoepfe button {
    min-height: 44px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .fahrplan {
    display: flex;
    gap: 14px;
    margin: 0;
    padding: 6px 14px;
    background: #fff;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    font-size: 1.05rem;
  }
  .tipp {
    margin: 0;
    font-size: 0.9rem;
    text-align: center;
  }
</style>
