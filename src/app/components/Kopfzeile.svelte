<script lang="ts">
  import type { Snippet } from 'svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app, type Bildschirm } from '../zustand.svelte';
  import { rang } from '../../domain/rang';
  import { neueKarten } from '../../domain/belohnungen';
  import Icon from './Icon.svelte';
  import { faellige } from '../../domain/fundbuero';

  /** Kopfzeile mit Zurück, Titel, Talern, Ton und dem Menü hinter der eigenen Figur. */
  let { titel, zurueck, mitte }: { titel?: string; zurueck?: () => void; mitte?: Snippet } = $props();
  let p = $derived(app.profil);
  let r = $derived(p ? rang(p) : null);
  let neu = $derived(p ? neueKarten(p).length : 0);
  let offen = $state(false);
  let fund = $derived(p ? faellige(p.fundbuero, Date.now()).length : 0);
  function gehe(b: Bildschirm) {
    offen = false;
    app.zeige(b);
  }
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
      <span class="taler" aria-label="{p.taler} Taler"><Icon name="taler" groesse={26} />{p.taler}</span>
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
    {#if p}
      <button class="menue-knopf" onclick={() => (offen = !offen)} aria-label={neu ? `Menü, ${neu} neue Sammelkarten` : 'Menü'} aria-expanded={offen} aria-haspopup="true">
        <Figur figur={p.figur} groesse={38} aussehen={p.aussehen} />
        <Icon name="menue" groesse={18} />
        {#if neu}<span class="marke" aria-hidden="true">{neu}</span>{/if}
      </button>
    {:else}
      <button class="rund schloss" onclick={() => app.zeige({ name: 'eltern' })} aria-label="Elternbereich"><Icon name="schloss" groesse={20} /></button>
    {/if}
  </div>
  {#if offen && p}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="menue-schleier" onclick={() => (offen = false)}></div>
    <nav class="menue" aria-label="Menü">
      <div class="wer">
        <Figur figur={p.figur} groesse={52} aussehen={p.aussehen} />
        <div>
          <strong>{p.name}</strong>
          <span class="rang"><Icon name="stern" groesse={16} /> {r?.name} · {r?.sterne} Sterne</span>
          {#if r?.naechster}<small>noch {r.fehlen} bis {r.naechster}</small>{/if}
        </div>
      </div>
      <button onclick={() => gehe({ name: 'profil' })}><Icon name="profil" groesse={22} />Mein Mathe-Profil</button>
      <button onclick={() => gehe({ name: 'album' })}><Icon name="album" groesse={22} />Sammelalbum{#if neu}<span class="punkt">{neu} neu</span>{/if}</button>
      <button onclick={() => gehe({ name: 'blitz' })}><Icon name="blitz" groesse={22} />Blitzrechnen</button>
      <button onclick={() => gehe({ name: 'duell' })}><Icon name="duell" groesse={22} />Geschwister-Duell</button>
      <button onclick={() => gehe({ name: 'ueber' })}><Icon name="info" groesse={22} />Über Mathe-Jahrmarkt</button>
      <button onclick={() => gehe({ name: 'knobel' })}><Icon name="raetsel" groesse={22} />Knobelzelt</button>
      <button onclick={() => gehe({ name: 'fundbuero' })}><Icon name="kiste" groesse={22} />Fundbüro{#if fund}<span class="punkt">{fund} zum Abholen</span>{/if}</button>
      <button onclick={() => gehe({ name: 'bauplatz' })}><Icon name="block" groesse={22} />Bauplatz</button>
      <button onclick={() => gehe({ name: 'insel' })}><Icon name="insel" groesse={22} />Bauinsel{#if !app.paket}<Icon name="schloss" groesse={16} />{/if}</button>
      <button onclick={() => gehe({ name: 'check' })}><Icon name="check" groesse={22} />Jahrmarkt-Check</button>
      <button onclick={() => gehe({ name: 'start' })}><Figur figur={p.figur} groesse={22} aussehen={p.aussehen} />Spieler wechseln</button>
      <button class="leise" onclick={() => gehe({ name: 'eltern' })}><Icon name="schloss" groesse={20} />Elternbereich</button>
    </nav>
  {/if}
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
  .menue-knopf {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 3px solid var(--tinte);
    background: var(--papier);
    color: var(--tinte);
    padding: 0 8px 0 2px;
    border-radius: 24px;
    min-height: 44px;
  }
  .menue-knopf {
    position: relative;
  }
  .marke {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 22px;
    height: 22px;
    padding: 0 5px;
    border-radius: 11px;
    background: var(--markise);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 900;
    display: grid;
    place-items: center;
    border: 2px solid #fff;
  }
  .punkt {
    margin-left: auto;
    padding: 1px 8px;
    border-radius: 10px;
    background: var(--markise);
    color: #fff;
    font-size: 0.8rem;
  }
  .menue-schleier {
    position: fixed;
    inset: 0;
    z-index: 40;
  }
  .menue {
    position: absolute;
    right: var(--rand-r);
    top: calc(100% - 2px);
    z-index: 41;
    width: min(20rem, calc(100vw - 32px));
    display: grid;
    gap: 4px;
    padding: 10px;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 18px;
    box-shadow: 0 6px 0 var(--tinte);
    /* Lange Menüs (quer gehaltenes Handy) dürfen blättern */
    max-height: calc(100dvh - 11rem - var(--oben, 0px));
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* Wenig Höhe: zwei Spalten, damit alles ohne Blättern sichtbar ist */
  @media (orientation: landscape) and (max-height: 54rem) and (min-width: 36rem) {
    .menue {
      grid-template-columns: 1fr 1fr;
      width: min(36rem, calc(100vw - 32px));
    }
    .menue .wer {
      grid-column: 1 / -1;
    }
  }
  .wer {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 4px 6px 10px;
    border-bottom: 2px dashed #c9cde3;
    margin-bottom: 4px;
  }
  .wer div {
    display: grid;
  }
  .wer strong {
    font-size: 1.2rem;
  }
  .rang {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 900;
    color: var(--markise-dunkel);
  }
  .wer small {
    color: var(--tinte-weich);
    font-weight: 700;
  }
  .menue > button {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 6px 12px;
    border: 0;
    border-radius: 12px;
    background: none;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 1.1rem;
    text-align: left;
  }
  .menue > button:hover,
  .menue > button:focus-visible {
    background: #fff4c2;
  }
  .menue > button.leise {
    font-weight: 700;
    font-size: 1rem;
    color: var(--tinte-weich);
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
  @media (max-width: 430px) {
    header {
      gap: 6px;
    }
    .links,
    .rechts {
      gap: 6px;
    }
    h1 {
      font-size: 1.15rem;
    }
    .menue-knopf :global(svg:first-child) {
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
