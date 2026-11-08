<script lang="ts">
  import { GASSEN, TAGESBUDEN, budenDerGasse, type GasseId } from '../../domain/buden';
  import { hoechsteStufe, istGeschafft } from '../../domain/fortschritt/fortschritt';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import { INTRO, NOCH_IM_AUFBAU } from '../geschichte';
  import Riesenrad from '../grafik/Riesenrad.svelte';
  import { app } from '../zustand.svelte';

  let p = $derived(app.profil);
  let gondeln = $derived(p ? TAGESBUDEN.map((b) => hoechsteStufe(p, b.id)) : []);
  let laufend = $derived(gondeln.filter((g) => g).length);
  let dialog = $state<string[] | null>(null);

  $effect(() => {
    if (p && !p.gesehen.intro && dialog === null) dialog = INTRO(p.name);
  });

  function introFertig() {
    dialog = null;
    app.aendereProfil((q) => ({ ...q, gesehen: { ...q.gesehen, intro: true } }));
  }

  const tagesgassen = GASSEN.filter((g) => g.id !== 'abendmarkt');
  const offen = (g: GasseId) => budenDerGasse(g).some((b) => b.spielbar);

  function oeffne(g: GasseId) {
    app.spieleKlang('tipp');
    if (offen(g)) app.zeige({ name: 'gasse', gasse: g });
    else dialog = NOCH_IM_AUFBAU;
  }
</script>

{#if p}
  <Kopfzeile titel="Jahrmarkt" />
  <div class="platz">
    <section class="rad" aria-label="Fortschritt">
      <div class="rad-bild">
        <Riesenrad {gondeln} />
        {#if p.deko.includes('ballons')}
          <svg class="ballons" viewBox="0 0 60 110" aria-hidden="true">
            <path d="M30 108 L18 40 M30 108 L32 30 M30 108 L46 44" stroke="#4a5394" stroke-width="1.5" fill="none" />
            <ellipse cx="18" cy="30" rx="12" ry="15" fill="#e23a4e" />
            <ellipse cx="32" cy="18" rx="12" ry="15" fill="#ffc62b" />
            <ellipse cx="46" cy="34" rx="12" ry="15" fill="#3c78d8" />
          </svg>
        {/if}
      </div>
      <p class="stand"><strong>{laufend} von {TAGESBUDEN.length}</strong> Buden laufen wieder</p>
    </section>

    <nav class="gassen" aria-label="Gassen">
      {#each tagesgassen as g (g.id)}
        {@const buden = budenDerGasse(g.id)}
        {@const geschafft = buden.filter((b) => istGeschafft(p, b.id, 'bronze')).length}
        <button class="schild" class:zu={!offen(g.id)} style="--gasse: {g.farbe}" onclick={() => oeffne(g.id)}>
          <span class="name">{g.name}</span>
          <span class="zahl">{offen(g.id) ? `${geschafft} von ${buden.length} Buden` : 'Wird aufgebaut'}</span>
        </button>
      {/each}
      <button class="ticket rot andenken" onclick={() => app.zeige({ name: 'andenken' })}>Andenkenstand</button>
    </nav>
  </div>

  {#if dialog}
    <div class="schleier"></div>
    {#key dialog}
      <Sprechblase saetze={dialog} onfertig={dialog === NOCH_IM_AUFBAU ? () => (dialog = null) : introFertig} />
    {/key}
  {/if}
{/if}

<style>
  .platz {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 4px var(--rand-r) var(--unten) var(--rand);
    align-content: start;
    position: relative;
    z-index: 1;
  }
  @media (orientation: landscape) and (min-width: 700px) {
    .platz {
      grid-template-columns: minmax(260px, 1fr) minmax(300px, 1.2fr);
      align-items: center;
      align-content: center;
    }
  }
  .rad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .rad-bild {
    position: relative;
    width: clamp(180px, 30vh, 260px);
  }
  @media (orientation: landscape) and (min-width: 700px) {
    .rad-bild {
      width: clamp(220px, 46vh, 380px);
    }
  }
  .ballons {
    position: absolute;
    right: -46px;
    bottom: 10px;
    width: 52px;
    animation: schweben 4s ease-in-out infinite;
  }
  @keyframes schweben {
    50% {
      transform: translateY(-6px) rotate(3deg);
    }
  }
  .stand {
    font-size: 1.15rem;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 20px;
    padding: 6px 14px;
  }
  .gassen {
    display: grid;
    gap: 10px;
    max-width: 30rem;
    width: 100%;
    justify-self: center;
  }
  .schild {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 12px 16px 12px 22px;
    min-height: 58px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: linear-gradient(90deg, var(--gasse) 0 10px, #e9b77e 10px);
    color: var(--tinte);
    text-align: left;
    box-shadow: 0 4px 0 var(--holz-dunkel);
  }
  .schild:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 var(--holz-dunkel);
  }
  .schild .name {
    font-weight: 900;
    font-size: 1.2rem;
  }
  .schild .zahl {
    font-size: 0.95rem;
    white-space: nowrap;
  }
  .schild.zu {
    background: linear-gradient(90deg, var(--gasse) 0 10px, #e3dfd6 10px);
    color: #5a6080;
  }
  .andenken {
    justify-self: start;
  }
  .schleier {
    position: absolute;
    inset: 0;
    background: rgb(31 42 107 / 0.25);
    z-index: 15;
  }
</style>
