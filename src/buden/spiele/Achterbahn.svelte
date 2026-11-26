<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';
  import { BODEN, BREITE, HOEHE, bogen, profilFuer, punktBei, strecke, stueckPfad, stuetzen, tempo } from './achterbahnStrecke';

  /**
   * Achterbahn-Architekt: Schienenstücke aus dem Lager legen, bis die Bahn genau das Ziel erreicht.
   * Die Bahn wächst maßstäblich entlang einer echten Strecke mit Anstieg, Gefälle und Hügeln
   * (Bogenlänge im Verhältnis der Meter). Bei der Testfahrt fährt der Wagen so weit, wie Schiene liegt.
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
  // Gezeichnete Strecke (Form fest je Aufgabe) und Bogenlänge der fertigen bzw. neuen Stücke
  const st = $derived(strecke(profilFuer(ziel, gebaut)));
  const sEnde = $derived(Math.min(st.laengeGesamt, bogen(st, gebaut + summe, ziel)));
  const zielPunkt = $derived(punktBei(st, st.laengeZiel));
  /** Position des ersten Wagens auf der Schiene (Bogenlänge). */
  let wagenS = $state(6);
  let ruckeln = $state(0);
  let fahrt = 0;

  /** Wagen bis `bis` fahren lassen; bergab schneller. Ohne Bewegung (reduziert) springt er hin. */
  function fahre(bis: number): Promise<void> {
    const nr = ++fahrt;
    if (kontext.reduziert) {
      wagenS = bis;
      return warte(300);
    }
    return new Promise((fertig) => {
      let vorher = performance.now();
      const schritt = (jetzt: number) => {
        if (nr !== fahrt) return fertig();
        const dt = Math.min(50, jetzt - vorher);
        vorher = jetzt;
        wagenS = Math.min(bis, wagenS + tempo(st, wagenS) * dt * 1.6);
        if (wagenS >= bis) fertig();
        else requestAnimationFrame(schritt);
      };
      requestAnimationFrame(schritt);
    });
  }
  async function wackle() {
    if (kontext.reduziert) return;
    for (const r of [-4, 4, -3, 3, 0]) {
      ruckeln = r;
      await warte(70);
    }
  }

  export function zeige(neu: Aufgabe) {
    a = neu;
    gelegt = [];
    zustand = '';
    fahrt++;
    wagenS = 6;
    ruckeln = 0;
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    if (rechteck) await warte(kontext.reduziert ? 500 : 1400);
    else {
      await fahre(st.laengeZiel);
      await warte(400);
    }
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    if (rechteck) return warte(800);
    // Zu kurz: Der Wagen bleibt am Ende der Schiene stehen. Zu lang: Er hält am Ziel, der Rest ragt rot hinaus.
    await fahre(Math.min(sEnde, st.laengeZiel));
    await wackle();
    await warte(900);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function lege(v: number) {
    if (gesperrt || gelegt.length >= 40) return;
    gelegt = [...gelegt, v];
    zustand = '';
    wagenS = 6;
    kontext.klang('pop');
  }
  function weg(i: number) {
    if (gesperrt) return;
    gelegt = gelegt.filter((_, j) => j !== i);
    zustand = '';
    wagenS = 6;
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
      {@const w1 = punktBei(st, wagenS)}
      {@const w2 = punktBei(st, Math.max(0, wagenS - 22))}
      <svg class="bahn" viewBox="0 0 {BREITE} {HOEHE}" role="img" aria-label="Achterbahn: gebaut {laenge(gebaut + summe)}, Ziel {laenge(ziel)}">
        <rect x="0" y={BODEN} width={BREITE} height={HOEHE - BODEN} fill="#8fd18a" />
        <!-- So soll die Bahn verlaufen: gestrichelt bis zum Ziel -->
        <path d={stueckPfad(st, 0, st.laengeZiel)} fill="none" stroke="#9aa0b8" stroke-width="3" stroke-dasharray="6 6" />
        {#each stuetzen(st, 0, Math.min(sEnde, st.laengeGesamt)) as q, i (i)}
          <line x1={q.x} y1={q.y + 4} x2={q.x} y2={BODEN} stroke="#8a90a8" stroke-width="3" stroke-linecap="round" />
        {/each}
        <!-- Startbahnhof -->
        <rect x="6" y="148" width="44" height="22" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2.5" />
        <path d="M2 150 L28 134 L54 150 Z" fill="#3c78d8" stroke="#1f2a6b" stroke-width="2.5" stroke-linejoin="round" />
        <text x="28" y="128" text-anchor="middle" font-size="12" font-weight="900" fill="#1f2a6b" class="schrift-rand">Start</text>
        <rect x="0" y="170" width="60" height={BODEN - 170} fill="#c8a06a" stroke="#1f2a6b" stroke-width="2" />
        <!-- Zielbahnhof mit Fahne -->
        <rect x={zielPunkt.x - 20} y={zielPunkt.y} width="40" height={BODEN - zielPunkt.y} fill="#c8a06a" stroke="#1f2a6b" stroke-width="2" />
        <line x1={zielPunkt.x} y1={zielPunkt.y - 2} x2={zielPunkt.x} y2={zielPunkt.y - 58} stroke="#1f2a6b" stroke-width="3" />
        <path d="M{zielPunkt.x} {zielPunkt.y - 58} l26 8 l-26 8 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="2" stroke-linejoin="round" />
        <text x={zielPunkt.x} y={zielPunkt.y - 64} text-anchor="middle" font-size="14" font-weight="900" fill="#e23a4e" class="schrift-rand">Ziel {laenge(ziel)}</text>
        {#each fertigeTeile as t, i (i)}
          {@const von = bogen(st, fertigeTeile.slice(0, i).reduce((x, y) => x + y, 0), ziel)}
          {@const bis = von + bogen(st, t, ziel)}
          {@const mitte = punktBei(st, (von + bis) / 2)}
          {@const r = ((mitte.winkel - 90) * Math.PI) / 180}
          {@const seite = i % 2 ? -1 : 1}
          <path d={stueckPfad(st, von, bis)} fill="none" stroke="#87521f" stroke-width="9" />
          <path d={stueckPfad(st, von, bis)} fill="none" stroke="#f3dcb4" stroke-width="2" stroke-dasharray="3 5" />
          <text x={mitte.x + Math.cos(r) * 20 * seite} y={mitte.y + Math.sin(r) * 20 * seite + 5} text-anchor="middle" font-size="14" font-weight="900" fill="#1f2a6b" class="schrift-rand">{laenge(t)}</text>
        {/each}
        {#each gelegt as v, i (i)}
          {@const von = bogen(st, gebaut + gelegt.slice(0, i).reduce((x, y) => x + y, 0), ziel)}
          {@const bis = von + bogen(st, v, ziel)}
          <path d={stueckPfad(st, von, bis)} fill="none" stroke={FARBEN[i % FARBEN.length]} stroke-width="9" />
          <path d={stueckPfad(st, von, bis)} fill="none" stroke="#fffdf7" stroke-width="2" stroke-dasharray="3 5" />
        {/each}
        {#if zustand === 'falsch' && sEnde > st.laengeZiel + 0.5}
          <!-- Zu lang: Der Teil hinter dem Ziel leuchtet rot -->
          <path d={stueckPfad(st, st.laengeZiel, sEnde)} fill="none" stroke="#e23a4e" stroke-width="16" stroke-opacity="0.5" />
          <text x={(zielPunkt.x + punktBei(st, sEnde).x) / 2} y={zielPunkt.y + 20} text-anchor="middle" font-size="13" font-weight="900" fill="#e23a4e" class="schrift-rand">zu lang</text>
        {:else if zustand === 'falsch' && sEnde < st.laengeZiel - 0.5}
          {@const e = punktBei(st, sEnde)}
          <path d={stueckPfad(st, sEnde, st.laengeZiel)} fill="none" stroke="#e23a4e" stroke-width="5" stroke-dasharray="6 6" />
          <text x={(e.x + zielPunkt.x) / 2} y={Math.max(e.y, zielPunkt.y) + 24} text-anchor="middle" font-size="13" font-weight="900" fill="#e23a4e" class="schrift-rand">zu kurz</text>
        {/if}
        <!-- Zwei Wagen -->
        <g transform="translate({w2.x} {w2.y}) rotate({w2.winkel})">
          <rect x="-9" y="-13" width="18" height="10" rx="3" fill="#3c78d8" stroke="#1f2a6b" stroke-width="2" />
          <circle cx="-5" cy="-3" r="2.6" fill="#1f2a6b" /><circle cx="5" cy="-3" r="2.6" fill="#1f2a6b" />
        </g>
        <g transform="translate({w1.x + ruckeln} {w1.y}) rotate({w1.winkel})">
          <rect x="-10" y="-14" width="20" height="11" rx="4" fill="#ffc62b" stroke="#1f2a6b" stroke-width="2" />
          <circle cx="-5" cy="-3" r="2.6" fill="#1f2a6b" /><circle cx="5" cy="-3" r="2.6" fill="#1f2a6b" />
          <circle cx="2" cy="-17" r="4" fill="#f6c9a0" stroke="#1f2a6b" stroke-width="1.5" />
        </g>
      </svg>
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
  .bahn {
    width: min(100%, 34rem);
    height: auto;
    max-height: 44vh;
  }
  .schrift-rand {
    paint-order: stroke;
    stroke: #fffdf7;
    stroke-width: 4px;
    stroke-linejoin: round;
  }
  .falsch .rund {
    animation: wackeln 0.4s;
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
