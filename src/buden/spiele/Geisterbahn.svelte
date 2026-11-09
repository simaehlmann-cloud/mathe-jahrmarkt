<script lang="ts">
  import { divisionsZeilen, type DivSchritt } from '../../domain/aufgaben/klasse5';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';
  import Tastenfeld from './Tastenfeld.svelte';

  /**
   * Geisterbahn: schriftliche Division Schritt für Schritt. Jede richtige Ziffer fährt den Wagen eine Station weiter
   * in den Tunnel und schreibt den Rechenschritt ins Heft. Bei „mit Rest“ kommt am Ende der Rest.
   * Eine falsche Ziffer wird als Ergebnis mit dieser Ziffer gewertet (dann kommt die Hilfe).
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let k = $state(0);
  let phase = $state<'ziffer' | 'rest' | 'probe'>('ziffer');
  let eingabe = $state('');
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const s = $derived((d.schritte as DivSchritt[] | undefined) ?? []);
  const teiler = $derived(Number(d.d ?? 1));
  const zahl = $derived(String(d.a ?? ''));
  const zeilen = $derived(phase === 'probe' ? [] : divisionsZeilen(s, k));
  const ergebnis = $derived(s.slice(0, k).map((x) => x.q).join(''));
  const fortschritt = $derived(phase === 'probe' ? 0 : (k + (phase === 'rest' ? 0.5 : 0)) / Math.max(1, s.length));

  export function zeige(neu: Aufgabe) {
    a = neu;
    k = 0;
    eingabe = '';
    zustand = '';
    phase = neu.art === 'auswahl' && neu.daten.frage === 'probe' ? 'probe' : 'ziffer';
  }
  export async function treffer() {
    zustand = 'richtig';
    k = s.length;
    kontext.klang('jubel');
    await warte(kontext.reduziert ? 500 : 1200);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(800);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function ok() {
    if (gesperrt || !a) return;
    const z = Number(eingabe);
    eingabe = '';
    if (phase === 'probe') {
      kontext.onAntwort(z);
      return;
    }
    const mitRest = d.frage === 'rest';
    if (phase === 'rest') {
      kontext.onAntwort(Number(ergebnis) * 10 + z);
      return;
    }
    const x = s[k];
    if (!x) return;
    if (z !== x.q) {
      // Falsche Ziffer: Ergebnis mit dieser Ziffer (die übrigen richtig) als Antwort werten
      const ziffern = s.map((y) => y.q);
      ziffern[k] = z;
      const falsch = Number(ziffern.join(''));
      kontext.onAntwort(mitRest ? falsch * 10 + Number(d.rest ?? 0) : falsch);
      return;
    }
    kontext.klang('pop');
    k++;
    if (k < s.length) return;
    if (mitRest) phase = 'rest';
    else kontext.onAntwort(Number(ergebnis));
  }
  /** Zeile als Zellen (Spalte −1 für das Minus), rechtsbündig bis `ende`. */
  const zellen = (text: string, ende: number, minus = false): string[] => {
    const z = Array<string>(zahl.length + 1).fill('');
    const start = ende - (text.length - 1);
    text.split('').forEach((c, i) => {
      if (start + i + 1 >= 0 && start + i + 1 <= zahl.length) z[start + i + 1] = c;
    });
    if (minus && start >= 0) z[start] = '−';
    return z;
  };
  const frage = $derived(
    phase === 'probe' ? `Welche Zahl war es? Mach die Probe: ${d.quotient ? (d.quotient as string[]).join('') : ''} · ${teiler} + ${d.rest}` : phase === 'rest' ? 'Welcher Rest bleibt übrig?' : `Wie oft passt ${teiler} in ${s[k]?.teil ?? ''}?`,
  );
</script>

