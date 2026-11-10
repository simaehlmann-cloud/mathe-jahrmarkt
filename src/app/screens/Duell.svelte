<script lang="ts">
  import { onDestroy } from 'svelte';
  import { BLITZ_STUFEN, type BlitzAufgabe, type BlitzStufe } from '../../domain/blitz';
  import { DUELL_AUFGABEN, DUELL_SIEG_TALER, duellAufgaben, duellSieger, type DuellLauf } from '../../domain/geschwister';
  import { randomSeed } from '../../domain/rng';
  import Tastenfeld from '../../buden/spiele/Tastenfeld.svelte';
  import Figur from '../grafik/Figur.svelte';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Geschwister-Duell: Zwei Profile auf diesem Gerät rechnen nacheinander dieselben zehn Kopfrechenaufgaben.
   * Es zählen erst die Treffer, dann die Zeit. Das Ergebnis des ersten Kindes bleibt bis zum Schluss verdeckt.
   */
  let profile = $derived(app.bestand.profile);
  let ausgewaehlt = $state<string[]>([]);
  $effect.pre(() => {
    if (ausgewaehlt.length) return;
    const ich = app.profil?.id;
    const andere = app.bestand.profile.filter((p) => p.id !== ich).map((p) => p.id);
    ausgewaehlt = [...(ich ? [ich] : []), ...andere].slice(0, 2);
  });
  let stufe = $state<BlitzStufe>('leicht');
  let phase = $state<'wahl' | 'uebergabe' | 'countdown' | 'laeuft' | 'ende'>('wahl');
  let wer = $state(0);
  let aufgaben = $state<BlitzAufgabe[]>([]);
  let nr = $state(0);
  let eingabe = $state('');
  let blink = $state<'' | 'richtig' | 'falsch'>('');
  let treffer = $state<boolean[]>([]);
  let laeufe = $state<DuellLauf[]>([]);
  let countdown = $state(3);
  let start = 0;
  let uhr: ReturnType<typeof setInterval> | undefined;

  let spieler = $derived(ausgewaehlt.map((id) => profile.find((p) => p.id === id)).filter((p) => p !== undefined));
  let jetzt = $derived(spieler[wer]);
  let sieger = $derived(laeufe.length === 2 ? duellSieger(laeufe[0] as DuellLauf, laeufe[1] as DuellLauf) : null);

  function waehle(id: string) {
    if (ausgewaehlt.includes(id)) ausgewaehlt = ausgewaehlt.filter((x) => x !== id);
    else ausgewaehlt = [...ausgewaehlt, id].slice(-2);
  }
  function starten() {
    if (spieler.length !== 2) return;
    aufgaben = duellAufgaben(stufe, randomSeed());
    laeufe = [];
    wer = 0;
    phase = 'uebergabe';
  }
  function bereit() {
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
      nr = 0;
      eingabe = '';
      treffer = [];
      start = performance.now();
      phase = 'laeuft';
      if (app.einstellungen.automatischVorlesen) app.sprich(aufgaben[0]?.sprechtext ?? '');
    }, 800);
  }
  function pruefe() {
    const a = aufgaben[nr];
    if (!a || phase !== 'laeuft' || eingabe === '') return;
    const ok = Number(eingabe) === a.antwort;
    treffer = [...treffer, ok];
    blink = ok ? 'richtig' : 'falsch';
    app.spieleKlang(ok ? 'pop' : 'fehler');
    setTimeout(() => (blink = ''), 250);
    eingabe = '';
    if (nr + 1 < aufgaben.length) {
      nr++;
      if (app.einstellungen.automatischVorlesen) app.sprich(aufgaben[nr]?.sprechtext ?? '');
      return;
    }
    laeufe = [...laeufe, { richtig: treffer.filter(Boolean).length, ms: Math.round(performance.now() - start) }];
    if (wer === 0) {
      wer = 1;
      phase = 'uebergabe';
    } else fertig();
  }
  $effect(() => {
    const a = aufgaben[nr];
    if (phase === 'laeuft' && a && eingabe.length >= String(a.antwort).length) pruefe();
  });
  function fertig() {
    phase = 'ende';
    const s = duellSieger(laeufe[0] as DuellLauf, laeufe[1] as DuellLauf);
    spieler.forEach((p, i) => {
      const taler = (laeufe[i]?.richtig ?? 0) + (s === i ? DUELL_SIEG_TALER : 0);
      if (taler) app.aendereProfilVon(p.id, (q) => ({ ...q, taler: q.taler + taler }));
    });
    void app.speichereSofort();
    app.spieleKlang('jubel');
  }
  function zurueck() {
    clearInterval(uhr);
    if (phase === 'wahl' || phase === 'ende') app.zeige({ name: 'jahrmarkt' });
    else phase = 'wahl';
  }
  const sekunden = (ms: number) => (ms / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  onDestroy(() => clearInterval(uhr));
  app.zurueckAbfangen = () => {
    if (phase === 'wahl') return false;
    clearInterval(uhr);
    phase = 'wahl';
    return true;
  };
  onDestroy(() => (app.zurueckAbfangen = null));
</script>

<Kopfzeile titel="Geschwister-Duell" zurueck={zurueck} />
<div class="duell">
  {#if phase === 'wahl'}
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt">
        <h2><Icon name="duell" /> Wer rechnet schneller?</h2>
        {#if profile.length < 2}
          <p>Für ein Duell braucht ihr zwei Spieler auf diesem Gerät. Leg zuerst ein zweites Profil an.</p>
          <button class="ticket rot" onclick={() => app.zeige({ name: 'start' })}>Spieler hinzufügen</button>
        {:else}
          <p>Ihr rechnet nacheinander dieselben {DUELL_AUFGABEN} Aufgaben. Wer mehr richtig hat, gewinnt – bei Gleichstand entscheidet die Zeit.</p>
          <h3>Wer spielt mit? <small>(zwei auswählen)</small></h3>
          <div class="wer" role="group" aria-label="Spieler">
            {#each profile as p (p.id)}
              <button class="spieler" class:an={ausgewaehlt.includes(p.id)} aria-pressed={ausgewaehlt.includes(p.id)} onclick={() => waehle(p.id)}>
                <Figur figur={p.figur} groesse={44} aussehen={p.aussehen} />
                <span>{p.name}</span>
              </button>
            {/each}
          </div>
          <h3>Wie schwer?</h3>
          <div class="stufen" role="radiogroup" aria-label="Schwierigkeit">
            {#each BLITZ_STUFEN as s (s.id)}
              <button class="stufe" class:an={stufe === s.id} role="radio" aria-checked={stufe === s.id} onclick={() => (stufe = s.id)}>
                <strong>{s.name}</strong><span>{s.text}</span>
              </button>
            {/each}
          </div>
          <button class="ticket rot" disabled={spieler.length !== 2} onclick={starten}>Duell starten</button>
        {/if}
      </div>
    </div>
  {:else if phase === 'uebergabe' && jetzt}
    <div class="tafel karte">
      <div class="inhalt mitte">
        <Figur figur={jetzt.figur} groesse={96} aussehen={jetzt.aussehen} />
        <h2>{wer === 0 ? '' : 'Wechsel! '}Jetzt ist {jetzt.name} dran</h2>
        <p>{wer === 0 ? `Gib das Gerät an ${jetzt.name}.` : `Gib das Gerät an ${jetzt.name}. Das Ergebnis von ${spieler[0]?.name} bleibt geheim, bis beide fertig sind.`}</p>
        <button class="ticket rot" onclick={bereit}>Ich bin {jetzt.name} – los!</button>
      </div>
    </div>
  {:else if phase === 'countdown'}
    <div class="countdown" aria-live="assertive">{countdown}</div>
  {:else if phase === 'laeuft' && aufgaben[nr] && jetzt}
    <div class="stand">
      <Figur figur={jetzt.figur} groesse={32} aussehen={jetzt.aussehen} />
      <strong>{jetzt.name}</strong>
      <ol class="punkte" aria-label="Aufgabe {nr + 1} von {aufgaben.length}">
        {#each aufgaben as _, i (i)}<li class:fertig={i < nr} class:jetzt={i === nr}></li>{/each}
      </ol>
    </div>
    <div class="aufgabe {blink}">
      <span>{aufgaben[nr]?.text}</span>
      <b>= {eingabe || '?'}</b>
    </div>
    <Tastenfeld bind:wert={eingabe} maxStellen={4} onok={pruefe} />
  {:else if phase === 'ende'}
    <div class="tafel karte">
      <div class="markise"></div>
      <div class="inhalt mitte">
        <h2>{sieger === -1 ? 'Unentschieden!' : `${spieler[sieger ?? 0]?.name} gewinnt!`}</h2>
        <div class="ergebnis">
          {#each spieler as p, i (p.id)}
            <div class="lauf" class:sieg={sieger === i}>
              <Figur figur={p.figur} groesse={60} aussehen={p.aussehen} />
              <strong>{p.name}</strong>
              <span class="gross">{laeufe[i]?.richtig ?? 0} von {DUELL_AUFGABEN}</span>
              <span>{sekunden(laeufe[i]?.ms ?? 0)} Sekunden</span>
              <span class="taler"><Icon name="taler" groesse={20} /> +{(laeufe[i]?.richtig ?? 0) + (sieger === i ? DUELL_SIEG_TALER : 0)}</span>
            </div>
          {/each}
        </div>
        <p class="klein">Lösungen: {aufgaben.map((a) => `${a.text} = ${a.antwort}`).join(', ')}</p>
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => (phase = 'wahl')}>Andere Einstellung</button>
          <button class="ticket rot" onclick={starten}>Revanche</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .duell {
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
    width: min(100%, 32rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  .mitte {
    text-align: center;
    justify-items: center;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    justify-content: center;
  }
  h3 {
    margin: 4px 0 0;
    font-size: 1.05rem;
  }
  h3 small {
    font-weight: 600;
    color: var(--tinte-weich, #5a628c);
  }
  p {
    margin: 0;
  }
  .wer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .spieler {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 10px;
    min-width: 5.5rem;
    border: 3px solid #d7dae6;
    border-radius: 14px;
    background: #fff;
    color: var(--tinte);
    font: inherit;
    font-weight: 800;
  }
  .spieler.an {
    border-color: var(--tinte);
    background: #fff4cf;
  }
  .stufen {
    display: grid;
    gap: 6px;
  }
  .stufe {
    display: grid;
    text-align: left;
    padding: 8px 12px;
    border: 3px solid #d7dae6;
    border-radius: 14px;
    background: #fff;
    color: var(--tinte);
    font: inherit;
  }
  .stufe.an {
    border-color: var(--tinte);
    background: #fff4cf;
  }
  .countdown {
    font-size: 9rem;
    font-weight: 900;
    color: var(--tinte);
    text-shadow: 0 6px 0 var(--senf);
  }
  .stand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.1rem;
  }
  .punkte {
    display: flex;
    gap: 4px;
    list-style: none;
    padding: 0;
    margin: 0 0 0 8px;
  }
  .punkte li {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--tinte);
    background: #fff;
  }
  .punkte li.fertig {
    background: var(--tinte);
  }
  .punkte li.jetzt {
    background: var(--senf, #f2c41b);
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
  }
  .aufgabe.richtig {
    background: #d9f5df;
  }
  .aufgabe.falsch {
    background: #fbdada;
  }
  .ergebnis {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .lauf {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 10px 14px;
    border-radius: 16px;
    border: 3px solid #d7dae6;
    background: #fff;
    min-width: 8rem;
  }
  .lauf.sieg {
    border-color: var(--senf, #f2b705);
    background: #fff4cf;
  }
  .gross {
    font-size: 1.4rem;
    font-weight: 900;
  }
  .taler {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 900;
  }
  .klein {
    font-size: 0.85rem;
    color: var(--tinte-weich, #5a628c);
  }
  .knoepfe {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
