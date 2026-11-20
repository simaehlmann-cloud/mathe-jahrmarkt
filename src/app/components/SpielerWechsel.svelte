<script lang="ts">
  import Figur from '../grafik/Figur.svelte';
  import { app, RUNDE_LAEUFT } from '../zustand.svelte';

  /**
   * Spieler wechseln (seit 0.14): alle Profile als Figuren, ein Tipp wechselt direkt.
   * Mitten in einer Runde wird erst nachgefragt. Nach einer Pause erscheint dasselbe als „Wer spielt jetzt?“.
   */
  const profile = $derived(app.bestand.profile);
  const aktiv = $derived(app.bestand.aktiv);
  const pause = $derived(app.wechsel === 'pause');
  /** Ausgewähltes anderes Kind, solange die Rückfrage zur laufenden Runde offen ist. */
  let rueckfrage = $state<{ id: string; name: string } | null>(null);
  const runde = $derived(RUNDE_LAEUFT.has(app.bildschirm.name));
  const imSpiel = $derived(app.bildschirm.name === 'spiel');

  function waehle(id: string, name: string) {
    if (id === aktiv) {
      app.wechsel = null;
      return;
    }
    if (runde && !rueckfrage) {
      rueckfrage = { id, name };
      return;
    }
    app.wechsleZu(id);
  }
  function schliessen() {
    rueckfrage = null;
    app.wechsel = null;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="schleier" onclick={(e) => e.target === e.currentTarget && schliessen()}>
  <div class="karte" role="dialog" aria-modal="true" aria-labelledby="wechsel-titel">
    <div class="markise"></div>
    {#if rueckfrage}
      <div class="inhalt">
        <h2 id="wechsel-titel">Runde abbrechen und wechseln?</h2>
        <p>{imSpiel ? 'Deine Runde wird gemerkt – du kannst sie später weiterspielen.' : 'Diese Runde zählt dann nicht.'} Danach spielt {rueckfrage.name}.</p>
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => (rueckfrage = null)}>Weiterspielen</button>
          <button class="ticket" onclick={() => rueckfrage && app.wechsleZu(rueckfrage.id)}>Ja, wechseln</button>
        </div>
      </div>
    {:else}
      <div class="inhalt">
        <h2 id="wechsel-titel">{pause ? 'Wer spielt jetzt?' : 'Spieler wechseln'}</h2>
        <div class="liste">
          {#each profile as q (q.id)}
            <button class="spieler" class:aktiv={q.id === aktiv} onclick={() => waehle(q.id, q.name)} aria-label={q.id === aktiv ? `${q.name} spielt gerade` : `${q.name} spielt jetzt`}>
              <Figur figur={q.figur} aussehen={q.aussehen} groesse={64} />
              <strong>{q.name}</strong>
              {#if q.id === aktiv}<small>spielt gerade</small>{/if}
            </button>
          {/each}
        </div>
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => { app.wechsel = null; app.zeige({ name: 'start' }); }}>Neuer Spieler</button>
          <button class="ticket" onclick={schliessen}>{pause ? 'Ich spiele weiter' : 'Schließen'}</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .schleier {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    background: rgb(31 42 107 / 0.45);
  }
  .karte {
    width: min(100%, 34rem);
    background: var(--papier, #fffdf7);
    border: 3px solid var(--tinte);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 6px 0 var(--tinte);
  }
  .inhalt {
    display: grid;
    gap: 12px;
    padding: 16px 20px 18px;
  }
  h2 {
    font-size: 1.5rem;
    margin: 0;
  }
  p {
    margin: 0;
    font-weight: 700;
    line-height: 1.4;
  }
  .liste {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 10px;
  }
  .spieler {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 10px 8px;
    border: 3px solid var(--tinte);
    border-radius: 16px;
    background: #fff;
    color: var(--tinte);
    font: inherit;
    cursor: pointer;
    min-height: 44px;
  }
  .spieler strong {
    font-size: 1.1rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .spieler.aktiv {
    background: #fff6d6;
  }
  .spieler small {
    font-weight: 700;
    color: var(--tinte-weich);
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
