<script lang="ts">
  import { STUFEN, STUFEN_NAME, budeInfo, type Stufe } from '../../domain/buden';
  import { budenZustand, istGeschafft, stufenStand } from '../../domain/fortschritt/fortschritt';
  import { stufeFreigabe } from '../../domain/fortschritt/kaufgrenze';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import BudeStand from '../grafik/BudeStand.svelte';
  import Figur from '../grafik/Figur.svelte';
  import { app } from '../zustand.svelte';

  let { bude }: { bude: string } = $props();
  let info = $derived(budeInfo(bude));
  let p = $derived(app.profil);

  // Vorgewählt: die höchste freie, noch nicht geschaffte Stufe
  let gewaehlt = $state<Stufe>('bronze');
  $effect.pre(() => {
    const q = app.profil;
    if (!q) return;
    const naechste = STUFEN.find((s) => !istGeschafft(q, bude, s) && stufeFreigabe(q, bude, s, app.paket).frei);
    gewaehlt = naechste ?? 'bronze';
  });

  let bestenliste = $derived(
    app.bestand.profile
      .map((q) => ({ p: q, rekord: stufenStand(q, bude, gewaehlt)?.rekord ?? 0 }))
      .filter((x) => x.rekord > 0)
      .sort((a, b) => b.rekord - a.rekord),
  );
  let verlauf = $derived(p ? (stufenStand(p, bude, gewaehlt)?.verlauf ?? []) : []);

  const SPERRTEXT = {
    paket: 'Gehört zum Zusatzpaket. Frag deine Eltern.',
    vorstufe: 'Schaffe erst die Stufe davor.',
    nichtSpielbar: 'Diese Bude öffnet bald.',
    abendmarkt: 'Öffnet am Abend.',
  } as const;

  function waehle(s: Stufe) {
    if (!p) return;
    const f = stufeFreigabe(p, bude, s, app.paket);
    app.spieleKlang('tipp');
    if (f.frei) gewaehlt = s;
    else if (f.grund) app.melde(SPERRTEXT[f.grund]);
  }

  function spielen() {
    if (!p || !stufeFreigabe(p, bude, gewaehlt, app.paket).frei) return;
    app.zeige({ name: 'spiel', bude, stufe: gewaehlt });
  }

  /** Kleine Verlaufskurve der letzten Runden. */
  function kurve(werte: number[]): string {
    if (werte.length < 2) return '';
    const max = Math.max(...werte, 1);
    return werte.map((w, i) => `${(i / (werte.length - 1)) * 140 + 5},${50 - (w / max) * 42}`).join(' ');
  }
</script>

