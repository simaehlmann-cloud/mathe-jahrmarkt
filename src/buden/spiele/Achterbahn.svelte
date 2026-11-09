<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Achterbahn-Architekt: Schienenstücke aus dem Lager legen, bis die Bahn genau das Ziel erreicht.
   * Die Bahn wächst maßstäblich mit (Schätzen hilft), die Länge in Zahlen rechnet das Kind selbst.
   * Bei der Rundbahn (Umfang) läuft die Schiene um das Rechteck.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let gelegt = $state<number[]>([]);
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const stuecke = $derived((d.stuecke as number[] | undefined) ?? [10, 5, 1]);
  const ziel = $derived(Number(d.ziel ?? 100));
  const gebaut = $derived(Number(d.gebaut ?? 0));
  const rechteck = $derived(d.rechteck === true);
  const teile = $derived((d.teile as number[] | undefined) ?? []);
  const cm = $derived(d.anzeige === 'mcm');
  // Schon gebaute Stücke einzeln zeigen (ohne das gesuchte letzte Stück)
  const fertigeTeile = $derived(rechteck ? [] : teile.slice(0, -1));
  const summe = $derived(gelegt.reduce((s, x) => s + x, 0));
  const laenge = (v: number): string => (cm ? (v >= 100 ? `${v / 100} m` : `${v} cm`) : `${v} m`);
  // Anteil der Strecke für die Zeichnung (über das Ziel hinaus bis 130 %)
  const anteil = (v: number): number => Math.min(1.3, v / Math.max(1, ziel));

  export function zeige(neu: Aufgabe) {
    a = neu;
    gelegt = [];
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    await warte(kontext.reduziert ? 500 : 1400);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(800);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function lege(v: number) {
    if (gesperrt || gelegt.length >= 40) return;
    gelegt = [...gelegt, v];
    zustand = '';
    kontext.klang('pop');
  }
  function weg(i: number) {
    if (gesperrt) return;
    gelegt = gelegt.filter((_, j) => j !== i);
    zustand = '';
  }
  function testfahrt() {
    if (!gesperrt && gelegt.length) kontext.onAntwort(summe);
  }
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2a31b', '#7b5ea7'];
  // Rechteck: 280 × 160 Pixel, Umfang 880
  const W = 280;
  const H = 160;
  const U = 2 * (W + H);
</script>

{#if a}
  <div class="bahnhof spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    {#if rechteck}
      <svg class="rund" viewBox="-30 -30 {W + 60} {H + 60}" role="img" aria-label="Rundbahn um ein Rechteck, {teile[0]} m lang und {teile[1]} m breit">
        <rect x="0" y="0" width={W} height={H} rx="8" fill="#cde9c1" stroke="#9cc78f" stroke-width="3" stroke-dasharray="6 6" />
        <text x={W / 2} y="-10" text-anchor="middle" font-size="18" font-weight="900" fill="#1f2a6b">{teile[0]} m</text>
        <text x={W + 10} y={H / 2 + 6} font-size="18" font-weight="900" fill="#1f2a6b">{teile[1]} m</text>
        <text x={W / 2} y={H + 24} text-anchor="middle" font-size="16" font-weight="700" fill="#4a5394">{teile[0]} m</text>
        <text x="-10" y={H / 2 + 6} text-anchor="end" font-size="16" font-weight="700" fill="#4a5394">{teile[1]} m</text>
        <rect x="0" y="0" width={W} height={H} rx="8" fill="none" stroke="#1f2a6b" stroke-width="10" stroke-dasharray="{Math.min(1, anteil(summe)) * U} {U}" pathLength={U} />
        <rect x="0" y="0" width={W} height={H} rx="8" fill="none" stroke="#ffc62b" stroke-width="4" stroke-dasharray="{Math.min(1, anteil(summe)) * U} {U}" pathLength={U} />
        {#if zustand === 'richtig'}<circle r="12" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" class="wagen-rund" />{/if}
      </svg>
    {:else}
      <div class="strecke" role="img" aria-label="Bahn: gebaut {laenge(gebaut)}, Ziel {laenge(ziel)}">
        <div class="ziel" style="left: 100%"><span>Ziel {laenge(ziel)}</span></div>
        {#each fertigeTeile as t, i (i)}
          {@const start = fertigeTeile.slice(0, i).reduce((x, y) => x + y, 0)}
          <div class="teil fertig" style="left: {anteil(start) * 100}%; width: {(anteil(start + t) - anteil(start)) * 100}%"><span class:unten={i % 2 === 1}>{laenge(t)}</span></div>
        {/each}
        {#each gelegt as v, i (i)}
          {@const start = gebaut + gelegt.slice(0, i).reduce((s, x) => s + x, 0)}
          <div class="teil neu" style="left: {anteil(start) * 100}%; width: {(anteil(start + v) - anteil(start)) * 100}%; --f: {FARBEN[i % FARBEN.length]}"></div>
        {/each}
        {#if zustand === 'richtig'}<div class="wagen" aria-hidden="true">🎢</div>{/if}
      </div>
    {/if}

    <div class="gelegt" aria-label="Gelegte Schienen: {gelegt.length ? gelegt.map(laenge).join(', ') : 'keine'}">
      {#if gelegt.length === 0}<span class="leer">Noch keine neuen Schienen</span>{/if}
      {#each gelegt as v, i (i)}<button class="schiene klein" onclick={() => weg(i)} disabled={gesperrt} aria-label="{laenge(v)} wieder wegnehmen">{laenge(v)}</button>{/each}
    </div>

    <div class="lager" role="group" aria-label="Schienenlager">
      {#each stuecke as v (v)}
        <button class="schiene" onclick={() => lege(v)} disabled={gesperrt} aria-label="Schiene {laenge(v)} legen">{laenge(v)}</button>
      {/each}
    </div>
    <button class="ticket gruen" onclick={testfahrt} disabled={gesperrt || gelegt.length === 0}>Testfahrt!</button>
  </div>
{/if}

<style>
  .bahnhof {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: linear-gradient(#cfeefe, #eaf7ff 60%, #cde9c1 60%);
  }
  .strecke {
    position: relative;
    width: min(100% - 50px, 30rem);
    height: 64px;
    margin: 30px 40px 6px 0;
    border-bottom: 6px solid #1f2a6b;
  }
  .ziel {
    position: absolute;
    bottom: -6px;
    height: 96px;
    border-left: 4px dashed #e23a4e;
  }
  .ziel span {
    position: absolute;
    top: -24px;
    left: -40px;
    white-space: nowrap;
    font-weight: 900;
    color: #e23a4e;
  }
  .teil {
    position: absolute;
    bottom: 0;
    height: 22px;
    border: 3px solid #1f2a6b;
    border-radius: 4px;
    background: repeating-linear-gradient(90deg, #b9763f 0 8px, #87521f 8px 10px);
  }
  .teil.fertig span {
    position: absolute;
    left: 2px;
    top: -26px;
    font-weight: 900;
    white-space: nowrap;
  }
  .teil.fertig span.unten {
    top: 26px;
  }
  .teil.neu {
    background: var(--f);
  }
  .falsch .strecke,
  .falsch .rund {
    animation: wackeln 0.4s;
  }
  .wagen {
    position: absolute;
    bottom: 18px;
    font-size: 2rem;
    animation: fahrt 1.2s ease-in-out forwards;
  }
  @keyframes fahrt {
    from {
      left: 0;
    }
    to {
      left: calc(100% - 30px);
    }
  }
  .rund {
    width: min(100%, 24rem);
    height: auto;
    aspect-ratio: 340 / 220;
  }
  .wagen-rund {
    offset-path: path('M8 0 H272 Q280 0 280 8 V152 Q280 160 272 160 H8 Q0 160 0 152 V8 Q0 0 8 0');
    animation: rund 1.3s linear forwards;
  }
  @keyframes rund {
    to {
      offset-distance: 100%;
    }
  }
  .gelegt,
  .lager {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    width: min(100%, 28rem);
  }
  .gelegt {
    min-height: 40px;
  }
  .leer {
    color: var(--tinte-weich);
    font-weight: 700;
  }
  .lager {
    padding: 8px;
    background: #3a3d4f;
    border-radius: 12px;
  }
  .schiene {
    min-width: 64px;
    min-height: 46px;
    padding: 4px 10px;
    border: 3px solid var(--tinte);
    border-radius: 8px;
    background: repeating-linear-gradient(90deg, #ffd98a 0 10px, #f2b705 10px 12px);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .schiene.klein {
    min-height: 36px;
    min-width: 48px;
    background: #fff;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>
