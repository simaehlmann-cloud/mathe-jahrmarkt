import { hallImpuls } from './klang';
/**
 * Jahrmarkt-Musik: zwei eigene Kompositionen („Lichter an“ im 4/4-Takt mit Schlagzeug und „Flinkas Walzer“),
 * die das Gerät per Web Audio erzeugt. Keine Audiodateien, keine fremden Rechte.
 */

/** Ton als MIDI-Nummer (60 = C4) und Länge in Schlägen. */
export type Ton = readonly [midi: number, schlaege: number];
export interface Takt {
  melodie: readonly Ton[];
  /** Grundton für den Bass auf Schlag 1. */
  bass: number;
  /** Dreiklang für „Hm-ta-ta“ auf Schlag 2 und 3. */
  akkord: readonly number[];
}

const C = { bass: 48, akkord: [60, 64, 67] };
const Dm = { bass: 50, akkord: [62, 65, 69] };
const F = { bass: 41, akkord: [60, 65, 69] };
const G = { bass: 43, akkord: [59, 62, 67] };

/** „Flinkas Walzer“, 16 Takte, eigene Komposition für diese App. */
export const FLINKAS_WALZER: readonly Takt[] = [
  { melodie: [[72, 1], [76, 1], [79, 1]], ...C },
  { melodie: [[79, 1], [76, 1], [72, 1]], ...C },
  { melodie: [[74, 1], [77, 1], [81, 1]], ...Dm },
  { melodie: [[81, 1], [77, 1], [74, 1]], ...Dm },
  { melodie: [[67, 1], [71, 1], [74, 1]], ...G },
  { melodie: [[77, 1], [76, 1], [74, 1]], ...G },
  { melodie: [[72, 1], [76, 1], [79, 1]], ...C },
  { melodie: [[84, 3]], ...C },
  { melodie: [[81, 1], [79, 1], [77, 1]], ...F },
  { melodie: [[76, 1], [74, 1], [72, 1]], ...C },
  { melodie: [[74, 1], [76, 1], [77, 1]], ...Dm },
  { melodie: [[79, 3]], ...G },
  { melodie: [[81, 1], [79, 1], [77, 1]], ...F },
  { melodie: [[76, 1], [74, 1], [72, 1]], ...C },
  { melodie: [[74, 1], [71, 1], [67, 1]], ...G },
  { melodie: [[72, 3]], ...C },
];

export const SCHLAEGE_PRO_TAKT = 3;
export const TEMPO_BPM = 138;

/** Ein Musikstück: Taktart, Tempo, Takte. Pausen in der Melodie haben die MIDI-Nummer 0. */
export interface Stueck {
  name: string;
  bpm: number;
  schlaege: number;
  takte: readonly Takt[];
}

const Am = { bass: 45, akkord: [57, 60, 64] };
const Em = { bass: 40, akkord: [55, 59, 64] };
const C2 = { bass: 36, akkord: [60, 64, 67] };
const G2 = { bass: 43, akkord: [59, 62, 67] };
const F2 = { bass: 41, akkord: [57, 60, 65] };

/** „Lichter an“: zweites eigenes Stück, 4/4, Pop-Groove mit Schlagzeug (für Ältere weniger kindlich als der Walzer). */
export const LICHTER_AN: readonly Takt[] = [
  { melodie: [[72, 1], [76, 1], [79, 1.5], [77, 0.5]], ...C2 },
  { melodie: [[79, 1], [74, 1], [71, 2]], ...G2 },
  { melodie: [[72, 1], [76, 1], [81, 1.5], [79, 0.5]], ...Am },
  { melodie: [[77, 2], [76, 1], [74, 1]], ...F2 },
  { melodie: [[72, 1], [76, 1], [79, 1.5], [81, 0.5]], ...C2 },
  { melodie: [[83, 1], [81, 1], [79, 2]], ...G2 },
  { melodie: [[77, 1], [79, 1], [81, 1], [77, 1]], ...F2 },
  { melodie: [[79, 2], [74, 2]], ...G2 },
  { melodie: [[81, 1.5], [79, 0.5], [77, 1], [76, 1]], ...F2 },
  { melodie: [[74, 1.5], [76, 0.5], [79, 2]], ...G2 },
  { melodie: [[79, 1], [76, 1], [71, 1], [76, 1]], ...Em },
  { melodie: [[81, 3], [79, 1]], ...Am },
  { melodie: [[77, 1], [81, 1], [84, 1.5], [81, 0.5]], ...F2 },
  { melodie: [[83, 1], [79, 1], [74, 2]], ...G2 },
  { melodie: [[76, 1], [79, 1], [84, 2]], ...C2 },
  { melodie: [[84, 3], [0, 1]], ...C2 },
];

