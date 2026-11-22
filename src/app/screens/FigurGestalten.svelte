<script lang="ts">
  import type { Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';
  import { SCHULE } from '../../ausgabe';

  let { von }: { von?: 'profil' | undefined } = $props();
  /** Zurück dorthin, woher man kam: Mathe-Profil oder Jahrmarkt (Menü, Startbildschirm). */
  const zurueckZiel = () => app.zeige(von === 'profil' ? { name: 'profil' } : { name: 'jahrmarkt' });
  const start = app.profil;
  let figur = $state<FigurId>(start?.figur ?? 'fuchs');
  let aussehen = $state<Aussehen>(start ? { ...start.aussehen } : { fell: 0, tuch: 'keins', extra: 'keins' });

  function speichern() {
    const f = figur;
    const a = $state.snapshot(aussehen);
    // Schulversion: Die Figur ist gestaltet, beim nächsten Anmelden geht es gleich auf den Jahrmarkt
    app.aendereProfil((p) => ({ ...p, figur: f, aussehen: a, ...(SCHULE ? { figurGewaehlt: true } : {}) }));
    app.spieleKlang('jubel');
    zurueckZiel();
  }
</script>

{#if start}
  <Kopfzeile titel="Figur gestalten" zurueck={() => zurueckZiel()} />
  <div class="seite">
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <Baukasten bind:figur bind:aussehen deko={start.deko} />
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => zurueckZiel()}>Abbrechen</button>
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
