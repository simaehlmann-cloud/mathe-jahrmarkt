<script lang="ts">
  import type { Snippet } from 'svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';
  import Icon from './Icon.svelte';

  /** Kopfzeile mit Zurück, Titel, Figur, Talern, Mathe-Profil und Elternschloss. */
  let { titel, zurueck, mitte }: { titel?: string; zurueck?: () => void; mitte?: Snippet } = $props();
  let p = $derived(app.profil);
</script>

<header>
  <div class="links">
    {#if zurueck}
      <button class="rund" onclick={zurueck} aria-label="Zurück"><Icon name="zurueck" /></button>
    {/if}
    {#if titel}<h1>{titel}</h1>{/if}
    {@render mitte?.()}
  </div>
  <div class="rechts">
    {#if p}
      <button class="figur" onclick={() => app.zeige({ name: 'start' })} aria-label="Profil wechseln, angemeldet als {p.name}">
        <Figur figur={p.figur} groesse={40} aussehen={p.aussehen} />
        <span class="name">{p.name}</span>
      </button>
      <span class="taler" aria-label="{p.taler} Taler"><Icon name="taler" groesse={26} />{p.taler}</span>
      <button class="rund" onclick={() => app.zeige({ name: 'profil' })} aria-label="Mein Mathe-Profil"><Icon name="profil" /></button>
    {/if}
    <div class="ton" role="group" aria-label="Ton">
      <button
        class="schalter"
        class:an={app.einstellungen.musikAn}
        aria-pressed={app.einstellungen.musikAn}
        aria-label="Musik"
        onclick={() => app.aendereEinstellungen({ musikAn: !app.einstellungen.musikAn })}
      ><Icon name={app.einstellungen.musikAn ? 'musik' : 'musikAus'} groesse={20} /></button>
      <button
        class="schalter"
        class:an={app.einstellungen.stimmeAn}
        aria-pressed={app.einstellungen.stimmeAn}
        aria-label="Vorlesen"
        onclick={() => {
          const an = !app.einstellungen.stimmeAn;
          app.aendereEinstellungen({ stimmeAn: an });
          if (an) app.sprich('Hallo! Ich lese dir jetzt vor.');
          else void app.sprache.stopp();
        }}
      ><Icon name={app.einstellungen.stimmeAn ? 'laut' : 'stumm'} groesse={20} /></button>
    </div>
    <button class="rund schloss" onclick={() => app.zeige({ name: 'eltern' })} aria-label="Elternbereich"><Icon name="schloss" groesse={20} /></button>
  </div>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: var(--oben) var(--rand-r) 8px var(--rand);
    position: relative;
    z-index: 5;
  }
  .links,
  .rechts {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .links {
    flex: 1;
  }
  .rechts {
    flex: none;
  }
  h1 {
    font-size: clamp(1.3rem, 4.5vw, 1.9rem);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .figur {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    padding: 2px 4px;
    border-radius: 24px;
  }
  .name {
    font-weight: 900;
    max-width: 7.5em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .taler {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 900;
    font-size: 1.15rem;
    background: var(--papier);
    border-radius: 20px;
    padding: 4px 12px 4px 6px;
    border: 3px solid var(--tinte);
    min-height: 40px;
  }
  .ton {
    display: flex;
    border: 3px solid var(--tinte);
    border-radius: 22px;
    background: var(--papier);
    overflow: hidden;
    flex: none;
  }
  .schalter {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: var(--tinte);
    opacity: 0.55;
    padding: 0;
  }
  .schalter + .schalter {
    border-left: 2px solid var(--tinte);
  }
  .schalter.an {
    opacity: 1;
    background: var(--senf);
  }
  .schloss {
    width: 40px;
    height: 40px;
    opacity: 0.85;
  }
  @media (max-width: 520px) {
    .name {
      display: none;
    }
  }
  @media (max-width: 430px) {
    header {
      gap: 6px;
    }
    .links,
    .rechts {
      gap: 6px;
    }
    .figur :global(svg) {
      width: 32px;
      height: 32px;
    }
    .rechts :global(.rund) {
      width: 40px;
      height: 40px;
    }
    .schalter {
      width: 34px;
      height: 36px;
    }
    .taler {
      font-size: 1rem;
      padding: 2px 8px 2px 4px;
    }
  }
</style>
