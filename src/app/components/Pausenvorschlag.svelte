<script lang="ts">
  import { onMount } from 'svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import { app } from '../zustand.svelte';
  import Icon from './Icon.svelte';
  import { minutenHeute, pausenText } from '../../domain/spielzeit';
  import { tagKennung } from '../../domain/auftraege';

  /** Spielzeit-Erinnerung: freundlich, ohne Sperre. Erscheint nie mitten in einer Runde. */
  const p = app.profil;
  const sz = p?.spielzeit;
  const minuten = sz ? minutenHeute(sz, tagKennung(new Date())) : 0;
  const text = pausenText(p?.name ?? 'Hey', minuten, sz?.nachschlag ?? 0);

  onMount(() => {
    if (app.einstellungen.automatischVorlesen) app.sprich(text);
  });
</script>

<div class="schleier">
  <div class="karte" role="alertdialog" aria-modal="true" aria-labelledby="pause-titel" aria-describedby="pause-text">
    <div class="markise"></div>
    <div class="inhalt">
      <div class="flinka"><Flinka groesse={104} winkt /></div>
      <div>
        <h2 id="pause-titel">Pausenzeit!</h2>
        <p id="pause-text">{text}</p>
      </div>
    </div>
    <div class="knoepfe">
      <button class="rund" onclick={() => app.sprich(text, true)} aria-label="Vorlesen"><Icon name="laut" /></button>
      <button class="ticket hell" onclick={() => app.pauseVerschieben()}>Noch 5 Minuten</button>
      <button class="ticket" onclick={() => void app.pauseMachen()}>Pause machen</button>
    </div>
  </div>
</div>

<style>
  .schleier {
    position: fixed;
    inset: 0;
    z-index: 50;
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
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 16px 20px 4px;
  }
  .flinka {
    flex: none;
  }
  h2 {
    font-size: 1.5rem;
    margin-bottom: 4px;
  }
  p {
    font-weight: 700;
    line-height: 1.4;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    padding: 12px 20px 18px;
  }
  @media (max-width: 30rem) {
    .inhalt {
      flex-direction: column;
      text-align: center;
    }
  }
</style>
