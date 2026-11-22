<script lang="ts" module>
  /** Zuletzt gewählte Klasse (für die Sitzung): Das nächste Kind derselben Klasse sieht gleich seine Karte. */
  let letzteKlasse: string | null = null;
  /** Fehlversuche je Profil; über das Schließen hinaus gemerkt, sonst ließe sich die Wartezeit umgehen. */
  const fehlversuche = new Map<string, { n: number; bis: number }>();
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { klassenMitKindern } from '../domain/verwaltung';
  import { BILDSYMBOLE, PASSWORT_LAENGE, PASSWORT_VERSUCHE, PASSWORT_WARTEN_MS, passwortRichtig } from '../domain/bildpasswort';
  import type { Profil } from '../../domain/profil';
  import BildSymbol from './grafik/BildSymbol.svelte';
  import Figur from '../../app/grafik/Figur.svelte';
  import Flinka from '../../app/grafik/Flinka.svelte';
  import StartKulisse from '../../app/grafik/StartKulisse.svelte';
  import Icon from '../../app/components/Icon.svelte';
  import { app } from '../../app/zustand.svelte';

  /**
   * Startbildschirm der Schulversion: Klasse wählen, eigene Karte antippen, Bildpasswort eingeben.
   * Die Lehrkraft erreicht von hier den Lehrerbereich (Schloss unten).
   */
  // Auf dem Startbildschirm ist niemand angemeldet (Sicherheitsnetz, falls ein Weg hierher am Abmelden vorbeiführt)
  if (app.bestand.aktiv !== undefined) app.abmelden();
  const eingerichtet = $derived(!!app.bestand.schule?.pin);
  const gruppen = $derived(klassenMitKindern(app.bestand).filter((g) => g.profile.length > 0));
  let klasse = $state<string | null>(letzteKlasse);
  /** Gewählte Gruppe: die gemerkte Klasse, sonst die erste. */
  const gruppe = $derived(gruppen.find((g) => (g.klasse?.id ?? '') === klasse) ?? gruppen[0]);

  function klasseWaehlen(id: string) {
    klasse = id;
    letzteKlasse = id;
    app.spieleKlang('tipp');
  }

  /* ---------- Bildpasswort ---------- */
  let kind = $state<Profil | null>(null);
  let eingabe = $state<string[]>([]);
  let falsch = $state(false);
  let jetzt = $state(Date.now());
  const uhr = setInterval(() => (jetzt = Date.now()), 500);
  onDestroy(() => clearInterval(uhr));
  const warten = $derived(kind ? Math.max(0, Math.ceil(((fehlversuche.get(kind.id)?.bis ?? 0) - jetzt) / 1000)) : 0);
  let gewaehlt = $state<string | null>(null);
  /** Klasse ohne Bildpasswort (Lehrkraft-Einstellung): nur bestätigen. */
  const ohnePasswort = $derived(!!kind && kind.klasse !== undefined && (app.bestand.schule?.klassen.find((k) => k.id === kind?.klasse)?.ohnePasswort ?? false));

  function oeffnen(p: Profil) {
    if (gewaehlt) return;
    kind = p;
    eingabe = [];
    falsch = false;
    if (p.klasse !== undefined) {
      letzteKlasse = p.klasse;
    }
    app.spieleKlang('tipp');
  }

  function schliessen() {
    kind = null;
    eingabe = [];
    falsch = false;
  }

  function tippe(id: string) {
    if (!kind || warten > 0 || eingabe.length >= PASSWORT_LAENGE) return;
    falsch = false;
    eingabe = [...eingabe, id];
    app.spieleKlang('tipp');
    if (eingabe.length === PASSWORT_LAENGE) setTimeout(pruefen, 180);
  }

  function zurueck() {
    eingabe = eingabe.slice(0, -1);
    falsch = false;
  }

  function pruefen() {
    const p = kind;
    if (!p) return;
    if (passwortRichtig(p.passwort, eingabe)) {
      fehlversuche.delete(p.id);
      eintreten(p);
      return;
    }
    const f = fehlversuche.get(p.id) ?? { n: 0, bis: 0 };
    f.n++;
    if (f.n >= PASSWORT_VERSUCHE) {
      f.n = 0;
      f.bis = Date.now() + PASSWORT_WARTEN_MS;
    }
    fehlversuche.set(p.id, f);
    jetzt = Date.now();
    falsch = true;
    eingabe = [];
    app.spieleKlang('fehler');
  }

  /** Karte abstempeln, dann auf den Jahrmarkt; beim allerersten Mal erst die Figur gestalten. */
  function eintreten(p: Profil) {
    kind = null;
    eingabe = [];
    const ziel = p.figurGewaehlt === false ? ({ name: 'figur' } as const) : ({ name: 'jahrmarkt' } as const);
    if (app.einstellungen.animationenReduziert) {
      app.profilWaehlen(p.id, ziel);
      return;
    }
    gewaehlt = p.id;
    app.spieleKlang('jubel');
    setTimeout(() => app.profilWaehlen(p.id, ziel), 420);
  }
