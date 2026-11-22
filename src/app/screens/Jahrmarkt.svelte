<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { BUDEN, TAGESBUDEN, budeInfo, type GasseId } from '../../domain/buden';
  import { abendmarktOffen, budenZustand, hoechsteStufe, istGeschafft } from '../../domain/fortschritt/fortschritt';
  import {
    ALLEE_X,
    ANDENKEN_X,
    ATTRAKTIONEN,
    KNOBEL_X,
    FAEHRE_X,
    BUDE_BREITE,
    BUDE_HOEHE,
    BUDEN_ORTE,
    EINGANG,
    FESTPLATZ_Y,
    HUEGEL,
    LATERNEN,
    PLAETZE,
    RIESENRAD_X,
    TOR,
    WEGE,
    WEG_BREITE,
    WELT_BREITE,
    WELT_HOEHE,
    aufStrecke,
    aufWeg,
    budenOrt,
    hinterDemTor,
    BAEUME,
    BUESCHE,
    laufdauerMs,
    platzVon,
    weg,
    weglaenge,
    type Attraktion as AttraktionsDaten,
    type Laufrichtung,
    type Punkt,
  } from '../../domain/karte';
  import AttraktionsBild from '../grafik/Attraktion.svelte';
  import JahrmarktPlan from '../components/JahrmarktPlan.svelte';
  import Rundgang from '../components/Rundgang.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import { RUNDGANG, AUFTRAG_ERKLAERUNG, ENTDECKUNGEN, GASSE_BEGRUESSUNG, INTRO, NOCH_IM_AUFBAU, ABENDMARKT_ZU } from '../geschichte';
  import BudeStand from '../grafik/BudeStand.svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import Laeufer from '../grafik/Laeufer.svelte';
  import Riesenrad from '../grafik/Riesenrad.svelte';
  import { app } from '../zustand.svelte';
  import Icon from '../components/Icon.svelte';
  import { STUFEN_NAME } from '../../domain/buden';
  import { gasseFarbe } from '../../domain/auftraege';
  import { FEIER_BLOECKE, WOCHENZIEL_BLOECKE, WOCHENZIEL_TAGE, feierSchluessel, offeneFeiern, spieltageDieseWoche, wochenKennung } from '../../domain/belohnungen';
  import Feier from '../components/Feier.svelte';
  import RiesenradFahrt from '../components/RiesenradFahrt.svelte';
  import { flinkaTipp } from '../../domain/flinka';
  import { BAUMKRONE, jahreszeit, tageszeit } from '../../domain/stimmung';
  import { createRng, randomSeed } from '../../domain/rng';

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
  // Schulversion: Aufträge der Lehrkraft (in der Familien-App immer leer)
  let lehrerAuftraege = $derived(p && app.schule ? app.schule.auftraegeFuer(app.bestand, p) : []);
  let lehrerBuden = $derived(new Set(lehrerAuftraege.filter((a) => !a.erledigt && a.bude !== null).map((a) => a.bude as string)));
  let lehrerOffen = $derived(lehrerAuftraege.filter((a) => !a.erledigt).length);
  let planBuden = $derived(lehrerBuden.size ? new Set([...auftragsBuden, ...lehrerBuden]) : auftragsBuden);
  let feiern = $derived(p && p.gesehen.intro ? offeneFeiern(p) : []);
  let tage = $derived(p ? spieltageDieseWoche(p, new Date()) : 0);
  let wocheGeschafft = $derived(p ? p.belohnt.includes(`woche:${wochenKennung(new Date())}`) : false);
  let fahrtOffen = $state(false);

  // Tageszeit und Jahreszeit (einmal pro Minute neu)
  let jetzt = $state(new Date());
  let jz = $derived(app.einstellungen.stimmung ? jahreszeit(jetzt) : 'sommer');
  let tz = $derived(app.einstellungen.stimmung ? tageszeit(jetzt) : 'tag');
  let krone = $derived(BAUMKRONE[jz]);
  const flockenZahl = 26;
  const flocken = Array.from({ length: flockenZahl }, (_, i) => ({ x: (i * 37) % 100, d: 7 + ((i * 13) % 9), v: -((i * 7) % 14), g: 0.6 + ((i * 5) % 6) / 10 }));

  function feierFertig() {
    const f = feiern[0];
    if (!f) return;
    const k = feierSchluessel(f);
    app.aendereProfil((q) => (q.belohnt.includes(k) ? q : { ...q, belohnt: [...q.belohnt, k], bau: { ...q.bau, bloecke: q.bau.bloecke + FEIER_BLOECKE } }));
  }

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

  /** Platz, den die Leiste unten belegt – so lange lässt sich die Karte über das Ende hinaus schieben. */
  const LEISTE_PX = 72;

  /** Figur in die Mitte holen; `weich` folgt der Figur beim Laufen. */
  /**
   * Umrechnung Welt ↔ Bildschirm über zwei unsichtbare Messpunkte in der Welt (bei 0|0 und 1000|1000).
   * Hintergrund: Die Welt wird mit `zoom` verkleinert (gegen Flackern). Safari/WebKit gibt Positionen von
   * Elementen und Fingern *innerhalb* einer gezoomten Fläche durch den Zoom geteilt an, Chrome nicht. Mit reiner
   * Rechnung über massstab lag das Tippen auf dem iPad deshalb einige Zentimeter daneben.
   * Die Messpunkte liegen im selben „Maßsystem“ wie der Finger – daraus stimmt die Umrechnung auf jedem Gerät.
   */
  let messA = $state<HTMLElement>();
  let messB = $state<HTMLElement>();
  type Abbildung = { ax: number; ay: number; sx: number; sy: number; k: number };
  function abbildung(): Abbildung {
    if (messA && messB) {
      const a = messA.getBoundingClientRect();
      const b = messB.getBoundingClientRect();
      const sx = (b.left - a.left) / 1000;
      const sy = (b.top - a.top) / 1000;
      if (sx > 0.05 && sy > 0.05 && Number.isFinite(sx) && Number.isFinite(sy)) {
        // k: Faktor zurück in echte Bildschirmpunkte. Kommt 1 statt massstab heraus, teilt der Browser durch den Zoom.
        const k = massstab < 0.98 && Math.abs(sx - 1) < Math.abs(sx - massstab) ? massstab : 1;
        return { ax: a.left, ay: a.top, sx, sy, k };
      }
    }
    // Rückfall: rechnen
    const r = karte!.getBoundingClientRect();
    return { ax: r.left - karte!.scrollLeft, ay: r.top - karte!.scrollTop, sx: massstab, sy: massstab, k: 1 };
  }
  /** Finger (clientX/Y eines Ereignisses in der Welt) → Weltpunkt. Finger und Messpunkte sind gleich gemessen. */
  function bildZuWelt(cx: number, cy: number): Punkt {
    const m = abbildung();
    return { x: (cx - m.ax) / m.sx, y: (cy - m.ay) / m.sy };
  }

  function kamera(weich: boolean) {
    if (!karte) return;
    const m = abbildung();
    const r = karte.getBoundingClientRect();
    // Wo steht die Figur gerade auf dem Bildschirm (echte Punkte), und wo soll sie hin?
    // Die Leiste unten deckt etwa 70 px ab: Figur in die Mitte der sichtbaren Fläche
    const dx = (m.ax + pos.x * m.sx) * m.k - (r.left + karte.clientWidth / 2);
    const dy = (m.ay + (pos.y - 80) * m.sy) * m.k - (r.top + (karte.clientHeight - LEISTE_PX) / 2);
    if (!weich) {
      karte.scrollTo({ left: karte.scrollLeft + dx, top: karte.scrollTop + dy });
      return;
    }
    karte.scrollLeft += dx * 0.12;
    karte.scrollTop += dy * 0.12;
  }

  /* ---------- Laufen ---------- */
  function schritt(jetzt: number) {
    if (zerstoert || !lauf) return;
    const t = Math.min(1, (jetzt - lauf.start) / lauf.dauer);
    const a = aufStrecke(lauf.weg, t * lauf.laenge);
    pos = a.p;
    richtung = a.richtung;
    if (folgen) kamera(true);
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

  /**
   * Folgt die Kamera der Figur? Schiebt das Kind die Karte beim Laufen selbst (Finger, Maus, Rad), hört sie auf,
   * bis ein neues Ziel angetippt oder „Wo bin ich?“ gedrückt wird – sonst ziehen Kamera und Finger gegeneinander.
   */
  let folgen = true;
  /** Wird die Karte gerade geschoben? (Bewegungen ruhen kurz) */
  let bewegt = $state(false);
  let bewegtUhr: ReturnType<typeof setTimeout> | undefined;
  function beimSchieben() {
    if (laeuft && folgen) return; // die Kamera folgt der Figur – das ist kein Schieben
    bewegt = true;
    clearTimeout(bewegtUhr);
    bewegtUhr = setTimeout(() => (bewegt = false), 180);
  }
  function selbstSchauen() {
    if (laeuft) folgen = false;
  }
  let ziehAnfang: [number, number] | null = null;
  function ziehStart(e: PointerEvent) {
    ziehAnfang = [e.clientX, e.clientY];
  }
  function ziehen(e: PointerEvent) {
    if (!ziehAnfang || e.buttons === 0) return;
    if (Math.hypot(e.clientX - ziehAnfang[0], e.clientY - ziehAnfang[1]) > 8) {
      ziehAnfang = null;
      selbstSchauen();
    }
  }
  /** iOS/Android: Übernimmt der Browser das Schieben, kommt pointercancel und danach nur noch touchmove. */
  let wischAnfang: [number, number] | null = null;
  function wischStart(e: TouchEvent) {
    const t = e.touches[0];
    wischAnfang = t ? [t.clientX, t.clientY] : null;
  }
  function wischen(e: TouchEvent) {
    const t = e.touches[0];
    if (!wischAnfang || !t) return;
    if (Math.hypot(t.clientX - wischAnfang[0], t.clientY - wischAnfang[1]) > 8) {
      wischAnfang = null;
      selbstSchauen();
    }
  }

  function laufeZu(zielPunkt: Punkt, fertig: () => void = () => {}) {
    cancelAnimationFrame(rahmen);
    folgen = true;
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
    const gruss = GASSE_BEGRUESSUNG(gasse, info.name, info.mechanik);
    if (p && !p.gesehen.gassen.includes(gasse)) {
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

  function zumKnobelzelt() {
    app.spieleKlang('tipp');
    laufeZu({ x: KNOBEL_X, y: FESTPLATZ_Y }, () => app.zeige({ name: 'knobel' }));
  }

  /** Teleporter: kurzes Glitzern um die Figur, dann ist man auf der Bauinsel. */
  let teleport = $state(false);
  function teleportieren() {
    if (teleport) return;
    app.spieleKlang('tipp');
    if (app.einstellungen.animationenReduziert) {
      app.zeige({ name: 'insel', anreise: 'teleport' });
      return;
    }
    teleport = true;
    setTimeout(() => {
      // Bleibt die Bauinsel zu (Schulversion), bleibt man hier – das Glitzern endet trotzdem
      teleport = false;
      app.zeige({ name: 'insel', anreise: 'teleport' });
    }, 750);
  }

  function zurFaehre() {
    app.spieleKlang('tipp');
    laufeZu({ x: FAEHRE_X, y: FESTPLATZ_Y }, () => app.zeige({ name: 'insel' }));
  }

  function zumAndenkenstand() {
    app.spieleKlang('tipp');
    laufeZu({ x: ANDENKEN_X, y: FESTPLATZ_Y }, () => app.zeige({ name: 'andenken' }));
  }

  /** Tippen auf freie Fläche: zum nächsten Punkt auf dem Weg laufen. */
  function aufKarteGetippt(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (!karte) return;
    const punkt = bildZuWelt(e.clientX, e.clientY);
    let z = aufWeg(punkt);
    if (!abendOffen && hinterDemTor(z)) z = TOR;
    // Der Kreis erscheint unter dem Finger und gleitet zum Ziel (auf der Wiese: zum nächsten Weg oder Platz)
    const n = (tippMarke?.n ?? 0) + 1;
    tippMarke = { x: punkt.x, y: punkt.y, n };
    setTimeout(() => {
      if (tippMarke?.n === n) tippMarke = { x: z.x, y: z.y, n };
    }, 160);
    laufeZu(z);
  }
  /** Kleiner Kreis, wo die Figur hinläuft. */
  let tippMarke = $state<{ x: number; y: number; n: number } | null>(null);

  /* ---------- Attraktionen und Essstände (seit 0.15) ---------- */
  const SPRUECHE: Partial<Record<AttraktionsDaten['id'], string>> = {
    kettenkarussell: 'Das Kettenkarussell hat 16 Sitze. Bei 3 Fahrten sind das 48 Plätze!',
    autoscooter: 'Im Autoscooter fahren 12 Wagen. Eine Fahrt dauert 3 Minuten – in einer Stunde sind das 20 Fahrten und bis zu 240 Fahrgäste!',
    schiffschaukel: 'Hui! Die Schiffschaukel schwingt bis zu 4 Meter hoch – fast so hoch wie zwei Erwachsene übereinander.',
    musikpavillon: 'Die Kapelle spielt im Dreivierteltakt: eins, zwei, drei!',
    kinderkarussell: '12 Pferdchen drehen sich im Kreis. Jedes dritte ist ein Einhorn – das sind 4 Einhörner, also ein Drittel.',
    zirkuszelt: 'Ins Zirkuszelt passen 300 Leute – 100 auf jeder der drei Tribünen.',
    achterbahn: 'Die Achterbahn ist 25 Meter hoch. Das sind 2 500 Zentimeter!',
    brunnen: 'Plätscher! Das Wasser fliegt in einem Bogen. So eine Kurve heißt Parabel – die lernst du in ein paar Jahren im Matheunterricht kennen.',
    fernrohr: 'Durchs Fernrohr siehst du bis zur Bauinsel.',
  };
  let aktiv = $state<string | null>(null);
  let aktivUhr: ReturnType<typeof setTimeout> | undefined;
  /** Essstand: hinlaufen, dann fragen, ob es etwas sein darf. */
  let essen = $state<AttraktionsDaten | null>(null);
  let freude = $state<string | null>(null);
  let freudeUhr: ReturnType<typeof setTimeout> | undefined;
  function attraktionGetippt(a: AttraktionsDaten) {
    app.spieleKlang('tipp');
    if (a.preis) {
      laufeZu(a.stand ?? aufWeg({ x: a.x, y: a.y + 60 }), () => (essen = a));
      return;
    }
    clearTimeout(aktivUhr);
    aktiv = a.id;
    aktivUhr = setTimeout(() => (aktiv = null), 4000);
    const spruch = SPRUECHE[a.id];
    if (spruch) app.melde(spruch);
  }
  function kaufeEssen() {
    const a = essen;
    const q = app.profil;
    essen = null;
    if (!a || !q || !a.preis) return;
    if (q.taler < a.preis) {
      app.melde('Dafür reichen die Taler noch nicht. Eine Runde bringt 10!');
      return;
    }
    app.aendereProfil((r) => ({ ...r, taler: r.taler - (a.preis ?? 0) }));
    app.spieleKlang('muenze');
    clearTimeout(freudeUhr);
    freude = a.lecker ?? 'Lecker!';
    setTimeout(() => app.spieleKlang('jubel'), 250);
    freudeUhr = setTimeout(() => (freude = null), 1800);
  }

  /** Lageplan: alle Buden mit Medaillen und Aufträgen; ein Tipp schickt die Figur hin. */
  let planOffen = $state(false);
  let medaillen = $derived(p ? Object.fromEntries(BUDEN_ORTE.map((o) => [o.id, budeInfo(o.id).spielbar ? hoechsteStufe(p, o.id) : undefined])) : {});

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
    } else if (p && p.gesehen.intro && dialog === null && !rundgangOffen && (app.rundgang || !p.gesehen.hinweise.includes('rundgang'))) {
      // Rundgang: einmal nach der Begrüßung (auch für Kinder, die schon länger spielen) und über das Menü
      app.rundgang = false;
      planOffen = false;
      auftraegeOffen = false;
      void tick().then(() => (rundgangOffen = true));
    } else if (p && p.gesehen.intro && dialog === null && !rundgangOffen && lehrerAuftraege.some((a) => !a.erledigt && !p.gesehen.hinweise.includes(`lehrer:${a.id}`))) {
      // Schulversion: neuer Auftrag der Lehrkraft – einmal ansagen
      const neu = lehrerAuftraege.filter((a) => !a.erledigt && !p.gesehen.hinweise.includes(`lehrer:${a.id}`));
      dialog = {
        saetze: [
          neu.length === 1 ? 'Deine Lehrkraft hat dir einen Auftrag gegeben!' : `Deine Lehrkraft hat dir ${neu.length} Aufträge gegeben!`,
          `${neu.map((a) => a.text).join(', ')}. Die blauen Fähnchen zeigen dir, wo. Unter „Aufträge“ findest du alles.`,
        ],
        danach: () =>
          app.aendereProfil((q) => ({ ...q, gesehen: { ...q.gesehen, hinweise: [...q.gesehen.hinweise, ...neu.map((a) => `lehrer:${a.id}`).filter((h) => !q.gesehen.hinweise.includes(h))] } })),
      };
    } else if (p && p.gesehen.intro && dialog === null && !rundgangOffen && auftraege.length > 0 && !p.gesehen.hinweise.includes('auftraege')) {
      // Einmal erklären, was die Fähnchen bedeuten
      dialog = {
        saetze: AUFTRAG_ERKLAERUNG,
        danach: () => app.aendereProfil((q) => (q.gesehen.hinweise.includes('auftraege') ? q : { ...q, gesehen: { ...q.gesehen, hinweise: [...q.gesehen.hinweise, 'auftraege'] } })),
      };
    }
  });

  let rundgangOffen = $state(false);
  function rundgangFertig() {
    rundgangOffen = false;
    app.aendereProfil((q) => {
      const neu = ['rundgang', 'auftraege'].filter((h) => !q.gesehen.hinweise.includes(h));
      return neu.length ? { ...q, gesehen: { ...q.gesehen, hinweise: [...q.gesehen.hinweise, ...neu] } } : q;
    });
  }

  /** Flinka am Eingang: hingehen und einen Tipp abholen. */
  function zuFlinka() {
    if (!p) return;
    app.spieleKlang('tipp');
    laufeZu({ x: EINGANG.x + 40, y: FESTPLATZ_Y }, () => {
      const q = app.profil;
      if (!q) return;
      dialog = { saetze: flinkaTipp(q, q.auftraege, app.paket, new Date(), createRng(randomSeed())) };
    });
  }

  function fahrtZurBude(id: string) {
    fahrtOffen = false;
    zurBude(id);
  }

  onMount(() => {
    const uhr = setInterval(() => (jetzt = new Date()), 60000);
    app.auftraegeSicherstellen();
    messen();
    void tick().then(() => kamera(false));
    const ro = new ResizeObserver(() => {
      messen();
      kamera(false);
    });
    if (karte) ro.observe(karte);
    return () => {
      ro.disconnect();
      clearInterval(uhr);
    };
  });

  onDestroy(() => {
    zerstoert = true;
    cancelAnimationFrame(rahmen);
    app.karteOrt = pos;
  });

  /** Gassenschilder vorn an jedem Platz. */
  const schilder = PLAETZE.filter((pl) => pl.id !== 'festplatz' && pl.id !== 'abendmarkt').map((pl) => ({ id: pl.id, name: pl.name, farbe: pl.farbe, x: pl.c.x - pl.rx * 0.5, y: pl.c.y + pl.ry * 0.25 }));
  /** Budenreihe eines Platzes von links nach rechts (für Lichterkette und Wimpel über den hinteren Buden). */
  const ketten = PLAETZE.filter((pl) => pl.id !== 'festplatz').map((pl) => {
    const hinten = BUDEN_ORTE.filter((o) => o.gasse === pl.id).sort((a, b) => a.boden - b.boden);
    const oben = hinten[0]?.boden ?? pl.c.y;
    const reihe = hinten.filter((o) => o.boden - oben < 60);
    const xs = reihe.map((o) => o.x);
    return { id: pl.id, l: Math.min(...xs) - BUDE_BREITE / 2, r: Math.max(...xs) + BUDE_BREITE / 2, y: oben - BUDE_HOEHE - 58 };
  });
  const lampen = Array.from({ length: 14 }, (_, i) => i);
  const wimpelFarben = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'];
  const baeume = [...BAEUME, { x: 1550, y: WELT_HOEHE - 120 }];
  const bueschee = BUESCHE;
  const linie = (pts: readonly Punkt[]): string => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x} ${q.y}`).join(' ');
  /** Treppe hinauf: Stufen quer zur Treppe. */
  const treppe = WEGE.find((w) => w.treppe);
  const stufen = treppe ? Array.from({ length: 9 }, (_, i) => ({ y: TOR.y - 30 - i * ((TOR.y - 30 - (platzVon('abendmarkt').c.y + platzVon('abendmarkt').ry * 0.8)) / 9) })) : [];
  const sterne = Array.from({ length: 46 }, (_, i) => ({ x: (i * 173 + 40) % WELT_BREITE, y: 14 + ((i * 97) % 150), r: i % 3 === 0 ? 2.6 : 1.6 }));
</script>

{#if p}
  <Kopfzeile titel="Jahrmarkt" />
  <div class="kartenrahmen">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="karte" class:bewegt style="--wiese-zeit: {tz === 'nacht' ? '#628370' : tz === 'tag' ? '#9fd88f' : '#85af8a'}" bind:this={karte} onscroll={beimSchieben} onpointerdown={ziehStart} onpointermove={ziehen} onpointercancel={selbstSchauen} ontouchstart={wischStart} ontouchmove={wischen} onwheel={selbstSchauen}>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="huelle" style="width: {WELT_BREITE * massstab}px; height: {WELT_HOEHE * massstab + LEISTE_PX}px">
      <div class="welt" style="width: {WELT_BREITE}px; height: {WELT_HOEHE}px; zoom: {massstab}" onclick={aufKarteGetippt}>
        <span class="mess" bind:this={messA} style="left: 0; top: 0" aria-hidden="true"></span>
        <span class="mess" bind:this={messB} style="left: 1000px; top: 1000px" aria-hidden="true"></span>
        <!-- Boden: Wiese, Hügel mit Sternenmarkt, Wege, Plätze -->
        <svg class="boden" viewBox="0 0 {WELT_BREITE} {WELT_HOEHE}" width={WELT_BREITE} height={WELT_HOEHE} aria-hidden="true">
          <defs>
            <pattern id="gras" width="120" height="120" patternUnits="userSpaceOnUse">
              <rect width="120" height="120" fill="#9fd88f" />
              <rect x="0" y="0" width="60" height="60" fill="#a6dc95" opacity="0.6" />
              <rect x="60" y="60" width="60" height="60" fill="#a6dc95" opacity="0.6" />
              <path d="M10 20 l3 -7 l3 7 M40 48 l3 -7 l3 7 M44 12 l2 -5 l2 5 M80 92 l3 -7 l3 7 M100 30 l2 -5 l2 5 M22 96 l3 -7 l3 7" stroke="#7fc06e" stroke-width="2" fill="none" />
              <circle cx="30" cy="80" r="3" fill="#fff" /><circle cx="30" cy="80" r="1.2" fill="#ffc62b" />
              <circle cx="96" cy="70" r="3" fill="#ffd1dc" /><circle cx="96" cy="70" r="1.2" fill="#e23a4e" />
              <circle cx="70" cy="18" r="2.6" fill="#fff" /><circle cx="70" cy="18" r="1" fill="#ffc62b" />
            </pattern>
            <pattern id="pflaster" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#ecd6aa" />
              <rect x="1" y="1" width="18" height="18" rx="3" fill="#e4cb9b" />
              <rect x="21" y="21" width="18" height="18" rx="3" fill="#e4cb9b" />
            </pattern>
          </defs>
          <rect width={WELT_BREITE} height={WELT_HOEHE} fill="url(#gras)" />
          <!-- Abendhimmel über dem Hügel -->
          <rect x="0" y="0" width={WELT_BREITE} height={HUEGEL.oben} fill={abendOffen ? '#2e2a4f' : '#4b4673'} opacity="0.9" />
          {#each sterne as st, i (i)}<circle cx={st.x} cy={st.y} r={st.r} fill="#fff6c8" opacity="0.85" />{/each}
          <!-- Der Hügel: Hang und Plateau -->
          <ellipse cx={HUEGEL.c.x} cy={HUEGEL.c.y + 70} rx={HUEGEL.rx} ry={HUEGEL.ry} fill="#6fb35f" />
          <ellipse cx={HUEGEL.c.x} cy={HUEGEL.c.y + 30} rx={HUEGEL.rx - 30} ry={HUEGEL.ry - 40} fill="#82c46f" />
          <ellipse cx={HUEGEL.c.x} cy={HUEGEL.c.y - 10} rx={HUEGEL.rx - 90} ry={HUEGEL.ry - 110} fill={abendOffen ? '#5b5f97' : '#7c7fb0'} opacity="0.55" />
          <!-- Wege: Rand, dann Pflaster -->
          {#each WEGE as w, i (i)}<path d={linie(w.punkte)} fill="none" stroke="#c9a96f" stroke-width={WEG_BREITE + 12} stroke-linecap="round" stroke-linejoin="round" />{/each}
          {#each WEGE as w, i (i)}<path d={linie(w.punkte)} fill="none" stroke={w.treppe ? '#d9c39b' : 'url(#pflaster)'} stroke-width={WEG_BREITE} stroke-linecap="round" stroke-linejoin="round" />{/each}
          {#each stufen as st, i (i)}<rect x={TOR.x - WEG_BREITE / 2} y={st.y} width={WEG_BREITE} height="6" rx="2" fill="#b39463" />{/each}
          <!-- Plätze -->
          {#each PLAETZE as pl (pl.id)}
            <ellipse cx={pl.c.x} cy={pl.c.y} rx={pl.rx} ry={pl.ry} fill="url(#pflaster)" stroke="#c9a96f" stroke-width="6" />
            {#if pl.id !== 'festplatz'}<ellipse cx={pl.c.x} cy={pl.c.y} rx={pl.rx - 14} ry={pl.ry - 12} fill={pl.farbe} opacity="0.08" />{/if}
          {/each}
          <!-- Tor am Fuß der Treppe (zu, bis alle Buden Silber haben) -->
          {#if !abendOffen}
            <g>
              {#each [-1, 1] as sd (sd)}
                {#each [0, 1, 2, 3, 4] as i (i)}<rect x={TOR.x + sd * (70 + i * 36) - 6} y={TOR.y - 70} width="12" height="62" rx="4" fill="#b9763f" stroke="#87521f" stroke-width="3" />{/each}
                <rect x={sd < 0 ? TOR.x - 250 : TOR.x + 60} y={TOR.y - 54} width="190" height="10" fill="#87521f" />
              {/each}
              <rect x={TOR.x - 60} y={TOR.y - 80} width="120" height="74" fill="#87521f" stroke="#5e3714" stroke-width="4" />
              {#each [0, 1, 2, 3] as i (i)}<rect x={TOR.x - 52 + i * 28} y={TOR.y - 74} width="20" height="62" fill="#b9763f" />{/each}
            </g>
          {/if}
          <!-- Bäume -->
          {#each baeume as b, i (i)}
            <g transform="translate({b.x} {b.y})">
              <ellipse cx="0" cy="58" rx="40" ry="10" fill="#1f2a6b" opacity="0.12" />
              <rect x="-8" y="10" width="16" height="48" rx="5" fill="#87521f" />
              <circle cx="-18" cy="0" r="30" fill={krone[0]} />
              <circle cx="18" cy="-4" r="32" fill={krone[1]} />
              <circle cx="0" cy="-26" r="30" fill={jz === 'winter' ? krone[1] : krone[2]} />
              {#if jz === 'winter'}<path d="M-30 -30 Q0 -64 30 -30 Q14 -40 0 -36 Q-14 -40 -30 -30 Z" fill="#fff" /><path d="M-44 -6 Q-18 -32 4 -10 Q-18 -18 -44 -6 Z" fill="#fff" />{/if}
              {#if jz === 'fruehling'}{#each [[-24, -6], [10, -16], [-4, -40], [24, 6], [-10, 12]] as [bx, by], k (k)}<circle cx={bx} cy={by} r="5" fill="#fff" /><circle cx={bx} cy={by} r="2" fill="#f17aa0" />{/each}{/if}
            </g>
          {/each}
          <!-- Büsche -->
          {#each bueschee as bu, i (i)}
            <g transform="translate({bu.x} {bu.y})">
              <ellipse cx="0" cy="26" rx="34" ry="7" fill="#1f2a6b" opacity="0.1" />
              <circle cx="-14" cy="8" r="18" fill="#3fae6a" /><circle cx="12" cy="6" r="20" fill="#4fbf78" /><circle cx="0" cy="-8" r="16" fill="#5ccc85" />
              <circle cx="-6" cy="-6" r="3" fill="#e23a4e" /><circle cx="10" cy="4" r="3" fill="#ffc62b" />
            </g>
          {/each}
          <!-- Laternen an den Wegen -->
          {#each LATERNEN as l, i (i)}
            <g transform="translate({l.x} {l.y})">
              <rect x="-3" y="-60" width="6" height="64" fill="#1f2a6b" />
              <circle cx="0" cy="-66" r="10" fill={laufend > 0 || tz !== 'tag' ? '#ffe57a' : '#d7dae6'} stroke="#1f2a6b" stroke-width="3" />
            </g>
          {/each}
        </svg>

        <!-- Sternenmarkt-Schild am Tor -->
        <div class="abend-schild" style="left: {TOR.x}px; top: {TOR.y - 128}px">
          <strong>Sternenmarkt</strong>
          {#if !abendOffen}<span>öffnet, wenn alle Buden Silber haben</span>{/if}
        </div>

        <!-- Gassenschilder vorn an den Plätzen -->
        {#each schilder as s (s.id)}
          <div class="gassen-schild" style="--f: {s.farbe}; left: {s.x}px; top: {s.y}px; z-index: {Math.round(s.y) + 10}">{s.name}</div>
        {/each}

        <!-- Deko aus dem Andenkenstand: über den hinteren Buden jedes Platzes -->
        {#if p.deko.includes('lichterkette') || p.deko.includes('wimpel')}
          {#each ketten as k (k.id)}
            {#if p.deko.includes('lichterkette')}
              <div class="kette licht" style="left: {k.l}px; width: {k.r - k.l}px; top: {k.y - 30}px" aria-hidden="true">
                {#each lampen as i (i)}<span style="animation-delay: {(i % 6) * 0.3}s"></span>{/each}
              </div>
            {/if}
            {#if p.deko.includes('wimpel')}
              <div class="kette wimpel" style="left: {k.l}px; width: {k.r - k.l}px; top: {k.y - 14}px" aria-hidden="true">
                {#each lampen as i (i)}<span style="--f: {wimpelFarben[i % wimpelFarben.length]}"></span>{/each}
              </div>
            {/if}
          {/each}
        {/if}

        <!-- Karussells, Essstände und Blickfänge -->
        {#each ATTRAKTIONEN as a (a.id)}
          <button
            class="attraktion"
            class:essen-stand={!!a.preis}
            style="left: {a.x - a.breite / 2}px; top: {a.y - a.breite}px; width: {a.breite}px; z-index: {Math.round(a.y)}"
            onclick={() => attraktionGetippt(a)}
            aria-label={a.preis ? `${a.name}: für ${a.preis} Taler` : a.name}
          >
            <AttraktionsBild art={a.id} aktiv={aktiv === a.id} preis={a.preis} />
            {#if a.preis}<span class="schild klein">{a.name}</span>{/if}
          </button>
        {/each}

        <!-- Buden -->
        {#each BUDEN_ORTE as o (o.id)}
          {@const info = BUDEN.find((x) => x.id === o.id)}
          {#if info}
            {@const zustand = info.spielbar ? budenZustand(p, o.id) : 'zu'}
            {@const mitKatze = o.id === 'dartbude' && istGeschafft(p, o.id, 'bronze')}
            {@const medaille = info.spielbar ? hoechsteStufe(p, o.id) : undefined}
            <div class="bude" class:ziel={ziel === o.id} class:leuchtet={tz !== 'tag' && !!medaille} style="left: {o.x - BUDE_BREITE / 2}px; top: {o.boden - BUDE_HOEHE}px; z-index: {Math.round(o.boden)}">
              <button
                class="bude-knopf"
                onclick={() => zurBude(o.id)}
                aria-label={info.spielbar ? `${info.name} öffnen${medaille ? `, ${STUFEN_NAME[medaille]} geschafft` : ''}` : `${info.name}, bald geöffnet`}
              >
                <BudeStand bude={o.id} {zustand} besitzer={o.id === 'dartbude'} katze={mitKatze} form={platzVon(o.gasse).form} />
              </button>
              {#if mitKatze}
                <button class="katze-knopf" onclick={katzeEntdeckt} aria-label="Katze auf dem Dach"></button>
              {/if}
              <div class="schild" class:zu={!info.spielbar}>{info.name}</div>
              {#if medaille}<div class="medaille m-{medaille}" aria-hidden="true" title="{STUFEN_NAME[medaille]} geschafft"><span>{medaille === 'gold' ? 'G' : medaille === 'silber' ? 'S' : 'B'}</span></div>{/if}
              {#if lehrerBuden.has(o.id)}<div class="auftrag-fahne lehrer" aria-hidden="true"><span class="stange"></span><span class="tuch">Lehrer</span></div>
              {:else if auftragsBuden.has(o.id)}<div class="auftrag-fahne" aria-hidden="true"><span class="stange"></span><span class="tuch">Auftrag</span></div>{/if}
            </div>
          {/if}
        {/each}

        <!-- Festplatz: Riesenrad, Andenkenstand, Eingang, Flinka -->
        <button class="riesenrad" style="left: {RIESENRAD_X - 170}px; top: {FESTPLATZ_Y - 470}px; z-index: {FESTPLATZ_Y - 40}" onclick={() => { app.spieleKlang('tipp'); fahrtOffen = true; }} aria-label="Riesenrad: {laufend} von {TAGESBUDEN.length} Gondeln leuchten. Mitfahren">
          <Riesenrad {gondeln} />
          {#if p.deko.includes('ballons')}
            <svg class="ballons" viewBox="0 0 60 110" aria-hidden="true">
              <path d="M30 108 L18 40 M30 108 L32 30 M30 108 L46 44" stroke="#4a5394" stroke-width="1.5" fill="none" />
              <ellipse cx="18" cy="30" rx="12" ry="15" fill="#e23a4e" />
              <ellipse cx="32" cy="18" rx="12" ry="15" fill="#ffc62b" />
              <ellipse cx="46" cy="34" rx="12" ry="15" fill="#3c78d8" />
            </svg>
          {/if}
        </button>

        <!-- Fortschrittsschild neben dem Hauptweg: auch auf schmalen Handys ganz sichtbar -->
        <button class="fortschritt" style="left: {ALLEE_X - 215}px; top: {FESTPLATZ_Y - 150}px; z-index: {FESTPLATZ_Y - 35}" onclick={() => (fahrtOffen = true)} aria-label="{laufend} von {TAGESBUDEN.length} Gondeln leuchten. Riesenrad-Fahrt">
          <strong>{laufend} von {TAGESBUDEN.length}</strong> Gondeln<br />leuchten
          <small>Antippen zum Mitfahren</small>
        </button>

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

 <button class="knobelzelt" style="left: {KNOBEL_X - 90}px; top: {FESTPLATZ_Y - 236}px; z-index: {FESTPLATZ_Y - 30}" onclick={zumKnobelzelt} aria-label="Knobelzelt">
          <svg viewBox="0 0 180 200" aria-hidden="true">
            <ellipse cx="90" cy="194" rx="84" ry="7" fill="#1f2a6b" opacity="0.12" />
            <path d="M10 160 L90 20 L170 160 Z" fill="#7b5ea7" stroke="#1f2a6b" stroke-width="4" stroke-linejoin="round" />
            <path d="M50 160 L90 20 L130 160 Z" fill="#fffdf7" />
            <path d="M70 160 L90 20 L110 160 Z" fill="#7b5ea7" />
            <path d="M90 20 V4" stroke="#1f2a6b" stroke-width="4" /><path d="M90 4 L112 10 L90 16 Z" fill="#ffc62b" stroke="#1f2a6b" stroke-width="2" />
            <path d="M74 160 Q90 120 106 160 Z" fill="#2b2f5e" />
            <rect x="6" y="158" width="168" height="34" rx="6" fill="#b9763f" stroke="#1f2a6b" stroke-width="4" />
            <circle cx="90" cy="110" r="22" fill="#ffc62b" stroke="#1f2a6b" stroke-width="3" />
            <text x="90" y="121" text-anchor="middle" font-size="30" font-weight="900" fill="#1f2a6b">?</text>
          </svg>
          <span class="schild">Knobelzelt</span>
          {#if p && !p.belohnt.includes(`raetsel:${wochenKennung(new Date())}`)}<span class="neu-raetsel" aria-hidden="true">Rätsel</span>{/if}
        </button>

        <!-- Fähre zur Bauinsel: Wasser am linken Rand, Steg und Boot -->
        <button class="faehre" style="left: {FAEHRE_X - 110}px; top: {FESTPLATZ_Y - 190}px; z-index: {FESTPLATZ_Y - 25}" onclick={zurFaehre} aria-label="Fähre zur Bauinsel">
          <svg viewBox="0 0 220 200" aria-hidden="true">
            <path d="M0 40 Q40 20 70 40 L70 200 L0 200 Z" fill="#6cc3ec" />
            <path d="M6 70 q10 -6 20 0 q10 6 20 0 M10 120 q10 -6 20 0 q10 6 20 0 M4 165 q10 -6 20 0 q10 6 20 0" stroke="#fff" stroke-width="3" fill="none" opacity="0.7" class="welle" />
            <rect x="50" y="110" width="120" height="22" rx="4" fill="#b9763f" stroke="#1f2a6b" stroke-width="3" />
            {#each [62, 92, 122, 152] as px (px)}<rect x={px} y="128" width="8" height="26" fill="#87521f" />{/each}
            <g class="boot">
              <path d="M-4 96 L60 96 L50 116 L6 116 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" stroke-linejoin="round" />
              <rect x="22" y="56" width="5" height="40" fill="#1f2a6b" />
              <path d="M27 58 L52 88 L27 88 Z" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2" />
            </g>
            <rect x="150" y="40" width="8" height="74" fill="#87521f" />
          </svg>
          <span class="schild">Fähre zur Bauinsel</span>
        </button>

        <div class="eingang" style="left: {EINGANG.x - 190}px; top: {WELT_HOEHE - 200}px" aria-hidden="true">
          <div class="bogen">Mathe-Jahrmarkt</div>
        </div>

        <button class="flinka" style="left: {EINGANG.x + 90}px; top: {FESTPLATZ_Y - 150}px; z-index: {FESTPLATZ_Y - 20}" onclick={zuFlinka} aria-label="Flinka nach einem Tipp fragen">
          <Flinka groesse={84} winkt={!laeuft} />
          <span class="tipp-blase" aria-hidden="true">Tipp?</span>
        </button>

        <!-- Die Figur -->
        {#if tippMarke}
          {#key tippMarke.n}
            <div class="tipp-marke" style="left: {tippMarke.x}px; top: {tippMarke.y}px; z-index: {Math.round(tippMarke.y) + 5}" aria-hidden="true"></div>
          {/key}
        {/if}
        <div class="figur" class:teleport class:freude={!!freude} style="left: {pos.x}px; top: {pos.y}px; z-index: {Math.round(pos.y) + 40}" aria-hidden="true">
          <Laeufer figur={p.figur} aussehen={p.aussehen} {laeuft} {richtung} groesse={104} />
          {#if freude}<span class="lecker">{freude}</span>{/if}
          {#if teleport}{#each [0, 1, 2, 3, 4, 5, 6, 7] as k (k)}<span class="funke" style="--w: {k * 45}deg; --v: {k * 40}ms"></span>{/each}{/if}
        </div>

        <!-- Wegweiser zur Fähre, gleich neben dem Eingang -->
        <button class="wegweiser" style="left: {ALLEE_X - 168}px; top: {FESTPLATZ_Y - 30}px; z-index: {FESTPLATZ_Y + 20}" onclick={zurFaehre} aria-label="Wegweiser: Fähre zur Bauinsel">
          <svg viewBox="0 0 90 96" aria-hidden="true">
            <rect x="40" y="18" width="8" height="78" rx="2" fill="#87521f" stroke="#1f2a6b" stroke-width="2" />
            <path d="M84 8 H22 L6 22 L22 36 H84 Z" fill="#6cc3ec" stroke="#1f2a6b" stroke-width="3" stroke-linejoin="round" />
            <path d="M34 30 L68 30 L63 37 L39 37 Z" fill="#e23a4e" />
            <text x="50" y="27" text-anchor="middle" font-size="12" font-weight="900" fill="#1f2a6b">Fähre</text>
          </svg>
        </button>

        <!-- Abend und Nacht: Himmel dunkler, Laternen und geschaffte Buden leuchten -->
        {#if tz !== 'tag'}
          <div class="dunkel" class:nacht={tz === 'nacht'} aria-hidden="true"></div>
          <div class="lichter" aria-hidden="true">
            {#each LATERNEN as l, i (i)}<span class="schein" style="left: {l.x}px; top: {l.y - 66}px"></span>{/each}
            {#each BUDEN_ORTE as o (o.id)}
              {#if budeInfo(o.id).spielbar && hoechsteStufe(p, o.id)}<span class="schein bude-schein" style="left: {o.x}px; top: {o.boden - BUDE_HOEHE * 0.45}px"></span>{/if}
            {/each}
            <span class="schein gross" style="left: {RIESENRAD_X}px; top: {FESTPLATZ_Y - 370}px; opacity: {0.3 + (0.7 * laufend) / TAGESBUDEN.length}"></span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if (jz === 'winter' || jz === 'herbst' || jz === 'fruehling') && !reduziert()}
    <div class="wetter {jz}" aria-hidden="true">
      {#each flocken as f, i (i)}<span style="left: {f.x}%; animation-duration: {f.d}s; animation-delay: {f.v}s; --g: {f.g}"></span>{/each}
    </div>
  {/if}
  </div>

  <div class="leiste">
    <button class="ticket gelb" onclick={() => (auftraegeOffen = true)} aria-label="Tagesaufträge, {erledigt} von {auftraege.length} erledigt{lehrerOffen ? `, ${lehrerOffen} offen von deiner Lehrkraft` : ''}">
      <Icon name="auftrag" groesse={22} /> Aufträge {erledigt}/{auftraege.length}{#if lehrerOffen}<span class="lehrer-punkt" aria-hidden="true">{lehrerOffen}</span>{/if}
    </button>
    <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz' })} aria-label="Bauplatz"><Icon name="block" groesse={22} /><span class="lang"> Bauplatz</span></button>
    <button class="ticket hell" onclick={teleportieren} aria-label="Teleporter zur Bauinsel"><Icon name="insel" groesse={22} /><span class="lang"> Insel</span></button>
    <button class="ticket hell rund-klein" onclick={() => { app.spieleKlang('tipp'); planOffen = true; }} aria-label="Lageplan"><Icon name="karte" groesse={22} /></button>
    <button class="ticket hell rund-klein" onclick={() => { folgen = true; kamera(false); }} aria-label="Wo bin ich?">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22" /></svg>
    </button>
  </div>

  {#if auftraegeOffen}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="schleier" onclick={() => (auftraegeOffen = false)}></div>
    <div class="tafel auftraege" role="dialog" aria-modal="true" aria-labelledby="auftraege-titel">
      <div class="markise"></div>
      <div class="inhalt">
        {#if lehrerAuftraege.length}
          <h2 id="auftraege-titel">Von deiner Lehrkraft</h2>
          <ul>
            {#each lehrerAuftraege as a (a.id)}
              <li class:fertig={a.erledigt} style="--f: #3c78d8">
                <span class="haken" aria-hidden="true">{#if a.erledigt}<Icon name="haken" groesse={20} />{/if}</span>
                <span class="was"><strong>{a.text}</strong><small>{a.bude === null ? 'einmal durchspielen' : a.stufe ? 'eine Runde in dieser Stufe' : 'eine Runde spielen'}</small></span>
                {#if !a.erledigt}
                  <button class="ticket rot klein" onclick={() => { auftraegeOffen = false; if (a.bude) zurBude(a.bude); else app.zeige({ name: 'check' }); }}>Hin</button>
                {:else}<span class="erledigt">erledigt</span>{/if}
              </li>
            {/each}
          </ul>
          <h2>Tagesaufträge</h2>
        {:else}
          <h2 id="auftraege-titel">Tagesaufträge</h2>
        {/if}
        <div class="wochenziel" aria-label="Wochenziel: an {Math.min(tage, WOCHENZIEL_TAGE)} von {WOCHENZIEL_TAGE} Tagen gespielt">
          <span>Wochenziel</span>
          {#each Array(WOCHENZIEL_TAGE) as _, i (i)}<span class="tag" class:an={i < tage} aria-hidden="true"></span>{/each}
          <small>{wocheGeschafft ? 'geschafft!' : `${Math.min(tage, WOCHENZIEL_TAGE)} von ${WOCHENZIEL_TAGE} Tagen · +${WOCHENZIEL_BLOECKE} Blöcke`}</small>
        </div>
        <p class="klein">Spiel eine Runde mit mindestens 7 Treffern. Pro Auftrag: 15 Taler und 10 Blöcke. Alle drei: 20 Blöcke extra.</p>
        <ul>
          {#each auftraege as a (a.bude)}
            {@const info = budeInfo(a.bude)}
            <li class:fertig={a.erledigt} style="--f: {gasseFarbe(a.bude)}">
              <span class="haken" aria-hidden="true">{#if a.erledigt}<Icon name="haken" groesse={20} />{/if}</span>
              <span class="was"><strong>{info.name}</strong><small>{STUFEN_NAME[a.stufe]}{#if a.frisch} · <span class="frisch">Frischmacher</span>{/if}</small></span>
              {#if !a.erledigt}
                <button class="ticket rot klein" onclick={() => { auftraegeOffen = false; zurBude(a.bude); }}>Hin</button>
              {:else}<span class="erledigt">erledigt</span>{/if}
            </li>
          {/each}
        </ul>
        <button class="aufwaermen" onclick={() => { auftraegeOffen = false; app.zeige({ name: 'blitz' }); }}><Icon name="blitz" groesse={22} /> Zum Aufwärmen: Blitzrechnen (1 Minute)</button>
        <button class="ticket hell" onclick={() => (auftraegeOffen = false)}>Schließen</button>
      </div>
    </div>
  {/if}

  {#if planOffen}
    <JahrmarktPlan {medaillen} auftraege={planBuden} figur={pos} sternOffen={abendOffen} onzu={() => (planOffen = false)} onbude={(id) => { planOffen = false; zurBude(id); }} />
  {/if}

  {#if essen}
    {@const e = essen}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="schleier" onclick={() => (essen = null)}></div>
    <div class="tafel essen-frage" role="dialog" aria-modal="true" aria-labelledby="essen-titel">
      <div class="markise"></div>
      <div class="inhalt">
        <h2 id="essen-titel">{e.name}</h2>
        <p>Möchtest du {e.id === 'crepes' ? 'einen Crêpe' : e.id === 'eis' ? 'ein Eis' : e.name} für {e.preis} Taler? Du hast {p.taler} Taler.</p>
        <div class="knoepfe">
          <button class="ticket hell" onclick={() => (essen = null)}>Lieber nicht</button>
          <button class="ticket gelb" aria-label="Für {e.preis} Taler kaufen" onclick={kaufeEssen} disabled={p.taler < (e.preis ?? 0)}><Icon name="taler" groesse={20} /> {e.preis} Taler</button>
        </div>
      </div>
    </div>
  {/if}

  {#if fahrtOffen}
    <RiesenradFahrt profil={p} paket={app.paket} onzu={() => (fahrtOffen = false)} onbude={fahrtZurBude} />
  {/if}

  {#if feiern[0] && !dialog && !rundgangOffen}
    {#key feierSchluessel(feiern[0])}<Feier feier={feiern[0]} onweiter={feierFertig} />{/key}
  {/if}

  {#if rundgangOffen && p}
    <Rundgang schritte={RUNDGANG(p.name)} onfertig={rundgangFertig} />
  {/if}
  {#if dialog}
    <div class="schleier"></div>
    {#key dialog}
      <Sprechblase saetze={dialog.saetze} onfertig={dialogFertig} />
    {/key}
  {/if}
{/if}

<style>
  .kartenrahmen {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  /* Medaille an der Bude: Bronze, Silber oder Gold */
  .medaille {
    position: absolute;
    left: 6px;
    top: 18%;
    width: 40px;
    height: 40px;
    z-index: 3;
    pointer-events: none;
    filter: drop-shadow(0 2px 0 rgb(31 42 107 / 0.35));
  }
  .medaille::before {
    content: '';
    position: absolute;
    left: 10px;
    top: -12px;
    width: 20px;
    height: 18px;
    background: linear-gradient(90deg, #e23a4e 50%, #3c78d8 50%);
    clip-path: polygon(0 0, 100% 0, 75% 100%, 25% 100%);
  }
  .medaille span {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 3px solid #1f2a6b;
    font-weight: 900;
    font-size: 1.15rem;
    color: #1f2a6b;
  }
  .m-bronze span {
    background: radial-gradient(circle at 35% 35%, #f0c08c, #c98a4b 60%, #a8692f);
  }
  .m-silber span {
    background: radial-gradient(circle at 35% 35%, #ffffff, #c9d2de 60%, #98a3b4);
  }
  .m-gold span {
    background: radial-gradient(circle at 35% 35%, #fff2a8, #f2b705 60%, #c98f00);
  }
  .bude.leuchtet .bude-knopf {
    filter: drop-shadow(0 0 14px rgb(255 214 90 / 0.9));
  }
  /* Riesenrad und Schild sind Knöpfe */
  button.riesenrad {
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    pointer-events: auto;
  }
  button.fortschritt {
    pointer-events: auto;
    cursor: pointer;
    color: var(--tinte);
    font-family: inherit;
  }
  .fortschritt small {
    display: block;
    font-size: 0.8rem;
    color: var(--tinte-weich, #5a628c);
    margin-top: 2px;
  }
  button.flinka {
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    pointer-events: auto;
  }
  .tipp-blase {
    position: absolute;
    right: -26px;
    top: -8px;
    background: #fff;
    border: 3px solid var(--tinte);
    border-radius: 14px 14px 14px 2px;
    padding: 0 8px;
    font-weight: 900;
    font-size: 1.1rem;
    color: var(--tinte);
    animation: tippen 2.6s ease-in-out infinite;
  }
  @keyframes tippen {
    0%, 70%, 100% { transform: translateY(0); }
    80% { transform: translateY(-6px); }
    90% { transform: translateY(0); }
  }
  /* Abend und Nacht */
  .dunkel {
    position: absolute;
    inset: 0;
    z-index: 9000;
    pointer-events: none;
    /* Dämmerung statt grauer Schleier: Farben bleiben kräftig, die Lichter tragen die Stimmung */
    /* ohne mix-blend-mode: Mischmodi über die ganze Welt zwingen iOS beim Schieben zum Neuzeichnen (Flackern) */
    background: rgb(40 30 120 / 0.22);
  }
  .dunkel.nacht {
    background: rgb(15 15 70 / 0.42);
  }
  .lichter {
    position: absolute;
    inset: 0;
    z-index: 9001;
    pointer-events: none;
  }
  .schein {
    position: absolute;
    width: 140px;
    height: 140px;
    margin: -70px 0 0 -70px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(255 225 120 / 0.7), rgb(255 225 120 / 0) 70%);
    mix-blend-mode: screen;
  }
  .schein.bude-schein {
    width: 220px;
    height: 200px;
    margin: -100px 0 0 -110px;
    background: radial-gradient(ellipse, rgb(255 205 110 / 0.55), rgb(255 205 110 / 0) 70%);
  }
  .schein.gross {
    width: 380px;
    height: 380px;
    margin: -190px 0 0 -190px;
    background: radial-gradient(circle, rgb(255 230 150 / 0.5), rgb(255 230 150 / 0) 70%);
  }
  /* Jahreszeit: Schnee, Laub oder Blüten über der Karte */
  .wetter {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 2;
  }
  .wetter span {
    position: absolute;
    top: -20px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    opacity: 0.9;
    scale: var(--g);
    animation: rieseln linear infinite;
  }
  .wetter.herbst span {
    width: 14px;
    height: 9px;
    border-radius: 0 80% 0 80%;
    background: #d9822b;
  }
  .wetter.herbst span:nth-child(3n) {
    background: #c9572f;
  }
  .wetter.herbst span:nth-child(3n + 1) {
    background: #e8b43d;
  }
  .wetter.fruehling span {
    width: 9px;
    height: 9px;
    border-radius: 60% 0 60% 0;
    background: #f9c4d4;
  }
  @keyframes rieseln {
    0% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(24px, 50vh) rotate(180deg); }
    100% { transform: translate(-12px, 105vh) rotate(360deg); }
  }
  .karte {
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
    z-index: 1;
    /* kein Nachfedern am Rand (dort blitzte sonst helle Wiese auf) */
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    background: var(--wiese-zeit, #9fd88f);
    scrollbar-width: none;
  }
  .karte::-webkit-scrollbar {
    display: none;
  }
  .huelle {
    position: relative;
    background: var(--wiese-zeit, #9fd88f); /* Wiese unter der Leiste, abends und nachts abgedunkelt wie die Welt */
  }
  /* zoom statt transform: scale – sonst wird die ganze Welt eine riesige Grafikebene, die iOS beim Schieben
     in Kacheln neu zeichnet (Flackern). */
  .welt {
    position: absolute;
    left: 0;
    top: 0;
  }
  /* Während die Karte geschoben wird, ruhen die Bewegungen (Karussells, Fahnen, Laternen) – weniger zu zeichnen. */
  .karte.bewegt :global(.welt *) {
    animation-play-state: paused !important;
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
    max-width: 168px;
    text-align: center;
    line-height: 1.05;
    background: var(--holz);
    color: #fff;
    border: 3px solid var(--holz-dunkel);
    border-radius: 8px;
    padding: 3px 8px;
    font-weight: 900;
    font-size: 1.2rem;
    hyphens: auto;
    pointer-events: none;
    z-index: 2;
  }
  .schild.zu {
    background: #8b8fa6;
    border-color: #6a6e86;
  }
  .attraktion {
    position: absolute;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .attraktion .schild.klein {
    position: absolute;
    left: 50%;
    bottom: -6px;
    transform: translateX(-50%);
    background: #fffdf7;
    border: 3px solid var(--tinte);
    border-radius: 8px;
    padding: 0 8px;
    font-weight: 900;
    font-size: 1rem;
    white-space: nowrap;
    color: var(--tinte);
  }
  .figur.freude :global(.laeufer) {
    animation: hopsen 0.45s ease-out 3;
  }
  @keyframes hopsen {
    40% {
      transform: translateY(-34px);
    }
  }
  .lecker {
    position: absolute;
    left: 50%;
    bottom: 118px;
    transform: translateX(-50%);
    background: #fffdf7;
    border: 3px solid var(--tinte);
    border-radius: 14px;
    padding: 4px 12px;
    font-weight: 900;
    font-size: 1.3rem;
    white-space: nowrap;
    color: var(--tinte);
    animation: auftauchen 0.3s ease-out;
  }
  @keyframes auftauchen {
    from {
      transform: translateX(-50%) scale(0.4);
      opacity: 0;
    }
  }
  .mess {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
    visibility: hidden;
  }
  .tipp-marke {
    position: absolute;
    width: 46px;
    height: 22px;
    margin: -11px 0 0 -23px;
    border: 4px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(42, 47, 99, 0.35);
    pointer-events: none;
    animation: tipp-marke 1.1s ease-out forwards;
    transition:
      left 0.3s ease-out,
      top 0.3s ease-out;
  }
  @keyframes tipp-marke {
    from {
      transform: scale(0.4);
      opacity: 1;
    }
    to {
      transform: scale(1.3);
      opacity: 0;
    }
  }
  .essen-frage {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 31;
    width: min(92vw, 26rem);
  }
  .essen-frage .inhalt {
    padding: 14px 18px 18px;
    display: grid;
    gap: 10px;
  }
  .essen-frage h2,
  .essen-frage p {
    margin: 0;
  }
  .essen-frage p {
    font-weight: 700;
  }
  .essen-frage .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .gassen-schild {
    position: absolute;
    transform: translate(-50%, -50%);
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
    position: absolute;
    width: 190px;
    box-sizing: border-box;
    pointer-events: none;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 14px;
    padding: 4px 16px;
    font-size: 1.25rem;
    line-height: 1.15;
    margin: 0;
    text-align: center;
  }
  .ballons {
    position: absolute;
    right: 0;
    top: 30px;
    width: 70px;
  }
  .faehre {
    position: absolute;
    width: 220px;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
  }
  .faehre .schild {
    bottom: auto;
    top: 6px;
    left: 62%;
  }
  .faehre .boot {
    animation: schaukeln-boot 3s ease-in-out infinite;
    transform-origin: 28px 110px;
  }
  @keyframes schaukeln-boot {
    50% {
      transform: rotate(-4deg) translateY(2px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .faehre .boot {
      animation: none;
    }
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
  .knobelzelt {
    position: absolute;
    width: 180px;
    border: 0;
    background: none;
    padding: 0;
  }
  .knobelzelt .schild {
    bottom: -34px;
  }
  .neu-raetsel {
    position: absolute;
    right: -6px;
    top: 30px;
    padding: 2px 10px;
    border-radius: 12px;
    background: var(--markise);
    color: #fff;
    font-weight: 900;
    font-size: 1.1rem;
    border: 3px solid #fff;
    animation: hupf 0.8s ease-in-out infinite alternate;
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
  }
  .figur {
    position: absolute;
    transform: translate(-50%, -88%);
    pointer-events: none;
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
  .leiste .ticket {
    white-space: nowrap;
  }
  /* Schmale Handys: Bauplatz und Insel nur mit Bild */
  @media (max-width: 32rem) {
    .leiste .lang {
      display: none;
    }
  }
  .wegweiser {
    position: absolute;
    width: 90px;
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
  }
  .wegweiser svg {
    display: block;
    width: 100%;
  }
  .figur.teleport :global(svg) {
    animation: wegbeamen 0.75s ease-in forwards;
  }
  @keyframes wegbeamen {
    60% {
      opacity: 1;
      filter: brightness(1.8);
    }
    100% {
      opacity: 0;
      scale: 0.2 1.4;
      filter: brightness(3);
    }
  }
  .funke {
    position: absolute;
    left: 50%;
    top: -50px;
    width: 12px;
    height: 12px;
    background: #ffe57a;
    clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
    transform: rotate(var(--w)) translateY(-10px);
    animation: funke 0.7s ease-out var(--v) both;
  }
  @keyframes funke {
    to {
      transform: rotate(var(--w)) translateY(-60px) scale(0.3);
      opacity: 0;
    }
  }
  /* Tagesauftrag: Fähnchen am Dach der Bude */
  .auftrag-fahne {
    position: absolute;
    right: 8px;
    top: -118px;
    width: 92px;
    height: 76px;
    pointer-events: none;
    z-index: 3;
  }
  .auftrag-fahne .stange {
    position: absolute;
    left: 0;
    top: 0;
    width: 6px;
    height: 76px;
    border-radius: 3px;
    background: var(--tinte);
  }
  .auftrag-fahne .stange::before {
    content: '';
    position: absolute;
    left: -4px;
    top: -8px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--senf);
    border: 3px solid var(--tinte);
  }
  .auftrag-fahne .tuch {
    position: absolute;
    left: 6px;
    top: 4px;
    padding: 4px 18px 4px 10px;
    background: var(--senf);
    border: 3px solid var(--tinte);
    border-left: 0;
    clip-path: polygon(0 0, 100% 0, 86% 50%, 100% 100%, 0 100%);
    font-weight: 900;
    font-size: 1.15rem;
    color: var(--tinte);
    transform-origin: left center;
    animation: wehen 1.6s ease-in-out infinite alternate;
  }
  .auftrag-fahne.lehrer .tuch {
    background: #8fb8f5;
  }
  .lehrer-punkt {
    display: inline-grid;
    place-items: center;
    min-width: 1.4em;
    height: 1.4em;
    margin-left: 4px;
    border-radius: 999px;
    background: #3c78d8;
    color: #fff;
    font-size: 0.85em;
  }
  @keyframes wehen {
    to {
      transform: skewY(-4deg) scaleX(0.94);
    }
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
  .wochenziel {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-weight: 900;
  }
  .wochenziel .tag {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: #fff;
  }
  .wochenziel .tag.an {
    background: var(--wiese);
  }
  .wochenziel small {
    font-weight: 700;
    color: var(--tinte-weich);
  }
  .frisch {
    color: #17a398;
    font-weight: 900;
  }
  .aufwaermen {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 46px;
    padding: 6px 12px;
    border: 3px dashed var(--tinte);
    border-radius: 12px;
    background: #fff8dc;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .ticket.klein {
    min-height: 40px;
    padding: 4px 16px;
  }
</style>
