<script lang="ts">
  import { standardAussehen, type Aussehen } from '../../domain/aussehen';
  import { MAX_NAME, MAX_PROFILE, type FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Elternsperre from '../components/Elternsperre.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import StartKulisse from '../grafik/StartKulisse.svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';
  import Icon from '../components/Icon.svelte';
  import { TAGESBUDEN } from '../../domain/buden';
  import { hoechsteStufe } from '../../domain/fortschritt/fortschritt';

  let anlegen = $state(app.bestand.profile.length === 0);
  /**
   * Neues Profil nur über die Elternsperre, sobald es schon eines gibt (Wechseln bleibt frei) –
   * so legen Kinder nicht nebenbei weitere Profile an. Das allererste Profil braucht keine Sperre.
   */
  let sperre = $state(false);
  function neuesProfil() {
    if (app.bestand.profile.length === 0) anlegen = true;
    else sperre = true;
  }
  if (app.neuesProfil) {
    app.neuesProfil = false;
    if (app.bestand.profile.length < MAX_PROFILE) neuesProfil();
  }
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

  /** Eintrittskarte antippen: kurz abstempeln, dann auf den Jahrmarkt. */
  let gewaehlt = $state<string | null>(null);
  function eintreten(id: string) {
    if (gewaehlt) return;
    if (app.einstellungen.animationenReduziert) {
      app.profilWaehlen(id);
      return;
    }
    gewaehlt = id;
    app.spieleKlang('tipp');
    setTimeout(() => app.profilWaehlen(id), 420);
  }

  function speichern() {
    if (app.profilAnlegen(name, figur, aussehen)) {
      app.spieleKlang('jubel');
      app.zeige({ name: 'jahrmarkt' });
    }
  }
</script>

<div class="start" class:fest={anlegen && schritt === 'figur'}>
  <StartKulisse />

  <div class="kopf" class:weg={anlegen && schritt === 'figur'}>
    <span class="winken"><Flinka groesse={96} /></span>
    <div>
      <h1>Mathe-Jahrmarkt</h1>
      <p class="unter">Fit für Klasse 5</p>
    </div>
  </div>

  {#if !anlegen}
    <div class="wer">
      <h2>Wer spielt? <span>Nimm deine Eintrittskarte!</span></h2>
      <ul class="profile">
        {#each app.bestand.profile as p (p.id)}
          {@const an = TAGESBUDEN.filter((b) => hoechsteStufe(p, b.id)).length}
          <li class="karte-eintritt" class:gewaehlt={gewaehlt === p.id}>
            <button class="profil" onclick={() => eintreten(p.id)} aria-label="{p.name}: {p.taler} Taler, {an} von {TAGESBUDEN.length} Gondeln. Los geht’s">
              <span class="abriss" aria-hidden="true"></span>
              <span class="bild"><Figur figur={p.figur} groesse={64} aussehen={p.aussehen} /></span>
              <span class="name">{p.name}</span>
              <span class="werte" aria-hidden="true">
                <span><Icon name="taler" groesse={16} /> {p.taler}</span>
                <span>{an}/{TAGESBUDEN.length} Gondeln</span>
              </span>
              <span class="stempel" aria-hidden="true">Eintritt</span>
            </button>
            <button class="aendern" onclick={() => app.profilWaehlen(p.id, { name: 'figur' })} aria-label="Figur von {p.name} gestalten">✎ Figur</button>
          </li>
        {/each}
        {#if !voll}
          <li class="karte-eintritt neu">
            <button class="profil leer" onclick={neuesProfil}>
              <span class="plus" aria-hidden="true">+</span>
              <span class="name">Neues Profil</span>
            </button>
          </li>
        {/if}
      </ul>
      {#if voll}<p class="klein">Auf diesem Gerät haben {MAX_PROFILE} Profile Platz. Im Elternbereich lassen sich Profile löschen.</p>{/if}
    </div>
  {:else}
    <div class="tafel karte">
      <div class="markise"></div>
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
    </div>
  {/if}

  {#if !(anlegen && schritt === 'figur')}
    <nav class="fuss" aria-label="Rechtliches">
      <button onclick={() => app.zeige({ name: 'ueber', von: 'start' })}>Über die App</button>
      <span aria-hidden="true">·</span>
      <button onclick={() => app.zeige({ name: 'ueber', abschnitt: 'impressum', von: 'start' })}>Impressum</button>
      <span aria-hidden="true">·</span>
      <button onclick={() => app.zeige({ name: 'ueber', abschnitt: 'datenschutz', von: 'start' })}>Datenschutz</button>
    </nav>
  {/if}
</div>

{#if sperre}
  <div class="sperre-schleier" role="dialog" aria-modal="true" aria-label="Neues Profil – nur für Eltern">
    <p class="sperre-hinweis">Ein neues Profil legen Eltern an.</p>
    <Elternsperre onoffen={() => { sperre = false; anlegen = true; schritt = 'name'; }} onabbrechen={() => (sperre = false)} />
  </div>
{/if}

<style>
  .sperre-schleier {
    position: fixed;
    inset: 0;
    z-index: 70;
    background: var(--himmel);
    overflow: auto;
    display: flex;
    flex-direction: column;
  }
  .sperre-hinweis {
    margin: calc(var(--oben) + 1rem) var(--rand-r) 0 var(--rand);
    text-align: center;
    font-weight: 800;
  }
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
    /* unter der Wimpelkette, nicht durch sie hindurch */
    margin-top: 44px;
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
    position: relative;
  }
  .winken :global(svg) {
    transform-origin: 50% 90%;
    animation: winken 3s ease-in-out infinite;
  }
  @keyframes winken {
    0%, 70%, 100% {
      rotate: 0deg;
    }
    80% {
      rotate: -6deg;
    }
    90% {
      rotate: 5deg;
    }
  }
  .wer {
    width: min(100%, 44rem);
    display: grid;
    gap: 12px;
  }
  .wer h2 {
    text-align: center;
    margin: 0;
    color: var(--tinte);
    text-shadow: 0 2px 0 #fffdf7;
  }
  .wer h2 span {
    display: block;
    font-size: 1rem;
    font-weight: 800;
    color: var(--tinte-weich);
  }
  .karte-eintritt {
    display: grid;
    gap: 6px;
    transition: transform 0.4s ease-in;
  }
  .karte-eintritt.gewaehlt {
    transform: translateY(-14px) rotate(-3deg) scale(1.06);
  }
  .karte-eintritt .profil {
    position: relative;
    min-height: 168px;
    justify-content: center;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: linear-gradient(#fff4cc, #ffe7a3);
    -webkit-mask: radial-gradient(11px at 0 62%, #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(11px at 100% 62%, #0000 98%, #000) right / 51% 100% no-repeat;
    mask: radial-gradient(11px at 0 62%, #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(11px at 100% 62%, #0000 98%, #000) right / 51% 100% no-repeat;
    box-shadow: inset 0 -6px 0 rgb(31 42 107 / 0.12);
    cursor: pointer;
  }
  .abriss {
    position: absolute;
    left: 14px;
    right: 14px;
    top: 62%;
    border-top: 3px dashed rgb(31 42 107 / 0.35);
  }
  .bild {
    margin-top: -4px;
  }
  .name {
    font-size: 1.15rem;
  }
  .werte {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--tinte-weich);
    margin-top: 6px;
  }
  .werte span {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .stempel {
    position: absolute;
    right: 10px;
    top: 10px;
    padding: 2px 8px;
    border: 3px solid var(--markise);
    border-radius: 8px;
    color: var(--markise);
    font-size: 0.8rem;
    font-weight: 900;
    rotate: 12deg;
    opacity: 0;
    scale: 2;
  }
  .gewaehlt .stempel {
    opacity: 1;
    scale: 1;
    transition: all 0.2s ease-out;
  }
  .profil.leer {
    background: rgb(255 253 247 / 0.88);
    border-style: dashed;
    -webkit-mask: none;
    mask: none;
    box-shadow: none;
  }
  .plus {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    display: grid;
    place-items: center;
    font-size: 2rem;
    font-weight: 900;
    background: #fff;
  }
  .fuss {
    margin-top: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px 6px;
    font-size: 0.85rem;
    padding: 2px 12px;
    border-radius: 999px;
    background: rgb(255 253 247 / 0.85);
  }
  .fuss button {
    border: 0;
    background: none;
    font: inherit;
    font-weight: 800;
    color: var(--tinte);
    text-decoration: underline;
    padding: 6px 2px;
    min-height: 32px;
    cursor: pointer;
  }
  /* Wenig Höhe (Handy quer): kleinerer Kopf, Kulisse flacher und blasser, damit nichts kollidiert */
  @media (max-height: 32rem) {
    .kopf {
      margin-top: 24px;
    }
    .winken :global(svg) {
      width: 56px;
      height: auto;
    }
    h1 {
      font-size: 1.9rem;
    }
    .unter {
      font-size: 1rem;
    }
    .karte-eintritt .profil {
      min-height: 140px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .winken :global(svg) {
      animation: none;
    }
    .karte-eintritt {
      transition: none;
    }
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
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
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
