<script lang="ts">
  import { onDestroy } from 'svelte';
  import { BLITZ_SEKUNDEN, BLITZ_STUFEN, blitzAufgabe, blitzBloecke, type BlitzAufgabe, type BlitzStufe } from '../../domain/blitz';
  import { createRng, randomSeed } from '../../domain/rng';
  import Tastenfeld from '../../buden/spiele/Tastenfeld.svelte';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Blitzrechnen: eine Minute so viele Aufgaben wie möglich. Die Eingabe wird geprüft, sobald sie so viele
   * Ziffern hat wie das Ergebnis (OK geht auch). Ein eigener Rekord je Stufe, Blöcke als Belohnung.
   */
  let p = $derived(app.profil);
  let phase = $state<'wahl' | 'countdown' | 'laeuft' | 'ende'>('wahl');
  let stufe = $state<BlitzStufe>('leicht');
  let countdown = $state(3);
  let rest = $state(BLITZ_SEKUNDEN);
  let aufgabe = $state<BlitzAufgabe | null>(null);
  let eingabe = $state('');
  let richtig = $state(0);
  let falsch = $state(0);
  let blink = $state<'' | 'richtig' | 'falsch'>('');
  let ergebnis = $state<{ rekord: boolean; bloecke: number; alt: number } | null>(null);
  let rng = createRng(randomSeed());
  let uhr: ReturnType<typeof setInterval> | undefined;

  function starten(s: BlitzStufe) {
    stufe = s;
    richtig = 0;
    falsch = 0;
    eingabe = '';
    rng = createRng(randomSeed());
    phase = 'countdown';
    countdown = 3;
    app.spieleKlang('tipp');
    clearInterval(uhr);
    uhr = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        app.spieleKlang('tipp');
        return;
      }
      clearInterval(uhr);
      los();
    }, 800);
  }
  function los() {
    phase = 'laeuft';
    rest = BLITZ_SEKUNDEN;
    aufgabe = blitzAufgabe(stufe, rng);
    const ende = Date.now() + BLITZ_SEKUNDEN * 1000;
    uhr = setInterval(() => {
      rest = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
      if (rest <= 0) fertig();
    }, 200);
  }
  function naechste() {
    aufgabe = blitzAufgabe(stufe, rng);
    eingabe = '';
  }
  function pruefe() {
    if (!aufgabe || phase !== 'laeuft') return;
    if (Number(eingabe) === aufgabe.antwort) {
      richtig++;
      blink = 'richtig';
      app.spieleKlang('pop');
    } else {
      falsch++;
      blink = 'falsch';
      app.spieleKlang('fehler');
    }
    setTimeout(() => (blink = ''), 250);
    naechste();
  }
  $effect(() => {
    // Automatisch prüfen, sobald so viele Ziffern getippt sind wie das Ergebnis hat
    if (phase === 'laeuft' && aufgabe && eingabe.length >= String(aufgabe.antwort).length) pruefe();
  });
  function fertig() {
    clearInterval(uhr);
    phase = 'ende';
    const q = app.profil;
    if (!q) return;
    const alt = q.blitz.rekorde[stufe] ?? 0;
    const heute = new Date().toDateString();
    const ersteHeute = new Date(q.blitz.zuletzt).toDateString() !== heute;
    const bloecke = blitzBloecke(richtig, ersteHeute);
    const rekord = richtig > alt;
    app.aendereProfil((r) => ({
      ...r,
      blitz: { rekorde: { ...r.blitz.rekorde, [stufe]: Math.max(alt, richtig) }, zuletzt: Date.now() },
      bau: { ...r.bau, bloecke: r.bau.bloecke + bloecke },
    }));
    ergebnis = { rekord, bloecke, alt };
    app.wochenzielPruefen();
    app.spieleKlang(rekord ? 'jubel' : 'richtig');
  }
  onDestroy(() => clearInterval(uhr));
</script>

