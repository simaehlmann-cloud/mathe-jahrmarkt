<script lang="ts">
  import { standardAussehen, type Aussehen } from '../../domain/aussehen';
  import { MAX_NAME, MAX_PROFILE, type FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';

  let anlegen = $state(app.bestand.profile.length === 0);
  /** Profil anlegen in zwei Schritten: erst der Name, dann die Figur. */
  let schritt = $state<'name' | 'figur'>('name');
  let name = $state('');
  let figur = $state<FigurId>('mensch');
  let aussehen = $state<Aussehen>(standardAussehen());
  let voll = $derived(app.bestand.profile.length >= MAX_PROFILE);

  /** Enter auf der Handytastatur führt zum nächsten Schritt, nicht direkt ins Spiel. */
  function weiter(e: SubmitEvent) {
    e.preventDefault();
    if (name.trim().length === 0) return;
    (document.activeElement as HTMLElement | null)?.blur();
    schritt = 'figur';
    requestAnimationFrame(() => document.querySelector('.start')?.scrollTo({ top: 0 }));
  }

  function speichern() {
    if (app.profilAnlegen(name, figur, aussehen)) {
      app.spieleKlang('jubel');
      app.zeige({ name: 'jahrmarkt' });
    }
  }
</script>

<div class="start" class:fest={anlegen && schritt === 'figur'}>
  <div class="kopf" class:weg={anlegen && schritt === 'figur'}>
    <Flinka groesse={96} />
    <div>
      <h1>Mathe-Jahrmarkt</h1>
      <p class="unter">Fit für Klasse 5</p>
    </div>
  </div>

  <div class="tafel karte">
    <div class="markise"></div>
    {#if !anlegen}
      <div class="inhalt">
        <h2>Wer spielt?</h2>
        <ul class="profile">
          {#each app.bestand.profile as p (p.id)}
            <li>
              <button class="profil" onclick={() => app.profilWaehlen(p.id)}>
                <Figur figur={p.figur} groesse={56} aussehen={p.aussehen} />
                <span>{p.name}</span>
              </button>
              <button class="aendern" onclick={() => app.profilWaehlen(p.id, { name: 'figur' })} aria-label="Figur von {p.name} gestalten">
                Figur gestalten
              </button>
            </li>
          {/each}
        </ul>
        {#if !voll}
          <button class="ticket hell" onclick={() => (anlegen = true)}>Neues Profil</button>
        {:else}
          <p class="klein">Auf diesem Gerät haben {MAX_PROFILE} Profile Platz. Im Elternbereich lassen sich Profile löschen.</p>
        {/if}
      </div>
    {:else}
      {#if schritt === 'name'}
        <form class="inhalt" onsubmit={weiter}>
          <h2>Wie heißt du?</h2>
          <label class="nur-leser" for="name">Spitzname</label>
          <input
            id="name"
            bind:value={name}
            maxlength={MAX_NAME}
            placeholder="Spitzname"
            autocomplete="off"
            autocapitalize="words"
            enterkeyhint="next"
          />
          <p class="klein">Ein Spitzname reicht. Er bleibt nur auf diesem Gerät.</p>
          <div class="knoepfe">
            {#if app.bestand.profile.length > 0}
              <button type="button" class="ticket hell" onclick={() => (anlegen = false)}>Zurück</button>
            {/if}
            <button type="submit" class="ticket" disabled={name.trim().length === 0}>Weiter</button>
          </div>
        </form>
      {:else}
        <div class="inhalt figur-schritt">
          <h2>Gestalte deine Figur, {name.trim()}!</h2>
          <Baukasten bind:figur bind:aussehen />
          <div class="aktion">
            <button type="button" class="ticket hell" onclick={() => (schritt = 'name')}>Zurück</button>
            <button type="button" class="ticket" onclick={speichern}>Los geht’s</button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .start {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    position: relative;
    z-index: 1;
  }
  .kopf {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 8px;
  }
  h1 {
    font-size: clamp(2rem, 7vw, 3.2rem);
    color: var(--markise);
    -webkit-text-stroke: 1.5px var(--tinte);
    paint-order: stroke fill;
    text-shadow: 0 4px 0 var(--tinte);
    letter-spacing: 0.01em;
  }
  .unter {
    font-weight: 900;
    font-size: 1.25rem;
  }
  .karte {
    width: min(100%, 44rem);
  }
  .inhalt {
    padding: 16px 20px 20px;
    display: grid;
    gap: 14px;
  }
  .profile {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
  }
  .profil {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: #fff;
    font-weight: 900;
    font-size: 1.1rem;
  }
  .profile li {
    display: grid;
    gap: 6px;
  }
  .aendern {
    border: 2px solid var(--tinte);
    border-radius: 10px;
    background: var(--papier);
    font-weight: 800;
    font-size: 0.95rem;
    padding: 8px 6px;
    min-height: 44px;
  }
  input#name {
    font: inherit;
    font-size: 1.4rem;
    font-weight: 800;
    padding: 10px 14px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    color: var(--tinte);
    user-select: text;
    -webkit-user-select: text;
  }
  .klein {
    font-size: 0.95rem;
    color: var(--tinte-weich);
  }
  /* Figur-Schritt: feste Höhe, nur die Auswahl im Baukasten blättert. */
  .start.fest {
    overflow: clip;
    padding-top: 6px;
  }
  .kopf.weg {
    display: none;
  }
  .fest .karte {
    flex: 1;
    overflow: clip;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .figur-schritt {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px 12px;
  }
  .figur-schritt h2 {
    font-size: 1.3rem;
  }
  .aktion {
    flex: none;
    display: flex;
    gap: 10px;
  }
  .aktion .ticket {
    flex: 1;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
