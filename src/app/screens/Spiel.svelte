<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { budeDefinition } from '../../buden';
  import type { BudeSzene } from '../../buden/typen';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { STUFEN_NAME, budeInfo, type Stufe } from '../../domain/buden';
  import { AUFGABEN_PRO_RUNDE, rundeVerbuchen } from '../../domain/fortschritt/fortschritt';
  import { stufeFreigabe } from '../../domain/fortschritt/kaufgrenze';
  import { URSACHE_HINWEIS } from '../../domain/lernprofil/fehlerursache';
  import { createRng, randomSeed } from '../../domain/rng';
  import { Rundensteuerung } from '../../domain/runde';
  import { vibriere } from '../../services/haptik';
  import Icon from '../components/Icon.svelte';
  import { BUDE_FARBE, BUDE_FEST, BUDE_WIEDER_AN } from '../geschichte';
  import { app } from '../zustand.svelte';

  let props: { bude: string; stufe: Stufe } = $props();
  // Der Bildschirm wird für jede Runde neu erzeugt ({#key} in App.svelte), Bude und Stufe stehen daher fest.
  const { bude, stufe } = (() => ({ bude: props.bude, stufe: props.stufe }))();

  const info = budeInfo(bude);
  const def = budeDefinition(bude);
  const profilStart = app.profil;
  const ersteRunde = !profilStart || Object.values(profilStart.fortschritt[bude] ?? {}).every((s) => !s || s.gespielt === 0);
  const rng = createRng(randomSeed());
  const runde = new Rundensteuerung({
    bude,
    stufe,
    rng,
    erzeuge: def.erzeuge,
    aehnlich: def.aehnlich,
    gewichtung: def.gewichtung(profilStart?.ereignisse ?? []),
    probe: ersteRunde ? def.probe(rng) : undefined,
  });

  let host: HTMLDivElement;
  let szene: BudeSzene | undefined;
  let aufgabe = $state<Aufgabe>(runde.aktuelle);
  let phase = $state(runde.aktuellePhase);
  let nummer = $state(runde.nummer);
  let punkte = $state(0);
  let ergebnisse = $state<boolean[]>([]);
  let hinweis = $state<string | null>(null);
  let hilfe = $state<{ aufgabe: Aufgabe; gewaehlt: number } | null>(null);
  let ende = $state<{ punkte: number; richtig: number; taler: number; rekord: boolean; geschafft: boolean; erster: boolean } | null>(null);
  let bereit = $state(false);
  let fehlerBeimLaden = $state(false);
  let gezeigtUm = 0;
  let verbucht = false;
  /** Sperrt Eingaben während Animation und Auswertung (auch für die Bedienhilfe-Knöpfe). */
  let beschaeftigt = false;
  let zerstoert = false;

  function stelle(a: Aufgabe) {
    aufgabe = a;
    phase = runde.aktuellePhase;
    nummer = runde.nummer;
    szene?.zeige(a);
    szene?.sperre(false);
    beschaeftigt = false;
    gezeigtUm = performance.now();
    if (app.einstellungen.automatischVorlesen) app.sprich(phase === 'probe' ? `Probewurf. ${a.sprechtext}` : a.sprechtext);
  }

  async function antwort(wert: number, bonus = 0) {
    if (!szene || hilfe || ende || beschaeftigt) return;
    beschaeftigt = true;
    szene.sperre(true);
    void app.sprache.stopp();
    const ms = performance.now() - gezeigtUm;
    const a = aufgabe;
    const erg = runde.antworte(wert, ms, bonus);
    if (erg.richtig) {
      void vibriere('leicht');
      await szene.treffer(wert);
      app.spieleKlang('richtig');
      if (phase !== 'probe' && phase !== 'nochmal') ergebnisse = [...ergebnisse, true];
      punkte = runde.punkte;
      if (erg.durchgehalten && app.abzeichenVergeben('durchhalte', bude)) app.melde('Neues Abzeichen: Durchhalten!');
      naechste();
      return;
    }
    app.spieleKlang('fehler');
    await szene.daneben(wert);
    if (erg.wiederholen) {
      hinweis = phase === 'probe' ? 'Probier’s noch einmal!' : URSACHE_HINWEIS.zuSchnell;
      setTimeout(() => (hinweis = null), 2200);
      stelle(runde.weiter(true) as Aufgabe);
      return;
    }
    if (phase === 'haupt') ergebnisse = [...ergebnisse, false];
    hinweis = erg.ursache ? URSACHE_HINWEIS[erg.ursache] : null;
    hilfe = { aufgabe: a, gewaehlt: wert };
  }

  function hilfeFertig() {
    hilfe = null;
    hinweis = null;
    naechste();
  }

  function naechste() {
    const n = runde.weiter();
    if (n) stelle(n);
    else beenden();
  }

  function verbuche(): void {
    if (verbucht) return;
    verbucht = true;
    app.ereignisseAnhaengen(runde.ereignisse);
  }

  function beenden() {
    const p = app.profil;
    if (!p) return;
    verbuche();
    const r = runde.ergebnis();
    const e = rundeVerbuchen(app.profil ?? p, r);
    app.aendereProfil(() => e.profil);
    void app.speichereSofort();
    ende = { punkte: r.punkte, richtig: r.richtig, taler: e.taler, rekord: e.neuerRekord, geschafft: e.geschafft, erster: e.ersterErfolg };
    app.spieleKlang(e.geschafft ? 'jubel' : 'richtig');
    if (e.geschafft) void vibriere('erfolg');
    if (e.ersterErfolg) app.flinka = stufe === 'bronze' ? BUDE_WIEDER_AN(info.name) : stufe === 'silber' ? BUDE_FARBE(info.name) : BUDE_FEST(info.name);
  }

  function zurueck() {
    // Abgebrochene Runde: Antworten zählen fürs Lernprofil, die Runde selbst nicht.
    verbuche();
    app.zeige({ name: 'bude', bude });
  }

  function nochmal() {
    app.zeige({ name: 'spiel', bude, stufe, n: Date.now() });
  }

  onMount(() => {
    const p = app.profil;
    if (!p || !stufeFreigabe(p, bude, stufe, app.paket).frei) {
      app.zeige({ name: 'bude', bude });
      return;
    }
    def
      .erstelleSzene(host, {
        reduziert: app.einstellungen.animationenReduziert || matchMedia('(prefers-reduced-motion: reduce)').matches,
        onAntwort: (w, bonus) => void antwort(w, bonus),
        klang: (k) => app.spieleKlang(k),
      })
      .then((s) => {
        if (zerstoert) {
          s.zerstoere();
          return;
        }
        szene = s;
        bereit = true;
        if (ersteRunde) app.sprich(def.anleitung);
        stelle(runde.aktuelle);
      })
      .catch((e: unknown) => {
        console.error('Bude konnte nicht starten', e);
        fehlerBeimLaden = true;
      });
  });

  // Zurück-Taste: Runde wie mit dem Zurück-Knopf beenden (Antworten werden verbucht).
  // Während der Hilfe nach Fehlern wird der Druck ignoriert, damit die Hilfe nicht verloren geht.
  app.zurueckAbfangen = () => {
    if (hilfe) return true;
    if (ende) {
      app.zeige({ name: 'bude', bude });
      return true;
    }
    zurueck();
    return true;
  };

  onDestroy(() => {
    app.zurueckAbfangen = null;
    zerstoert = true;
    szene?.zerstoere();
    void app.sprache.stopp();
  });

  const HilfeKomponente = def.hilfe;
