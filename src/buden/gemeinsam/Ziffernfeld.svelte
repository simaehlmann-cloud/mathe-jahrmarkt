<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * Ziffernfeld für freie Eingabe (Kopfrechnen). Große Tasten, auch mit der Tastatur bedienbar.
   * Die Bude steuert es über die exportierten Funktionen.
   */
  let {
    onok,
    ontaste,
    maxStellen = 6,
  }: { onok: (wert: number) => void; ontaste?: () => void; maxStellen?: number } = $props();

  let eingabe = $state('');
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');

  export function leeren(): void {
    eingabe = '';
    zustand = '';
  }
  export function sperre(x: boolean): void {
    gesperrt = x;
  }
  export function zeigeErgebnis(richtig: boolean): void {
    zustand = richtig ? 'richtig' : 'falsch';
  }

  function tippe(z: string) {
    if (gesperrt) return;
    zustand = '';
    if (eingabe.length >= maxStellen) return;
    eingabe = eingabe === '0' ? z : eingabe + z;
    ontaste?.();
  }
  function loeschen() {
    if (gesperrt) return;
    zustand = '';
    eingabe = eingabe.slice(0, -1);
    ontaste?.();
  }
  function ok() {
    if (gesperrt || eingabe.length === 0) return;
    onok(Number(eingabe));
  }

  onMount(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) tippe(e.key);
      else if (e.key === 'Backspace') loeschen();
      else if (e.key === 'Enter') ok();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  });

  const TASTEN = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
</script>

<div class="feld" class:gesperrt>
  <output class="anzeige {zustand}" aria-live="polite" aria-label="Deine Eingabe">{eingabe || ' '}</output>
  <div class="tasten">
    {#each TASTEN as z (z)}
      <button type="button" onclick={() => tippe(z)}>{z}</button>
    {/each}
    <button type="button" class="neben" onclick={loeschen} aria-label="Letzte Ziffer löschen">⌫</button>
    <button type="button" onclick={() => tippe('0')}>0</button>
    <button type="button" class="ok" onclick={ok} disabled={eingabe.length === 0} aria-label="Fertig">OK</button>
  </div>
</div>

<style>
  .feld {
    display: grid;
    gap: 8px;
    width: 100%;
    max-width: 22rem;
    margin: 0 auto;
  }
  .anzeige {
    display: block;
    text-align: center;
    font-weight: 900;
    font-size: clamp(1.8rem, 7vh, 2.6rem);
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    background: #fff;
    border: 4px solid var(--tinte);
    border-radius: 14px;
    padding: 2px 10px;
    color: var(--tinte);
    transition: background 0.15s;
  }
  .anzeige.richtig {
    background: #c9f2d4;
  }
  .anzeige.falsch {
    background: #ffe2a8;
    animation: wackeln 0.35s;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .tasten {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }
  .tasten button {
    min-height: clamp(44px, 7.4vh, 64px);
    border: 3px solid var(--tinte);
    border-radius: 12px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: clamp(1.4rem, 4.6vh, 1.9rem);
    box-shadow: 0 4px 0 var(--tinte);
    touch-action: manipulation;
  }
  .tasten button:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 var(--tinte);
  }
  .tasten .neben {
    background: #f1e6cf;
  }
  .tasten .ok {
    background: var(--wiese);
    color: #fff;
  }
  .tasten .ok:disabled {
    opacity: 0.45;
  }
  .gesperrt .tasten button {
    opacity: 0.6;
  }
</style>