</script>

<div class="start">
  <StartKulisse />

  <div class="kopf">
    <span class="winken"><Flinka groesse={80} /></span>
    <div>
      <h1>Mathe-Jahrmarkt</h1>
      <p class="unter">Fit für Klasse 5 · Schule</p>
    </div>
  </div>

  {#if !eingerichtet}
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <h2>Willkommen!</h2>
        <p>Dieses iPad ist noch nicht eingerichtet. Die Lehrkraft legt im Lehrerbereich eine PIN fest und trägt die Klasse ein.</p>
        <button class="ticket" onclick={() => app.zeige({ name: 'lehrer' })}><Icon name="schloss" groesse={20} /> Lehrerbereich einrichten</button>
      </div>
    </div>
  {:else if gruppen.length === 0}
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <h2>Noch keine Kinder</h2>
        <p>Die Lehrkraft legt die Klasse im Lehrerbereich an. Danach steht hier für jedes Kind eine Eintrittskarte.</p>
      </div>
    </div>
  {:else}
    <div class="wer">
      <h2>Wer spielt? <span>Tipp auf deine Karte!</span></h2>
      {#if gruppen.length > 1}
        <div class="klassen" role="group" aria-label="Klasse">
          {#each gruppen as g (g.klasse?.id ?? '')}
            {@const id = g.klasse?.id ?? ''}
            <button class:aktiv={gruppe === g} aria-pressed={gruppe === g} onclick={() => klasseWaehlen(id)}>{g.klasse ? g.klasse.name : 'Ohne Klasse'}</button>
          {/each}
        </div>
      {/if}
      {#if gruppe}
        <ul class="profile" aria-label={gruppe.klasse ? `Klasse ${gruppe.klasse.name}` : 'Ohne Klasse'}>
          {#each gruppe.profile as p (p.id)}
            <li class:gewaehlt={gewaehlt === p.id}>
              <button class="profil" onclick={() => oeffnen(p)} aria-label="{p.name}: anmelden">
                <Figur figur={p.figur} groesse={52} aussehen={p.aussehen} />
                <span class="name">{p.name}</span>
                <span class="stempel" aria-hidden="true">Eintritt</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <nav class="fuss" aria-label="Lehrerbereich und Rechtliches">
    <button class="lehrer" onclick={() => app.zeige({ name: 'lehrer' })}><Icon name="schloss" groesse={16} /> Lehrerbereich</button>
    <span aria-hidden="true">·</span>
    <button onclick={() => app.zeige({ name: 'ueber', von: 'start' })}>Über die App</button>
    <span aria-hidden="true">·</span>
    <button onclick={() => app.zeige({ name: 'ueber', abschnitt: 'impressum', von: 'start' })}>Impressum</button>
    <span aria-hidden="true">·</span>
    <button onclick={() => app.zeige({ name: 'ueber', abschnitt: 'datenschutz', von: 'start' })}>Datenschutz</button>
  </nav>
</div>

{#if kind}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="schleier" onclick={(e) => e.target === e.currentTarget && schliessen()}>
    <div class="tafel dialog" role="dialog" aria-modal="true" aria-labelledby="pw-titel">
      <div class="markise"></div>
      <div class="inhalt">
        <div class="wer-kopf">
          <Figur figur={kind.figur} groesse={56} aussehen={kind.aussehen} />
          <div>
            <h2 id="pw-titel">{ohnePasswort ? `Bist du ${kind.name}?` : `Hallo, ${kind.name}!`}</h2>
            <p>{ohnePasswort ? 'Dann tipp auf „Ja, das bin ich“.' : 'Tipp deine drei Bilder in der richtigen Reihenfolge.'}</p>
          </div>
        </div>
        {#if ohnePasswort}
          <!-- Klasse ohne Bildpasswort: nur bestätigen (Knöpfe unten) -->
        {:else if !kind.passwort}
          <p class="fehler" role="status">Für dich ist noch kein Bildpasswort angelegt. Frag deine Lehrerin oder deinen Lehrer.</p>
        {:else}
          <div class="felder" class:wackeln={falsch} aria-live="polite" aria-label="{eingabe.length} von {PASSWORT_LAENGE} Bildern">
            {#each Array.from({ length: PASSWORT_LAENGE }, (_, i) => i) as i (i)}
              <span class="feld" class:voll={!!eingabe[i]}>{#if eingabe[i]}<BildSymbol id={eingabe[i] as string} groesse={44} />{/if}</span>
            {/each}
          </div>
          {#if warten > 0}
            <p class="fehler" role="status">Mehrmals falsch. Warte noch {warten} Sekunden.</p>
          {:else if falsch}
            <p class="fehler" role="status">Das war nicht richtig. Versuch es noch einmal.</p>
          {/if}
          <div class="tasten" role="group" aria-label="Bilder">
            {#each BILDSYMBOLE as s (s.id)}
              <button class="taste" disabled={warten > 0 || eingabe.length >= PASSWORT_LAENGE} onclick={() => tippe(s.id)} aria-label={s.name}>
                <BildSymbol id={s.id} groesse={46} />
              </button>
            {/each}
          </div>
          <p class="klein">Passwort vergessen? Frag deine Lehrerin oder deinen Lehrer.</p>
        {/if}
        <div class="knoepfe">
          <button class="ticket hell" onclick={schliessen}>{ohnePasswort ? 'Nein' : 'Abbrechen'}</button>
          {#if ohnePasswort}
            {@const k = kind}
            <button class="ticket" onclick={() => eintreten(k)}>Ja, das bin ich</button>
          {/if}
          {#if kind.passwort && !ohnePasswort}
            <button class="ticket hell" disabled={eingabe.length === 0} onclick={zurueck} aria-label="Letztes Bild löschen">⌫ Zurück</button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .start {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }
  .kopf {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 44px;
  }
  h1 {
    font-size: clamp(1.9rem, 6vw, 3rem);
    color: var(--markise);
    -webkit-text-stroke: 1.5px var(--tinte);
    paint-order: stroke fill;
    text-shadow: 0 4px 0 var(--tinte);
  }
  .unter {
    font-weight: 900;
    font-size: 1.15rem;
  }
  .winken :global(svg) {
    transform-origin: 50% 90%;
    animation: winken 3s ease-in-out infinite;
  }
  @keyframes winken {
    0%,
    70%,
    100% {
      rotate: 0deg;
    }
    80% {
      rotate: -6deg;
    }
    90% {
      rotate: 5deg;
    }
  }
  .karte {
    width: min(100%, 36rem);
  }
  .inhalt {
    padding: 16px 20px 20px;
    display: grid;
    gap: 12px;
  }
  .wer {
    width: min(100%, 52rem);
    display: grid;
    gap: 12px;
  }
  .wer h2 {
    text-align: center;
    color: var(--tinte);
    text-shadow: 0 2px 0 #fffdf7;
  }
  .wer h2 span {
    display: block;
    font-size: 1rem;
    font-weight: 800;
    color: var(--tinte-weich);
  }
  .klassen {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .klassen button {
    border: 3px solid var(--tinte);
    border-radius: 999px;
    background: var(--papier);
    font-weight: 900;
    font-size: 1.1rem;
    padding: 8px 18px;
    min-height: 48px;
  }
  .klassen button.aktiv {
    background: var(--senf);
  }
  .profile {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(112px, 140px));
    justify-content: center;
    gap: 10px;
  }
  .profile li {
    transition: transform 0.4s ease-in;
  }
  .profile li.gewaehlt {
    transform: translateY(-10px) rotate(-3deg) scale(1.06);
  }
  .profil {
    position: relative;
    width: 100%;
    min-height: 118px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 6px;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: linear-gradient(#fff4cc, #ffe7a3);
    box-shadow: inset 0 -5px 0 rgb(31 42 107 / 0.12);
  }
  .name {
    font-weight: 900;
    font-size: 1.05rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .stempel {
    position: absolute;
    right: 6px;
    top: 6px;
    padding: 1px 6px;
    border: 3px solid var(--markise);
    border-radius: 8px;
    color: var(--markise);
    font-size: 0.75rem;
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
  .fuss {
    margin-top: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
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
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .schleier {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    background: rgb(31 42 107 / 0.45);
    overflow: auto;
  }
  .dialog {
    width: min(100%, 30rem);
    box-shadow: 0 6px 0 var(--tinte);
  }
  .wer-kopf {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .wer-kopf p {
    font-weight: 700;
  }
  .felder {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
  .feld {
    width: 62px;
    height: 62px;
    border: 3px dashed var(--tinte-weich);
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: #fff;
  }
  .feld.voll {
    border-style: solid;
    border-color: var(--tinte);
  }
  .wackeln {
    animation: wackeln 0.35s;
  }
  @keyframes wackeln {
    20%,
    60% {
      translate: -8px 0;
    }
    40%,
    80% {
      translate: 8px 0;
    }
  }
  .tasten {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .taste {
    aspect-ratio: 1;
    min-height: 56px;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: #fff;
  }
  .taste:active {
    background: #fff6d6;
  }
  .taste[disabled] {
    opacity: 0.45;
  }
  .fehler {
    color: var(--markise-dunkel);
    font-weight: 800;
    text-align: center;
  }
  .klein {
    font-size: 0.9rem;
    color: var(--tinte-weich);
    text-align: center;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  @media (max-height: 32rem) {
    .kopf {
      margin-top: 22px;
    }
    .winken :global(svg) {
      width: 52px;
      height: auto;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .winken :global(svg) {
      animation: none;
    }
  }
</style>
