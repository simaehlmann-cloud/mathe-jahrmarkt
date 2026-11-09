<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { BUDEN, TAGESBUDEN, budeInfo, type GasseId } from '../../domain/buden';
  import { abendmarktOffen, budenZustand, hoechsteStufe, istGeschafft } from '../../domain/fortschritt/fortschritt';
  import {
    ALLEE_X,
    ANDENKEN_X,
    BUDE_BREITE,
    BUDE_HOEHE,
    BUDEN_ORTE,
    EINGANG,
    FESTPLATZ_Y,
    REIHEN,
    RIESENRAD_X,
    TOR,
    WEG_BREITE,
    WELT_BREITE,
    WELT_HOEHE,
    aufStrecke,
    aufWeg,
    budenOrt,
    laufdauerMs,
    reihenSchilder,
    reihenSpanne,
    weg,
    weglaenge,
    type Laufrichtung,
    type Punkt,
  } from '../../domain/karte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import { ENTDECKUNGEN, GASSE_BEGRUESSUNG, INTRO, NOCH_IM_AUFBAU, ABENDMARKT_ZU } from '../geschichte';
  import BudeStand from '../grafik/BudeStand.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import Laeufer from '../grafik/Laeufer.svelte';
  import Riesenrad from '../grafik/Riesenrad.svelte';
  import { app } from '../zustand.svelte';
  import Icon from '../components/Icon.svelte';
  import { STUFEN_NAME } from '../../domain/buden';
  import { gasseFarbe } from '../../domain/auftraege';

  /**
   * Der begehbare Jahrmarkt. Das Kind tippt auf eine Bude (oder einen Weg),
   * die Figur läuft über die Wege dorthin und geht hinein.
   */
  let p = $derived(app.profil);
  let gondeln = $derived(p ? TAGESBUDEN.map((b) => hoechsteStufe(p, b.id)) : []);
  let laufend = $derived(gondeln.filter((g) => g).length);
  let abendOffen = $derived(p ? abendmarktOffen(p, app.paket) : false);
  let dialog = $state<{ saetze: string[]; danach?: () => void } | null>(null);
  let auftraegeOffen = $state(false);
  let auftraege = $derived(p?.auftraege?.liste ?? []);
  let auftragsBuden = $derived(new Set(auftraege.filter((a) => !a.erledigt).map((a) => a.bude)));
  let erledigt = $derived(auftraege.filter((a) => a.erledigt).length);

  // Startpunkt: vor der zuletzt besuchten Bude, sonst am Eingang
  let pos = $state<Punkt>(app.karteOrt ?? budenOrt(app.letzteBude ?? '')?.vorne ?? EINGANG);
  let richtung = $state<Laufrichtung>('runter');
  let laeuft = $state(false);
  let ziel = $state<string | null>(null);

  let karte = $state<HTMLDivElement>();
  let massstab = $state(0.7);
  let lauf: { weg: Punkt[]; laenge: number; dauer: number; start: number; fertig: () => void } | null = null;
  let rahmen = 0;
  let zerstoert = false;
  const reduziert = (): boolean => app.einstellungen.animationenReduziert || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Kamera ---------- */
  function messen() {
    if (!karte) return;
    const w = karte.clientWidth;
    const h = karte.clientHeight;
    massstab = Math.max(0.56, Math.min(1, w / 1000, h / 760));
  }

  /** Figur in die Mitte holen; `weich` folgt der Figur beim Laufen. */
  function kamera(weich: boolean) {
    if (!karte) return;
    const zx = pos.x * massstab - karte.clientWidth / 2;
    const zy = (pos.y - 80) * massstab - karte.clientHeight / 2;
    if (!weich) {
      karte.scrollTo({ left: zx, top: zy });
      return;
    }
    karte.scrollLeft += (zx - karte.scrollLeft) * 0.12;
    karte.scrollTop += (zy - karte.scrollTop) * 0.12;
  }

  /* ---------- Laufen ---------- */
  function schritt(jetzt: number) {
    if (zerstoert || !lauf) return;
    const t = Math.min(1, (jetzt - lauf.start) / lauf.dauer);
    const a = aufStrecke(lauf.weg, t * lauf.laenge);
    pos = a.p;
    richtung = a.richtung;
    kamera(true);
    if (t >= 1) {
      const fertig = lauf.fertig;
      lauf = null;
      laeuft = false;
      app.karteOrt = pos;
      fertig();
      return;
    }
    rahmen = requestAnimationFrame(schritt);
  }

  function laufeZu(zielPunkt: Punkt, fertig: () => void = () => {}) {
    cancelAnimationFrame(rahmen);
    const w = weg(pos, zielPunkt);
    const laenge = weglaenge(w);
    if (laenge < 2 || reduziert()) {
      pos = zielPunkt;
      app.karteOrt = pos;
      lauf = null;
      laeuft = false;
      kamera(false);
      fertig();
      return;
    }
    laeuft = true;
    lauf = { weg: w, laenge, dauer: laufdauerMs(laenge), start: performance.now(), fertig };
    rahmen = requestAnimationFrame(schritt);
  }


  function zurBude(id: string) {
    const o = budenOrt(id);
    if (!o) return;
    app.spieleKlang('tipp');
    ziel = id;
    if (o.gasse === 'abendmarkt' && !abendOffen) {
      laufeZu(TOR, () => {
        ziel = null;
        dialog = { saetze: ABENDMARKT_ZU };
      });
      return;
    }
    laufeZu(o.vorne, () => ankommen(id, o.gasse));
  }

  function ankommen(id: string, gasse: GasseId) {
    ziel = null;
    const info = budeInfo(id);
    if (!info.spielbar) {
      dialog = { saetze: NOCH_IM_AUFBAU };
      return;
    }
    const betreten = () => {
      app.letzteBude = id;
      app.zeige({ name: 'bude', bude: id });
    };
    const gruss = GASSE_BEGRUESSUNG[gasse];
    if (p && gruss && !p.gesehen.gassen.includes(gasse)) {
      dialog = {
        saetze: gruss,
        danach: () => {
          app.aendereProfil((q) => (q.gesehen.gassen.includes(gasse) ? q : { ...q, gesehen: { ...q.gesehen, gassen: [...q.gesehen.gassen, gasse] } }));
          betreten();
        },
      };
      return;
    }
    betreten();
  }

  function zumAndenkenstand() {
    app.spieleKlang('tipp');
    laufeZu({ x: ANDENKEN_X, y: FESTPLATZ_Y }, () => app.zeige({ name: 'andenken' }));
  }

  /** Tippen auf freie Fläche: zum nächsten Punkt auf dem Weg laufen. */
  function aufKarteGetippt(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const punkt = { x: (e.clientX - r.left) / massstab, y: (e.clientY - r.top) / massstab };
    let z = aufWeg(punkt);
    if (!abendOffen && z.y < TOR.y) z = TOR;
    laufeZu(z);
  }

  function katzeEntdeckt() {
    const e = ENTDECKUNGEN.katze;
    if (!p || !e) return;
    app.spieleKlang('jubel');
    if (!p.gesehen.entdeckungen.includes('katze')) {
      app.aendereProfil((q) => ({ ...q, gesehen: { ...q.gesehen, entdeckungen: [...q.gesehen.entdeckungen, 'katze'] } }));
      app.melde(`Neu im Entdeckerbuch: ${e.titel}`);
    } else {
      app.melde(e.text);
    }
  }

  function dialogFertig() {
    const d = dialog;
    dialog = null;
    d?.danach?.();
  }

  $effect(() => {
    if (p && !p.gesehen.intro && dialog === null) {
      dialog = {
        saetze: INTRO(p.name),
        danach: () => app.aendereProfil((q) => ({ ...q, gesehen: { ...q.gesehen, intro: true } })),
      };
    }
  });

  onMount(() => {
    app.auftraegeSicherstellen();
    messen();
    void tick().then(() => kamera(false));
    const ro = new ResizeObserver(() => {
      messen();
      kamera(false);
    });
    if (karte) ro.observe(karte);
    return () => ro.disconnect();
  });

  onDestroy(() => {
    zerstoert = true;
    cancelAnimationFrame(rahmen);
    app.karteOrt = pos;
  });

  const schilder = reihenSchilder();
  const lampen = Array.from({ length: 14 }, (_, i) => i);
  const wimpelFarben = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'];
  const baeume = [
    { x: 150, y: 200 },
    { x: 1500, y: 210 },
    { x: 1500, y: FESTPLATZ_Y - 400 },
    { x: 90, y: WELT_HOEHE - 120 },
    { x: 1550, y: WELT_HOEHE - 120 },
  ];
