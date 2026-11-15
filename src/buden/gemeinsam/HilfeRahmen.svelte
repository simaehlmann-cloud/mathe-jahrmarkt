<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Icon from '../../app/components/Icon.svelte';
  import { app } from '../../app/zustand.svelte';

  /**
   * Gemeinsamer Ablauf der Hilfe nach Fehlern: 1 zeigen, 2 Lösungsweg mit Lösung, dann direkt die ähnliche Aufgabe.
   * Seit 0.12 entfällt das erneute Antippen der eben gezeigten Lösung (das war nur Abschreiben);
   * die ähnliche Aufgabe mit neuen Zahlen prüft, ob es verstanden ist.
   * Die Bude liefert Darstellung und Texte; Schritt 3 der Inhalte wird nicht mehr gezeigt.
   */
  let {
    texte,
    inhalt,
    onfertig,
  }: {
    gewaehlt: number;
    loesung: number;
    /** Frage (früher Schritt 3, wird nicht mehr gezeigt). */
    frage: string;
    /** Sprechtexte für die Schritte 1 und 2 (der dritte wird nicht mehr genutzt). */
    texte: [string, string, string];
    inhalt: Snippet<[number]>;
    format?: (n: number) => string;
    hinweisFalsch?: string;
    kandidaten?: number[];
    onfertig: () => void;
  } = $props();

  let schritt = $state(1);
  const TITEL = ['Schauen wir genau hin', 'So geht es'];

  const sprechtext = (s: number): string => texte[s - 1] ?? '';
  const sag = (erbeten = false) => app.sprich(sprechtext(schritt), erbeten);

  function weiter() {
    app.spieleKlang('tipp');
    schritt++;
    if (app.einstellungen.automatischVorlesen) sag();
  }

  function fertig() {
    app.spieleKlang('tipp');
    void app.sprache.stopp();
    onfertig();
  }

  onMount(() => {
    if (app.einstellungen.automatischVorlesen) sag();
  });
</script>

<div class="hilfe tafel" role="dialog" aria-modal="true" aria-labelledby="hilfe-titel">
  <div class="markise"></div>
  <div class="inhalt">
    <div class="kopf">
      <h2 id="hilfe-titel">{TITEL[schritt - 1]}</h2>
      <button class="rund" onclick={() => sag(true)} aria-label="Vorlesen"><Icon name="laut" /></button>
    </div>

    {@render inhalt(schritt)}

    {#if schritt < 2}
      <button class="ticket weiter" onclick={weiter}>Weiter</button>
    {:else}
      <button class="ticket gruen weiter" onclick={fertig}>Ähnliche Aufgabe probieren</button>
    {/if}
  </div>
</div>

<style>
  .hilfe {
    width: min(100%, 34rem);
    max-height: 100%;
    overflow: auto;
  }
  .inhalt {
    padding: 12px 18px 18px;
    display: grid;
    gap: 12px;
  }
  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .inhalt :global(p) {
    font-size: 1.15rem;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .weiter {
    justify-self: end;
  }
</style>
