<script lang="ts">
  // "8. Tag" ohne Leerzeichen, sonst "8 Gondeln"
  const mitEinheit = (z: string | number, e: string): string => (e.startsWith('.') ? `${z}${e}` : `${z} ${e}`.trim());
  import Tastenfeld from '../../buden/spiele/Tastenfeld.svelte';
  import { wochenKennung } from '../../domain/belohnungen';
  import { KNOBEL_TALER, RAETSEL_BLOECKE, knobelRunde, raetselDerWoche, type KnobelStufe, type Knobelaufgabe } from '../../domain/knobel';
  import type { Ereignis } from '../../domain/lernprofil/lernprofil';
  import { createRng, randomSeed } from '../../domain/rng';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Knobelzelt: Sachaufgaben Schritt für Schritt (Probleme lösen, Modellieren) und das Rätsel der Woche.
   * Pro Schritt: eintippen, bei Bedarf Tipp; nach drei Fehlversuchen wird der Schritt gezeigt.
   */
  let p = $derived(app.profil);
  const woche = wochenKennung(new Date());
  const raetsel = raetselDerWoche(woche);
  let raetselGeloest = $derived(p?.belohnt.includes(`raetsel:${woche}`) ?? false);

  let phase = $state<'start' | 'aufgabe' | 'ende' | 'raetsel'>('start');
  let aufgaben = $state<Knobelaufgabe[]>([]);
  let nr = $state(0);
  let schritt = $state(0);
  let versuche = $state(0);
  let tippZeigen = $state(false);
  let eingabe = $state('');
  let wackeln = $state(false);
  /** Je Aufgabe: ohne Fehler gelöst? */
  let ohneFehler = $state<boolean[]>([]);
  let fehlerInAufgabe = false;
  let aufgedeckt = $state<boolean[]>([]);
  let start = 0;
  let ereignisse: Ereignis[] = [];

  let a = $derived(aufgaben[nr]);
  let s = $derived(a?.schritte[schritt]);

  function starten(stufe: KnobelStufe) {
    aufgaben = knobelRunde(createRng(randomSeed()), stufe);
    nr = 0;
    ohneFehler = [];
    ereignisse = [];
    neueAufgabe();
    phase = 'aufgabe';
  }
  function neueAufgabe() {
    schritt = 0;
    versuche = 0;
    tippZeigen = false;
    eingabe = '';
    fehlerInAufgabe = false;
    aufgedeckt = [];
    start = performance.now();
    vorlesen();
  }
  function vorlesen() {
    const x = aufgaben[nr];
    if (x && app.einstellungen.stimmeAn) app.sprich(`${x.geschichte} ${x.schritte[0]?.frage ?? ''}`);
  }
  function wackle() {
    wackeln = true;
    setTimeout(() => (wackeln = false), 400);
  }
  function ok() {
    if (!a || !s) return;
    if (Number(eingabe) === s.antwort) {
      app.spieleKlang('richtig');
      weiterSchritt(false);
      return;
    }
    app.spieleKlang('fehler');
    fehlerInAufgabe = true;
    versuche++;
    eingabe = '';
    wackle();
    if (versuche >= 2) tippZeigen = true;
    if (versuche >= 3) weiterSchritt(true);
  }
  function weiterSchritt(zeigen: boolean) {
    if (!a) return;
    aufgedeckt = [...aufgedeckt, zeigen];
    eingabe = '';
    versuche = 0;
    tippZeigen = false;
    if (schritt + 1 < a.schritte.length) {
      schritt++;
      if (app.einstellungen.stimmeAn) app.sprich(a.schritte[schritt]?.frage ?? '');
      return;
    }
    schritt = a.schritte.length;
    ohneFehler = [...ohneFehler, !fehlerInAufgabe];
    ereignisse.push({
      t: Date.now(),
      bude: 'knobelzelt',
      kompetenz: a.kompetenz,
      dimension: 'anwendung',
      richtig: !fehlerInAufgabe,
      ms: Math.round(performance.now() - start),
      gewertet: true,
    });
    if (!fehlerInAufgabe) app.spieleKlang('jubel');
  }
  function naechsteAufgabe() {
    if (nr + 1 < aufgaben.length) {
      nr++;
      neueAufgabe();
      return;
    }
    const geloest = ohneFehler.filter(Boolean).length;
    app.ereignisseAnhaengen(ereignisse);
    app.aendereProfil((q) => ({ ...q, taler: q.taler + geloest * KNOBEL_TALER, bau: { ...q.bau, bloecke: q.bau.bloecke + aufgaben.length } }));
    app.wochenzielPruefen();
    phase = 'ende';
  }

  /* ---------- Rätsel der Woche ---------- */
  let rVersuche = $state(0);
  let rTipps = $state(0);
  let rEingabe = $state('');
  let rStatus = $state<'' | 'falsch' | 'richtig' | 'gezeigt'>('');
  function raetselOk() {
    if (Number(rEingabe) === raetsel.antwort) {
      rStatus = 'richtig';
      app.spieleKlang('jubel');
      const k = `raetsel:${woche}`;
      app.aendereProfil((q) => (q.belohnt.includes(k) ? q : { ...q, belohnt: [...q.belohnt, k], bau: { ...q.bau, bloecke: q.bau.bloecke + RAETSEL_BLOECKE } }));
      return;
    }
    app.spieleKlang('fehler');
    rStatus = 'falsch';
    rVersuche++;
    rEingabe = '';
    wackle();
  }