</script>

{#if p}
  <Kopfzeile titel="Jahrmarkt" />
  <div class="karte" bind:this={karte}>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="huelle" style="width: {WELT_BREITE * massstab}px; height: {WELT_HOEHE * massstab}px">
      <div class="welt" style="width: {WELT_BREITE}px; height: {WELT_HOEHE}px; transform: scale({massstab})" onclick={aufKarteGetippt}>
        <!-- Boden: Wiese, Wege, Festplatz, Zaun des Sternenmarkts -->
        <svg class="boden" viewBox="0 0 {WELT_BREITE} {WELT_HOEHE}" width={WELT_BREITE} height={WELT_HOEHE} aria-hidden="true">
          <defs>
            <pattern id="gras" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="#9fd88f" />
              <path d="M10 20 l3 -7 l3 7 M40 48 l3 -7 l3 7 M44 12 l2 -5 l2 5" stroke="#7fc06e" stroke-width="2" fill="none" />
            </pattern>
            <pattern id="pflaster" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#ecd6aa" />
              <rect x="1" y="1" width="18" height="18" rx="3" fill="#e4cb9b" />
              <rect x="21" y="21" width="18" height="18" rx="3" fill="#e4cb9b" />
            </pattern>
          </defs>
          <rect width={WELT_BREITE} height={WELT_HOEHE} fill="url(#gras)" />
          <!-- Sternenmarkt: dunkler Himmel hinter dem Zaun -->
          <rect x="0" y="0" width={WELT_BREITE} height={TOR.y - 20} fill={abendOffen ? '#2e2a4f' : '#4b4673'} opacity="0.85" />
          {#each Array.from({ length: 40 }, (_, i) => i) as i (i)}
            <circle cx={(i * 173) % WELT_BREITE} cy={20 + ((i * 97) % 140)} r={i % 3 === 0 ? 2.5 : 1.5} fill="#fff6c8" opacity="0.8" />
          {/each}
          <!-- Festplatz -->
          <ellipse cx={ALLEE_X} cy={FESTPLATZ_Y - 40} rx={WELT_BREITE * 0.47} ry="300" fill="url(#pflaster)" stroke="#c9a96f" stroke-width="6" />
          <!-- Allee -->
          <rect x={ALLEE_X - WEG_BREITE / 2 - 10} y={(REIHEN[0]?.y ?? 0) - WEG_BREITE / 2} width={WEG_BREITE + 20} height={FESTPLATZ_Y - (REIHEN[0]?.y ?? 0) + WEG_BREITE} fill="url(#pflaster)" stroke="#c9a96f" stroke-width="5" />
          <!-- Querwege -->
          {#each REIHEN as r (r.index)}
            {@const [l, re] = reihenSpanne(r)}
            <rect x={l - 30} y={r.y - WEG_BREITE / 2} width={re - l + 60} height={WEG_BREITE} rx={WEG_BREITE / 2} fill="url(#pflaster)" stroke="#c9a96f" stroke-width="5" />
          {/each}
          <!-- Zaun vor dem Sternenmarkt -->
          {#if !abendOffen}
            <g>
              {#each Array.from({ length: Math.ceil(WELT_BREITE / 36) }, (_, i) => i) as i (i)}
                {#if Math.abs(i * 36 + 18 - ALLEE_X) > 60}
                  <rect x={i * 36 + 12} y={TOR.y - 70} width="12" height="62" rx="4" fill="#b9763f" stroke="#87521f" stroke-width="3" />
                {/if}
              {/each}
              <rect x="0" y={TOR.y - 54} width={ALLEE_X - 60} height="10" fill="#87521f" />
              <rect x={ALLEE_X + 60} y={TOR.y - 54} width={ALLEE_X - 60} height="10" fill="#87521f" />
              <rect x={ALLEE_X - 60} y={TOR.y - 80} width="120" height="74" fill="#87521f" stroke="#5e3714" stroke-width="4" />
              {#each [0, 1, 2, 3] as i (i)}<rect x={ALLEE_X - 52 + i * 28} y={TOR.y - 74} width="20" height="62" fill="#b9763f" />{/each}
            </g>
          {/if}
          <!-- Bäume -->
          {#each baeume as b, i (i)}
            <g transform="translate({b.x} {b.y})">
              <ellipse cx="0" cy="58" rx="40" ry="10" fill="#1f2a6b" opacity="0.12" />
              <rect x="-8" y="10" width="16" height="48" rx="5" fill="#87521f" />
              <circle cx="-18" cy="0" r="30" fill="#3fae6a" />
              <circle cx="18" cy="-4" r="32" fill="#4fbf78" />
              <circle cx="0" cy="-26" r="30" fill="#5ccc85" />
            </g>
          {/each}
          <!-- Laternen an der Allee -->
          {#each REIHEN as r (r.index)}
            {#each [-1, 1] as s (s)}
              <g transform="translate({ALLEE_X + s * 70} {r.y + 160})">
                <rect x="-3" y="-60" width="6" height="64" fill="#1f2a6b" />
                <circle cx="0" cy="-66" r="10" fill={laufend > 0 ? '#ffe57a' : '#d7dae6'} stroke="#1f2a6b" stroke-width="3" />
              </g>
            {/each}
          {/each}
        </svg>

        <!-- Sternenmarkt-Schild -->
        <div class="abend-schild" style="left: {ALLEE_X}px; top: {TOR.y + 14}px">
          <strong>Sternenmarkt</strong>
          {#if !abendOffen}<span>öffnet, wenn alle Buden Silber haben</span>{/if}
        </div>

        <!-- Gassenschilder -->
        {#each schilder as s (`${s.reihe.index}-${s.name}`)}
          <div
            class="gassen-schild"
            style="--f: {s.farbe}; top: {s.reihe.y}px; z-index: {s.reihe.y + 10}; {s.seite === 'links' ? `right: ${WELT_BREITE - ALLEE_X + 56}px` : `left: ${ALLEE_X + 56}px`}"
          >
            {s.name}
          </div>
        {/each}

        <!-- Deko aus dem Andenkenstand -->
        {#if p.deko.includes('lichterkette') || p.deko.includes('wimpel')}
          {#each REIHEN.slice(1) as r (r.index)}
            {@const [l, re] = reihenSpanne(r)}
            {#if p.deko.includes('lichterkette')}
              <div class="kette licht" style="left: {l}px; width: {re - l}px; top: {r.y - BUDE_HOEHE - 30}px" aria-hidden="true">
                {#each lampen as i (i)}<span style="animation-delay: {(i % 6) * 0.3}s"></span>{/each}
              </div>
            {/if}
            {#if p.deko.includes('wimpel')}
              <div class="kette wimpel" style="left: {l}px; width: {re - l}px; top: {r.y - BUDE_HOEHE - 14}px" aria-hidden="true">
                {#each lampen as i (i)}<span style="--f: {wimpelFarben[i % wimpelFarben.length]}"></span>{/each}
              </div>
            {/if}
          {/each}
        {/if}

        <!-- Buden -->
        {#each BUDEN_ORTE as o (o.id)}
          {@const info = BUDEN.find((x) => x.id === o.id)}
          {#if info}
            {@const zustand = info.spielbar ? budenZustand(p, o.id) : 'zu'}
            {@const mitKatze = o.id === 'dartbude' && istGeschafft(p, o.id, 'bronze')}
            <div class="bude" class:ziel={ziel === o.id} style="left: {o.x - BUDE_BREITE / 2}px; top: {o.boden - BUDE_HOEHE}px; z-index: {Math.round(o.boden)}">
              <button
                class="bude-knopf"
                onclick={() => zurBude(o.id)}
                aria-label={info.spielbar ? `${info.name} öffnen` : `${info.name}, bald geöffnet`}
              >
                <BudeStand bude={o.id} {zustand} besitzer={o.id === 'dartbude'} katze={mitKatze} />
              </button>
              {#if mitKatze}
                <button class="katze-knopf" onclick={katzeEntdeckt} aria-label="Katze auf dem Dach"></button>
              {/if}
              <div class="schild" class:zu={!info.spielbar}>{info.name}</div>
              {#if auftragsBuden.has(o.id)}<div class="auftrag-marke" aria-hidden="true"><Icon name="auftrag" groesse={30} /></div>{/if}
            </div>
          {/if}
        {/each}

        <!-- Festplatz: Riesenrad, Andenkenstand, Eingang, Flinka -->
        <div class="riesenrad" style="left: {RIESENRAD_X - 170}px; top: {FESTPLATZ_Y - 470}px; z-index: {FESTPLATZ_Y - 40}">
          <Riesenrad {gondeln} />
          <p class="fortschritt"><strong>{laufend} von {TAGESBUDEN.length}</strong> Buden laufen wieder</p>
          {#if p.deko.includes('ballons')}
            <svg class="ballons" viewBox="0 0 60 110" aria-hidden="true">
              <path d="M30 108 L18 40 M30 108 L32 30 M30 108 L46 44" stroke="#4a5394" stroke-width="1.5" fill="none" />
              <ellipse cx="18" cy="30" rx="12" ry="15" fill="#e23a4e" />
              <ellipse cx="32" cy="18" rx="12" ry="15" fill="#ffc62b" />
              <ellipse cx="46" cy="34" rx="12" ry="15" fill="#3c78d8" />
            </svg>
          {/if}
        </div>

        <button class="andenken" style="left: {ANDENKEN_X - 100}px; top: {FESTPLATZ_Y - 250}px; z-index: {FESTPLATZ_Y - 30}" onclick={zumAndenkenstand} aria-label="Andenkenstand">
          <svg viewBox="0 0 200 220" aria-hidden="true">
            <ellipse cx="100" cy="212" rx="92" ry="8" fill="#1f2a6b" opacity="0.12" />
            <rect x="26" y="70" width="10" height="138" fill="#87521f" />
            <rect x="164" y="70" width="10" height="138" fill="#87521f" />
            <path d="M10 76 L100 10 L190 76 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="4" stroke-linejoin="round" />
            <path d="M55 76 L100 10 L145 76 Z" fill="#fffdf7" opacity="0.9" />
            <rect x="36" y="76" width="128" height="80" fill="#fff4cc" />
            <circle cx="66" cy="112" r="16" fill="#ffc62b" stroke="#1f2a6b" stroke-width="3" />
            <rect x="92" y="96" width="30" height="30" rx="4" fill="#3c78d8" stroke="#1f2a6b" stroke-width="3" />
            <path d="M92 110 H122 M107 96 V126" stroke="#ffc62b" stroke-width="4" />
            <path d="M136 124 L146 98 L156 124 Z" fill="#3fae6a" stroke="#1f2a6b" stroke-width="3" />
            <rect x="20" y="156" width="160" height="52" rx="6" fill="#b9763f" stroke="#1f2a6b" stroke-width="4" />
          </svg>
          <span class="schild">Andenkenstand</span>
        </button>

        <div class="eingang" style="left: {EINGANG.x - 190}px; top: {WELT_HOEHE - 200}px" aria-hidden="true">
          <div class="bogen">Mathe-Jahrmarkt</div>
        </div>

        <div class="flinka" style="left: {EINGANG.x + 90}px; top: {FESTPLATZ_Y - 150}px; z-index: {FESTPLATZ_Y - 20}" aria-hidden="true">
          <Flinka groesse={84} winkt={!laeuft} />
        </div>

        <!-- Die Figur -->
        <div class="figur" style="left: {pos.x}px; top: {pos.y}px; z-index: {Math.round(pos.y) + 40}" aria-hidden="true">
          <Laeufer figur={p.figur} aussehen={p.aussehen} {laeuft} {richtung} groesse={104} />
        </div>
      </div>
    </div>
  </div>

  <div class="leiste">
    <button class="ticket gelb" onclick={() => (auftraegeOffen = true)} aria-label="Tagesaufträge, {erledigt} von {auftraege.length} erledigt">
      <Icon name="auftrag" groesse={22} /> Aufträge {erledigt}/{auftraege.length}
    </button>
    <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz' })}><Icon name="block" groesse={22} /> Bauplatz</button>
    <button class="ticket hell rund-klein" onclick={() => kamera(false)} aria-label="Wo bin ich?">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22" /></svg>
    </button>
  </div>

  {#if auftraegeOffen}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="schleier" onclick={() => (auftraegeOffen = false)}></div>
    <div class="tafel auftraege" role="dialog" aria-modal="true" aria-labelledby="auftraege-titel">
      <div class="markise"></div>
      <div class="inhalt">
        <h2 id="auftraege-titel">Tagesaufträge</h2>
        <p class="klein">Spiel eine Runde mit mindestens 7 Treffern. Pro Auftrag: 15 Taler und 10 Blöcke. Alle drei: 20 Blöcke extra.</p>
        <ul>
          {#each auftraege as a (a.bude)}
            {@const info = budeInfo(a.bude)}
            <li class:fertig={a.erledigt} style="--f: {gasseFarbe(a.bude)}">
              <span class="haken" aria-hidden="true">{#if a.erledigt}<Icon name="haken" groesse={20} />{/if}</span>
              <span class="was"><strong>{info.name}</strong><small>{STUFEN_NAME[a.stufe]}</small></span>
              {#if !a.erledigt}
                <button class="ticket rot klein" onclick={() => { auftraegeOffen = false; zurBude(a.bude); }}>Hin</button>
              {:else}<span class="erledigt">erledigt</span>{/if}
            </li>
          {/each}
        </ul>
        <button class="ticket hell" onclick={() => (auftraegeOffen = false)}>Schließen</button>
      </div>
    </div>
  {/if}

  {#if dialog}
    <div class="schleier"></div>
    {#key dialog}
      <Sprechblase saetze={dialog.saetze} onfertig={dialogFertig} />
    {/key}
  {/if}
{/if}

<style>
  .karte {
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
    z-index: 1;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .karte::-webkit-scrollbar {
    display: none;
  }
  .huelle {
    position: relative;
  }
  .welt {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .boden {
    position: absolute;
    inset: 0;
    display: block;
  }
  .bude {
    position: absolute;
    width: 172px;
  }
  .bude-knopf {
    display: block;
    width: 100%;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
  }
  .bude.ziel .bude-knopf {
    animation: hupf 0.5s ease-in-out infinite alternate;
  }
  @keyframes hupf {
    to {
      transform: translateY(-6px);
    }
  }
  .katze-knopf {
    position: absolute;
    left: 62%;
    top: 5%;
    width: 25%;
    height: 15%;
    border: 0;
    background: transparent;
    border-radius: 12px;
  }
  .schild {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 4px);
    transform: translateX(-50%);
    width: max-content;
    max-width: 196px;
    text-align: center;
    line-height: 1.1;
    background: var(--holz);
    color: #fff;
    border: 3px solid var(--holz-dunkel);
    border-radius: 8px;
    padding: 3px 12px;
    font-weight: 900;
    font-size: 1.35rem;
    pointer-events: none;
    z-index: 2;
  }
  .schild.zu {
    background: #8b8fa6;
    border-color: #6a6e86;
  }
  .gassen-schild {
    position: absolute;
    transform: translateY(-50%);
    background: var(--f);
    color: #fff;
    font-weight: 900;
    font-size: 1.7rem;
    padding: 4px 16px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    box-shadow: 0 4px 0 var(--tinte);
    white-space: nowrap;
    pointer-events: none;
  }
  .abend-schild {
    position: absolute;
    transform: translateX(-50%);
    display: grid;
    justify-items: center;
    background: #2e2a4f;
    color: #ffe57a;
    border: 3px solid #ffe57a;
    border-radius: 12px;
    padding: 4px 16px;
    font-size: 1.05rem;
    white-space: nowrap;
    pointer-events: none;
    z-index: 4000;
  }
  .abend-schild strong {
    font-size: 1.4rem;
  }
  .riesenrad {
    position: absolute;
    width: 340px;
    display: grid;
    justify-items: center;
    pointer-events: none;
  }
  .fortschritt {
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 14px;
    padding: 4px 16px;
    font-size: 1.6rem;
    margin-top: -6px;
    white-space: nowrap;
  }
  .ballons {
    position: absolute;
    right: 0;
    top: 30px;
    width: 70px;
  }
  .andenken {
    position: absolute;
    width: 200px;
    border: 0;
    background: none;
    padding: 0;
  }
  .andenken .schild {
    bottom: -34px;
  }
  .eingang {
    position: absolute;
    width: 380px;
    height: 200px;
    pointer-events: none;
    z-index: 9000;
  }
  .bogen {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 40px;
    text-align: center;
    font-weight: 900;
    font-size: 1.9rem;
    color: #fff;
    background: var(--markise);
    border: 4px solid var(--tinte);
    border-radius: 60px 60px 12px 12px;
    padding: 8px 10px;
    box-shadow: 0 5px 0 var(--tinte);
  }
  .eingang::before,
  .eingang::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 22px;
    height: 120px;
    background: repeating-linear-gradient(0deg, #e23a4e 0 18px, #fffdf7 18px 36px);
    border: 3px solid var(--tinte);
    border-radius: 6px;
  }
  .eingang::before {
    left: 6px;
  }
  .eingang::after {
    right: 6px;
  }
  .flinka {
    position: absolute;
    pointer-events: none;
  }
  .figur {
    position: absolute;
    transform: translate(-50%, -88%);
    pointer-events: none;
    filter: drop-shadow(0 2px 0 rgb(31 42 107 / 0.25));
  }
  .kette {
    position: absolute;
    height: 30px;
    display: flex;
    justify-content: space-around;
    border-top: 2px solid #4a5394;
    border-radius: 0 0 50% 50% / 0 0 18px 18px;
    pointer-events: none;
    z-index: 3000;
  }
  .kette.licht span {
    width: 10px;
    height: 12px;
    border-radius: 50%;
    background: #ffe57a;
    margin-top: 2px;
    box-shadow: 0 0 8px #ffe57a;
    animation: funkeln 1.8s ease-in-out infinite;
  }
  .kette.wimpel span {
    width: 0;
    height: 0;
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-top: 16px solid var(--f);
  }
  @keyframes funkeln {
    50% {
      opacity: 0.55;
    }
  }
  .leiste {
    position: absolute;
    left: var(--rand);
    right: var(--rand-r);
    bottom: var(--unten);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    z-index: 6;
  }
  .leiste > * {
    pointer-events: auto;
  }
  .leiste .ticket {
    min-height: 44px;
    font-size: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding-inline: 12px;
  }
  .leiste .rund-klein {
    padding-inline: 10px;
  }
  .auftrag-marke {
    position: absolute;
    right: 4px;
    top: -82px;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    background: var(--senf);
    color: var(--tinte);
    border: 3px solid var(--tinte);
    border-radius: 50%;
    box-shadow: 0 3px 0 var(--tinte);
    animation: hupf 0.8s ease-in-out infinite alternate;
    pointer-events: none;
    z-index: 3;
  }
  .schleier {
    position: absolute;
    inset: 0;
    background: rgb(31 42 107 / 0.25);
    z-index: 20;
  }
  .auftraege {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(calc(100% - 32px), 26rem);
    z-index: 30;
  }
  .auftraege .inhalt {
    padding: 12px 16px 16px;
    display: grid;
    gap: 10px;
  }
  .auftraege ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .auftraege li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-left: 10px solid var(--f);
    border-radius: 12px;
    background: #fff;
  }
  .auftraege li.fertig {
    background: #e7f6ec;
  }
  .haken {
    width: 28px;
    height: 28px;
    flex: none;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinte);
    border-radius: 8px;
    color: var(--wiese-dunkel);
  }
  .was {
    flex: 1;
    display: grid;
  }
  .was small {
    color: var(--tinte-weich);
    font-weight: 800;
  }
  .erledigt {
    font-weight: 900;
    color: var(--wiese-dunkel);
  }
  .klein {
    font-size: 0.95rem;
    margin: 0;
  }
  .ticket.klein {
    min-height: 40px;
    padding: 4px 16px;
  }
</style>
