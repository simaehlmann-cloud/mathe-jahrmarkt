<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { BLOCKARTEN } from '../../domain/bau';
  import { EINRICHTUNG, LANDSCHAFT, INSEL, boeden, nimmAn, setzeAn, wegAufInsel, zielAufFeld } from '../../domain/insel';
  import type { Seite } from '../grafik/InselWelt.svelte';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import InselWelt from '../grafik/InselWelt.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Bauinsel (Zusatzpaket): Laufen, Bauen, Abbauen. Blöcke kommen aus demselben Lager wie auf dem Bauplatz,
   * Einrichtung aus dem Andenkenstand. Die Figur läuft per Antippen; Treppen führen hinauf, Türen hindurch.
   */
  let p = $derived(app.profil);
  let modus = $state<'laufen' | 'bauen' | 'abbauen'>('laufen');
  let art = $state(2);
  let drehung = $state(0);
  let massstab = $state(1);
  let laeuft = $state(false);
  let markiert = $state<{ x: number; y: number } | null>(null);
  let feld = $state<HTMLDivElement>();
  let welt = $state<InselWelt>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let zerstoert = false;

  const MELDUNG: Record<string, string> = {
    feld: 'Hier kann man nicht bauen (Wasser oder Baum).',
    hoch: 'Höher geht es nicht.',
    figur: 'Da stehst du gerade selbst!',
    keineBloecke: 'Keine Blöcke mehr. Rechne eine Runde, dann bekommst du neue!',
    keinTeil: 'Davon hast du keins mehr. Einrichtung gibt es im Andenkenstand.',
    leer: 'Hier ist nichts zum Abbauen.',
    besetzt: 'Da ist schon etwas.',
    schwebt: 'Das hätte keinen Halt. Baue es an einen anderen Block oder auf den Boden.',
  };

  function kamera(weich = false) {
    if (!feld || !welt) return;
    const [x, y] = welt.figurBildpunkt();
    feld.scrollTo({ left: x - feld.clientWidth / 2, top: y - feld.clientHeight / 2, behavior: weich ? 'smooth' : 'auto' });
  }

  /** Richtung der angetippten Seitenfläche im Bauplan (hängt von der Drehung ab). */
  function nachbar(seite: Seite): [number, number] {
    const r = ((drehung % 4) + 4) % 4;
    const links: [number, number][] = [[1, 0], [0, -1], [-1, 0], [0, 1]];
    const rechts: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    return seite === 'links' ? (links[r] ?? [1, 0]) : seite === 'rechts' ? (rechts[r] ?? [0, 1]) : [0, 0];
  }

  function tippe(x: number, y: number, z: number, seite: Seite) {
    const q = app.profil;
    if (!q || laeuft) return;
    markiert = { x, y };
    setTimeout(() => (markiert = null), 400);
    if (modus === 'laufen') {
      const ziel = zielAufFeld(q.insel, x, y, seite === 'oben' ? z + 1 : undefined);
      if (!ziel) {
        app.melde('Da kannst du nicht hin.');
        return;
      }
      const weg = wegAufInsel(q.insel, q.insel.figur, ziel);
      if (weg.length === 0) {
        app.melde(boeden(q.insel, x, y).length ? 'Da kommst du nicht hin. Baue eine Treppe oder eine Tür!' : 'Da kannst du nicht hin.');
        return;
      }
      laufe(weg.slice(1));
      return;
    }
    if (modus === 'bauen') {
      // Wie in Bauspielen: an die angetippte Fläche setzen (oben drauf oder seitlich daneben)
      const [dx, dy] = nachbar(seite);
      const e = setzeAn(q.insel, x + dx, y + dy, seite === 'oben' ? z + 1 : z, art, q.bau.bloecke);
      if (!e.ok) {
        app.melde(MELDUNG[e.grund] ?? 'Geht nicht.');
        return;
      }
      app.aendereProfil((r) => ({ ...r, insel: e.stand, bau: { ...r.bau, bloecke: e.bloecke } }));
      app.spieleKlang('pop');
      return;
    }
    if (z < (LANDSCHAFT.hoehe[y * INSEL + x] ?? 0)) {
      app.melde('Die Landschaft bleibt stehen. Abbauen kannst du nur, was du gebaut hast.');
      return;
    }
    const e = nimmAn(q.insel, x, y, z, q.bau.bloecke);
    if (!e.ok) {
      app.melde(MELDUNG[e.grund] ?? 'Geht nicht.');
      return;
    }
    app.aendereProfil((r) => ({ ...r, insel: e.stand, bau: { ...r.bau, bloecke: e.bloecke } }));
    app.spieleKlang('tipp');
  }

  function laufe(weg: { x: number; y: number; z: number }[]) {
    if (weg.length === 0 || zerstoert) {
      laeuft = false;
      return;
    }
    laeuft = true;
    const [naechster, ...rest] = weg;
    if (!naechster) return;
    app.aendereProfil((r) => ({ ...r, insel: { ...r.insel, figur: naechster } }));
    void tick().then(() => kamera(false));
    timer = setTimeout(() => laufe(rest), app.einstellungen.animationenReduziert ? 40 : 180);
  }

  const inventar = $derived(p ? EINRICHTUNG.filter((e) => (p.insel.inventar[String(e.id)] ?? 0) > 0) : []);
  const istMoebel = $derived(art >= 100);

  onMount(() => {
    void tick().then(() => kamera(false));
  });
  onDestroy(() => {
    zerstoert = true;
    clearTimeout(timer);
  });
</script>

