<script lang="ts">
  import Ueber from '../components/Ueber.svelte';
  import { app } from '../zustand.svelte';

  /**
   * „Über Mathe-Jahrmarkt“ ohne Elternsperre: Impressum und Datenschutz müssen leicht und unmittelbar erreichbar sein.
   * Alles ist Text in der App, es gibt keine Links nach außen (Kinder-Regeln der Stores).
   */
  let { abschnitt, von }: { abschnitt?: 'impressum' | 'datenschutz' | 'lizenzen' | undefined; von?: 'start' | undefined } = $props();
  const zurueck = () => app.zeige(von === 'start' || !app.profil ? { name: 'start' } : { name: 'jahrmarkt' });
</script>

<header class="leiste-oben">
  <button class="rund" onclick={zurueck} aria-label="Zurück">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 L8 12 L15 19" /></svg>
  </button>
  <h1>Über Mathe-Jahrmarkt</h1>
</header>
<div class="seite">
  <div class="tafel karte">
    <div class="inhalt"><Ueber start={abschnitt ?? null} /></div>
  </div>
</div>

<style>
  .leiste-oben {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--oben) var(--rand-r) 8px var(--rand);
    position: relative;
    z-index: 2;
  }
  h1 {
    font-size: 1.3rem;
    margin: 0;
  }
  .seite {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    display: grid;
    justify-items: center;
    align-content: start;
    position: relative;
    z-index: 1;
  }
  .karte {
    width: min(100%, 44rem);
  }
  .inhalt {
    padding: 8px 18px 18px;
  }
</style>