{#if p}
  <Kopfzeile titel={info.name} zurueck={() => app.zeige({ name: 'gasse', gasse: info.gasse })} />
  <div class="vorplatz">
    <div class="bild">
      <BudeStand {bude} zustand={budenZustand(p, bude)} besitzer={bude === 'dartbude'} />
    </div>

    <div class="tafel seite">
      <div class="markise"></div>
      <div class="inhalt">
        <p class="mechanik">{info.mechanik}.</p>
        <div class="stufen" role="radiogroup" aria-label="Stufe wählen">
          {#each STUFEN as s (s)}
            {@const f = stufeFreigabe(p, bude, s, app.paket)}
            {@const st = stufenStand(p, bude, s)}
            <button
              class="stufe {s}"
              class:gewaehlt={gewaehlt === s}
              class:gesperrt={!f.frei}
              role="radio"
              aria-checked={gewaehlt === s}
              onclick={() => waehle(s)}
            >
              <span class="medaille" aria-hidden="true">
                {#if st?.geschafft}<Icon name="haken" groesse={20} />{:else if !f.frei}<Icon name="schloss" groesse={18} />{/if}
              </span>
              <span class="text">
                <strong>{STUFEN_NAME[s]}</strong>
                <span>{info.stufen[s]}</span>
              </span>
              {#if st && st.rekord > 0}<span class="rekord">Rekord {st.rekord}</span>{/if}
            </button>
          {/each}
        </div>

        {#if bestenliste.length > 0}
          <div class="familie">
            <h2>Familien-Bestenliste {STUFEN_NAME[gewaehlt]}</h2>
            <ol>
              {#each bestenliste as e (e.p.id)}
                <li class:ich={e.p.id === p.id}>
                  <Figur figur={e.p.figur} groesse={28} aussehen={e.p.aussehen} />
                  <span class="wer">{e.p.name}</span>
                  <span class="punkte">{e.rekord}</span>
                </li>
              {/each}
            </ol>
          </div>
        {/if}
        {#if verlauf.length >= 2}
          <div class="verlauf">
            <h2>Deine letzten Runden</h2>
            <svg viewBox="0 0 150 55" role="img" aria-label="Punkte der letzten {verlauf.length} Runden: {verlauf.join(', ')}">
              <polyline points={kurve(verlauf)} fill="none" stroke="var(--markise)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
            </svg>
          </div>
        {/if}
      </div>
    </div>
  </div>
  <!-- Feste Leiste: Der Spielen-Knopf ist auf jedem Bildschirm sofort sichtbar -->
  <div class="aktion">
    <button class="ticket rot spielen" onclick={spielen}>{STUFEN_NAME[gewaehlt]} spielen</button>
  </div>
  {#if app.flinka}
    <Sprechblase saetze={app.flinka} onfertig={() => (app.flinka = null)} />
  {/if}
{/if}

<style>
  .vorplatz {
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: grid;
    gap: 14px;
    padding: 4px var(--rand-r) 8px var(--rand);
    position: relative;
    z-index: 1;
    align-content: start;
  }
  @media (orientation: landscape) and (min-width: 700px) {
    .vorplatz {
      grid-template-columns: minmax(220px, 0.9fr) minmax(320px, 1.1fr);
      align-items: center;
    }
  }
  .bild {
    width: min(62vw, 30vh, 300px);
    justify-self: center;
    padding-top: 18px;
  }
  @media (orientation: landscape) and (min-width: 700px) {
    .bild {
      width: min(100%, 42vh, 320px);
    }
  }
  .aktion {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: center;
    padding: 10px var(--rand-r) var(--unten) var(--rand);
    background: linear-gradient(180deg, rgb(159 216 168 / 0) 0, #9fd8a8 40%);
  }
  .seite {
    width: min(100%, 32rem);
    justify-self: center;
  }
  .inhalt {
    padding: 12px 16px 16px;
    display: grid;
    gap: 12px;
  }
  .mechanik {
    font-weight: 800;
  }
  .stufen {
    display: grid;
    gap: 8px;
  }
  .stufe {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    padding: 8px 12px;
    border: 3px solid #c9cde0;
    border-radius: 12px;
    background: #fff;
    min-height: 56px;
  }
  .stufe.gewaehlt {
    border-color: var(--tinte);
    background: #fff4cc;
  }
  .stufe.gesperrt {
    color: #6b7191;
    background: #f1f2f7;
  }
  .medaille {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinte);
    color: var(--tinte);
  }
  .bronze .medaille {
    background: var(--bronze);
  }
  .silber .medaille {
    background: var(--silber);
  }
  .gold .medaille {
    background: var(--gold);
  }
  .text {
    display: grid;
    flex: 1;
    line-height: 1.25;
  }
  .text span {
    font-size: 0.92rem;
  }
  .rekord {
    font-size: 0.85rem;
    font-weight: 900;
    white-space: nowrap;
  }
  .spielen {
    width: min(100%, 32rem);
    font-size: 1.35rem;
    min-height: 60px;
  }
  h2 {
    font-size: 1rem;
    margin-bottom: 6px;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    counter-reset: platz;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    border-radius: 8px;
    counter-increment: platz;
  }
  li::before {
    content: counter(platz) '.';
    font-weight: 900;
    width: 1.4em;
  }
  li.ich {
    background: #fff4cc;
  }
  .wer {
    flex: 1;
  }
  .punkte {
    font-weight: 900;
  }
  .verlauf svg {
    width: 100%;
    max-width: 260px;
    height: auto;
    background: #fff;
    border-radius: 8px;
  }
</style>
