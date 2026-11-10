<script lang="ts">
  import Tastenfeld from '../../buden/spiele/Tastenfeld.svelte';
  import { EXTRA_TALER, FORSCHER_TALER, alleLoesungen, forscherRunde, pruefeLoesung, type Forscheraufgabe, type LoesungsAufgabe } from '../../domain/forscher';
  import type { Ereignis } from '../../domain/lernprofil/lernprofil';
  import { createRng, randomSeed } from '../../domain/rng';
  import { app } from '../zustand.svelte';
  import Icon from './Icon.svelte';

  /**
   * Forscheraufgaben: offene Aufgaben mit mehreren Lösungen. Jede neue Lösung zählt;
   * wer mehr als verlangt findet, bekommt Extra-Taler. Am Ende einer Aufgabe gibt es (wo möglich) alle Lösungen zu sehen.
   */
  let { onende }: { onende: () => void } = $props();

  const aufgaben: Forscheraufgabe[] = forscherRunde(createRng(randomSeed()));
  let nr = $state(0);
  let a = $derived(aufgaben[nr] as Forscheraufgabe);
  let gefunden = $state<{ schluessel: string; anzeige: string }[]>([]);
  let werte = $state<string[]>([]);
  let aktiv = $state(0);
  let eingabe = $state('');
  let hinweis = $state<{ text: string; gut: boolean } | null>(null);
  let tipp = $state(false);
  let aufgeloest = $state(false);
  let gewaehlt = $state<boolean[]>([]);
  let geprueft = $state(false);
  let versuche = $state(0);
  let taler = $state(0);
  let geschafft = $state(0);
  let ende = $state(false);
  let start = performance.now();
  const ereignisse: Ereignis[] = [];

  function neu() {
    gefunden = [];
    werte = a.art === 'loesungen' ? Array<string>(a.felder).fill('') : [];
    aktiv = 0;
    eingabe = '';
    hinweis = null;
    tipp = false;
    aufgeloest = false;
    gewaehlt = a.art === 'geschichten' ? a.geschichten.map(() => false) : [];
    geprueft = false;
    versuche = 0;
    start = performance.now();
    if (app.einstellungen.automatischVorlesen) app.sprich(a.text);
  }
  neu();

  const wert = (i: number): string => (i === aktiv ? eingabe : (werte[i] ?? ''));
  function setzeAktiv(i: number) {
    werte[aktiv] = eingabe;
    aktiv = i;
    eingabe = werte[i] ?? '';
  }
  let fertig = $derived(a.art === 'loesungen' ? gefunden.length >= a.gesucht || aufgeloest : geprueft && (a.geschichten.every((g, i) => g.passt === gewaehlt[i]) || versuche >= 2));

  function ok() {
    if (a.art !== 'loesungen') return;
    werte[aktiv] = eingabe;
    const leer = werte.findIndex((w) => w === '');
    if (leer >= 0) {
      setzeAktiv(leer);
      return;
    }
    const p = pruefeLoesung(a, werte.map(Number));
    if (!p.ok) {
      hinweis = { text: p.hinweis, gut: false };
      app.spieleKlang('fehler');
      return;
    }
    if (gefunden.some((g) => g.schluessel === p.schluessel)) {
      hinweis = { text: a.regel === 'mauer' ? 'Diese Mauer hast du schon (auch gespiegelt zählt sie nicht neu).' : a.regel === 'differenz' ? 'Die hast du schon gefunden.' : 'Die hast du schon – Tauschaufgaben zählen nicht extra.', gut: false };
      app.spieleKlang('fehler');
      return;
    }
    const vorher = gefunden.length;
    gefunden = [...gefunden, { schluessel: p.schluessel, anzeige: p.anzeige }];
    if (vorher + 1 === a.gesucht) {
      geschafft++;
      taler += FORSCHER_TALER;
      buche(true);
      app.spieleKlang('jubel');
      hinweis = { text: alle(a) ? 'Geschafft! Findest du noch mehr? Jede weitere bringt einen Extra-Taler.' : 'Geschafft! Du kannst noch weitersuchen.', gut: true };
    } else {
      if (vorher >= a.gesucht && !aufgeloest) taler += EXTRA_TALER;
      app.spieleKlang('richtig');
      hinweis = { text: vorher + 1 > a.gesucht ? 'Noch eine – stark!' : 'Richtig! Und noch eine?', gut: true };
    }
    werte = werte.map(() => '');
    eingabe = '';
    aktiv = 0;
  }
  const alle = (x: LoesungsAufgabe): boolean => (alleLoesungen(x)?.length ?? Infinity) > gefunden.length;
  function buche(richtig: boolean) {
    ereignisse.push({ t: Date.now(), bude: 'knobelzelt', kompetenz: a.art === 'geschichten' ? 'operationsverstaendnis' : a.regel === 'mauer' ? 'muster' : 'kopfrechnen', dimension: 'anwendung', richtig, ms: Math.round(performance.now() - start), gewertet: true });
  }
  function aufloesen() {
    aufgeloest = true;
    hinweis = null;
    buche(false);
  }
  function geschichtenPruefen() {
    if (a.art !== 'geschichten') return;
    geprueft = true;
    versuche++;
    const richtig = a.geschichten.every((g, i) => g.passt === gewaehlt[i]);
    if (richtig) {
      if (versuche === 1) {
        geschafft++;
        taler += FORSCHER_TALER;
      } else taler += 1;
      buche(versuche === 1);
      app.spieleKlang('jubel');
    } else {
      app.spieleKlang('fehler');
      if (versuche >= 2) buche(false);
    }
  }
  function weiter() {
    if (nr + 1 < aufgaben.length) {
      nr++;
      neu();
      return;
    }
    app.ereignisseAnhaengen(ereignisse);
    const t = taler;
    app.aendereProfil((q) => ({ ...q, taler: q.taler + t }));
    app.wochenzielPruefen();
    ende = true;
  }
