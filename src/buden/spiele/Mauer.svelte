<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';
  import Tastenfeld from './Tastenfeld.svelte';

  /**
   * Rechenmauer: Die leeren Steine Stein für Stein füllen (von unten nach oben). Mit „OK“ geht es zum nächsten Stein,
   * beim letzten Stein wird abgegeben. Jeder leere Stein kann zum Ändern angetippt werden.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let werte = $state<Record<string, string>>({});
  let aktiv = $state('');
  let eingabe = $state('');
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const zeilen = $derived((d.zeilen as (number | null)[][] | undefined) ?? []);
  const loesung = $derived((d.loesung as number[][] | undefined) ?? []);
  /** Leere Steine in Bau-Reihenfolge: Reihe für Reihe von unten, links nach rechts. */
  const leer = $derived(zeilen.flatMap((z, r) => z.map((v, s) => (v === null ? `${r}-${s}` : '')).filter(Boolean)));

  export function zeige(neu: Aufgabe) {
    a = neu;
    werte = {};
    zustand = '';
    const z = (neu.art === 'auswahl' ? (neu.daten.zeilen as (number | null)[][]) : []) ?? [];
    aktiv = z.flatMap((zeile, r) => zeile.map((v, s) => (v === null ? `${r}-${s}` : '')).filter(Boolean))[0] ?? '';
    eingabe = '';
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
  $effect(() => {
    // Getippte Zahl landet direkt im aktiven Stein
    if (aktiv) werte[aktiv] = eingabe;
  });
  function waehle(k: string) {
    if (gesperrt) return;
    aktiv = k;
    eingabe = werte[k] ?? '';
    zustand = '';
  }
  function ok() {
    if (gesperrt || !aktiv) return;
    kontext.klang('pop');
    const offen = leer.find((k) => !werte[k]);
    if (offen) {
      aktiv = offen;
      eingabe = '';
      return;
    }
    const letzter = leer[leer.length - 1];
    if (letzter) kontext.onAntwort(Number(werte[letzter]));
  }
  const B = 74;
  const H = 46;
  const breite = $derived((zeilen[0]?.length ?? 1) * B);
  const hoehe = $derived(zeilen.length * H);
</script>

{#if a}
  <div class="baustelle spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    <svg viewBox="-4 -4 {breite + 8} {hoehe + 8}" class="mauer" role="group" aria-label="Rechenmauer">
      {#each zeilen as zeile, r (r)}
        {#each zeile as v, s (s)}
          {@const k = `${r}-${s}`}
          {@const x = s * B + (r * B) / 2}
          {@const y = hoehe - (r + 1) * H}
          {#if v === null}
            <g
              class="stein leer"
              class:aktiv={aktiv === k && zustand !== 'richtig'}
              role="button"
              tabindex={gesperrt ? -1 : 0}
              aria-label="Leerer Stein, Reihe {r + 1}, {werte[k] ? `eingetragen ${werte[k]}` : 'noch leer'}"
              onclick={() => waehle(k)}
              onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), waehle(k))}
            >
              <rect {x} {y} width={B - 4} height={H - 4} rx="6" fill={zustand === 'richtig' ? '#c9f2d6' : werte[k] ? '#ffe7a8' : '#fff4c2'} stroke="#1f2a6b" stroke-width={aktiv === k ? 4.5 : 3} stroke-dasharray={werte[k] ? undefined : '7 5'} />
              <text x={x + (B - 4) / 2} y={y + H / 2 + 6} text-anchor="middle" font-size="22" font-weight="900" fill="#1f2a6b">{zustand === 'richtig' ? loesung[r]?.[s] : werte[k] || '?'}</text>
            </g>
          {:else}
            <g class="stein">
              <rect {x} {y} width={B - 4} height={H - 4} rx="6" fill="#f3d2b3" stroke="#1f2a6b" stroke-width="3" />
              <text x={x + (B - 4) / 2} y={y + H / 2 + 6} text-anchor="middle" font-size="22" font-weight="900" fill="#1f2a6b">{v}</text>
            </g>
          {/if}
        {/each}
      {/each}
    </svg>
    <p class="tipp">Tippe die Zahl für den markierten Stein. Jeder Stein = die zwei darunter zusammen.</p>
    <Tastenfeld bind:wert={eingabe} gesperrt={gesperrt || !aktiv} maxStellen={4} okText={leer.filter((k) => !werte[k]).length <= 1 && werte[aktiv] ? 'Fertig' : 'OK'} onok={ok} />
  </div>
{/if}

<style>
  .baustelle {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 10px;
    background: linear-gradient(#fff4cc, #fde8c2);
  }
  .mauer {
    width: min(100%, 22rem);
    max-height: 34vh;
  }
  .stein.leer {
    cursor: pointer;
    outline: none;
  }
  .stein.aktiv rect {
    filter: drop-shadow(0 0 4px #3c78d8);
  }
  .richtig .mauer {
    animation: hupf 0.6s ease-in-out;
  }
  .falsch .mauer {
    animation: wackeln 0.4s;
  }
  @keyframes hupf {
    50% {
      transform: translateY(-8px);
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
  .tipp {
    margin: 0;
    font-size: 0.9rem;
    text-align: center;
  }
</style>