</script>

<div class="spiel">
  <div class="leiste">
    <button class="rund" onclick={zurueck} aria-label="Runde beenden und zurück"><Icon name="zurueck" /></button>
    <div class="schild" aria-live="polite" data-aufgabe={aufgabe.id}>
      {#if phase === 'probe'}
        <span class="marke">Probewurf</span>
      {:else if phase === 'nochmal'}
        <span class="marke">Noch eine ähnliche</span>
      {/if}
      <span class="aufgabe">{aufgabe.text}{aufgabe.art === 'mal' ? ' = ?' : ''}</span>
    </div>
    <button class="rund" onclick={() => app.sprich(aufgabe.sprechtext, true)} aria-label="Aufgabe vorlesen"><Icon name="laut" /></button>
  </div>
  <div class="status">
    <span class="stufe">{info.name} · {STUFEN_NAME[stufe]}</span>
    <ol class="punkte-reihe" aria-label="Aufgabe {Math.max(nummer, 0)} von {AUFGABEN_PRO_RUNDE}">
      {#each Array.from({ length: AUFGABEN_PRO_RUNDE }, (_, i) => i) as i (i)}
        <li class:richtig={ergebnisse[i] === true} class:falsch={ergebnisse[i] === false} class:jetzt={i === nummer - 1 && ergebnisse[i] === undefined}></li>
      {/each}
    </ol>
    <span class="zaehler">{punkte} Punkte</span>
  </div>

  <div class="buehne" bind:this={host}>
    {#if !bereit && !fehlerBeimLaden}<p class="laden">{def.ladetext}</p>{/if}
    {#if fehlerBeimLaden}<p class="laden">Die Bude konnte nicht starten. Bitte die App neu öffnen.</p>{/if}
    {#if hinweis && !hilfe}<p class="hinweis" role="status">{hinweis}</p>{/if}
  </div>

  <!-- Für Bildschirmleser und Tastatur: dieselben Antworten als Knöpfe (bei freier Eingabe hat die Bude ein Ziffernfeld) -->
  <div class="nur-leser" hidden={aufgabe.eingabe === 'ziffern'}>
    {#each aufgabe.optionen as o (o.wert)}
      <button onclick={() => void antwort(o.wert)} disabled={!bereit || !!hilfe || !!ende}>{o.wert}</button>
    {/each}
  </div>

  {#if hilfe}
    <div class="ebene">
      {#if hinweis}<p class="hinweis oben" role="status">{hinweis}</p>{/if}
      <HilfeKomponente aufgabe={hilfe.aufgabe} gewaehlt={hilfe.gewaehlt} onfertig={hilfeFertig} />
    </div>
  {/if}

  {#if ende}
    <div class="ebene">
      <div class="tafel ende" role="dialog" aria-modal="true" aria-labelledby="ende-titel">
        <div class="markise"></div>
        <div class="inhalt">
          <h2 id="ende-titel">{ende.geschafft ? (ende.erster ? `${STUFEN_NAME[stufe]} geschafft!` : 'Stark gespielt!') : 'Runde geschafft!'}</h2>
          {#if ende.rekord}<p class="rekord">Neuer Rekord!</p>{/if}
          <p class="gross">{ende.punkte} Punkte</p>
          <p>{ende.richtig} von {AUFGABEN_PRO_RUNDE} beim ersten Versuch richtig.</p>
          <p class="taler"><Icon name="taler" groesse={26} /> +{ende.taler} Taler</p>
          {#if !ende.geschafft}<p class="klein">Mit 8 Treffern schaffst du die Stufe. Du kommst näher!</p>{/if}
          <div class="knoepfe">
            <button class="ticket hell" onclick={() => app.zeige({ name: 'bude', bude })}>Zur Bude</button>
            <button class="ticket rot" onclick={nochmal}>Nochmal spielen</button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .spiel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
  }
  .leiste {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: var(--oben) var(--rand-r) 6px var(--rand);
  }
  .schild {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--holz);
    border: 4px solid var(--holz-dunkel);
    border-radius: 12px;
    color: #fff;
    padding: 4px 12px 6px;
    min-height: 64px;
    justify-content: center;
  }
  .aufgabe {
    font-weight: 900;
    font-size: clamp(1.9rem, 7vw, 2.8rem);
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 3px 0 var(--holz-dunkel);
  }
  .marke {
    font-size: 0.9rem;
    font-weight: 800;
    background: var(--senf);
    color: var(--tinte);
    border-radius: 10px;
    padding: 0 8px;
  }
  .status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 var(--rand-r) 6px var(--rand);
    font-weight: 800;
    font-size: 0.95rem;
  }
  .punkte-reihe {
    display: flex;
    gap: 5px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .punkte-reihe li {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2.5px solid var(--tinte);
    background: #fff;
  }
  .punkte-reihe li.richtig {
    background: var(--wiese);
  }
  .punkte-reihe li.falsch {
    background: var(--senf);
  }
  .punkte-reihe li.jetzt {
    background: var(--himmel-hell);
    transform: scale(1.2);
  }
  @media (max-width: 420px) {
    .stufe {
      display: none;
    }
  }
  .buehne {
    flex: 1;
    min-height: 0;
    position: relative;
    margin: 0 var(--rand-r) var(--unten) var(--rand);
    border: 4px solid var(--holz-dunkel);
    border-radius: 14px;
    overflow: hidden;
    background: #f6dfb3;
  }
  .buehne :global(canvas) {
    display: block;
    position: absolute;
    inset: 0;
  }
  .laden {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 1.2rem;
  }
  .hinweis {
    position: absolute;
    left: 50%;
    top: 12px;
    transform: translateX(-50%);
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 14px;
    padding: 6px 14px;
    font-weight: 900;
    z-index: 2;
    white-space: nowrap;
  }
  .hinweis.oben {
    position: static;
    transform: none;
    margin-bottom: 8px;
  }
  .ebene {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgb(31 42 107 / 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    overflow: auto;
  }
  .ende {
    width: min(100%, 26rem);
    text-align: center;
  }
  .ende .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 8px;
  }
  .gross {
    font-size: 2.4rem;
    font-weight: 900;
  }
  .rekord {
    font-weight: 900;
    color: var(--markise);
    font-size: 1.3rem;
  }
  .taler {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 1.2rem;
  }
  .klein {
    font-size: 0.95rem;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 6px;
  }
</style>
