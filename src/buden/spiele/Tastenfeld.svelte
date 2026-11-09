<script lang="ts">
  /**
   * Kompaktes Zahlenfeld für Spiel-Buden: Die Bude hält den Wert (`wert`, bindbar) und entscheidet, was „OK“ heißt.
   * Auch über die Tastatur bedienbar.
   */
  import { onMount } from 'svelte';
  let {
    wert = $bindable(''),
    gesperrt = false,
    maxStellen = 5,
    onok,
    okText = 'OK',
  }: { wert?: string; gesperrt?: boolean; maxStellen?: number; onok: () => void; okText?: string } = $props();

  function tippe(z: string) {
    if (gesperrt || wert.length >= maxStellen) return;
    wert = wert === '0' ? z : wert + z;
  }
  function loeschen() {
    if (!gesperrt) wert = wert.slice(0, -1);
  }
  function ok() {
    if (!gesperrt && wert.length > 0) onok();
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
</script>

<div class="tasten" role="group" aria-label="Zahlenfeld">
  {#each ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as z (z)}
    <button onclick={() => tippe(z)} disabled={gesperrt} aria-label="Ziffer {z}">{z}</button>
  {/each}
  <button class="leise" onclick={loeschen} disabled={gesperrt} aria-label="Löschen">⌫</button>
  <button onclick={() => tippe('0')} disabled={gesperrt} aria-label="Ziffer 0">0</button>
  <button class="ok" onclick={ok} disabled={gesperrt || wert.length === 0}>{okText}</button>
</div>

<style>
  .tasten {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    width: min(100%, 15rem);
  }
  button {
    min-height: 46px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 1.35rem;
    box-shadow: 0 3px 0 var(--tinte);
  }
  button:active:not([disabled]) {
    transform: translateY(2px);
    box-shadow: 0 1px 0 var(--tinte);
  }
  button[disabled] {
    opacity: 0.5;
  }
  .leise {
    background: #f1e4c8;
  }
  .ok {
    background: var(--wiese);
    color: #fff;
    font-size: 1.1rem;
  }
</style>
