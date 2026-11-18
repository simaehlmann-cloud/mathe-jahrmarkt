<script lang="ts" module>
  // Über das Schließen hinaus merken: sonst ließe sich die Wartezeit durch Abbrechen umgehen.
  let fehlversuche = 0;
  let gesperrtBis = 0;
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { erzeugeSperrfrage, pruefeSperre, SPERRE_VERSUCHE, SPERRE_WARTEN_MS } from '../../domain/elternsperre';
  import { createRng, randomSeed } from '../../domain/rng';

  /** Elternsperre: Frage in Worten, Antwort als Zahl. Lässt sich nicht abschalten. */
  let { onoffen, onabbrechen }: { onoffen: () => void; onabbrechen: () => void } = $props();

  const rng = createRng(randomSeed());
  let frage = $state(erzeugeSperrfrage(rng));
  let eingabe = $state('');
  let falsch = $state(false);
  let jetzt = $state(Date.now());
  const uhr = setInterval(() => (jetzt = Date.now()), 1000);
  onDestroy(() => clearInterval(uhr));
  let warten = $derived(Math.max(0, Math.ceil((gesperrtBis - jetzt) / 1000)));

  function pruefen(e: SubmitEvent) {
    e.preventDefault();
    if (warten > 0) return;
    if (pruefeSperre(frage, eingabe)) {
      fehlversuche = 0;
      onoffen();
    } else {
      falsch = true;
      eingabe = '';
      frage = erzeugeSperrfrage(rng);
      fehlversuche++;
      if (fehlversuche >= SPERRE_VERSUCHE) {
        fehlversuche = 0;
        gesperrtBis = Date.now() + SPERRE_WARTEN_MS;
        jetzt = Date.now();
      }
    }
  }
</script>

<div class="huelle">
  <form class="tafel" onsubmit={pruefen}>
    <div class="markise"></div>
    <div class="inhalt">
      <h2>Nur für Erwachsene</h2>
      <p>Bitte lösen Sie diese Aufgabe, um fortzufahren.</p>
      <label for="sperre-eingabe" class="frage">{frage.frage}</label>
      <input
        id="sperre-eingabe"
        bind:value={eingabe}
        inputmode="numeric"
        autocomplete="off"
        pattern="[0-9]*"
        maxlength="5"
        aria-describedby={falsch || warten > 0 ? 'sperre-fehler' : undefined}
      />
      {#if warten > 0}
        <p id="sperre-fehler" class="fehler" role="status">Mehrmals falsch. Bitte {warten} Sekunden warten.</p>
      {:else if falsch}
        <p id="sperre-fehler" class="fehler">Das stimmt nicht. Hier ist eine neue Aufgabe.</p>
      {/if}
      <div class="knoepfe">
        <button type="button" class="ticket hell" onclick={onabbrechen}>Abbrechen</button>
        <button type="submit" class="ticket" disabled={warten > 0}>Öffnen</button>
      </div>
    </div>
  </form>
</div>

<style>
  .huelle {
    min-height: 100%;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    overflow: auto;
  }
  form {
    width: min(100%, 28rem);
  }
  .inhalt {
    padding: 18px 20px 20px;
    display: grid;
    gap: 10px;
  }
  .frage {
    font-weight: 900;
    font-size: 1.25rem;
    margin-top: 6px;
  }
  input {
    font: inherit;
    font-size: 1.6rem;
    font-weight: 900;
    padding: 10px 14px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    width: 100%;
    color: var(--tinte);
    user-select: text;
    -webkit-user-select: text;
  }
  .fehler {
    color: var(--markise-dunkel);
    font-weight: 800;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
    margin-top: 6px;
  }
</style>
