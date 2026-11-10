<script lang="ts">
  import { standardAussehen, type Aussehen } from '../../domain/aussehen';
  import { MAX_NAME, MAX_PROFILE, type FigurId } from '../../domain/profil';
  import Baukasten from '../components/Baukasten.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';
  import Icon from '../components/Icon.svelte';
  import { TAGESBUDEN } from '../../domain/buden';
  import { hoechsteStufe } from '../../domain/fortschritt/fortschritt';

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
  <!-- Kulisse: Wimpelkette, dahinter Riesenrad und Zeltdächer, vorne das Eingangstor -->
  <svg class="kulisse" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g class="ferne">
      <!-- Riesenrad hinter dem Tor -->
      <g transform="translate(600 300)">
        <g class="rad">
          <circle r="135" fill="none" stroke="#7d86c4" stroke-width="9" />
          {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
            <line x1="0" y1="0" x2={135 * Math.cos((i * Math.PI) / 6)} y2={135 * Math.sin((i * Math.PI) / 6)} stroke="#7d86c4" stroke-width="4" />
          {/each}
        </g>
        {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
          <rect x={135 * Math.cos((i * Math.PI) / 6) - 13} y={135 * Math.sin((i * Math.PI) / 6) - 2} width="26" height="20" rx="6" fill={['#f2b705', '#e23a4e', '#3c78d8', '#3fae6a'][i % 4]} opacity="0.8" />
        {/each}
        <path d="M0 0 L-80 200 M0 0 L80 200" stroke="#7d86c4" stroke-width="11" />
        <circle r="12" fill="#e23a4e" />
      </g>
      <!-- Zelte links und rechts -->
      <path d="M300 500 L380 380 L460 500 Z" fill="#c9a6e8" />
      <path d="M380 380 V350 M380 350 L404 358 L380 366" stroke="#7d86c4" stroke-width="5" fill="#f2b705" />
      <path d="M740 500 L820 370 L900 500 Z" fill="#f4a6b0" />
      <path d="M820 370 V340 M820 340 L844 348 L820 356" stroke="#7d86c4" stroke-width="5" fill="#3fae6a" />
      <path d="M160 500 L230 410 L300 500 Z" fill="#a6d4f4" />
      <path d="M900 500 L970 420 L1040 500 Z" fill="#ffd98a" />
    </g>
    <path d="M0 470 Q300 430 600 470 T1200 460 V700 H0 Z" fill="#9ed98a" />
    <!-- Eingangstor -->
    <g class="tor">
      <rect x="430" y="400" width="34" height="300" fill="#e23a4e" stroke="#1f2a6b" stroke-width="6" />
      <rect x="736" y="400" width="34" height="300" fill="#e23a4e" stroke="#1f2a6b" stroke-width="6" />
      <path d="M410 420 Q600 300 790 420 L790 470 Q600 352 410 470 Z" fill="#ffc62b" stroke="#1f2a6b" stroke-width="6" stroke-linejoin="round" />
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as k (k)}<circle cx={440 + k * 40} cy={430 - Math.sin((k / 8) * Math.PI) * 74} r="7" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2" class="lampe" style="--v: {k * 0.15}s" />{/each}
    </g>
  </svg>
  <svg class="wimpel" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 8 Q600 70 1200 8" stroke="#1f2a6b" stroke-width="3" fill="none" />
    {#each Array.from({ length: 24 }, (_, i) => i) as i (i)}
      {@const x = 25 + i * 50}
      {@const y = 8 + Math.sin((x / 1200) * Math.PI) * 31}
      <path d="M{x - 16} {y} L{x + 16} {y} L{x} {y + 30} Z" fill={['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'][i % 5]} stroke="#1f2a6b" stroke-width="2" />
    {/each}
  </svg>

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
            <button class="profil leer" onclick={() => (anlegen = true)}>
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
    position: relative;
  }
  .kulisse {
    position: fixed;
    inset: auto 0 0 0;
    width: 100%;
    height: 62%;
    z-index: -1;
    pointer-events: none;
  }
  .ferne {
    opacity: 0.85;
  }
  .rad {
    animation: rad 60s linear infinite;
  }
  @keyframes rad {
    to {
      rotate: 360deg;
    }
  }
  .lampe {
    animation: lampe 1.8s ease-in-out infinite alternate;
    animation-delay: var(--v);
  }
  @keyframes lampe {
    to {
      fill: #ffe57a;
    }
  }
  .wimpel {
    position: fixed;
    top: calc(var(--oben) - 6px);
    left: 0;
    width: 100%;
    height: 56px;
    z-index: -1;
    pointer-events: none;
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
      margin-top: 14px;
    }
    .wimpel {
      height: 30px;
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
    .kulisse {
      height: 42%;
      opacity: 0.55;
    }
    .karte-eintritt .profil {
      min-height: 140px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lampe,
    .rad,
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
