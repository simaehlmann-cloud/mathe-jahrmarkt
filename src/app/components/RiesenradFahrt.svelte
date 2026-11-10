<script lang="ts">
  import { GASSEN, STUFEN_NAME, TAGESBUDEN, budeInfo, type Stufe } from '../../domain/buden';
  import { hoechsteStufe } from '../../domain/fortschritt/fortschritt';
  import { naechsteStufe } from '../../domain/flinka';
  import type { Profil } from '../../domain/profil';
  import Riesenrad from '../grafik/Riesenrad.svelte';

  /**
   * Fahrt mit dem Riesenrad: Von oben sieht man den ganzen Jahrmarkt. Jede Gondel gehört zu einer Tagesbude;
   * die Liste zeigt, welche Medaille dort schon geschafft ist. Antippen führt zur Bude.
   */
  let { profil, paket, onzu, onbude }: { profil: Profil; paket: boolean; onzu: () => void; onbude: (id: string) => void } = $props();
  let gondeln = $derived(TAGESBUDEN.map((b) => hoechsteStufe(profil, b.id)));
  let an = $derived(gondeln.filter((g) => g).length);
  let naechste = $derived(naechsteStufe(profil, paket));
  let markiert = $state(-1);
  const ZEICHEN: Record<Stufe, string> = { bronze: 'B', silber: 'S', gold: 'G' };
</script>

<div class="fahrt" role="dialog" aria-modal="true" aria-labelledby="fahrt-titel">
  <div class="tafel karte">
    <header>
      <h2 id="fahrt-titel">Fahrt mit dem Riesenrad</h2>
      <button class="rund" onclick={onzu} aria-label="Fahrt beenden">✕</button>
    </header>
    <div class="oben">
      <div class="rad"><Riesenrad {gondeln} {markiert} /></div>
      <div class="erklaerung">
        <p><strong>{an} von {gondeln.length}</strong> Gondeln leuchten.</p>
        <p>Jede Bude, die du in Bronze schaffst, bringt Licht in ihre Gondel. Silber und Gold färben die Gondel neu.</p>
        {#if naechste}
          <button class="ticket gelb" onclick={() => onbude(naechste.bude)}>Nächster Schritt: {STUFEN_NAME[naechste.stufe]} bei {budeInfo(naechste.bude).name}</button>
        {:else}
          <p>Alles geschafft, was gerade möglich ist. Großartig!</p>
        {/if}
      </div>
    </div>
    <div class="liste">
      {#each GASSEN.filter((g) => TAGESBUDEN.some((b) => b.gasse === g.id)) as g (g.id)}
        <h3>{g.name}</h3>
        <ul>
          {#each TAGESBUDEN.filter((b) => b.gasse === g.id) as b (b.id)}
            {@const i = TAGESBUDEN.indexOf(b)}
            {@const s = gondeln[i]}
            <li>
              <button
                class="zeile"
                onclick={() => onbude(b.id)}
                onpointerenter={() => (markiert = i)}
                onpointerleave={() => (markiert = -1)}
                onfocus={() => (markiert = i)}
                onblur={() => (markiert = -1)}
                aria-label="{b.name}: {s ? `${STUFEN_NAME[s]} geschafft` : 'noch keine Medaille'}. Hingehen"
              >
                <span class="medaille m-{s ?? 'leer'}" aria-hidden="true">{s ? ZEICHEN[s] : ''}</span>
                <span class="name">{b.name}</span>
                <span class="stand">{s ? STUFEN_NAME[s] : 'noch dunkel'}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
  </div>
</div>

<style>
  .fahrt {
    position: absolute;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 12px;
    background: radial-gradient(circle at 50% 20%, rgb(140 190 255 / 0.6), rgb(31 42 107 / 0.7));
  }
  .tafel {
    width: min(100%, 40rem);
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 4px;
  }
  h2 {
    margin: 0;
    font-size: 1.3rem;
  }
  .oben {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0 16px;
  }
  .rad {
    flex: 0 0 min(42%, 11rem);
  }
  .erklaerung p {
    margin: 4px 0;
  }
  .erklaerung .ticket {
    margin-top: 6px;
    font-size: 0.95rem;
  }
  .liste {
    overflow: auto;
    padding: 4px 16px 16px;
  }
  h3 {
    font-size: 1rem;
    margin: 12px 0 4px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 6px;
  }
  .zeile {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 12px;
    border: 2px solid var(--linie, #eadfca);
    background: #fff;
    text-align: left;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .zeile:hover,
  .zeile:focus-visible {
    border-color: var(--rot, #e23a4e);
  }
  .name {
    flex: 1;
    font-weight: 800;
  }
  .stand {
    font-size: 0.85rem;
    color: var(--tinte-weich, #5a628c);
  }
  .medaille {
    flex: 0 0 auto;
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 0.85rem;
    border: 2px solid #1f2a6b;
    color: #1f2a6b;
  }
  .m-leer {
    background: #d7dae6;
    border-style: dashed;
  }
  .m-bronze {
    background: #c98a4b;
  }
  .m-silber {
    background: #c9d2de;
  }
  .m-gold {
    background: #f2b705;
  }
  @media (max-width: 30rem) {
    .oben {
      flex-direction: column;
    }
    .rad {
      width: 9rem;
    }
  }
</style>
