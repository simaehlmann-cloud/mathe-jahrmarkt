<script lang="ts">
  import { standardAussehen, type Aussehen } from '../../domain/aussehen';
  import { MAX_NAME, MAX_PROFILE, type FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';

  let anlegen = $state(app.bestand.profile.length === 0);
  let name = $state('');
  let figur = $state<FigurId>('fuchs');
  let aussehen = $state<Aussehen>(standardAussehen());
  let voll = $derived(app.bestand.profile.length >= MAX_PROFILE);

  function speichern(e: SubmitEvent) {
    e.preventDefault();
    if (app.profilAnlegen(name, figur, aussehen)) {
      app.spieleKlang('jubel');
      app.zeige({ name: 'jahrmarkt' });
    }
  }
</script>

<div class="start">
  <div class="kopf">
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
      <form class="inhalt" onsubmit={speichern}>
        <h2>Wie heißt du?</h2>
        <label class="nur-leser" for="name">Spitzname</label>
        <input id="name" bind:value={name} maxlength={MAX_NAME} placeholder="Spitzname" autocomplete="off" autocapitalize="words" />
        <p class="klein">Ein Spitzname reicht. Er bleibt nur auf diesem Gerät.</p>
        <h2>Gestalte deine Figur</h2>
        <Baukasten bind:figur bind:aussehen />
        <div class="knoepfe">
          {#if app.bestand.profile.length > 0}
            <button type="button" class="ticket hell" onclick={() => (anlegen = false)}>Zurück</button>
          {/if}
          <button type="submit" class="ticket" disabled={name.trim().length === 0}>Los geht’s</button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  .start {
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
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
</style>
