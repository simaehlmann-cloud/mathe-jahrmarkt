<script lang="ts">
  import { DEKO, dekoKaufen } from '../../domain/deko';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /** Andenkenstand: Taler gegen Deko, feste Preise, kein echtes Geld, keine Zufallsgewinne. */
  let p = $derived(app.profil);

  function kaufe(id: string, name: string) {
    const q = app.profil;
    if (!q) return;
    const e = dekoKaufen(q, id);
    if (e.ok) {
      app.aendereProfil(() => e.profil);
      app.spieleKlang('jubel');
      app.melde(`${name} gehört jetzt dir!`);
    } else if (e.grund === 'zuWenig') {
      app.melde('Dafür brauchst du noch mehr Taler. Jede Runde bringt 10.');
    }
  }
</script>

{#if p}
  <Kopfzeile titel="Andenkenstand" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="seite">
    <p class="erklaerung">Für jede gespielte Runde gibt es 10 Taler. Hier tauschst du sie gegen Deko für den Jahrmarkt.</p>
    <ul class="regal">
      {#each DEKO as d (d.id)}
        {@const hat = p.deko.includes(d.id)}
        <li class="tafel">
          <div class="markise"></div>
          <div class="inhalt">
            <h2>{d.name}</h2>
            <p>{d.beschreibung}</p>
            {#if hat}
              <p class="hat"><Icon name="haken" groesse={20} /> Gehört dir</p>
            {:else}
              <button class="ticket" disabled={p.taler < d.preis} onclick={() => kaufe(d.id, d.name)}>
                <Icon name="taler" groesse={22} />{d.preis}
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .seite {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 4px var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
    display: grid;
    gap: 14px;
    align-content: start;
    justify-items: center;
  }
  .erklaerung {
    max-width: 36rem;
    font-weight: 800;
    background: var(--papier);
    border-radius: 12px;
    padding: 8px 14px;
  }
  .regal {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 14px;
    width: min(100%, 60rem);
  }
  .inhalt {
    padding: 10px 14px 14px;
    display: grid;
    gap: 8px;
    justify-items: start;
  }
  h2 {
    font-size: 1.2rem;
  }
  .hat {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-weight: 900;
    color: var(--wiese-dunkel);
  }
</style>
