<script lang="ts">
  import type { Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  const start = app.profil;
  let figur = $state<FigurId>(start?.figur ?? 'fuchs');
  let aussehen = $state<Aussehen>(start ? { ...start.aussehen } : { fell: 0, tuch: 'keins', extra: 'keins' });

  function speichern() {
    const f = figur;
    const a = $state.snapshot(aussehen);
    app.aendereProfil((p) => ({ ...p, figur: f, aussehen: a }));
    app.spieleKlang('jubel');
    app.zeige({ name: 'profil' });
  }
</script>

{#if start}
  <Kopfzeile titel="Figur gestalten" zurueck={() => app.zeige({ name: 'profil' })} />
  <div class="seite">
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <Baukasten bind:figur bind:aussehen deko={start.deko} />
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => app.zeige({ name: 'profil' })}>Abbrechen</button>
          <button class="ticket rot" onclick={speichern}>Speichern</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Feste Höhe: Vorschau oben, Auswahl blättert, Knöpfe unten immer sichtbar. */
  .seite {
    flex: 1;
    min-height: 0;
    padding: 4px var(--rand-r) calc(6px + var(--unten)) var(--rand);
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .karte {
    width: min(100%, 44rem);
    flex: 1;
    min-height: 0;
    /* clip statt hidden: Beim Antippen weiter unten darf nicht die ganze Tafel verrutschen */
    overflow: clip;
    display: flex;
    flex-direction: column;
  }
  .inhalt {
    flex: 1;
    min-height: 0;
    padding: 8px 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .knoepfe {
    flex: none;
    display: flex;
    gap: 10px;
  }
  .knoepfe .ticket {
    flex: 1;
  }
</style>
