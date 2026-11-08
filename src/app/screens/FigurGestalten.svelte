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
  .seite {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    align-content: start;
  }
  .karte {
    width: min(100%, 44rem);
  }
  .inhalt {
    padding: 12px 16px 16px;
    display: grid;
    gap: 14px;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