export const PLAYLIST: readonly Stueck[] = [
  { name: 'Lichter an', bpm: 112, schlaege: 4, takte: LICHTER_AN },
  { name: 'Lichter an', bpm: 112, schlaege: 4, takte: LICHTER_AN },
  { name: 'Flinkas Walzer', bpm: TEMPO_BPM, schlaege: SCHLAEGE_PRO_TAKT, takte: FLINKAS_WALZER },
];

export const frequenz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export interface Musik {
  /** Nach der ersten Berührung aufrufen; Browser erlauben Ton erst dann. */
  entsperren(): void;
  /** Spielt oder pausiert mit der gewünschten Lautstärke (0 bis 1). */
  stelle(spielen: boolean, lautstaerke: number): void;
}

/**
 * Kleine Band aus dem Gerät: Melodie (Marimba-artig mit Glockenschimmer), Flächenakkorde, Bass,
 * leise Begleitfiguren und ein weiches Schlagzeug aus Rauschen. Alles läuft über Hall und Kompressor.
 */
export function erstelleMusik(liste: readonly Stueck[] = PLAYLIST): Musik {
  let ctx: AudioContext | undefined;
  let haupt: GainNode | undefined;
  let bus: AudioNode | undefined;
  let hall: AudioNode | undefined;
  let rauschen: AudioBuffer | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let naechsteZeit = 0;
  let stueckIndex = 0;
  let taktIndex = 0;
  let wunschLaut = 0;
  let wunschSpielen = false;

  const senden = (n: AudioNode, hallAnteil: boolean) => {
    if (bus) n.connect(bus);
    if (hallAnteil && hall) n.connect(hall);
  };

  const ton = (f: number, start: number, dauer: number, laut: number, typ: OscillatorType, o: { verstimmt?: number; angriff?: number; filter?: number; hall?: boolean } = {}) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(f, start);
    if (o.verstimmt) osc.detune.setValueAtTime(o.verstimmt, start);
    const angriff = o.angriff ?? 0.012;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(laut, start + angriff);
    g.gain.exponentialRampToValueAtTime(laut * 0.5, start + Math.max(angriff + 0.01, dauer * 0.45));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    let letzter: AudioNode = osc.connect(g);
    if (o.filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.filter;
      letzter = g.connect(fl);
    }
    senden(letzter, o.hall ?? true);
    osc.start(start);
    osc.stop(start + dauer + 0.05);
  };

  const trommel = (start: number, art: 'kick' | 'snare' | 'hat', laut: number) => {
    if (!ctx || !rauschen) return;
    if (art === 'kick') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(130, start);
      osc.frequency.exponentialRampToValueAtTime(45, start + 0.18);
      g.gain.setValueAtTime(laut, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(g);
      senden(g, false);
      osc.start(start);
      osc.stop(start + 0.25);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = rauschen;
    const f = ctx.createBiquadFilter();
    f.type = art === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = art === 'hat' ? 7000 : 1800;
    const g = ctx.createGain();
    const dauer = art === 'hat' ? 0.05 : 0.16;
    g.gain.setValueAtTime(laut, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    src.connect(f).connect(g);
    senden(g, art === 'snare');
    src.start(start, Math.random() * 0.5);
    src.stop(start + dauer + 0.02);
  };

  const planeTakt = (stueck: Stueck, takt: Takt, start: number) => {
    const schlag = 60 / stueck.bpm;
    const walzer = stueck.schlaege === 3;
    // Melodie: Marimba (Dreieck, kurz) mit leisem Glockenschimmer eine Oktave höher
    let t = start;
    for (const [midi, laenge] of takt.melodie) {
      if (midi > 0) {
        const d = Math.min(laenge * schlag * 0.95, walzer ? 0.9 : 1.2);
        ton(frequenz(midi), t, d, 0.13, 'triangle');
        ton(frequenz(midi + 12), t, d * 0.6, 0.025, 'sine');
        if (walzer) ton(frequenz(midi), t, d, 0.035, 'square', { verstimmt: 7, filter: 2200 });
      }
      t += laenge * schlag;
    }
    if (walzer) {
      ton(frequenz(takt.bass), start, schlag * 0.8, 0.2, 'triangle', { hall: false });
      for (const s of [1, 2]) for (const m of takt.akkord) ton(frequenz(m), start + s * schlag, schlag * 0.35, 0.03, 'triangle');
      trommel(start, 'kick', 0.18);
      trommel(start + schlag, 'hat', 0.05);
      trommel(start + 2 * schlag, 'hat', 0.05);
      return;
    }
    // Flächenakkord über den ganzen Takt (weich gefiltert, langsamer Einsatz)
    for (const m of takt.akkord) ton(frequenz(m), start, stueck.schlaege * schlag, 0.022, 'sawtooth', { angriff: 0.25, filter: 900, verstimmt: m % 2 ? 6 : -6 });
    // Bass: Grundton – Grundton – Quinte – Oktave
    const b = takt.bass;
    [[b, 0, 0.9], [b, 1.5, 0.45], [b + 7, 2, 0.9], [b + 12, 3, 0.8]].forEach(([m = b, s = 0, l = 1]) => ton(frequenz(m), start + s * schlag, l * schlag, 0.17, 'triangle', { hall: false, filter: 700 }));
    // Begleitfigur: Akkordtöne in Achteln, sehr leise
    takt.akkord.concat(takt.akkord.slice().reverse()).slice(0, 8).forEach((m, i) => {
      if (i % 2 === 1) ton(frequenz(m + 12), start + i * 0.5 * schlag, 0.18, 0.018, 'sine');
    });
    // Schlagzeug: Kick 1 und 3, Snare 2 und 4, Hi-Hat in Achteln
    for (let s = 0; s < 4; s++) {
      if (s % 2 === 0) trommel(start + s * schlag, 'kick', 0.32);
      else trommel(start + s * schlag, 'snare', 0.07);
      trommel(start + s * schlag, 'hat', 0.03);
      trommel(start + (s + 0.5) * schlag, 'hat', 0.018);
    }
  };

  const takten = () => {
    if (!ctx) return;
    while (naechsteZeit < ctx.currentTime + 0.5) {
      const stueck = liste[stueckIndex % liste.length];
      if (!stueck) return;
      const takt = stueck.takte[taktIndex];
      if (takt) planeTakt(stueck, takt, naechsteZeit);
      naechsteZeit += stueck.schlaege * (60 / stueck.bpm);
      taktIndex++;
      if (taktIndex >= stueck.takte.length) {
        taktIndex = 0;
        stueckIndex++;
        // Kleine Atempause zwischen den Stücken
        naechsteZeit += 60 / stueck.bpm;
      }
    }
  };

  const anwenden = () => {
    if (!ctx || !haupt) return;
    const jetzt = ctx.currentTime;
    const ziel = wunschSpielen ? Math.max(0.0001, wunschLaut * 0.55) : 0.0001;
    haupt.gain.cancelScheduledValues(jetzt);
    haupt.gain.setTargetAtTime(ziel, jetzt, 0.3);
    if (wunschSpielen && wunschLaut > 0 && !timer) {
      if (ctx.state === 'suspended') void ctx.resume();
      naechsteZeit = Math.max(naechsteZeit, jetzt + 0.05);
      timer = setInterval(takten, 120);
      takten();
    } else if ((!wunschSpielen || wunschLaut <= 0) && timer) {
      // Erst ausblenden, dann anhalten
      const t = timer;
      timer = undefined;
      setTimeout(() => clearInterval(t), 1200);
    }
  };

  // App im Hintergrund: Musik sofort aus
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.visibilityState === 'hidden') void ctx.suspend();
      else if (wunschSpielen && wunschLaut > 0) void ctx.resume();
    });
  }

  return {
    entsperren() {
      if (ctx || typeof AudioContext === 'undefined') return;
      ctx = new AudioContext();
      const komp = ctx.createDynamicsCompressor();
      komp.threshold.value = -20;
      komp.ratio.value = 3;
      haupt = ctx.createGain();
      haupt.gain.value = 0.0001;
      haupt.connect(komp).connect(ctx.destination);
      bus = haupt;
      const conv = ctx.createConvolver();
      conv.buffer = hallImpuls(ctx, 1.8, 2.5);
      const hallPegel = ctx.createGain();
      hallPegel.gain.value = 0.28;
      conv.connect(hallPegel).connect(haupt);
      hall = conv;
      rauschen = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = rauschen.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      anwenden();
    },
    stelle(spielen, lautstaerke) {
      wunschSpielen = spielen;
      wunschLaut = lautstaerke;
      anwenden();
    },
  };
}
