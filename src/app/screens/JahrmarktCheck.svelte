<script lang="ts">
  import { BUDEN_DEFINITIONEN } from '../../buden';
  import Wahlknoepfe from '../../buden/gemeinsam/Wahlknoepfe.svelte';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { budeInfo } from '../../domain/buden';
  import { BEREICH_NAME, CHECK_PLAN, einschaetzung, werteCheckAus, type Bereich } from '../../domain/check';
  import { checkFrei } from '../../domain/fortschritt/kaufgrenze';
  import { createRng, randomSeed } from '../../domain/rng';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Jahrmarkt-Check: zwölf Aufgaben aus allen Bereichen, ohne Zeitdruck und ohne Rückmeldung je Aufgabe.
   * Am Ende: Stand je Bereich und drei empfohlene Buden. Die Empfehlung steuert auch die Tagesaufträge.
   */
  let p = $derived(app.profil);
  let phase = $state<'start' | 'laeuft' | 'fertig'>('start');
  let aufgaben = $state<{ aufgabe: Aufgabe; bereich: Bereich; bude: string }[]>([]);
  let nr = $state(0);
  let antworten = $state<{ bereich: Bereich; richtig: boolean }[]>([]);
  let gesperrt = $state(false);
  let gewaehlt = $state<number | null>(null);
  let ergebnis = $derived(p?.check ?? null);

  function starten() {
    const rng = createRng(randomSeed());
    aufgaben = CHECK_PLAN.map((c) => ({ aufgabe: BUDEN_DEFINITIONEN[c.bude]?.erzeuge(c.stufe, rng, () => 1) as Aufgabe, bereich: c.bereich, bude: c.bude })).filter((x) => x.aufgabe);
    nr = 0;
    antworten = [];
    gewaehlt = null;
    gesperrt = false;
    phase = 'laeuft';
    sprich();
  }

  function sprich() {
    const a = aufgaben[nr]?.aufgabe;
    if (a && app.einstellungen.stimmeAn) app.sprich(a.sprechtext);
  }

  function waehle(w: number) {
    const x = aufgaben[nr];
    if (!x || gesperrt) return;
    gesperrt = true;
    gewaehlt = w;
    antworten = [...antworten, { bereich: x.bereich, richtig: w === x.aufgabe.antwort }];
    app.spieleKlang('tipp');
    setTimeout(() => {
      gewaehlt = null;
      gesperrt = false;
      if (nr + 1 < aufgaben.length) {
        nr++;
        sprich();
      } else fertig();
    }, 450);
  }

  function fertig() {
    const q = app.profil;
    if (!q) return;
    const e = werteCheckAus(antworten, q, app.paket, Date.now());
    // Aufträge von heute neu würfeln, damit die Empfehlung gleich drin ist (erledigte bleiben erhalten)
    app.aendereProfil((r) => ({ ...r, check: e, auftraege: r.auftraege && r.auftraege.liste.some((a) => a.erledigt) ? r.auftraege : null }));
    app.auftraegeSicherstellen();
    app.spieleKlang('jubel');
    phase = 'fertig';
  }

  const EINSCHAETZUNG_TEXT = { sicher: 'sicher', fastSicher: 'fast sicher', ueben: 'üben' } as const;
  const datum = (t: number): string => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  let aktuelle = $derived(aufgaben[nr]);
  let Bild = $derived(aktuelle ? BUDEN_DEFINITIONEN[aktuelle.bude]?.bild : undefined);
</script>

