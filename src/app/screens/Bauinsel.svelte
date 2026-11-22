<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { BLOCKARTEN } from '../../domain/bau';
  import {
    BREITE,
    EINRICHTUNG,
    STEG,
    SITZEN,
    LIEGEN,
    AKTIONEN,
    INSEL_DAEMMERUNG_MS,
    INSEL_TAG_MS,
    dreheAn,
    drehbar,
    autoRichtung,
    mitRichtung,
    einrichtung,
    inselLicht,
    istBlock,
    richtungVon,
    imFreienTeil,
    teilFrei,
    START,
    inEbene,
    GRUNDSTUECKE,
    INSEL_AUFTRAEGE,
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
  import type { Pose, Seite } from '../grafik/InselWelt.svelte';
  import Icon from '../components/Icon.svelte';
  import InselKarte from '../components/InselKarte.svelte';
  import Sprechblase from '../components/Sprechblase.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import TeilVorschau from '../grafik/TeilVorschau.svelte';
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

  /** Alles Speichern gilt nur für das Kind, dessen Insel gerade offen ist (nicht nach einem Spielerwechsel). */
  const meinProfil = app.bestand.aktiv;
  const meins = (): boolean => app.bestand.aktiv === meinProfil;
  /** Lokale Bewegung ins Profil übernehmen. */
  function sichern() {
    if (!lokalFigur && !lokalTiere) return;
    if (!meins()) return;
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
  let modus = $state<'laufen' | 'bauen' | 'abbauen' | 'drehen'>('laufen');
  /** Richtung für die nächsten Möbel (null = von selbst: Stühle zum Tisch, Bett an die Wand). */
  let setzRichtung = $state<number | null>(null);
  $effect(() => {
    void art;
    setzRichtung = null;
  });
  /** Zuletzt gesetztes drehbares Möbel: dafür erscheint im Bauen-Modus ein Dreh-Knopf. */
  let zuletzt = $state<{ x: number; y: number; z: number } | null>(null);
  let art = $state(2);
  let drehung = $state(0);
  let massstab = $state(1);
  let laeuft = $state(false);
  let markiert = $state<{ x: number; y: number } | null>(null);
  let feld = $state<HTMLDivElement>();
  let welt = $state<InselWelt>();
  let zerstoert = false;

  const FREI_HINWEIS = 'Hier geht es mit dem Zusatzpaket weiter.';
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
    folgen = true;
    const [x, y] = welt.figurBildpunkt();
    feld.scrollTo({ left: x - feld.clientWidth / 2, top: y - feld.clientHeight / 2, behavior: weich ? 'smooth' : 'auto' });
  }
  /**
   * Folgt die Kamera der Figur? Schiebt das Kind die Ansicht selbst (Finger, Maus, Rad), hört sie damit auf,
   * bis ein neues Ziel angetippt oder ◎ gedrückt wird – sonst ziehen Kamera und Finger gegeneinander.
   */
  let folgen = true;
  function selbstSchauen() {
    if (laeuft) folgen = false;
  }
  /** Erst ein echtes Schieben (nicht schon ein Tippen) zählt als „selbst schauen“. */
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
  /** Übersichtskarte: eine Stelle auswählen, die große Ansicht springt dorthin. */
  let karteOffen = $state(false);
  function zeigeStelle(x: number, y: number) {
    karteOffen = false;
    if (!feld || !welt) return;
    folgen = false;
    const [px, py] = welt.bildpunkt(x, y, LANDSCHAFT.hoehe[y * BREITE + x] ?? 0);
    feld.scrollTo({ left: px - feld.clientWidth / 2, top: py - feld.clientHeight / 2, behavior: app.einstellungen.animationenReduziert ? 'auto' : 'smooth' });
  }

  /* ---------- Flinka erklärt Neues (einmal je Kind) ---------- */
  const HINWEISE: { id: string; nur: 'frei' | 'paket'; saetze: string[] }[] = [
    { id: 'insel-frei', nur: 'frei', saetze: ['Die erste Insel gehört dir! Bau los – Blöcke bekommst du beim Rechnen.', 'Im Andenkenstand gibt es Türen, Fenster, Möbel und Blumen für dein Haus.'] },
    {
      id: 'insel-014',
      nur: 'paket',
      saetze: ['Neu auf der Insel: Mit „Drehen“ drehst du Möbel. Stühle schauen sogar von selbst zum Tisch.', 'Ganz im Süden, hinter dem Bauland, wartet jetzt eine Wüste mit Kakteen und einer Oase!', 'Unten bei den Knöpfen gibt es eine Karte mit allen Inseln.'],
    },
  ];
  let hinweis = $state<{ id: string; saetze: string[] } | null>(null);
  function hinweisFertig() {
    const h = hinweis;
    hinweis = null;
    if (h) app.aendereProfil((q) => (q.gesehen.hinweise.includes(h.id) ? q : { ...q, gesehen: { ...q.gesehen, hinweise: [...q.gesehen.hinweise, h.id] } }));
  }
  /** Kamera ohne eigene Animation genau auf einen Punkt setzen (beim Laufen in jedem Bild). */
  function kameraAuf(pos: { x: number; y: number; z: number }) {
    if (!feld || !welt || !folgen) return;
    const [x, y] = welt.bildpunkt(pos.x, pos.y, pos.z);
    feld.scrollLeft = x - feld.clientWidth / 2;
    feld.scrollTop = y - feld.clientHeight / 2;
  }

  /** Ansicht um die Figur drehen: nach dem Drehen steht die Figur wieder in der Bildmitte. */
  /** Ansicht drehen: kurz überblenden, die Stelle in der Bildmitte bleibt in der Mitte. */
  let blende = $state(false);
  let kompass = $state(0);
  function drehen() {
    if (!feld || !welt || blende) return;
    const mitte = welt.planpunkt(feld.scrollLeft + feld.clientWidth / 2, feld.scrollTop + feld.clientHeight / 2);
    const umdrehen = () => {
      drehung = (drehung + 1) % 4;
      void tick().then(() => {
        if (!feld || !welt) return;
        const [x, y] = welt.bildpunkt(mitte.x, mitte.y, 0);
        feld.scrollLeft = x - feld.clientWidth / 2;
        feld.scrollTop = y - feld.clientHeight / 2;
        kompass = welt.nordWinkel();
        blende = false;
      });
    };
    if (app.einstellungen.animationenReduziert) {
      umdrehen();
      return;
    }
    blende = true;
    setTimeout(umdrehen, 160);
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
    // Freie Version: nur die erste Insel (seit 0.14)
    if (!app.paket && !imFreienTeil(x, y)) {
      app.melde(FREI_HINWEIS);
      return;
    }
    markiert = { x, y };
    setTimeout(() => (markiert = null), 400);
    if (modus === 'laufen') {
      // Liegt oder sitzt die Figur, steht sie beim nächsten Antippen auf; das Möbel selbst noch einmal antippen = nur aufstehen
      const war = pose;
      pose = null;
      if (war && war.x === x && war.y === y) {
        app.spieleKlang('pop');
        void tick().then(() => kamera(true));
        return;
      }
      if (streicheln(st, x, y)) return;
      if (z >= 0 && platzNehmen(st, x, y, z)) return;
      const ziel = zielAufFeld(st, x, y, seite === 'oben' ? z + 1 : undefined);
      if (!ziel) {
        app.melde('Da kannst du nicht hin.');
        return;
      }
      const weg = wegAufInsel(st, st.figur, ziel);
      if (!app.paket && weg.some((w) => !imFreienTeil(w.x, w.y))) {
        app.melde(FREI_HINWEIS);
        return;
      }
      if (weg.length === 0) {
        app.melde(boeden(st, x, y).length ? 'Da kommst du nicht hin. Baue eine Treppe oder eine Tür!' : 'Da kannst du nicht hin.');
        return;
      }
      laufe(weg.slice(1));
      return;
    }
    if (modus === 'drehen') {
      const neu = z >= 0 ? dreheAn(st, x, y, z) : undefined;
      if (!neu) {
        const e = z >= 0 ? inEbene(st, x, y, z) : null;
        app.melde(
          typeof e === 'number' && istBlock(e)
            ? 'Blöcke sehen von allen Seiten gleich aus. Drehen kannst du Möbel wie Stuhl, Bett, Bank oder Zaun.'
            : typeof e === 'number' && einrichtung(e)
              ? 'Das sieht von allen Seiten gleich aus.'
              : 'Tippe auf ein Möbelstück, dann dreht es sich.',
        );
        return;
      }
      uebernehmen(neu, q.bau.bloecke);
      app.spieleKlang('tipp');
      return;
    }
    if (modus === 'bauen') {
      zuletzt = null;
      const [dx, dy] = nachbar(seite);
      const zz = seite === 'oben' ? z + 1 : z;
      if (!app.paket && (!imFreienTeil(x + dx, y + dy) || !teilFrei(art, false) || tierArt(art))) {
        app.melde(FREI_HINWEIS);
        return;
      }
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
      // Richtung: selbst gewählt, sonst von selbst (Stuhl zum Tisch, Bett an die Wand)
      let neu = e.stand;
      if (drehbar(art)) {
        const r = setzRichtung ?? autoRichtung(neu, x + dx, y + dy, zz, art) ?? 0;
        if (r) neu = mitRichtung(neu, x + dx, y + dy, zz, r);
      }
      uebernehmen(neu, e.bloecke);
      if (drehbar(art)) zuletzt = { x: x + dx, y: y + dy, z: zz };
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

  /** Zuletzt gesetztes Möbel eine Viertelumdrehung drehen (Dreh-Knopf im Bauen-Modus). */
  function zuletztDrehen() {
    const st = stand;
    const q = app.profil;
    if (!st || !q || !zuletzt) return;
    const neu = dreheAn(st, zuletzt.x, zuletzt.y, zuletzt.z);
    if (!neu) {
      zuletzt = null;
      return;
    }
    uebernehmen(neu, q.bau.bloecke);
    app.spieleKlang('tipp');
  }

  /** Figur sitzt, liegt, schaukelt, springt, rutscht oder buddelt (nur zur Anzeige, wird nicht gespeichert). */
  let pose = $state<Pose | null>(null);
  /** Spielgeräte: eine kurze Runde, dann hört die Figur von selbst auf (seit 0.18.1 nicht nur die Schaukel). */
  let schaukelUhr: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const war = pose;
    if (!war || war.typ === 'sitzen' || war.typ === 'liegen') return;
    const dauer = Object.values(AKTIONEN).find((a) => a.typ === war.typ)?.ms ?? 3000;
    schaukelUhr = setTimeout(() => {
      if (pose === war) {
        pose = null;
        app.spieleKlang('pop');
      }
    }, app.einstellungen.animationenReduziert ? 1200 : dauer);
    return () => clearTimeout(schaukelUhr);
    clearTimeout(streichelUhr);
  });
  /** Angetipptes Tier: hüpft kurz und sagt etwas (seit 0.18.1). */
  let gestreichelt = $state<{ nr: number; laut: string } | null>(null);
  let streichelUhr: ReturnType<typeof setTimeout> | undefined;
  function streicheln(st: InselStand, x: number, y: number): boolean {
    const nr = st.tiere.findIndex((t) => t.x === x && t.y === y);
    const t = st.tiere[nr];
    if (!t) return false;
    clearTimeout(streichelUhr);
    gestreichelt = { nr, laut: tierArt(t.art)?.laut ?? '♥' };
    app.spieleKlang('pop');
    streichelUhr = setTimeout(() => (gestreichelt = null), 1600);
    return true;
  }
  // Beim Wechsel zu Bauen oder Abbauen steht die Figur wieder auf
  $effect(() => {
    if (modus !== 'laufen') pose = null;
  });

  /**
   * Hinsetzen bzw. Hinlegen: zum nächsten freien Nachbarfeld des Möbels laufen, dann Platz nehmen.
   * Gibt false zurück, wenn das angetippte Teil kein Sitz- oder Liegemöbel ist.
   */
  function platzNehmen(st: InselStand, x: number, y: number, z: number): boolean {
    const e = inEbene(st, x, y, z);
    if (typeof e !== 'number') return false;
    const sitz = SITZEN[e];
    const lieg = LIEGEN[e];
    const aktion = AKTIONEN[e];
    if (sitz === undefined && lieg === undefined && aktion === undefined) return false;
    let besterWeg: { x: number; y: number; z: number }[] | null = null;
    if (aktion?.hinein) {
      // Sandkasten: hineingehen (man steht darin)
      const ziel = zielAufFeld(st, x, y);
      const weg = ziel ? wegAufInsel(st, st.figur, ziel) : [];
      if (weg.length) besterWeg = weg;
    } else
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        const weg = wegAufInsel(st, st.figur, { x: x + dx, y: y + dy, z });
        if (weg.length && (!besterWeg || weg.length < besterWeg.length)) besterWeg = weg;
      }
    if (!besterWeg) {
      app.melde('Da kommst du nicht hin.');
      return true;
    }
    if (!app.paket && besterWeg.some((w) => !imFreienTeil(w.x, w.y))) {
      app.melde(FREI_HINWEIS);
      return true;
    }
    const typ = lieg !== undefined ? 'liegen' : aktion !== undefined ? aktion.typ : 'sitzen';
    const richtung = richtungVon(st, x, y, z);
    nachLaufen = () => {
      pose = { x, y, z, typ, hoehe: lieg ?? aktion?.hoehe ?? sitz ?? 0.4, richtung };
      app.spieleKlang('pop');
    };
    laufe(besterWeg.slice(1));
    return true;
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
    folgen = true;
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

  /* ---------- Tag und Nacht ---------- */
  /** Gespielte Zeit seit dem letzten Schlafen (ms); läuft nur, solange die Insel offen und sichtbar ist. */
  let wach = $state(app.profil?.insel.wach ?? 0);
  let licht = $derived(inselLicht(wach));
  let morgen = false;
  let nachtGemeldet = false;
  let wachUhr: ReturnType<typeof setInterval> | undefined;
  let letzterWachTakt = Date.now();
  let gespeichertBei = 0;
  function wachSichern() {
    if (!meins()) return;
    const w = wach;
    app.aendereProfil((r) => ({ ...r, insel: { ...r.insel, wach: w } }));
    gespeichertBei = w;
  }
  function wachTakt() {
    const jetzt = Date.now();
    const dt = Math.min(jetzt - letzterWachTakt, 30_000);
    letzterWachTakt = jetzt;
    if (zerstoert || morgen || document.visibilityState === 'hidden') return;
    wach += dt;
    if (licht === 0 && !nachtGemeldet) {
      nachtGemeldet = true;
      app.melde('Es ist Nacht geworden. Leg dich in ein Bett und schlaf eine Runde – dann wird es wieder Tag.');
    }
    if (Math.abs(wach - gespeichertBei) >= 60_000) wachSichern();
  }
  /** Schlafen: Liegt die Figur nachts (oder in der Dämmerung) eine Weile im Bett, geht die Sonne auf. */
  $effect(() => {
    if (pose?.typ !== 'liegen' || licht >= 1) return;
    const uhr = setTimeout(sonnenaufgang, app.einstellungen.animationenReduziert ? 800 : 2500);
    return () => clearTimeout(uhr);
  });
  function sonnenaufgang() {
    if (morgen || zerstoert) return;
    morgen = true;
    const fertig = () => {
      wach = 0;
      morgen = false;
      nachtGemeldet = false;
      wachSichern();
      app.spieleKlang('jubel');
      app.melde('Guten Morgen! Die Nacht ist vorbei.');
    };
    if (app.einstellungen.animationenReduziert) {
      fertig();
      return;
    }
    // In zehn Schritten durch die Dämmerung zurück zum Tag
    wach = INSEL_TAG_MS + INSEL_DAEMMERUNG_MS;
    const takt = setInterval(() => {
      if (zerstoert) return clearInterval(takt);
      wach = Math.max(INSEL_TAG_MS, wach - INSEL_DAEMMERUNG_MS / 10);
      if (wach <= INSEL_TAG_MS) {
        clearInterval(takt);
        fertig();
      }
    }, 220);
  }

  let bummeln: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    void tick().then(() => welt && (kompass = welt.nordWinkel()));
    // Freie Version: Wer (z. B. nach einer Rückgabe des Kaufs) außerhalb der ersten Insel steht, kommt zurück zum Ankunftsplatz
    const st0 = stand;
    if (!app.paket && st0 && !imFreienTeil(st0.figur.x, st0.figur.y)) lokalFigur = { ...START };
    void tick().then(() => kamera(false));
    gespeichertBei = wach;
    letzterWachTakt = Date.now();
    wachUhr = setInterval(wachTakt, 5000);
    const q0 = app.profil;
    const neu = q0 && HINWEISE.find((h) => (h.nur === 'paket') === app.paket && !q0.gesehen.hinweise.includes(h.id));
    if (neu) setTimeout(() => !zerstoert && (hinweis = { id: neu.id, saetze: neu.saetze }), 700);
    if (licht === 0) {
      nachtGemeldet = true;
      setTimeout(() => app.melde('Auf der Insel ist Nacht. Leg dich in ein Bett und schlaf eine Runde – dann wird es wieder Tag.'), 600);
    }
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
  // Spielerwechsel von der Insel aus: vorher für dieses Kind sichern
  const vorWechsel = () => {
    sichern();
    if (wach !== gespeichertBei) wachSichern();
  };
  app.vorWechsel = vorWechsel;
  onDestroy(() => {
    if (app.vorWechsel === vorWechsel) app.vorWechsel = null;
    zerstoert = true;
    cancelAnimationFrame(bild);
    clearInterval(bummeln);
    clearInterval(wachUhr);
    clearTimeout(schaukelUhr);
    clearTimeout(streichelUhr);
    sichern();
    if (wach !== gespeichertBei) wachSichern();
  });
</script>

{#if p}
  <Kopfzeile titel="Bauinsel" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
    <div class="rahmen">
    <div class="kompass" aria-hidden="true" style="--w: {kompass}deg"><span class="nadel"></span><b>N</b></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="feld" class:blende bind:this={feld} onpointerdown={ziehStart} onpointermove={ziehen} onpointercancel={selbstSchauen} ontouchstart={wischStart} ontouchmove={wischen} onwheel={selbstSchauen}>
      {#if stand}<InselWelt bind:this={welt} {stand} {drehung} {massstab} figur={p.figur} aussehen={p.aussehen} {laeuft} {markiert} grundstueck={auftrag && app.paket ? auftrag.grundstueck : null} frei={!app.paket} bauen={modus !== 'laufen'} drehMarken={modus === 'drehen'} {gleitPos} {funkeln} {pose} {gestreichelt} {licht} ontippe={tippe} onboot={zumBoot} onschild={() => (auftragOffen = true)} />{/if}
    </div>
    </div>
    {#if karteOffen && stand}<InselKarte {stand} paket={app.paket} onwahl={zeigeStelle} onzu={() => (karteOffen = false)} />{/if}
    {#if hinweis}<div class="flinka-hinweis"><Sprechblase saetze={hinweis.saetze} onfertig={hinweisFertig} /></div>{/if}
    {#if auftragOffen && app.paket}
      <div class="auftrag karte" role="region" aria-label="Bauauftrag">
        <div class="kopf">
          <h2>{auftrag ? auftrag.titel : 'Alle Inselaufträge geschafft!'}</h2>
          <button class="zu" onclick={() => (auftragOffen = false)} aria-label="Bauauftrag schließen">✕</button>
        </div>
        {#if auftrag}
          {@const g = GRUNDSTUECKE.find((x) => x.id === auftrag.grundstueck)}
          {@const nr = INSEL_AUFTRAEGE.indexOf(auftrag) + 1}
          <p class="sogehts">So geht's: Lies den Auftrag und bau genau das auf dem markierten Bauplatz. Ist alles richtig, gibt es Taler und Blöcke. <span class="nr">Auftrag {nr} von {INSEL_AUFTRAEGE.length}</span></p>
          <p>{auftrag.text}</p>
          <p class="tipp">Tipp: {auftrag.tipp}</p>
          <p class="klein">{g?.name ?? 'Der Bauplatz'} liegt {g?.wo ?? 'auf einer Insel'} und hat ein Schild. Belohnung: {INSEL_AUFTRAG_TALER} Taler und {INSEL_AUFTRAG_BLOECKE} Blöcke.</p>
          <div class="knoepfe">
            <button class="ticket gelb" onclick={zumGrundstueck}>Hinlaufen</button>
            <button class="ticket hell" onclick={() => (auftragOffen = false)}>Schließen</button>
            <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz', von: 'insel' })}>Bauplatz-Aufträge</button>
          </div>
        {:else}
          <p>Du hast alle Bauplätze bebaut. Weitere Aufträge gibt es auf dem Bauplatz.</p>
          <button class="ticket hell" onclick={() => app.zeige({ name: 'bauplatz', von: 'insel' })}>Zum Bauplatz</button>
        {/if}
      </div>
    {/if}
    <div class="werkzeug">
      <div class="zeile">
        <div class="modus" role="radiogroup" aria-label="Was möchtest du tun?">
          <button role="radio" aria-checked={modus === 'laufen'} class:an={modus === 'laufen'} onclick={() => { if (modus === 'laufen') pose = null; modus = 'laufen'; }}>Laufen</button>
          <button role="radio" aria-checked={modus === 'bauen'} class:an={modus === 'bauen'} onclick={() => (modus = 'bauen')}>Bauen</button>
          <button role="radio" aria-checked={modus === 'abbauen'} class:an={modus === 'abbauen'} onclick={() => (modus = 'abbauen')}>Abbauen</button>
          <button role="radio" aria-checked={modus === 'drehen'} class:an={modus === 'drehen'} onclick={() => (modus = 'drehen')}>Drehen</button>
        </div>
        <span class="lager"><Icon name="block" groesse={20} />{p.bau.bloecke}</span>
      </div>
      {#if modus === 'bauen'}
        <div class="palette" role="radiogroup" aria-label="Baustein">
          {#each BLOCKARTEN as b (b.id)}
            <button role="radio" aria-checked={art === b.id} aria-label={b.name} class="block" class:an={art === b.id} style="--o: {b.oben}; --l: {b.links}" onclick={() => (art = b.id)}></button>
          {/each}
          {#each inventar as e (e.id)}
            <button role="radio" aria-checked={art === e.id} aria-label="{e.name}, {p.insel.inventar[String(e.id)]} Stück" class="teil" class:an={art === e.id} onclick={() => (art = e.id)}><TeilVorschau art={e.id} groesse={30} />{e.name}<small>{p.insel.inventar[String(e.id)]}</small></button>
          {/each}
          <button class="laden" onclick={() => app.zeige({ name: 'andenken', von: 'insel' })}>+ Einrichtung</button>
        </div>
        {#if istMoebel && !(p.insel.inventar[String(art)] ?? 0)}<p class="hinweis">Davon hast du keins mehr.</p>{/if}
        <div class="drehzeile">
          {#if istMoebel && drehbar(art)}
            <button class="richtung" onclick={() => (setzRichtung = ((setzRichtung ?? 0) + 1) % 4)} aria-label="Richtung für die nächsten Teile drehen">
              <TeilVorschau {art} richtung={setzRichtung ?? 0} groesse={34} />
              <span>↻ {setzRichtung === null ? 'Richtung: von selbst' : 'Richtung gewählt'}</span>
            </button>
          {/if}
          {#if zuletzt}<button class="ticket hell drehknopf" onclick={zuletztDrehen}>↻ Gesetztes drehen</button>{/if}
        </div>
      {:else}
        <p class="hinweis">{modus === 'laufen' ? 'Tippe auf ein Feld, dann läufst du hin. Hinauf geht es über Treppen.' : modus === 'drehen' ? 'Tippe auf ein Möbelstück: Es dreht sich um eine Vierteldrehung.' : 'Tippe auf einen Block: Er kommt zurück ins Lager.'}</p>
      {/if}
      <div class="zeile klein">
        <button class="rund" onclick={drehen} aria-label="Ansicht drehen">↻</button>
        <button class="rund" onclick={() => { massstab = Math.max(0.6, massstab - 0.2); void tick().then(() => kamera()); }} aria-label="Kleiner">−</button>
        <button class="rund" onclick={() => { massstab = Math.min(1.8, massstab + 0.2); void tick().then(() => kamera()); }} aria-label="Größer">+</button>
        <button class="rund" onclick={() => kamera(true)} aria-label="Wo bin ich?">◎</button>
        <button class="rund" onclick={() => (karteOffen = true)} aria-label="Übersicht aller Inseln"><Icon name="karte" groesse={22} /></button>
        {#if app.paket}<button class="ticket hell auftraege" onclick={() => (auftragOffen = !auftragOffen)} aria-expanded={auftragOffen}>Bauauftrag</button>{/if}
      </div>
    </div>
{/if}

<style>
  .karte {
    width: min(100%, 30rem);
  }
  h2,
  p {
    margin: 0;
  }
  .rahmen {
    flex: 1;
    min-height: 0;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .kompass {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 3;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: rgb(255 253 247 / 0.9);
    pointer-events: none;
    display: grid;
    place-items: center;
  }
  .kompass .nadel {
    position: absolute;
    inset: 4px;
    rotate: var(--w);
    transition: rotate 0.3s ease;
    background: linear-gradient(to bottom, #e23a4e 0 50%, transparent 50%);
    clip-path: polygon(50% 0, 64% 50%, 36% 50%);
  }
  .kompass b {
    position: relative;
    font-size: 0.7rem;
    font-weight: 900;
    color: var(--tinte);
    translate: 0 6px;
  }
  .flinka-hinweis {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
  }
  .feld.blende {
    opacity: 0;
  }
  .feld {
    transition: opacity 0.16s ease;
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
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
    padding: 8px var(--rand-r) var(--unten) var(--rand);
    background: var(--papier);
    border-top: 3px solid var(--tinte);
  }
  .zeile {
    display: flex;
    flex-wrap: wrap;
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
  .auftrag .kopf {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .auftrag .kopf h2 {
    align-self: center;
  }
  .auftrag .zu {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: #fff;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 1.1rem;
    cursor: pointer;
  }
  .auftrag .sogehts {
    background: #fff6d6;
    border: 2px dashed var(--tinte-weich);
    border-radius: 10px;
    padding: 6px 10px;
    font-size: 0.95rem;
  }
  .auftrag .sogehts .nr {
    display: block;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--tinte-weich);
  }
  .auftrag {
    width: auto;
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
  .modus {
    flex-wrap: wrap;
  }
  .modus button {
    min-height: 44px;
    padding: 4px 11px;
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
  .drehzeile {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .drehzeile:empty {
    display: none;
  }
  .drehknopf {
    padding: 6px 16px;
  }
  .richtung {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 2px 12px 2px 4px;
    border: 3px solid var(--tinte);
    border-radius: 22px;
    background: #fff6d6;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 0.9rem;
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