{#if p}
  <Kopfzeile titel="Bauinsel" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  {#if !app.paket}
    <div class="gesperrt">
      <div class="tafel karte">
        <div class="markise"></div>
        <div class="inhalt">
          <h2>Die Bauinsel</h2>
          <p>Eine eigene Insel mit See, Hügel und Bäumen: Häuser bauen, einrichten und mit deiner Figur durch die Türen gehen. Die Blöcke verdienst du beim Rechnen.</p>
          <p class="schloss"><Icon name="schloss" groesse={20} /> Die Bauinsel gehört zum Zusatzpaket. Frag deine Eltern!</p>
          <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz' })}>Zum Bauplatz</button>
        </div>
      </div>
    </div>
  {:else}
    <div class="feld" bind:this={feld}>
      <InselWelt bind:this={welt} stand={p.insel} {drehung} {massstab} figur={p.figur} aussehen={p.aussehen} {laeuft} {markiert} ontippe={tippe} />
    </div>
    <div class="werkzeug">
      <div class="zeile">
        <div class="modus" role="radiogroup" aria-label="Was möchtest du tun?">
          <button role="radio" aria-checked={modus === 'laufen'} class:an={modus === 'laufen'} onclick={() => (modus = 'laufen')}>Laufen</button>
          <button role="radio" aria-checked={modus === 'bauen'} class:an={modus === 'bauen'} onclick={() => (modus = 'bauen')}>Bauen</button>
          <button role="radio" aria-checked={modus === 'abbauen'} class:an={modus === 'abbauen'} onclick={() => (modus = 'abbauen')}>Abbauen</button>
        </div>
        <span class="lager"><Icon name="block" groesse={20} />{p.bau.bloecke}</span>
      </div>
      {#if modus === 'bauen'}
        <div class="palette" role="radiogroup" aria-label="Baustein">
          {#each BLOCKARTEN as b (b.id)}
            <button role="radio" aria-checked={art === b.id} aria-label={b.name} class="block" class:an={art === b.id} style="--o: {b.oben}; --l: {b.links}" onclick={() => (art = b.id)}></button>
          {/each}
          {#each inventar as e (e.id)}
            <button role="radio" aria-checked={art === e.id} aria-label="{e.name}, {p.insel.inventar[String(e.id)]} Stück" class="teil" class:an={art === e.id} onclick={() => (art = e.id)}>{e.name}<small>{p.insel.inventar[String(e.id)]}</small></button>
          {/each}
          <button class="laden" onclick={() => app.zeige({ name: 'andenken' })}>+ Einrichtung</button>
        </div>
        {#if istMoebel && !(p.insel.inventar[String(art)] ?? 0)}<p class="hinweis">Davon hast du keins mehr.</p>{/if}
      {:else}
        <p class="hinweis">{modus === 'laufen' ? 'Tippe auf ein Feld, dann läufst du hin. Hinauf geht es über Treppen.' : 'Tippe auf einen Block: Er kommt zurück ins Lager.'}</p>
      {/if}
      <div class="zeile klein">
        <button class="rund" onclick={() => (drehung = (drehung + 1) % 4)} aria-label="Ansicht drehen">↻</button>
        <button class="rund" onclick={() => { massstab = Math.max(0.6, massstab - 0.2); void tick().then(() => kamera()); }} aria-label="Kleiner">−</button>
        <button class="rund" onclick={() => { massstab = Math.min(1.8, massstab + 0.2); void tick().then(() => kamera()); }} aria-label="Größer">+</button>
        <button class="rund" onclick={() => kamera(true)} aria-label="Wo bin ich?">◎</button>
        <button class="ticket hell auftraege" onclick={() => app.zeige({ name: 'bauplatz' })}>Bauaufträge</button>
      </div>
    </div>
  {/if}
{/if}

<style>
  .gesperrt {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    position: relative;
    z-index: 1;
  }
  .karte {
    width: min(100%, 30rem);
  }
  .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  h2,
  p {
    margin: 0;
  }
  .schloss {
    display: flex;
    gap: 8px;
    align-items: center;
    font-weight: 900;
  }
  .feld {
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
    z-index: 1;
    background: #3c8fc2;
    scrollbar-width: none;
    overscroll-behavior: contain;
  }
  .werkzeug {
    position: relative;
    z-index: 2;
    display: grid;
    gap: 6px;
    padding: 8px var(--rand-r) var(--unten) var(--rand);
    background: var(--papier);
    border-top: 3px solid var(--tinte);
  }
  .zeile {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
  .zeile.klein {
    justify-content: flex-start;
  }
  .zeile.klein .rund {
    width: 44px;
    height: 44px;
  }
  .auftraege {
    margin-left: auto;
    min-height: 44px;
    font-size: 1rem;
  }
  .modus {
    display: flex;
    gap: 4px;
  }
  .modus button {
    min-height: 44px;
    padding: 4px 12px;
    border: 3px solid var(--tinte);
    border-radius: 22px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .modus button.an {
    background: var(--tinte);
    color: #fff;
  }
  .lager {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-weight: 900;
    padding: 4px 10px;
    border: 3px solid var(--tinte);
    border-radius: 16px;
  }
  .palette {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 4px 2px;
  }
  .palette button {
    flex: none;
    min-height: 42px;
    border: 3px solid var(--tinte);
    border-radius: 8px;
    font: inherit;
    font-weight: 800;
    color: var(--tinte);
  }
  .palette .block {
    width: 42px;
    background: linear-gradient(var(--o) 55%, var(--l) 55%);
  }
  .palette .teil {
    padding: 2px 10px;
    background: #fff;
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .palette .teil small {
    background: var(--tinte);
    color: #fff;
    border-radius: 8px;
    padding: 0 6px;
  }
  .palette .laden {
    padding: 2px 10px;
    background: #fff8dc;
    border-style: dashed;
  }
  .palette .an {
    outline: 4px solid var(--senf);
    outline-offset: 1px;
  }
  .hinweis {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--tinte-weich);
  }
</style>
