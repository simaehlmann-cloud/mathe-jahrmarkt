<script lang="ts">
  import { STUFEN_NAME, budeInfo } from '../../domain/buden';
  import { ABSTAENDE_TAGE, TALER_PRO_FUNDSACHE, abholStapel, naechsteRueckkehr, tageBis } from '../../domain/fundbuero';
  import { stufeFreigabe } from '../../domain/fortschritt/kaufgrenze';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Fundbüro: Hier landen Aufgaben, bei denen man sich vertan hat. Sie kommen nach 1, 3 und 7 Tagen wieder;
   * abgeholt wird in der passenden Bude, mit ähnlichen Aufgaben.
   */
  let p = $derived(app.profil);
  const jetzt = Date.now();
  let stapel = $derived(p ? abholStapel(p.fundbuero, jetzt).filter((s) => stufeFreigabe(p, s.bude, s.stufe, app.paket).frei) : []);
  let wartend = $derived(p ? p.fundbuero.filter((f) => f.faellig > jetzt).length : 0);
  let naechste = $derived(p ? naechsteRueckkehr(p.fundbuero, jetzt) : undefined);
  const wann = (t: number): string => {
    const d = tageBis(t, jetzt);
    return d <= 1 ? 'morgen' : `in ${d} Tagen`;
  };
  const FACH = ['erstes', 'zweites', 'drittes'];
</script>

{#if p}
  <Kopfzeile titel="Fundbüro" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="buero">
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <h2>Was verloren? Hier wird es gefunden!</h2>
        <p>
          Wenn du dich bei einer Aufgabe vertust, landet sie im Fundbüro. Sie kommt nach {ABSTAENDE_TAGE.join(', ').replace(/, (\d+)$/, ' und $1')} Tagen
          wieder – jedes Mal mit neuen Zahlen. Wer sie dreimal löst, hat sie sicher im Kopf.
        </p>
        <p class="taler"><Icon name="taler" groesse={22} /> {TALER_PRO_FUNDSACHE} Taler für jede wiedergefundene Aufgabe</p>
      </div>
    </div>

    {#if stapel.length}
      <h3>Heute abholen</h3>
      <ul class="liste">
        {#each stapel as s (`${s.bude}-${s.stufe}`)}
          <li>
            <button class="tafel abholen" onclick={() => app.zeige({ name: 'spiel', bude: s.bude, stufe: s.stufe, fundbuero: true, n: Date.now() })}>
              <span class="kiste" aria-hidden="true">{s.sachen.length}</span>
              <span class="text">
                <strong>{budeInfo(s.bude).name} · {STUFEN_NAME[s.stufe]}</strong>
                <small>{s.sachen.length === 1 ? '1 Aufgabe' : `${s.sachen.length} Aufgaben`} · {FACH[Math.max(...s.sachen.map((x) => x.fach))]} Wiedersehen</small>
              </span>
              <span class="los">Abholen</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="leer">{p.fundbuero.length ? 'Heute liegt nichts zum Abholen bereit.' : 'Das Fundbüro ist leer. Prima!'}</p>
    {/if}
    {#if wartend && naechste}
      <p class="bald">{wartend === 1 ? 'Eine Aufgabe kommt' : `${wartend} Aufgaben kommen`} später zurück, die nächste {wann(naechste)}.</p>
    {/if}
  </div>
{/if}

<style>
  .buero {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 12px;
  }
  .karte,
  .liste,
  h3,
  .leer,
  .bald {
    width: min(100%, 34rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 8px;
  }
  h2 {
    font-size: 1.3rem;
    margin: 0;
  }
  p {
    margin: 0;
  }
  .taler {
    display: flex;
    gap: 6px;
    align-items: center;
    font-weight: 800;
  }
  h3 {
    margin: 6px 0 0;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .abholen {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    text-align: left;
    font: inherit;
    color: var(--tinte);
    cursor: pointer;
  }
  .kiste {
    flex: none;
    width: 48px;
    height: 42px;
    border-radius: 8px;
    background: linear-gradient(#c98a4b 0 30%, #e0a868 30%);
    border: 3px solid var(--tinte);
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 1.2rem;
    color: #fff;
    text-shadow: 0 1px 0 var(--tinte);
  }
  .text {
    flex: 1;
    display: grid;
  }
  .text small {
    color: var(--tinte-weich, #5a628c);
  }
  .los {
    font-weight: 900;
    color: var(--rot, #e23a4e);
  }
  .leer,
  .bald {
    text-align: center;
    color: var(--tinte-weich, #5a628c);
  }
</style>
