<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import Icon from '../../app/components/Icon.svelte';
  import { app } from '../../app/zustand.svelte';
  import { createRng, randomSeed } from '../../domain/rng';

  /**
   * Gemeinsamer Ablauf der Hilfe nach Fehlern, wie in der Dartbude:
   * 1 zeigen, 2 hervorheben, 3 selbst lösen (Auswahl), 4 weiter zur ähnlichen Aufgabe.
   * Die Bude liefert Darstellung und Texte.
   */
  let {
    gewaehlt,
    loesung,
    frage,
    texte,
    inhalt,
    format = (n: number) => String(n),
    hinweisFalsch = 'Schau noch einmal genau hin.',
    kandidaten = [],
    onfertig,
  }: {
    gewaehlt: number;
    loesung: number;
    /** Frage in Schritt 3. */
    frage: string;
    /** Sprechtexte für die Schritte 1 bis 3. */
    texte: [string, string, string];
    inhalt: Snippet<[number]>;
    format?: (n: number) => string;
    hinweisFalsch?: string;
    /** Falsche Auswahlmöglichkeiten in Schritt 3; ohne Angabe nahe Zahlen. */
    kandidaten?: number[];
    onfertig: () => void;
  } = $props();

  let schritt = $state(1);
  let falschGetippt = $state<number | null>(null);
  const TITEL = ['Schauen wir genau hin', 'So geht es leichter', 'Jetzt du', 'Super!'];

  /** Drei Möglichkeiten: Lösung, die eigene falsche Antwort, dann Vorschläge der Bude oder nahe Zahlen. */
  const auswahl = $derived.by(() => {
    const rng = createRng(randomSeed());
    const wahl = new Set<number>([loesung]);
    if (gewaehlt !== loesung && gewaehlt > 0) wahl.add(gewaehlt);
    for (const x of kandidaten) if (wahl.size < 3 && x > 0) wahl.add(x);
    const stufe = 10 ** Math.max(0, String(loesung).length - 2);
    for (const d of [10, -10, 1, -1, 2]) {
      if (wahl.size >= 3) break;
      const x = loesung + d * stufe;
      if (x > 0) wahl.add(x);
    }
    return rng.shuffle([...wahl]);
  });

  const sprechtext = (s: number): string => (s <= 3 ? (texte[s - 1] ?? '') : 'Genau! Jetzt kommt eine ähnliche Aufgabe.');
  const sag = (erbeten = false) => app.sprich(sprechtext(schritt), erbeten);

  function weiter() {
    app.spieleKlang('tipp');
    schritt++;
    if (app.einstellungen.automatischVorlesen) sag();
  }

  function waehle(w: number) {
    if (w === loesung) {
      app.spieleKlang('richtig');
      falschGetippt = null;
      schritt = 4;
      if (app.einstellungen.automatischVorlesen) sag();
    } else {
      app.spieleKlang('fehler');
      falschGetippt = w;
    }
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

    {#if schritt === 3}
      <p class="frage">{frage}</p>
      <div class="auswahl">
        {#each auswahl as w (w)}
          <button class="ticket" class:wackeln={falschGetippt === w} onclick={() => waehle(w)}>{format(w)}</button>
        {/each}
      </div>
      {#if falschGetippt !== null}<p class="sanft">{hinweisFalsch}</p>{/if}
    {:else if schritt < 3}
      <button class="ticket weiter" onclick={weiter}>Weiter</button>
    {:else}
      <button class="ticket gruen weiter" onclick={onfertig}>Nochmal probieren</button>
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
  .frage {
    font-weight: 900;
    font-size: 1.45rem;
  }
  .auswahl {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .auswahl .ticket {
    font-size: 1.4rem;
    min-width: 90px;
  }
  .wackeln {
    animation: wackeln 0.4s;
    --farbe: #f1f2f7;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .sanft {
    text-align: center;
    font-size: 1rem;
  }
  .weiter {
    justify-self: end;
  }
</style>