</script>

{#if ende}
  <div class="tafel karte">
    <div class="markise lila"></div>
    <div class="inhalt mitte">
      <h2>Forscherrunde geschafft!</h2>
      <p class="gross">{geschafft} von {aufgaben.length}</p>
      <p>Aufgaben selbst gelöst. Forschen heißt: ausprobieren, vergleichen, weitersuchen.</p>
      <p class="belohnung"><Icon name="taler" groesse={22} /> +{taler} Taler</p>
      <div class="knoepfe">
        <button class="ticket hell" onclick={onende}>Zurück zum Zelt</button>
      </div>
    </div>
  </div>
{:else}
  <div class="fortschritt" aria-label="Aufgabe {nr + 1} von {aufgaben.length}">
    {#each aufgaben as _, i (i)}<span class:fertig={i < nr} class:jetzt={i === nr}></span>{/each}
  </div>
  <div class="tafel aufgabe">
    <div class="kopf">
      <h2>{a.titel}</h2>
      <button class="rund" onclick={() => app.sprich(a.text, true)} aria-label="Vorlesen"><Icon name="laut" /></button>
    </div>
    <p class="text">{a.text}</p>

    {#if a.art === 'loesungen'}
      <!-- Eingabe als Lückenrechnung bzw. Mauer -->
      {#if a.regel === 'mauer'}
        {@const z = [0, 1, 2].map((i) => Number(wert(i) || NaN))}
        <div class="mauer" aria-label="Rechenmauer mit Deckstein {a.ziel}">
          <div class="reihe"><span class="stein oben">{a.ziel}</span></div>
          <div class="reihe">
            <span class="stein grau">{Number.isNaN((z[0] ?? 0) + (z[1] ?? 0)) ? '' : (z[0] ?? 0) + (z[1] ?? 0)}</span>
            <span class="stein grau">{Number.isNaN((z[1] ?? 0) + (z[2] ?? 0)) ? '' : (z[1] ?? 0) + (z[2] ?? 0)}</span>
          </div>
          <div class="reihe">
            {#each [0, 1, 2] as i (i)}
              <button class="stein feld" class:aktiv={aktiv === i} onclick={() => setzeAktiv(i)} aria-label="Grundstein {i + 1}: {wert(i) || 'leer'}">{wert(i) || '?'}</button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="rechnung">
          <button class="feld" class:aktiv={aktiv === 0} onclick={() => setzeAktiv(0)} aria-label="Erste Zahl: {wert(0) || 'leer'}">{wert(0) || '?'}</button>
          <span>{a.regel === 'produkt' ? '·' : a.regel === 'differenz' ? '−' : '+'}</span>
          <button class="feld" class:aktiv={aktiv === 1} onclick={() => setzeAktiv(1)} aria-label="Zweite Zahl: {wert(1) || 'leer'}">{wert(1) || '?'}</button>
          <span>= {a.ziel}</span>
        </div>
      {/if}
      {#if hinweis}<p class="hinweis" class:gut={hinweis.gut} role="status">{hinweis.text}</p>{/if}
      <p class="zaehler"><strong>{gefunden.length}</strong> von {a.gesucht} gefunden</p>
      {#if gefunden.length}
        <ul class="gefunden">{#each gefunden as g (g.schluessel)}<li>✓ {g.anzeige}</li>{/each}</ul>
      {/if}
      {#if tipp}<p class="tipp">Tipp: {a.tipp}</p>{/if}
      {#if aufgeloest || (fertig && gefunden.length > 0)}
        {@const l = alleLoesungen(a)}
        {#if l && (aufgeloest || gefunden.length >= a.gesucht)}<p class="alle">Alle Möglichkeiten{a.regel === 'produkt' ? ' (ohne Tauschaufgaben)' : ''}: {l.join(', ')}</p>{/if}
        {#if aufgeloest && !l}<p class="alle">Ein Beispiel: {a.regel === 'mauer' ? `1, 1, ${a.ziel - 3} – oder 2, 2, ${a.ziel - 6}` : `${a.ziel + 10} − 10 = ${a.ziel}`}</p>{/if}
      {/if}
      <div class="werkzeug">
        <div class="knoepfe">
          {#if !tipp}<button class="ticket hell" onclick={() => (tipp = true)}>Tipp</button>{/if}
          {#if fertig}
            <button class="ticket rot" onclick={weiter}>{nr + 1 < aufgaben.length ? 'Nächste Aufgabe' : 'Fertig'}</button>
          {:else if tipp && !aufgeloest}
            <button class="ticket hell" onclick={aufloesen}>Lösungen zeigen</button>
          {/if}
        </div>
        {#if !aufgeloest}<Tastenfeld bind:wert={eingabe} maxStellen={3} onok={ok} okText={aktiv < a.felder - 1 ? 'Weiter' : 'Prüfen'} />{/if}
      </div>
    {:else}
      <p class="rechnung klein">{a.rechnung}</p>
      <ul class="geschichten">
        {#each a.geschichten as g, i (g.text)}
          <li>
            <button
              class="geschichte"
              class:an={gewaehlt[i]}
              class:richtig={geprueft && fertig && g.passt}
              class:falsch={geprueft && gewaehlt[i] !== g.passt && !fertig}
              aria-pressed={gewaehlt[i]}
              disabled={fertig}
              onclick={() => {
                gewaehlt[i] = !gewaehlt[i];
                geprueft = false;
              }}
            >{g.text}</button>
          </li>
        {/each}
      </ul>
      {#if geprueft && !fertig}<p class="hinweis" role="status">Noch nicht ganz. Die rot markierten Karten stimmen nicht. Schau sie dir noch einmal an.</p>{/if}
      {#if fertig}<p class="hinweis gut" role="status">{a.geschichten.every((g, i) => g.passt === gewaehlt[i]) ? 'Richtig erkannt!' : 'Grün markiert sind die passenden Geschichten.'}</p>{/if}
      {#if tipp}<p class="tipp">Tipp: {a.tipp}</p>{/if}
      <div class="knoepfe">
        {#if !tipp && !fertig}<button class="ticket hell" onclick={() => (tipp = true)}>Tipp</button>{/if}
        {#if fertig}
          <button class="ticket rot" onclick={weiter}>{nr + 1 < aufgaben.length ? 'Nächste Aufgabe' : 'Fertig'}</button>
        {:else}
          <button class="ticket rot" onclick={geschichtenPruefen} disabled={!gewaehlt.some(Boolean)}>Prüfen</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .karte,
  .aufgabe {
    width: min(100%, 34rem);
  }
  .markise.lila {
    background: repeating-linear-gradient(90deg, #7b5ea7 0 28px, #fff 28px 56px);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  .mitte {
    text-align: center;
  }
  .gross {
    font-size: 2rem;
    font-weight: 900;
    margin: 0;
  }
  .belohnung {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
    font-weight: 900;
  }
  .aufgabe {
    padding: 12px 16px 16px;
    display: grid;
    gap: 10px;
  }
  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: 1.3rem;
  }
  p {
    margin: 0;
  }
  .text {
    font-size: 1.1rem;
  }
  .fortschritt {
    display: flex;
    gap: 6px;
  }
  .fortschritt span {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--tinte);
    background: #fff;
  }
  .fortschritt .fertig {
    background: var(--tinte);
  }
  .fortschritt .jetzt {
    background: var(--senf, #f2c41b);
  }
  .rechnung {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 1.8rem;
    font-weight: 900;
  }
  .rechnung.klein {
    font-size: 1.5rem;
  }
  .feld {
    min-width: 3.4rem;
    height: 3.2rem;
    border: 3px dashed var(--tinte);
    border-radius: 12px;
    background: #fff;
    font: inherit;
    font-weight: 900;
    color: var(--tinte);
    padding: 0 8px;
  }
  .feld.aktiv {
    border-style: solid;
    background: #fff4cf;
    box-shadow: 0 0 0 3px var(--senf, #f2c41b);
  }
  .mauer {
    display: grid;
    gap: 4px;
    justify-items: center;
    font-size: 1.4rem;
    font-weight: 900;
  }
  .reihe {
    display: flex;
    gap: 4px;
  }
  .stein {
    width: 4.2rem;
    height: 2.8rem;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinte);
    border-radius: 6px;
    background: #f6c9a8;
  }
  .stein.oben {
    background: #f2b705;
  }
  .stein.grau {
    background: #eee7dc;
    color: var(--tinte-weich, #5a628c);
  }
  .stein.feld {
    border-style: dashed;
    background: #fff;
  }
  .stein.feld.aktiv {
    border-style: solid;
    background: #fff4cf;
  }
  .hinweis {
    padding: 8px 12px;
    border-radius: 12px;
    background: #fbdada;
    font-weight: 700;
  }
  .hinweis.gut {
    background: #d9f5df;
  }
  .zaehler {
    text-align: center;
  }
  .gefunden {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
  .gefunden li {
    padding: 4px 10px;
    border-radius: 999px;
    background: #d9f5df;
    font-weight: 800;
  }
  .tipp,
  .alle {
    padding: 8px 12px;
    border-radius: 12px;
    background: #efe7fb;
  }
  .werkzeug {
    display: grid;
    gap: 8px;
    justify-items: center;
  }
  .knoepfe {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .geschichten {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .geschichte {
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border: 3px solid #d7dae6;
    border-radius: 14px;
    background: #fff;
    font: inherit;
    color: var(--tinte);
  }
  .geschichte.an {
    border-color: var(--tinte);
    background: #fff4cf;
  }
  .geschichte.falsch {
    border-color: var(--markise, #e23a4e);
    background: #fbdada;
  }
  .geschichte.richtig {
    border-color: var(--wiese-dunkel, #2b7a4a);
    background: #d9f5df;
  }
</style>
