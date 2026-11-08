<script lang="ts">
  import { GASSEN, budenDerGasse, type GasseId } from '../../domain/buden';
  import { budenZustand, istGeschafft } from '../../domain/fortschritt/fortschritt';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import { ENTDECKUNGEN, GASSE_BEGRUESSUNG } from '../geschichte';
  import BudeStand from '../grafik/BudeStand.svelte';
  import { app } from '../zustand.svelte';

  let { gasse }: { gasse: GasseId } = $props();
  let info = $derived(GASSEN.find((g) => g.id === gasse));
  let buden = $derived(budenDerGasse(gasse));
  let p = $derived(app.profil);
  let dialog = $state<string[] | null>(null);

  $effect(() => {
    if (p && !p.gesehen.gassen.includes(gasse) && dialog === null && GASSE_BEGRUESSUNG[gasse]) {
      dialog = GASSE_BEGRUESSUNG[gasse] ?? null;
    }
  });

  function begruessungFertig() {
    dialog = null;
    app.aendereProfil((q) => (q.gesehen.gassen.includes(gasse) ? q : { ...q, gesehen: { ...q.gesehen, gassen: [...q.gesehen.gassen, gasse] } }));
  }

  function katzeEntdeckt() {
    const e = ENTDECKUNGEN.katze;
    if (!p || !e) return;
    app.spieleKlang('jubel');
    if (!p.gesehen.entdeckungen.includes('katze')) {
      app.aendereProfil((q) => ({ ...q, gesehen: { ...q.gesehen, entdeckungen: [...q.gesehen.entdeckungen, 'katze'] } }));
      app.melde(`Neu im Entdeckerbuch: ${e.titel}`);
    } else {
      app.melde(e.text);
    }
  }

  const lampen = Array.from({ length: 24 }, (_, i) => i);
  const wimpelFarben = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'];
</script>

{#if p && info}
  <Kopfzeile titel={info.name} zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="strasse" style="--gasse: {info.farbe}">
    <div class="reihe">
      {#if p.deko.includes('lichterkette')}
        <div class="kette licht" aria-hidden="true">
          {#each lampen as i (i)}<span style="animation-delay: {(i % 6) * 0.3}s"></span>{/each}
        </div>
      {/if}
      {#if p.deko.includes('wimpel')}
        <div class="kette wimpel" aria-hidden="true">
          {#each lampen as i (i)}<span style="--f: {wimpelFarben[i % wimpelFarben.length]}"></span>{/each}
        </div>
      {/if}
      {#each buden as b (b.id)}
        {@const zustand = b.spielbar ? budenZustand(p, b.id) : 'zu'}
        <div class="platz">
          {#if b.spielbar}
            {@const mitKatze = b.id === 'dartbude' && istGeschafft(p, b.id, 'bronze')}
            <div class="stand">
              <button class="bude-knopf" onclick={() => app.zeige({ name: 'bude', bude: b.id })} aria-label="{b.name} öffnen">
                <BudeStand {zustand} farbe={info.farbe} besitzer={b.id === 'dartbude'} katze={mitKatze} />
              </button>
              {#if mitKatze}
                <button class="katze-knopf" onclick={katzeEntdeckt} aria-label="Katze auf dem Dach"></button>
              {/if}
            </div>
          {:else}
            <div class="bude-knopf zu"><BudeStand zustand="zu" farbe={info.farbe} /></div>
          {/if}
          <div class="schild">
            <span class="name">{b.name}</span>
            {#if !b.spielbar}<span class="bald">Bald geöffnet</span>{/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if dialog}
    <Sprechblase saetze={dialog} onfertig={begruessungFertig} />
  {/if}
{/if}

<style>
  .strasse {
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x proximity;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    padding-bottom: var(--unten);
  }
  .reihe {
    position: relative;
    display: flex;
    align-items: flex-end;
    gap: clamp(12px, 3vw, 28px);
    padding: 40px var(--rand-r) 16px var(--rand);
    min-width: max-content;
    height: 100%;
    max-height: 520px;
    margin-top: auto;
  }
  .reihe::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 42px;
    background: repeating-linear-gradient(90deg, #d9b98a 0 40px, #cfae7d 40px 80px);
    border-top: 4px solid var(--holz-dunkel);
    z-index: -1;
  }
  .platz {
    width: clamp(170px, 40vh, 330px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    scroll-snap-align: center;
  }
  .bude-knopf {
    width: 100%;
    border: 0;
    background: none;
    padding: 0;
  }
  .stand {
    position: relative;
    width: 100%;
  }
  .katze-knopf {
    position: absolute;
    left: 63%;
    top: -5%;
    width: 26%;
    height: 16%;
    border: 0;
    background: transparent;
    border-radius: 12px;
  }
  .bude-knopf.zu {
    opacity: 0.9;
  }
  .schild {
    background: var(--holz);
    color: #fff;
    border: 3px solid var(--holz-dunkel);
    border-radius: 8px;
    padding: 4px 10px;
    text-align: center;
    min-height: 2.6em;
    display: grid;
    place-content: center;
  }
  .schild .name {
    font-weight: 900;
    line-height: 1.15;
  }
  .bald {
    font-size: 0.85rem;
    opacity: 0.9;
  }
  .kette {
    position: absolute;
    left: 0;
    right: 0;
    top: 6px;
    height: 30px;
    display: flex;
    justify-content: space-around;
    border-top: 2px solid #4a5394;
    border-radius: 0 0 50% 50% / 0 0 18px 18px;
    pointer-events: none;
  }
  .kette.wimpel {
    top: 18px;
  }
  .kette.licht span {
    width: 10px;
    height: 12px;
    border-radius: 50%;
    background: #ffe57a;
    margin-top: 2px;
    box-shadow: 0 0 8px #ffe57a;
    animation: funkeln 1.8s ease-in-out infinite;
  }
  .kette.wimpel span {
    width: 0;
    height: 0;
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-top: 16px solid var(--f);
  }
  @keyframes funkeln {
    50% {
      opacity: 0.55;
    }
  }
</style>