{#if p}
  <Kopfzeile titel="Blitzrechnen" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="blitz">
    {#if phase === 'wahl'}
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt">
          <h2><Icon name="blitz" /> Eine Minute Kopfrechnen</h2>
          <p>So viele Aufgaben wie möglich in 60 Sekunden. Zum Aufwärmen – und für deinen Rekord.</p>
          <div class="stufen">
            {#each BLITZ_STUFEN as s (s.id)}
              <button class="stufe" onclick={() => starten(s.id)}>
                <strong>{s.name}</strong>
                <span>{s.text}</span>
                <em>Rekord: {p.blitz.rekorde[s.id] ?? 0}</em>
              </button>
            {/each}
          </div>
        </div>
      </div>
    {:else if phase === 'countdown'}
      <div class="countdown" aria-live="assertive">{countdown}</div>
    {:else if phase === 'laeuft' && aufgabe}
      <div class="leiste" role="timer" aria-label="Noch {rest} Sekunden">
        <div class="zeit" style="width: {(rest / BLITZ_SEKUNDEN) * 100}%" class:knapp={rest <= 10}></div>
      </div>
      <div class="stand"><span>⏱ {rest} s</span><span class="gut">✓ {richtig}</span></div>
      <div class="aufgabe {blink}">
        <span>{aufgabe.text}</span>
        <b>= {eingabe || '?'}</b>
      </div>
      <Tastenfeld bind:wert={eingabe} maxStellen={4} onok={pruefe} />
    {:else if phase === 'ende' && ergebnis}
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt mitte">
          <h2>{ergebnis.rekord ? 'Neuer Rekord!' : 'Zeit um!'}</h2>
          <p class="gross">{richtig} richtig</p>
          <p>{falsch ? `${falsch} daneben · ` : ''}bisheriger Rekord: {ergebnis.alt}</p>
          {#if ergebnis.bloecke}<p class="belohnung"><Icon name="block" groesse={22} /> +{ergebnis.bloecke} Blöcke</p>{/if}
          <div class="knoepfe">
            <button class="ticket hell" onclick={() => (phase = 'wahl')}>Andere Stufe</button>
            <button class="ticket rot" onclick={() => starten(stufe)}>Nochmal</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .blitz {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 12px;
  }
  .karte {
    width: min(100%, 30rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  .mitte {
    text-align: center;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    justify-content: center;
  }
  p {
    margin: 0;
  }
  .stufen {
    display: grid;
    gap: 8px;
  }
  .stufe {
    display: grid;
    gap: 2px;
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
  .stufe em {
    font-style: normal;
    font-weight: 900;
    color: var(--markise-dunkel);
  }
  .countdown {
    font-size: 9rem;
    font-weight: 900;
    color: var(--tinte);
    text-shadow: 0 6px 0 var(--senf);
    animation: pochen 0.8s ease-out infinite;
  }
  @keyframes pochen {
    from {
      transform: scale(1.3);
      opacity: 0.4;
    }
  }
  .leiste {
    width: min(100%, 26rem);
    height: 16px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
  }
  .zeit {
    height: 100%;
    background: var(--wiese);
    transition: width 0.2s linear;
  }
  .zeit.knapp {
    background: var(--markise);
  }
  .stand {
    display: flex;
    gap: 24px;
    font-weight: 900;
    font-size: 1.2rem;
  }
  .gut {
    color: var(--wiese-dunkel);
  }
  .aufgabe {
    display: grid;
    justify-items: center;
    padding: 12px 24px;
    min-width: min(100%, 18rem);
    background: var(--papier);
    border: 4px solid var(--tinte);
    border-radius: 16px;
    font-weight: 900;
    font-size: 2.2rem;
    transition: background 0.2s;
  }
  .aufgabe b {
    font-size: 1.8rem;
    color: var(--markise-dunkel);
  }
  .aufgabe.richtig {
    background: #c9f2d6;
  }
  .aufgabe.falsch {
    background: #f9d0d6;
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
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>
