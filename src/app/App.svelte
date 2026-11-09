<script lang="ts">
  import { onMount } from 'svelte';
  import Andenken from './screens/Andenken.svelte';
  import BudeVorplatz from './screens/BudeVorplatz.svelte';
  import Eltern from './screens/Eltern.svelte';
  import FigurGestalten from './screens/FigurGestalten.svelte';
  import Jahrmarkt from './screens/Jahrmarkt.svelte';
  import MatheProfil from './screens/MatheProfil.svelte';
  import Spiel from './screens/Spiel.svelte';
  import Start from './screens/Start.svelte';
  import Bauplatz from './screens/Bauplatz.svelte';
  import JahrmarktCheck from './screens/JahrmarktCheck.svelte';
  import { erstelleMusik } from '../services/musik';
  import { app } from './zustand.svelte';

  const musik = erstelleMusik();

  onMount(() => {
    // Zurück-Taste von Android: Navigation innerhalb der App statt Beenden
    let abmelden: (() => void) | undefined;
    void import('@capacitor/core').then(async ({ Capacitor }) => {
      if (Capacitor.getPlatform() !== 'android') return;
      const { App } = await import('@capacitor/app');
      const h = await App.addListener('backButton', () => void app.zurueck());
      abmelden = () => void h.remove();
    });
    void app.starte().catch(() => {
      app.bildschirm = { name: 'start' };
      app.melde('Die App konnte ihre Daten nicht laden.');
    });
    // Ton erst nach der ersten Berührung (Vorgabe der Browser und Systeme)
    const entsperren = () => musik.entsperren();
    document.addEventListener('pointerdown', entsperren, { once: true });
    return () => {
      abmelden?.();
      document.removeEventListener('pointerdown', entsperren);
    };
  });

  // Musik: auf dem Jahrmarkt an, beim Rechnen nur wenn eingestellt, im Elternbereich aus
  $effect(() => {
    const name = app.bildschirm.name;
    const e = app.einstellungen;
    const spielen = e.musikAn && name !== 'laden' && name !== 'eltern' && (name !== 'spiel' || e.musikImSpiel);
    musik.stelle(spielen, e.lautMusik);
  });

  $effect(() => {
    const root = document.documentElement;
    root.dataset.schrift = app.einstellungen.schrift;
    root.dataset.ruhig = app.einstellungen.animationenReduziert ? '1' : '0';
  });

  let b = $derived(app.bildschirm);
</script>

<main class="welt">
  <div class="wolke w1" aria-hidden="true"></div>
  <div class="wolke w2" aria-hidden="true"></div>

  {#if b.name === 'laden'}
    <p class="laden">Der Jahrmarkt öffnet …</p>
  {:else if b.name === 'start'}
    <Start />
  {:else if b.name === 'jahrmarkt'}
    <Jahrmarkt />
  {:else if b.name === 'bude'}
    {#key b.bude}<BudeVorplatz bude={b.bude} />{/key}
  {:else if b.name === 'spiel'}
    {#key `${b.bude}-${b.stufe}-${b.n ?? 0}`}<Spiel bude={b.bude} stufe={b.stufe} />{/key}
  {:else if b.name === 'profil'}
    <MatheProfil />
  {:else if b.name === 'andenken'}
    <Andenken />
  {:else if b.name === 'figur'}
    <FigurGestalten />
  {:else if b.name === 'eltern'}
    <Eltern />
  {:else if b.name === 'bauplatz'}
    <Bauplatz />
  {:else if b.name === 'check'}
    <JahrmarktCheck />
  {/if}

  {#if app.ladefehler && b.name !== 'laden'}
    <div class="hinweis warnung" role="alert">
      Die gespeicherten Daten waren nicht lesbar und wurden sicher beiseitegelegt. Im Elternbereich gibt es eine Sicherung zum Einspielen.
      <button class="rund" onclick={() => (app.ladefehler = false)} aria-label="Hinweis schließen">✕</button>
    </div>
  {/if}
  {#if app.meldung}
    <div class="hinweis" role="status">{app.meldung}</div>
  {/if}
</main>

<style>
  .welt {
    position: relative;
    height: 100%;
    /* clip: Auch beim Antippen weit unten (scrollIntoView) verrutscht die ganze Seite nicht */
    overflow: clip;
    background: linear-gradient(180deg, var(--himmel) 0%, var(--himmel-hell) 62%, #c9ecd4 62.1%, #9fd8a8 100%);
    display: flex;
    flex-direction: column;
  }
  .wolke {
    position: absolute;
    width: 160px;
    height: 44px;
    border-radius: 40px;
    background: #fff;
    opacity: 0.75;
    pointer-events: none;
  }
  .wolke::before,
  .wolke::after {
    content: '';
    position: absolute;
    background: #fff;
    border-radius: 50%;
  }
  .wolke::before {
    width: 64px;
    height: 64px;
    left: 26px;
    top: -30px;
  }
  .wolke::after {
    width: 48px;
    height: 48px;
    left: 82px;
    top: -20px;
  }
  .w1 {
    top: 14%;
    left: -180px;
    animation: ziehen 90s linear infinite;
  }
  .w2 {
    top: 30%;
    left: -180px;
    transform: scale(0.7);
    animation: ziehen 130s linear infinite;
    animation-delay: -60s;
  }
  @keyframes ziehen {
    to {
      left: 110%;
    }
  }
  .laden {
    margin: auto;
    font-weight: 900;
    font-size: 1.4rem;
  }
  .hinweis {
    position: absolute;
    left: 50%;
    bottom: calc(var(--unten) + 8px);
    transform: translateX(-50%);
    background: var(--tinte);
    color: #fff;
    padding: 12px 18px;
    border-radius: 12px;
    font-weight: 800;
    max-width: min(92vw, 36rem);
    z-index: 50;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .warnung {
    top: calc(var(--oben) + 64px);
    bottom: auto;
    background: var(--markise-dunkel);
  }
</style>
