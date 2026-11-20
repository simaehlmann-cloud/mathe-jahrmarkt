<script lang="ts">
  import { DEKO, dekoKaufen } from '../../domain/deko';
  import { EINRICHTUNG, KATEGORIE_NAME, TIERE, kaufeEinrichtung, teilFrei, type Kategorie } from '../../domain/insel';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import TeilVorschau from '../grafik/TeilVorschau.svelte';
  import { app } from '../zustand.svelte';

  let { von }: { von?: 'insel' | undefined } = $props();
  /** Andenkenstand: Taler gegen Deko, feste Preise, kein echtes Geld, keine Zufallsgewinne. */
  let p = $derived(app.profil);
  /** Inselsachen nach Oberbegriffen. */
  let kategorie = $state<Kategorie>('bauen');
  const KATEGORIEN = Object.keys(KATEGORIE_NAME) as Kategorie[];
  let angebot = $derived(kategorie === 'tiere' ? TIERE.map((t) => ({ id: t.id, name: t.name, preis: t.preis })) : EINRICHTUNG.filter((e) => e.kategorie === kategorie));

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

  function kaufeTeil(id: number, name: string) {
    const q = app.profil;
    if (!q) return;
    const e = kaufeEinrichtung(q.insel, q.taler, id);
    if (!e.ok) {
      app.melde('Dafür brauchst du noch mehr Taler.');
      return;
    }
    app.aendereProfil((r) => ({ ...r, taler: e.taler, insel: e.stand }));
    app.spieleKlang('muenze');
    app.melde(`${name} liegt jetzt in deinem Bau-Inventar.`);
  }
</script>


{#if p}

{#snippet dekoLaden()}
    <p class="erklaerung">Für jede gespielte Runde gibt es 10 Taler – schaffst du eine Stufe zum ersten Mal, sogar 15 extra. Auch Aufträge und das Fundbüro bringen Taler. Hier tauschst du sie gegen Deko für den Jahrmarkt.</p>
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
{/snippet}

{#snippet inselLaden()}
    <h2 class="titel">Einrichtung für die Bauinsel</h2>
      <p class="erklaerung">Kaufe Türen, Möbel, Blumen und Tiere. Du setzt sie auf der Bauinsel wie Blöcke. Abbauen legt sie zurück ins Inventar. Tiere laufen auf der Insel umher. Auf Stuhl, Sessel, Sofa und Bank setzt sich deine Figur, ins Bett legt sie sich: im Laufen-Modus einfach antippen.</p>
      {#if !app.paket}<p class="erklaerung"><Icon name="schloss" groesse={18} /> Teile mit Schloss gehören zum Zusatzpaket.</p>{/if}
      <div class="kategorien" role="tablist" aria-label="Bereiche">
        {#each KATEGORIEN as k (k)}
          <button role="tab" aria-selected={kategorie === k} class:an={kategorie === k} onclick={() => (kategorie = k)}>{KATEGORIE_NAME[k]}</button>
        {/each}
      </div>
      <ul class="moebel">
        {#each angebot as e (e.id)}
          <li>
            <span class="bild"><TeilVorschau art={e.id} /></span>
            <strong>{e.name}</strong>
            <small>hast du: {p.insel.inventar[String(e.id)] ?? 0}</small>
            {#if teilFrei(e.id, app.paket)}
              <button class="ticket" disabled={p.taler < e.preis} onclick={() => kaufeTeil(e.id, e.name)} aria-label="{e.name} für {e.preis} Taler kaufen"><Icon name="taler" groesse={20} />{e.preis}</button>
            {:else}
              <span class="paket" aria-label="{e.name}: Zusatzpaket"><Icon name="schloss" groesse={18} /> Zusatzpaket</span>
            {/if}
          </li>
        {/each}
      </ul>
{/snippet}

  <Kopfzeile titel="Andenkenstand" zurueck={() => app.zeige(von === 'insel' ? { name: 'insel' } : { name: 'jahrmarkt' })} />
  <div class="seite">
    {#if von === 'insel'}
      {@render inselLaden()}
      {@render dekoLaden()}
    {:else}
      {@render dekoLaden()}
      {@render inselLaden()}
    {/if}
  </div>
{/if}

<style>
  .paket {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 900;
    font-size: 0.85rem;
    color: var(--tinte-weich);
  }
  .titel {
    margin: 6px 0 0;
  }
  .kategorien {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .kategorien button {
    min-height: 40px;
    padding: 4px 14px;
    border: 3px solid var(--tinte);
    border-radius: 20px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .kategorien button.an {
    background: var(--tinte);
    color: #fff;
  }
  .moebel {
    width: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  .moebel li {
    display: grid;
    gap: 4px;
    padding: 10px;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 12px;
  }
  .moebel .bild {
    justify-self: center;
  }
  .moebel small {
    color: var(--tinte-weich);
    font-weight: 700;
  }
  .moebel .ticket {
    min-height: 44px;
    font-size: 1rem;
  }
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
