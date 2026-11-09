<script lang="ts">
  import { onDestroy } from 'svelte';
  import { KARTEN, gesammelt, type Sammelkarte, type Seltenheit } from '../../domain/belohnungen';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import SammelkarteBild from '../grafik/Sammelkarte.svelte';
  import { app } from '../zustand.svelte';

  /** Sammelalbum: alle Karten, verdeckte mit Hinweis. Neue Karten werden aufgedeckt und dann als gesehen gemerkt. */
  let p = $derived(app.profil);
  const neuBeimOeffnen = new Set((app.profil ? KARTEN.filter((k) => k.hat(app.profil!) && !app.profil!.album.includes(k.id)) : []).map((k) => k.id));
  let filter = $state<'alle' | Seltenheit>('alle');
  let gezeigt = $state<Sammelkarte | null>(null);
  let liste = $derived(KARTEN.filter((k) => filter === 'alle' || k.seltenheit === filter));

  function merken() {
    const ids = [...neuBeimOeffnen];
    if (ids.length) app.aendereProfil((q) => ({ ...q, album: [...new Set([...q.album, ...ids])] }));
  }
  onDestroy(merken);
  if (neuBeimOeffnen.size) app.spieleKlang('karte');
</script>

{#if p}
  <Kopfzeile titel="Sammelalbum" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="album">
    <div class="kopf">
      <p class="zahl"><strong>{gesammelt(p)}</strong> von {KARTEN.length} Karten</p>
      <div class="filter" role="group" aria-label="Filter">
        {#each [['alle', 'Alle'], ['normal', 'Normal'], ['selten', 'Selten'], ['legendaer', 'Legendär']] as [id, name] (id)}
          <button class:an={filter === id} aria-pressed={filter === id} onclick={() => (filter = id as typeof filter)}>{name}</button>
        {/each}
      </div>
    </div>
    <div class="raster">
      {#each liste as k (k.id)}
        <button class="platz" onclick={() => (gezeigt = k)} aria-label="{k.hat(p) ? k.titel : 'Verdeckte Karte'}{neuBeimOeffnen.has(k.id) ? ', neu' : ''}">
          <SammelkarteBild karte={k} offen={k.hat(p)} neu={neuBeimOeffnen.has(k.id)} />
        </button>
      {/each}
    </div>
  </div>
  {#if gezeigt}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="ebene" onclick={() => (gezeigt = null)}>
      <div class="gross-karte" role="dialog" aria-modal="true" aria-label={gezeigt.hat(p) ? gezeigt.titel : 'Verdeckte Karte'}>
        <SammelkarteBild karte={gezeigt} offen={gezeigt.hat(p)} gross />
        <button class="ticket hell" onclick={() => (gezeigt = null)}>Schließen</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  .album {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .kopf {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
  .zahl {
    margin: 0;
    font-size: 1.1rem;
  }
  .filter {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .filter button {
    min-height: 40px;
    padding: 4px 12px;
    border: 3px solid var(--tinte);
    border-radius: 20px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 800;
  }
  .filter button.an {
    background: var(--tinte);
    color: #fff;
  }
  .raster {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 10px;
  }
  .platz {
    border: 0;
    padding: 0;
    background: none;
    font: inherit;
    color: inherit;
    text-align: inherit;
    perspective: 600px;
  }
  .ebene {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    background: rgb(31 42 107 / 0.55);
    padding: 16px;
  }
  .gross-karte {
    width: min(78vw, 17rem);
    display: grid;
    gap: 12px;
    justify-items: center;
  }
  .gross-karte :global(.karte) {
    width: 100%;
  }
</style>
