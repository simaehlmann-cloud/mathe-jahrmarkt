<script lang="ts">
  import { BUDEN } from '../../domain/buden';
  import { KOMPETENZEN, KOMPETENZ_REIHENFOLGE } from '../../domain/kompetenzen/modell';
  import { STATUS_TEXT, einschaetzen, type Status } from '../../domain/lernprofil/lernprofil';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { ENTDECKUNGEN } from '../geschichte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';

  /**
   * „Mein Mathe-Profil“ für das Kind: drei Wörter statt Zahlen, keine Noten.
   * Kompetenzen ohne genug Daten zeigen „Wir lernen uns noch kennen“.
   */
  let p = $derived(app.profil);
  // Nur Kompetenzen, zu denen es schon eine spielbare Bude gibt
  const sichtbar = KOMPETENZ_REIHENFOLGE.filter((k) => BUDEN.some((b) => b.spielbar && b.kompetenzen.some((x) => x.kompetenz === k)));
  const bald = KOMPETENZ_REIHENFOLGE.filter((k) => !sichtbar.includes(k));

  const BREITE: Record<Status, number> = { kennenlernen: 0, weiterUeben: 0.45, aufGutemWeg: 0.72, sicher: 0.94 };
  const ABZEICHEN_NAME = { durchhalte: 'Durchhalte-Abzeichen', entdecker: 'Entdecker-Abzeichen', budenmeister: 'Budenmeister', strategie: 'Strategie-Abzeichen' } as const;
</script>

{#if p}
  <Kopfzeile titel="Mein Mathe-Profil" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="seite">
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <div class="wer">
          <Figur figur={p.figur} groesse={52} hut={p.deko.includes('hut')} />
          <h2>{p.name}</h2>
        </div>
        <ul class="balken">
          {#each sichtbar as k (k)}
            {@const e = einschaetzen(p.ereignisse, k)}
            <li>
              <div class="zeile">
                <span class="k">{KOMPETENZEN[k].name}</span>
                <span class="s {e.status}">{STATUS_TEXT[e.status]}</span>
              </div>
              <div class="spur" role="img" aria-label="{KOMPETENZEN[k].name}: {STATUS_TEXT[e.status]}">
                <div class="fuellung {e.status}" style="width: {BREITE[e.status] * 100}%"></div>
              </div>
              {#if e.status === 'kennenlernen'}
                <p class="klein">Noch ein paar Runden, dann weiß ich mehr.</p>
              {/if}
            </li>
          {/each}
        </ul>
        {#if bald.length}
          <p class="klein">Bald kommen dazu: {bald.map((k) => KOMPETENZEN[k].name).join(', ')}.</p>
        {/if}
      </div>
    </div>

    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <h2>Abzeichen</h2>
        {#if p.abzeichen.length === 0}
          <p class="klein">Noch keine. Wenn du nach einem Fehler dranbleibst und die nächste Aufgabe schaffst, gibt es das Durchhalte-Abzeichen.</p>
        {:else}
          <ul class="liste">
            {#each p.abzeichen as a (a.id + a.bezug)}<li>{ABZEICHEN_NAME[a.id]}</li>{/each}
          </ul>
        {/if}
        <h2>Entdeckerbuch</h2>
        {#if p.gesehen.entdeckungen.length === 0}
          <p class="klein">Auf dem Jahrmarkt gibt es kleine Dinge zu entdecken. Schau genau hin!</p>
        {:else}
          <ul class="liste">
            {#each p.gesehen.entdeckungen as id (id)}
              {@const e = ENTDECKUNGEN[id]}
              {#if e}<li><strong>{e.titel}:</strong> {e.text}</li>{/if}
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .seite {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: grid;
    gap: 14px;
    padding: 4px var(--rand-r) var(--unten) var(--rand);
    justify-items: center;
    align-content: start;
    position: relative;
    z-index: 1;
  }
  @media (orientation: landscape) and (min-width: 800px) {
    .seite {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }
  .karte {
    width: min(100%, 32rem);
  }
  .inhalt {
    padding: 12px 18px 18px;
    display: grid;
    gap: 12px;
  }
  .wer {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .balken {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 14px;
  }
  .zeile {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    column-gap: 10px;
    margin-bottom: 4px;
  }
  .k {
    font-weight: 800;
  }
  .s {
    font-size: 0.9rem;
    font-weight: 800;
  }
  .spur {
    height: 12px;
    border-radius: 6px;
    background: #eceef5;
    overflow: hidden;
    border: 2px dashed #c9cde0;
  }
  .fuellung {
    height: 100%;
    border-radius: 6px;
  }
  .fuellung.sicher {
    background: var(--wiese);
  }
  .fuellung.aufGutemWeg {
    background: var(--senf-dunkel);
  }
  .fuellung.weiterUeben {
    background: #e07a4f;
  }
  .klein {
    font-size: 0.95rem;
    color: var(--tinte-weich);
  }
  h2 {
    font-size: 1.25rem;
  }
  .liste {
    margin: 0;
    padding-left: 1.2em;
    display: grid;
    gap: 4px;
  }
</style>
