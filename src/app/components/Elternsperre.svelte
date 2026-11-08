<script lang="ts">
  import { erzeugeSperrfrage, pruefeSperre } from '../../domain/elternsperre';
  import { createRng, randomSeed } from '../../domain/rng';

  /** Elternsperre: Frage in Worten, Antwort als Zahl. Lässt sich nicht abschalten. */
  let { onoffen, onabbrechen }: { onoffen: () => void; onabbrechen: () => void } = $props();

  const rng = createRng(randomSeed());
  let frage = $state(erzeugeSperrfrage(rng));
  let eingabe = $state('');
  let falsch = $state(false);

  function pruefen(e: SubmitEvent) {
    e.preventDefault();
    if (pruefeSperre(frage, eingabe)) {
      onoffen();
    } else {
      falsch = true;
      eingabe = '';
      frage = erzeugeSperrfrage(rng);
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
        aria-describedby={falsch ? 'sperre-fehler' : undefined}
      />
      {#if falsch}
        <p id="sperre-fehler" class="fehler">Das stimmt nicht. Hier ist eine neue Aufgabe.</p>
      {/if}
      <div class="knoepfe">
        <button type="button" class="ticket hell" onclick={onabbrechen}>Abbrechen</button>
        <button type="submit" class="ticket">Öffnen</button>
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