{#if a}
  <div class="tunnel spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    <svg class="bahn" viewBox="0 0 320 60" aria-hidden="true">
      <path d="M0 48 H320" stroke="#8b8fa6" stroke-width="4" />
      {#each s as _, i (i)}<circle cx={30 + (i + 1) * (260 / Math.max(1, s.length))} cy="48" r="5" fill={i < k ? '#ffe57a' : '#4b4f8a'} />{/each}
      <g style="transform: translateX({10 + fortschritt * 250}px); transition: transform 0.5s">
        <rect x="0" y="22" width="44" height="22" rx="6" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" />
        <circle cx="10" cy="46" r="5" fill="#1f2a6b" /><circle cx="34" cy="46" r="5" fill="#1f2a6b" />
      </g>
      <g class="geist" style="transform: translateX({60 + fortschritt * 240}px)">
        <path d="M0 26 Q0 6 14 6 Q28 6 28 26 L28 36 L23 32 L18 36 L14 32 L9 36 L5 32 L0 36 Z" fill="#fff" opacity="0.9" />
        <circle cx="10" cy="18" r="2.5" fill="#1f2a6b" /><circle cx="19" cy="18" r="2.5" fill="#1f2a6b" />
      </g>
    </svg>

    <div class="heft" aria-label="Rechnung: {phase === 'probe' ? '?' : zahl} geteilt durch {teiler}">
      <div class="zeile">
        <span></span>
        {#if phase === 'probe' && zustand !== 'richtig'}<span class="frag breit">?</span>{:else}{#each zahl.split('') as c, i (i)}<span class:teil={phase === 'ziffer' && zustand === '' && k === 0 && i <= (s[0]?.ende ?? -1)}>{c}</span>{/each}{/if}
        <span class="rechts">&nbsp;: {teiler} = {#if phase === 'probe'}{(d.quotient as string[]).join('')} R {d.rest}{:else}<b>{ergebnis}</b>{#if zustand !== 'richtig' && phase === 'ziffer'}<b class="frag">?</b>{/if}{#if phase === 'rest'}<b> R </b><b class="frag">?</b>{/if}{/if}</span>
      </div>
      {#each zeilen as z, j (j)}
        <div class="zeile">
          {#each zellen(z.text, z.ende, z.minus) as c, i (i)}<span class:strich={z.minus && c !== '' && c !== '−'} class:teil={phase === 'ziffer' && zustand === '' && j === zeilen.length - 1 && c !== ''}>{c}</span>{/each}
        </div>
      {/each}
    </div>

    <p class="frage">{frage}</p>
    <div class="eingabe" aria-live="polite">{eingabe || '?'}</div>
    <Tastenfeld bind:wert={eingabe} {gesperrt} maxStellen={phase === 'probe' ? 4 : 1} onok={ok} />
  </div>
{/if}

<style>
  .tunnel {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 10px;
    background: radial-gradient(circle at 50% 20%, #4b4f8a, #1c1f45 75%);
    color: #fff;
  }
  .bahn {
    width: min(100%, 24rem);
  }
  .geist {
    transition: transform 0.6s;
    animation: schweben 1.6s ease-in-out infinite alternate;
  }
  @keyframes schweben {
    to {
      translate: 0 -5px;
    }
  }
  .heft {
    display: inline-grid;
    gap: 2px;
    padding: 10px 16px;
    background: #fffdf7 repeating-linear-gradient(0deg, transparent 0 29px, #cfe0f5 29px 30px);
    border: 3px solid #1f2a6b;
    border-radius: 10px;
    font-family: ui-monospace, 'Cascadia Mono', Menlo, monospace;
    font-weight: 800;
    font-size: clamp(1rem, 4.6vw, 1.3rem);
    color: #1f2a6b;
    max-width: 100%;
    overflow-x: auto;
  }
  .zeile {
    display: flex;
    align-items: baseline;
    height: 1.75rem;
  }
  .zeile span:not(.rechts) {
    width: 1.05em;
    text-align: center;
  }
  .zeile span.strich {
    border-bottom: 3px solid #1f2a6b;
  }
  .zeile span.breit {
    width: auto;
    padding: 0 0.3em;
  }
  .rechts {
    white-space: pre;
  }
  .teil {
    background: #fff4c2;
    border-radius: 4px;
  }
  .frag {
    color: #e23a4e;
  }
  .falsch .heft {
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
  .frage {
    margin: 0;
    font-weight: 900;
    font-size: 1.15rem;
    text-align: center;
  }
  .eingabe {
    min-width: 4rem;
    text-align: center;
    padding: 2px 12px;
    background: #fff;
    color: #1f2a6b;
    border: 3px solid #ffe57a;
    border-radius: 10px;
    font-size: 1.7rem;
    font-weight: 900;
  }
</style>
