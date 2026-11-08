/**
 * Jahrmarkt-Musik: eine eigene Komposition (Walzer im 3/4-Takt, Drehorgel-Klang),
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

export const frequenz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export interface Musik {
  /** Nach der ersten Berührung aufrufen; Browser erlauben Ton erst dann. */
  entsperren(): void;
  /** Spielt oder pausiert mit der gewünschten Lautstärke (0 bis 1). */
  stelle(spielen: boolean, lautstaerke: number): void;
}

export function erstelleMusik(stueck: readonly Takt[] = FLINKAS_WALZER): Musik {
  let ctx: AudioContext | undefined;
  let haupt: GainNode | undefined;
  let filter: BiquadFilterNode | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let naechsteZeit = 0;
  let taktIndex = 0;
  let wunschLaut = 0;
  let wunschSpielen = false;
  const schlag = 60 / TEMPO_BPM;

  const ton = (frequenzHz: number, start: number, dauer: number, laut: number, typ: OscillatorType, verstimmt = 0) => {
    if (!ctx || !filter) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(frequenzHz, start);
    osc.detune.setValueAtTime(verstimmt, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(laut, start + 0.015);
    g.gain.exponentialRampToValueAtTime(laut * 0.55, start + dauer * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    osc.connect(g).connect(filter);
    osc.start(start);
    osc.stop(start + dauer + 0.05);
  };

  const planeTakt = (takt: Takt, start: number) => {
    // Melodie: zwei leicht verstimmte Rechteckwellen, klingt nach Drehorgel
    let t = start;
    for (const [midi, laenge] of takt.melodie) {
      const d = laenge * schlag * 0.92;
      ton(frequenz(midi), t, d, 0.09, 'square', -6);
      ton(frequenz(midi), t, d, 0.07, 'square', 7);
      t += laenge * schlag;
    }
    // Hm-ta-ta
    ton(frequenz(takt.bass), start, schlag * 0.8, 0.22, 'triangle');
    for (const s of [1, 2]) {
      for (const m of takt.akkord) ton(frequenz(m), start + s * schlag, schlag * 0.35, 0.035, 'square');
    }
  };

  const takten = () => {
    if (!ctx) return;
    while (naechsteZeit < ctx.currentTime + 0.4) {
      const takt = stueck[taktIndex % stueck.length];
      if (takt) planeTakt(takt, naechsteZeit);
      naechsteZeit += SCHLAEGE_PRO_TAKT * schlag;
      taktIndex++;
    }
  };

  const anwenden = () => {
    if (!ctx || !haupt) return;
    const jetzt = ctx.currentTime;
    const ziel = wunschSpielen ? Math.max(0.0001, wunschLaut * 0.5) : 0.0001;
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
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      haupt = ctx.createGain();
      haupt.gain.value = 0.0001;
      filter.connect(haupt).connect(ctx.destination);
      anwenden();
    },
    stelle(spielen, lautstaerke) {
      wunschSpielen = spielen;
      wunschLaut = lautstaerke;
      anwenden();
    },
  };
}
