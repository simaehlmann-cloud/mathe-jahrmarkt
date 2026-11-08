<script lang="ts">
  import { onMount } from 'svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import { app } from '../zustand.svelte';
  import Icon from './Icon.svelte';

  /**
   * Flinka spricht höchstens zwei kurze Sätze pro Blase.
   * Mehrere Blasen werden nacheinander gezeigt, jede lässt sich wegtippen.
   */
  let { saetze, onfertig }: { saetze: string[]; onfertig: () => void } = $props();
  let i = $state(0);
  let text = $derived(saetze[i] ?? '');

  function weiter() {
    app.spieleKlang('tipp');
    if (i < saetze.length - 1) {
      i++;
      if (app.einstellungen.automatischVorlesen) app.sprich(saetze[i] ?? '');
    } else {
      void app.sprache.stopp();
      onfertig();
    }
  }

  onMount(() => {
    if (app.einstellungen.automatischVorlesen) app.sprich(text);
  });
</script>

<div class="szene" role="dialog" aria-modal="false" aria-label="Flinka sagt">
  <div class="flinka"><Flinka groesse={110} /></div>
  <div class="blase">
    <p aria-live="polite">{text}</p>
    <div class="knoepfe">
      <button class="rund" onclick={() => app.sprich(text)} aria-label="Vorlesen"><Icon name="laut" /></button>
      <button class="ticket" onclick={weiter}>{i < saetze.length - 1 ? 'Weiter' : 'Los geht’s'}</button>
    </div>
  </div>
</div>

<style>
  .szene {
    position: absolute;
    left: var(--rand);
    right: var(--rand-r);
    bottom: var(--unten);
    display: flex;
    align-items: flex-end;
    gap: 8px;
    z-index: 20;
    pointer-events: none;
  }
  .flinka,
  .blase {
    pointer-events: auto;
  }
  .flinka {
    flex: none;
    animation: rein 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both;
  }
  .blase {
    position: relative;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 18px;
    padding: 14px 16px 12px;
    max-width: 34rem;
    margin-bottom: 40px;
    box-shadow: 0 6px 0 rgb(31 42 107 / 0.18);
    animation: rein 0.35s 0.1s ease-out both;
  }
  .blase::before {
    content: '';
    position: absolute;
    left: -14px;
    bottom: 22px;
    border: 12px solid transparent;
    border-right-color: var(--tinte);
  }
  p {
    font-size: 1.2rem;
    font-weight: 800;
    margin-bottom: 10px;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
  }
  @keyframes rein {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
</style>
