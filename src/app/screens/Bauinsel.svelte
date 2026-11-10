<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { BLOCKARTEN } from '../../domain/bau';
  import {
    BREITE,
    EINRICHTUNG,
    STEG,
    GRUNDSTUECKE,
    INSEL_AUFTRAG_BLOECKE,
    INSEL_AUFTRAG_TALER,
    LANDSCHAFT,
    TIERE,
    boeden,
    nimmAn,
    nimmTier,
    offenerInselAuftrag,
    pruefeInselAuftrag,
    setzeAn,
    setzeTier,
    tierArt,
    tiereBummeln,
    wegAufInsel,
    zielAufFeld,
    type InselStand,
  } from '../../domain/insel';
  import type { Seite } from '../grafik/InselWelt.svelte';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import InselWelt from '../grafik/InselWelt.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Bauinsel (Zusatzpaket): Laufen, Bauen, Abbauen. Blöcke kommen aus demselben Lager wie auf dem Bauplatz,
   * Einrichtung aus dem Andenkenstand. Die Figur läuft per Antippen; Treppen führen hinauf, Türen hindurch.
   */
  let { anreise }: { anreise?: 'teleport' | 'boot' | undefined } = $props();
  let p = $derived(app.profil);
  /** Nach dem Teleport glitzert es kurz um die Figur. */
  let funkeln = $state(false);
  /**
   * Figur und Tiere bewegen sich zuerst nur hier (schnell, ohne Speichern bei jedem Schritt);
   * gespeichert wird am Ende eines Wegs, beim Bauen und beim Verlassen.
   */
  let lokalFigur = $state<InselStand['figur'] | null>(null);
  let lokalTiere = $state<InselStand['tiere'] | null>(null);
  let stand = $derived.by((): InselStand | null => {
    if (!p) return null;
    if (!lokalFigur && !lokalTiere) return p.insel;
    return { ...p.insel, figur: lokalFigur ?? p.insel.figur, tiere: lokalTiere ?? p.insel.tiere };
  });
  let auftrag = $derived(stand ? offenerInselAuftrag(stand) : undefined);
  let auftragOffen = $state(false);
  const SCHRITT_MS = 200;

  /** Lokale Bewegung ins Profil übernehmen. */
  function sichern() {
    if (!lokalFigur && !lokalTiere) return;
    const f = lokalFigur;
    const t = lokalTiere;
    app.aendereProfil((r) => ({ ...r, insel: { ...r.insel, ...(f ? { figur: f } : {}), ...(t ? { tiere: t } : {}) } }));
    lokalFigur = null;
    lokalTiere = null;
  }

  /** Neuer Inselstand nach Bauen/Abbauen; prüft dabei den Bauauftrag. */
  function uebernehmen(neu: InselStand, bloecke: number) {
    lokalFigur = null;
    lokalTiere = null;
    const fertig = pruefeInselAuftrag(neu);
    if (fertig) {
      app.aendereProfil((r) => ({ ...r, insel: fertig.stand, taler: r.taler + INSEL_AUFTRAG_TALER, bau: { ...r.bau, bloecke: bloecke + INSEL_AUFTRAG_BLOECKE } }));
      app.spieleKlang('jubel');
      app.melde(`Bauauftrag geschafft: ${fertig.auftrag.titel}! +${INSEL_AUFTRAG_TALER} Taler, +${INSEL_AUFTRAG_BLOECKE} Blöcke`);
      return;
    }
    app.aendereProfil((r) => ({ ...r, insel: neu, bau: { ...r.bau, bloecke } }));
  }
  let modus = $state<'laufen' | 'bauen' | 'abbauen'>('laufen');
  let art = $state(2);
  let drehung = $state(0);
  let massstab = $state(1);
  let laeuft = $state(false);
  let markiert = $state<{ x: number; y: number } | null>(null);
  let feld = $state<HTMLDivElement>();
  let welt = $state<InselWelt>();
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
  /** Kamera ohne eigene Animation genau auf einen Punkt setzen (beim Laufen in jedem Bild). */
  function kameraAuf(pos: { x: number; y: number; z: number }) {
    if (!feld || !welt) return;
    const [x, y] = welt.bildpunkt(pos.x, pos.y, pos.z);
    feld.scrollLeft = x - feld.clientWidth / 2;
    feld.scrollTop = y - feld.clientHeight / 2;
  }

  /** Richtung der angetippten Seitenfläche im Bauplan (hängt von der Drehung ab). */
  function nachbar(seite: Seite): [number, number] {
    const r = ((drehung % 4) + 4) % 4;
    const links: [number, number][] = [[1, 0], [0, -1], [-1, 0], [0, 1]];
    const rechts: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    return seite === 'links' ? (links[r] ?? [1, 0]) : seite === 'rechts' ? (rechts[r] ?? [0, 1]) : [0, 0];
  }

  function tippe(x: number, y: number, z: number, seiteRoh: Seite) {
    const q = app.profil;
    const st = stand;
    if (!q || !st || laeuft) return;
    // Bodenkacheln (z = −1) zählen immer als Oberseite, auch an der Uferkante
    const seite: Seite = z < 0 ? 'oben' : seiteRoh;
    markiert = { x, y };
    setTimeout(() => (markiert = null), 400);
    if (modus === 'laufen') {
      const ziel = zielAufFeld(st, x, y, seite === 'oben' ? z + 1 : undefined);
      if (!ziel) {
        app.melde('Da kannst du nicht hin.');
        return;
      }
      const weg = wegAufInsel(st, st.figur, ziel);
      if (weg.length === 0) {
        app.melde(boeden(st, x, y).length ? 'Da kommst du nicht hin. Baue eine Treppe oder eine Tür!' : 'Da kannst du nicht hin.');
        return;
      }
      laufe(weg.slice(1));
      return;
    }
    if (modus === 'bauen') {
      const [dx, dy] = nachbar(seite);
      const zz = seite === 'oben' ? z + 1 : z;
      if (tierArt(art)) {
        const e = setzeTier(st, x + dx, y + dy, zz, art);
        if (!e.ok) {
          app.melde(e.grund === 'hoch' ? 'Mehr Tiere passen nicht auf die Inseln.' : e.grund === 'feld' ? 'Hier kann kein Tier stehen.' : (MELDUNG[e.grund] ?? 'Geht nicht.'));
          return;
        }
        uebernehmen(e.stand, q.bau.bloecke);
        app.spieleKlang('pop');
        return;
      }
      // Wie in Bauspielen: an die angetippte Fläche setzen (oben drauf oder seitlich daneben)
      const e = setzeAn(st, x + dx, y + dy, zz, art, q.bau.bloecke);
      if (!e.ok) {
        app.melde(MELDUNG[e.grund] ?? 'Geht nicht.');
        return;
      }
      uebernehmen(e.stand, e.bloecke);
      app.spieleKlang('pop');
      return;
    }
    // Abbauen: zuerst ein Tier auf dem Feld, sonst der angetippte Teil
    const ohneTier = nimmTier(st, x, y);
    if (ohneTier) {
      uebernehmen(ohneTier, q.bau.bloecke);
      app.spieleKlang('tipp');
      return;
    }
    if (z < (LANDSCHAFT.hoehe[y * BREITE + x] ?? 0)) {
      app.melde('Die Landschaft bleibt stehen. Abbauen kannst du nur, was du gebaut hast.');
      return;
    }
    const e = nimmAn(st, x, y, z, q.bau.bloecke);
    if (!e.ok) {
      app.melde(MELDUNG[e.grund] ?? 'Geht nicht.');
      return;
    }
    uebernehmen(e.stand, e.bloecke);
    app.spieleKlang('tipp');
  }

  /** Stetige Position beim Laufen; die Kamera folgt ihr Bild für Bild. */
  let gleitPos = $state<{ x: number; y: number; z: number } | null>(null);
  let bild = 0;
  /**
   * Laufen in einem durchgehenden Bildschleifen-Takt (requestAnimationFrame): Die Figur gleitet gleichmäßig
   * über den ganzen Weg, die Kamera wird in jedem Bild mitgeführt (kein Neustart einer Scroll-Animation je Feld).
   * Das Feld der Figur (für Speichern und Zeichenreihenfolge) wechselt erst, wenn sie näher am nächsten Feld ist.
   */
  function laufe(weg: { x: number; y: number; z: number }[]) {
    const start = stand?.figur;
    cancelAnimationFrame(bild);
    if (weg.length === 0 || zerstoert || !start) {
      laeuft = false;
      gleitPos = null;
      sichern();
      const danach = nachLaufen;
      nachLaufen = null;
      danach?.();
      return;
    }
    const pfad = [{ ...start }, ...weg];
    const ms = app.einstellungen.animationenReduziert ? 40 : SCHRITT_MS;
    const t0 = performance.now();
    laeuft = true;
    const schritt = (t: number) => {
      if (zerstoert) return;
      const s = Math.max(0, (t - t0) / ms);
      const ende = s >= pfad.length - 1;
      const i = Math.min(Math.floor(s), pfad.length - 1);
      const a = pfad[i]!;
      const b = pfad[Math.min(i + 1, pfad.length - 1)]!;
      const f = ende ? 0 : s - i;
      const pos = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
      const nah = f < 0.5 ? a : b;
      const jetzt = lokalFigur ?? stand?.figur;
      if (!jetzt || jetzt.x !== nah.x || jetzt.y !== nah.y || jetzt.z !== nah.z) lokalFigur = nah;
      if (ende) {
        gleitPos = null;
        laeuft = false;
        kameraAuf(nah);
        sichern();
        const danach = nachLaufen;
        nachLaufen = null;
        danach?.();
        return;
      }
      gleitPos = pos;
      kameraAuf(pos);
      bild = requestAnimationFrame(schritt);
    };
    bild = requestAnimationFrame(schritt);
  }

  const inventar = $derived(p ? [...EINRICHTUNG, ...TIERE].filter((e) => (p.insel.inventar[String(e.id)] ?? 0) > 0) : []);
  const istMoebel = $derived(art >= 100);

  /** Zum Rand des Grundstücks des aktuellen Auftrags laufen. */
  function zumGrundstueck() {
    const st = stand;
    if (!st || !auftrag) return;
    const g = GRUNDSTUECKE.find((x) => x.id === auftrag.grundstueck);
    if (!g) return;
    modus = 'laufen';
    // Ein freies Feld direkt vor dem Grundstück (unten Mitte), notfalls ein anderes Randfeld
    const kandidaten: [number, number][] = [[g.x0 + 1, g.y0 + g.n], [g.x0 - 1, g.y0 + 1], [g.x0 + g.n, g.y0 + 1], [g.x0 + 1, g.y0 - 1], [g.x0 + 1, g.y0 + 1]];
    for (const [x, y] of kandidaten) {
      const ziel = zielAufFeld(st, x, y);
      if (!ziel) continue;
      const weg = wegAufInsel(st, st.figur, ziel);
      if (weg.length) {
        auftragOffen = false;
        laufe(weg.slice(1));
        return;
      }
    }
    app.melde('Da kommst du gerade nicht hin.');
  }

  /** Zum Boot am Steg laufen und zurück zum Jahrmarkt fahren. */
  function zumBoot() {
    const st = stand;
    if (!st || laeuft) return;
    modus = 'laufen';
    const ziel = zielAufFeld(st, STEG.x, STEG.y1) ?? zielAufFeld(st, STEG.x + 1, STEG.y1);
    const weg = ziel ? wegAufInsel(st, st.figur, ziel) : [];
    app.spieleKlang('tipp');
    if (!ziel || weg.length === 0) {
      // Zugebaut? Dann fährt das Boot trotzdem.
      app.zeige({ name: 'jahrmarkt' });
      return;
    }
    nachLaufen = () => app.zeige({ name: 'jahrmarkt' });
    laufe(weg.slice(1));
  }
  /** Wird nach dem Ende eines Wegs einmal ausgeführt. */
  let nachLaufen: (() => void) | null = null;

  let bummeln: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    void tick().then(() => kamera(false));
    if (anreise === 'teleport' && !app.einstellungen.animationenReduziert) {
      funkeln = true;
      app.spieleKlang('richtig');
      setTimeout(() => (funkeln = false), 2000);
    }
    // Tiere bummeln alle paar Sekunden ein Feld weiter (nur angezeigt; gespeichert beim Verlassen)
    if (!app.einstellungen.animationenReduziert)
      bummeln = setInterval(() => {
        const st = stand;
        if (!st || st.tiere.length === 0 || laeuft) return;
        const neu = tiereBummeln(st, Math.random);
        if (neu !== st) lokalTiere = neu.tiere;
      }, 2600);
  });
  onDestroy(() => {
    zerstoert = true;
    cancelAnimationFrame(bild);
    clearInterval(bummeln);
    sichern();
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
      {#if stand}<InselWelt bind:this={welt} {stand} {drehung} {massstab} figur={p.figur} aussehen={p.aussehen} {laeuft} {markiert} grundstueck={auftrag ? auftrag.grundstueck : null} {gleitPos} {funkeln} ontippe={tippe} onboot={zumBoot} onschild={() => (auftragOffen = true)} />{/if}
    </div>
    {#if auftragOffen}
      <div class="auftrag karte" role="region" aria-label="Bauauftrag">
        {#if auftrag}
          {@const g = GRUNDSTUECKE.find((x) => x.id === auftrag.grundstueck)}
          <h2>{auftrag.titel}</h2>
          <p>{auftrag.text}</p>
          <p class="tipp">Tipp: {auftrag.tipp}</p>
          <p class="klein">{g?.name ?? 'Der Bauplatz'} liegt {g?.wo ?? 'auf einer Insel'} und hat ein Schild. Belohnung: {INSEL_AUFTRAG_TALER} Taler und {INSEL_AUFTRAG_BLOECKE} Blöcke.</p>
          <div class="knoepfe">
            <button class="ticket gelb" onclick={zumGrundstueck}>Hinlaufen</button>
            <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz' })}>Bauplatz-Aufträge</button>
          </div>
        {:else}
          <h2>Alle Inselaufträge geschafft!</h2>
          <p>Du hast alle Bauplätze bebaut. Weitere Aufträge gibt es auf dem Bauplatz.</p>
          <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz' })}>Zum Bauplatz</button>
        {/if}
      </div>
    {/if}
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
        <button class="ticket hell auftraege" onclick={() => (auftragOffen = !auftragOffen)} aria-expanded={auftragOffen}>Bauauftrag</button>
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
  .auftrag {
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 16px;
    box-shadow: 0 6px 0 rgb(31 42 107 / 0.2);
    max-height: 60%;
    overflow: auto;
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 190px;
    z-index: 3;
    padding: 12px 16px;
    display: grid;
    gap: 6px;
    max-width: 30rem;
    margin: 0 auto;
  }
  .auftrag h2 {
    font-size: 1.15rem;
  }
  .auftrag .tipp {
    font-weight: 700;
    color: var(--tinte-weich);
  }
  .auftrag .klein {
    font-size: 0.9rem;
  }
  .auftrag .knoepfe {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