</script>

{#if p}
  <Kopfzeile titel="Knobelzelt" zurueck={() => (phase === 'start' ? app.zeige({ name: 'jahrmarkt' }) : (phase = 'start'))} />
  <div class="zelt">
    {#if phase === 'start'}
      <div class="tafel karte">
        <div class="markise lila"></div>
        <div class="inhalt">
          <h2>Knobelaufgaben</h2>
          <p>Fünf Aufgaben aus dem Jahrmarkt-Alltag. Lies genau, rechne Schritt für Schritt. Wenn du hängst, hilft ein Tipp.</p>
          <div class="stufen">
            <button class="stufe" onclick={() => starten(1)}><strong>Leicht</strong><span>kleine Zahlen</span></button>
            <button class="stufe" onclick={() => starten(2)}><strong>Mittel</strong><span>größere Zahlen</span></button>
            <button class="stufe" onclick={() => starten(3)}><strong>Knifflig</strong><span>mit Kommazahlen und Extras</span></button>
          </div>
        </div>
      </div>
      <button class="tafel karte raetsel-karte" onclick={() => { phase = 'raetsel'; rStatus = raetselGeloest ? 'richtig' : ''; }}>
        <span class="symbol" aria-hidden="true">?</span>
        <span><strong>Rätsel der Woche</strong><br />{raetsel.titel}{raetselGeloest ? ' – gelöst!' : ` · +${RAETSEL_BLOECKE} Blöcke`}</span>
      </button>
    {:else if phase === 'aufgabe' && a}
      <div class="fortschritt" aria-label="Aufgabe {nr + 1} von {aufgaben.length}">
        {#each aufgaben as _, i (i)}<span class:fertig={i < nr} class:jetzt={i === nr}></span>{/each}
      </div>
      <div class="tafel aufgabe">
        <div class="kopf">
          <h2>{a.titel}</h2>
          <button class="rund" onclick={() => app.sprich(`${a.geschichte} ${s?.frage ?? ''}`, true)} aria-label="Vorlesen"><Icon name="laut" /></button>
        </div>
        <p class="geschichte">{a.geschichte}</p>
        {#if a.tabelle}
          <table>
            <tbody>{#each a.tabelle as [x, y] (x)}<tr><th>{x}</th><td>{y}</td></tr>{/each}</tbody>
          </table>
        {/if}
        <ol class="schritte">
          {#each a.schritte as sch, i (i)}
            {#if i < schritt}
              <li class="erledigt" class:aufgedeckt={aufgedeckt[i]}>
                <span>{sch.frage}</span>
                <b>{mitEinheit(sch.antwort, sch.einheit)}</b>
                <small>{sch.loesung}</small>
              </li>
            {:else if i === schritt}
              <li class="jetzt" class:wackeln>
                <span>{sch.frage}</span>
                <b class="eingabe">{mitEinheit(eingabe || '?', sch.einheit)}</b>
                {#if tippZeigen}<small class="tipp">Tipp: {sch.tipp}</small>{/if}
              </li>
            {/if}
          {/each}
        </ol>
        {#if schritt >= a.schritte.length}
          <p class="fazit">{ohneFehler[nr] ? 'Super gelöst – ganz ohne Fehler!' : 'Geschafft! Schau dir die Rechenwege oben noch einmal an.'}</p>
          <button class="ticket rot" onclick={naechsteAufgabe}>{nr + 1 < aufgaben.length ? 'Nächste Aufgabe' : 'Fertig'}</button>
        {/if}
      </div>
      {#if s}
        <div class="werkzeug">
          {#if !tippZeigen}<button class="ticket hell tipp-knopf" onclick={() => (tippZeigen = true)}>Tipp</button>{/if}
          <Tastenfeld bind:wert={eingabe} maxStellen={6} onok={ok} />
        </div>
      {/if}
    {:else if phase === 'ende'}
      <div class="tafel karte">
        <div class="markise lila"></div>
        <div class="inhalt mitte">
          <h2>Knobelrunde geschafft!</h2>
          <p class="gross">{ohneFehler.filter(Boolean).length} von {aufgaben.length}</p>
          <p>Aufgaben ganz ohne Fehler gelöst.</p>
          <p class="belohnung"><Icon name="taler" groesse={22} /> +{ohneFehler.filter(Boolean).length * KNOBEL_TALER} Taler · <Icon name="block" groesse={22} /> +{aufgaben.length} Blöcke</p>
          <div class="knoepfe">
            <button class="ticket hell" onclick={() => app.zeige({ name: 'jahrmarkt' })}>Zum Jahrmarkt</button>
            <button class="ticket rot" onclick={() => (phase = 'start')}>Noch eine Runde</button>
          </div>
        </div>
      </div>
    {:else if phase === 'raetsel'}
      <div class="tafel aufgabe" class:wackeln>
        <div class="kopf">
          <h2>Rätsel der Woche: {raetsel.titel}</h2>
          <button class="rund" onclick={() => app.sprich(raetsel.text, true)} aria-label="Vorlesen"><Icon name="laut" /></button>
        </div>
        <p class="geschichte">{raetsel.text}</p>
        {#each raetsel.tipps.slice(0, rTipps) as t, i (i)}<p class="tipp">Tipp {i + 1}: {t}</p>{/each}
        {#if rStatus === 'richtig' || rStatus === 'gezeigt'}
          <p class="fazit">{rStatus === 'richtig' ? `Richtig: ${mitEinheit(raetsel.antwort, raetsel.einheit)}!` : `Die Lösung: ${mitEinheit(raetsel.antwort, raetsel.einheit)}`}</p>
          <p>{raetsel.loesung}</p>
          {#if rStatus === 'richtig'}<p class="belohnung"><Icon name="album" groesse={22} /> Sammelkarte „Rätselfuchs“ · <Icon name="block" groesse={22} /> +{RAETSEL_BLOECKE} Blöcke</p>{/if}
          <button class="ticket hell" onclick={() => (phase = 'start')}>Zurück zum Zelt</button>
        {:else}
          <p class="eingabe gross-eingabe">{mitEinheit(rEingabe || '?', raetsel.einheit)}</p>
          {#if rStatus === 'falsch'}<p class="nein" role="status">Noch nicht. Denk noch einmal nach!</p>{/if}
        {/if}
      </div>
      {#if rStatus !== 'richtig' && rStatus !== 'gezeigt'}
        <div class="werkzeug">
          <div class="reihe">
            {#if rTipps < 2}<button class="ticket hell" onclick={() => rTipps++}>Tipp {rTipps + 1}</button>{/if}
            {#if rVersuche >= 3}<button class="ticket hell" onclick={() => (rStatus = 'gezeigt')}>Lösung zeigen</button>{/if}
          </div>
          <Tastenfeld bind:wert={rEingabe} maxStellen={6} onok={raetselOk} />
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .zelt {
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
  .markise.lila {
    background: repeating-linear-gradient(90deg, #7b5ea7 0 28px, #fff 28px 56px);
  }
  .karte,
  .aufgabe {
    width: min(100%, 34rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  .mitte {
    text-align: center;
  }
  h2,
  p {
    margin: 0;
  }
  .stufen {
    display: grid;
    gap: 8px;
  }
  .stufe {
    display: grid;
    text-align: left;
    padding: 10px 14px;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    background: #fff;
    color: var(--tinte);
    font: inherit;
  }
  .stufe strong {
    font-size: 1.2rem;
  }
  .raetsel-karte {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 14px 18px;
    text-align: left;
    color: var(--tinte);
    font: inherit;
    background: linear-gradient(135deg, #efe7fb, #fffdf7);
  }
  .symbol {
    width: 56px;
    height: 56px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #7b5ea7;
    color: #fff;
    font-size: 2rem;
    font-weight: 900;
  }
  .fortschritt {
    display: flex;
    gap: 6px;
  }
  .fortschritt span {
    width: 26px;
    height: 10px;
    border-radius: 5px;
    border: 2px solid var(--tinte);
    background: #fff;
  }
  .fortschritt .fertig {
    background: var(--tinte);
  }
  .fortschritt .jetzt {
    background: var(--senf);
  }
  .aufgabe {
    padding: 14px 16px;
    display: grid;
    gap: 10px;
  }
  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .geschichte {
    font-size: 1.1rem;
    line-height: 1.4;
    font-weight: 700;
  }
  table {
    border-collapse: collapse;
    justify-self: start;
    background: #fff;
  }
  th,
  td {
    border: 2px solid var(--tinte);
    padding: 4px 12px;
    text-align: left;
  }
  .schritte {
    margin: 0;
    padding-left: 1.3rem;
    display: grid;
    gap: 8px;
  }
  .schritte li {
    display: grid;
    gap: 2px;
    padding: 6px 10px;
    border-radius: 10px;
  }
  .schritte li.erledigt {
    background: #e7f6ec;
  }
  .schritte li.aufgedeckt {
    background: #fff4c2;
  }
  .schritte li.jetzt {
    background: #fff;
    border: 3px solid var(--tinte);
  }
  .schritte small {
    color: var(--tinte-weich);
    font-weight: 700;
  }
  .eingabe {
    font-size: 1.4rem;
    color: var(--markise-dunkel);
  }
  .gross-eingabe {
    font-size: 2rem;
    font-weight: 900;
    text-align: center;
  }
  .tipp {
    color: #7b5ea7 !important;
    font-weight: 800;
  }
  .nein {
    color: var(--markise-dunkel);
    font-weight: 800;
    text-align: center;
  }
  .wackeln {
    animation: wackeln 0.4s;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .fazit {
    font-weight: 900;
    color: var(--wiese-dunkel);
  }
  .werkzeug {
    display: grid;
    gap: 8px;
    justify-items: center;
  }
  .reihe {
    display: flex;
    gap: 8px;
  }
  .tipp-knopf {
    min-height: 40px;
  }
  .gross {
    font-size: 2.6rem;
    font-weight: 900;
  }
  .belohnung {
    display: inline-flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
    font-weight: 900;
    flex-wrap: wrap;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