{#if p}
  <Kopfzeile titel="Check" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="check">
    {#if !checkFrei(app.paket)}
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt">
          <h2><Icon name="check" /> Jahrmarkt-Check</h2>
          <p>Zwölf Aufgaben aus allen Bereichen zeigen, was schon sicher sitzt und wo sich Üben lohnt. Danach gibt es passende Buden als Tagesaufträge.</p>
          <p class="schloss"><Icon name="schloss" groesse={20} /> Der Check gehört zum Zusatzpaket. Frag deine Eltern!</p>
          <button class="ticket hell" onclick={() => app.zeige({ name: 'jahrmarkt' })}>Zurück zum Jahrmarkt</button>
        </div>
      </div>
    {:else if phase === 'start'}
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt">
          <h2>Wo stehst du?</h2>
          <p>Zwölf Aufgaben aus allen Bereichen. Ohne Zeitdruck, ohne Punkte – nimm dir Zeit. Danach weißt du, was schon sicher sitzt und was du üben solltest.</p>
          {#if ergebnis}<p class="klein">Letzter Check: {datum(ergebnis.am)}</p>{/if}
          <div class="knoepfe">
            {#if ergebnis}<button class="ticket hell" onclick={() => (phase = 'fertig')}>Letztes Ergebnis</button>{/if}
            <button class="ticket rot" onclick={starten}>Check starten</button>
          </div>
        </div>
      </div>
    {:else if phase === 'laeuft' && aktuelle}
      <div class="fortschritt" aria-label="Aufgabe {nr + 1} von {aufgaben.length}">
        {#each aufgaben as _, i (i)}<span class:fertig={i < nr} class:jetzt={i === nr}></span>{/each}
      </div>
      <div class="aufgabe tafel">
        <p class="bereich">{BEREICH_NAME[aktuelle.bereich]}</p>
        {#if !(Bild && aktuelle.aufgabe.art === 'auswahl') || aktuelle.bude !== 'schaetzbude'}<h2 class="frage">{aktuelle.aufgabe.text}</h2>{/if}
        {#if Bild && aktuelle.aufgabe.art === 'auswahl'}
          <div class="bild"><Bild aufgabe={aktuelle.aufgabe} zustand="" gewaehlt={null} /></div>
        {/if}
        {#key nr}
          <Wahlknoepfe aufgabe={aktuelle.aufgabe} {gesperrt} markiert={gewaehlt} spalten={aktuelle.aufgabe.optionen.length <= 2 ? 1 : 2} onwahl={waehle} />
        {/key}
      </div>
    {:else if ergebnis}
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt">
          <h2>Dein Check vom {datum(ergebnis.am)}</h2>
          <ul class="bereiche">
            {#each Object.entries(ergebnis.bereiche) as [b, wert] (b)}
              {@const [r, g] = wert as [number, number]}
              {@const e = einschaetzung([r, g])}
              <li>
                <span class="name">{BEREICH_NAME[b as Bereich]}</span>
                <span class="balken" aria-hidden="true"><span class={e} style="width: {g ? (r / g) * 100 : 0}%"></span></span>
                <span class="wert {e}">{r} von {g} · {EINSCHAETZUNG_TEXT[e]}</span>
              </li>
            {/each}
          </ul>
          {#if ergebnis.empfehlung.length}
            <h3>Das bringt dich jetzt weiter</h3>
            <div class="empfehlung">
              {#each ergebnis.empfehlung as id (id)}
                <button class="ticket gelb" onclick={() => app.zeige({ name: 'bude', bude: id })}>{budeInfo(id).name}</button>
              {/each}
            </div>
            <p class="klein">Diese Buden stehen ab jetzt auch in deinen Tagesaufträgen.</p>
          {/if}
          <div class="knoepfe">
            <button class="ticket hell" onclick={starten}>Nochmal checken</button>
            <button class="ticket rot" onclick={() => app.zeige({ name: 'jahrmarkt' })}>Zum Jahrmarkt</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .check {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    display: grid;
    align-content: start;
    justify-items: center;
    gap: 10px;
  }
  .karte {
    width: min(100%, 34rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  h2 {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 0;
  }
  h3 {
    margin: 6px 0 0;
  }
  p {
    margin: 0;
  }
  .klein {
    font-size: 0.95rem;
    color: var(--tinte-weich);
  }
  .schloss {
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 900;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .fortschritt {
    display: flex;
    gap: 5px;
  }
  .fortschritt span {
    width: 18px;
    height: 8px;
    border-radius: 4px;
    background: #fff;
    border: 2px solid var(--tinte);
  }
  .fortschritt .fertig {
    background: var(--tinte);
  }
  .fortschritt .jetzt {
    background: var(--senf);
  }
  .aufgabe {
    width: min(100%, 34rem);
    padding: 14px;
    display: grid;
    gap: 12px;
    justify-items: center;
    text-align: center;
  }
  .bereich {
    font-weight: 900;
    color: var(--tinte-weich);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
  }
  .frage {
    font-size: clamp(1.4rem, 5vw, 2rem);
    justify-content: center;
  }
  .bild {
    width: 100%;
    display: grid;
    place-items: center;
    max-height: 40vh;
    overflow: hidden;
  }
  .aufgabe :global(.wahlen) {
    width: 100%;
  }
  .bereiche {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .bereiche li {
    display: grid;
    gap: 4px;
  }
  .name {
    font-weight: 900;
  }
  .balken {
    height: 14px;
    border: 2px solid var(--tinte);
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
  }
  .balken span {
    display: block;
    height: 100%;
  }
  .balken .sicher {
    background: var(--wiese);
  }
  .balken .fastSicher {
    background: var(--senf);
  }
  .balken .ueben {
    background: var(--markise);
  }
  .wert {
    font-weight: 800;
    font-size: 0.95rem;
  }
  .empfehlung {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
