<script lang="ts">
  import { FEIER_BLOECKE, type Feier } from '../../domain/belohnungen';
  import Flinka from '../grafik/Flinka.svelte';
  import Icon from './Icon.svelte';

  /** Feier für eine fertige Gasse oder das Sommerfest: Konfetti bzw. Feuerwerk, Flinka, Belohnung. */
  let { feier, onweiter }: { feier: Feier; onweiter: () => void } = $props();
  const FARBEN = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7', '#fff'];
  const teile = Array.from({ length: 46 }, (_, i) => ({
    x: (i * 37) % 100,
    v: 2.4 + ((i * 13) % 20) / 10,
    d: ((i * 7) % 30) / 10,
    f: FARBEN[i % FARBEN.length],
    r: (i * 47) % 360,
  }));
  const raketen = Array.from({ length: 7 }, (_, i) => ({ x: 10 + ((i * 29) % 80), y: 12 + ((i * 17) % 30), d: i * 0.45, f: FARBEN[i % 5] }));
  const fest = $derived(feier.art === 'sommerfest');
</script>

<div class="feier" class:fest role="dialog" aria-modal="true" aria-labelledby="feier-titel">
  <div class="himmel" aria-hidden="true">
    {#if fest}
      {#each raketen as r, i (i)}
        <span class="rakete" style="left: {r.x}%; top: {r.y}%; animation-delay: {r.d}s; --f: {r.f}">
          {#each Array(12) as _, k (k)}<i style="--w: {k * 30}deg"></i>{/each}
        </span>
      {/each}
    {/if}
    {#each teile as t, i (i)}
      <span class="konfetti" style="left: {t.x}%; animation-duration: {t.v}s; animation-delay: {t.d}s; background: {t.f}; rotate: {t.r}deg"></span>
    {/each}
  </div>
  <div class="tafel karte">
    <div class="markise"></div>
    <div class="inhalt">
      <div class="flinka"><Flinka groesse={96} winkt /></div>
      {#if feier.art === 'gasse'}
        <h2 id="feier-titel">{feier.name} komplett!</h2>
        <p>Alle Buden dieser Gasse laufen wieder. Die ganze Gasse leuchtet – das hast du geschafft!</p>
      {:else}
        <h2 id="feier-titel">Das Sommerfest kann beginnen!</h2>
        <p>Der ganze Jahrmarkt läuft wieder. Lichter, Musik, Fahrgeschäfte – alles dank dir. Danke!</p>
      {/if}
      <p class="belohnung"><Icon name="block" groesse={24} /> +{FEIER_BLOECKE} Blöcke · <Icon name="album" groesse={22} /> neue Sammelkarte</p>
      <button class="ticket rot" onclick={onweiter}>Weiter</button>
    </div>
  </div>
</div>

<style>
  .feier {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 16px;
    background: radial-gradient(circle at 50% 40%, rgb(255 230 140 / 0.55), rgb(31 42 107 / 0.6));
    overflow: hidden;
  }
  .feier.fest {
    background: radial-gradient(circle at 50% 40%, #3b3f86, #141634);
  }
  .himmel {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .konfetti {
    position: absolute;
    top: -20px;
    width: 10px;
    height: 16px;
    border-radius: 2px;
    animation: fallen linear infinite;
  }
  @keyframes fallen {
    to {
      transform: translateY(110vh) rotate(540deg);
    }
  }
  .rakete {
    position: absolute;
    width: 0;
    height: 0;
    animation: platzen 2.4s ease-out infinite;
  }
  .rakete i {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--f);
    box-shadow: 0 0 8px var(--f);
    transform: rotate(var(--w)) translateX(0);
    animation: funke 2.4s ease-out infinite;
    animation-delay: inherit;
  }
  @keyframes funke {
    0% {
      transform: rotate(var(--w)) translateX(0);
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      transform: rotate(var(--w)) translateX(70px);
      opacity: 0;
    }
  }
  .karte {
    position: relative;
    width: min(100%, 26rem);
    animation: rein 0.5s cubic-bezier(0.2, 1.4, 0.4, 1);
  }
  @keyframes rein {
    from {
      transform: scale(0.6);
      opacity: 0;
    }
  }
  .inhalt {
    padding: 10px 18px 18px;
    display: grid;
    gap: 10px;
    justify-items: center;
    text-align: center;
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: 1.6rem;
  }
  .belohnung {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-weight: 900;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
