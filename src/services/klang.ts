/**
 * Klänge werden im Gerät erzeugt (Web Audio), es gibt keine Audiodateien.
 * Fehlerklänge sind bewusst leise und weich, nie ein „Buzzer“.
 * Die Klänge laufen über einen kleinen Hall und einen Kompressor, damit sie voll, aber nie schrill klingen.
 */
export type Klangart = 'pop' | 'richtig' | 'fehler' | 'jubel' | 'tipp' | 'wurf' | 'muenze' | 'glocke' | 'karte';

export interface Klang {
  spiele(art: Klangart, lautstaerke: number): void;
}

/** Kurzer, weicher Hall aus erzeugtem Rauschen (keine Datei). */
export function hallImpuls(c: BaseAudioContext, sekunden: number, abfall: number): AudioBuffer {
  const laenge = Math.floor(c.sampleRate * sekunden);
  const puffer = c.createBuffer(2, laenge, c.sampleRate);
  for (let k = 0; k < 2; k++) {
    const d = puffer.getChannelData(k);
    for (let i = 0; i < laenge; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / laenge) ** abfall;
  }
  return puffer;
}

export function erstelleKlang(): Klang {
  let ctx: AudioContext | undefined;
  let ausgang: AudioNode | undefined;
  let hall: AudioNode | undefined;
  let rauschen: AudioBuffer | undefined;

  const kontext = (): AudioContext | undefined => {
    if (typeof AudioContext === 'undefined') return undefined;
    if (!ctx) {
      ctx = new AudioContext();
      const komp = ctx.createDynamicsCompressor();
      komp.threshold.value = -18;
      komp.ratio.value = 4;
      komp.connect(ctx.destination);
      const conv = ctx.createConvolver();
      conv.buffer = hallImpuls(ctx, 0.9, 3);
      const hallPegel = ctx.createGain();
      hallPegel.gain.value = 0.22;
      conv.connect(hallPegel).connect(komp);
      ausgang = komp;
      hall = conv;
      rauschen = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = rauschen.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  const verbinde = (n: AudioNode, mitHall = true) => {
    if (ausgang) n.connect(ausgang);
    if (mitHall && hall) n.connect(hall);
  };

  /** Ton mit Hüllkurve; `obertoene` für glockige Klänge. */
  const ton = (c: AudioContext, f: number, start: number, dauer: number, laut: number, typ: OscillatorType = 'sine', ziel?: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(f, start);
    if (ziel) osc.frequency.exponentialRampToValueAtTime(ziel, start + dauer);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    osc.connect(g);
    verbinde(g);
    osc.start(start);
    osc.stop(start + dauer + 0.05);
  };

  /** Glocke: Grundton mit unharmonischen Obertönen, lange ausklingend. */
  const glocke = (c: AudioContext, f: number, start: number, dauer: number, laut: number) => {
    [1, 2.01, 2.76, 4.07].forEach((faktor, i) => ton(c, f * faktor, start, dauer / (1 + i * 0.6), laut / (1 + i * 1.4)));
  };

  /** Gefiltertes Rauschen (Wusch, Klick, Glitzern). */
  const rausch = (c: AudioContext, start: number, dauer: number, laut: number, typ: BiquadFilterType, von: number, bis = von, q = 1) => {
    if (!rauschen) return;
    const src = c.createBufferSource();
    src.buffer = rauschen;
    const f = c.createBiquadFilter();
    f.type = typ;
    f.Q.value = q;
    f.frequency.setValueAtTime(von, start);
    f.frequency.exponentialRampToValueAtTime(bis, start + dauer);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(laut, start + Math.min(0.03, dauer / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    src.connect(f).connect(g);
    verbinde(g);
    src.start(start, Math.random() * 0.5);
    src.stop(start + dauer + 0.05);
  };

  return {
    spiele(art, lautstaerke) {
      if (lautstaerke <= 0) return;
      const c = kontext();
      if (!c) return;
      const t = c.currentTime;
      const l = 0.32 * lautstaerke;
      switch (art) {
        case 'wurf':
          rausch(c, t, 0.22, l * 0.5, 'bandpass', 600, 2600, 2);
          break;
        case 'pop':
          ton(c, 740, t, 0.09, l * 0.7, 'triangle', 380);
          rausch(c, t, 0.03, l * 0.3, 'highpass', 4000);
          break;
        case 'tipp':
          ton(c, 1320, t, 0.05, l * 0.25, 'sine');
          rausch(c, t, 0.02, l * 0.15, 'highpass', 5000);
          break;
        case 'richtig':
          glocke(c, 784, t, 0.7, l * 0.55);
          glocke(c, 1175, t + 0.09, 0.9, l * 0.5);
          break;
        case 'fehler':
          // Weicher Holzklang, freundlich statt Buzzer
          ton(c, 220, t, 0.18, l * 0.5, 'sine', 180);
          ton(c, 330, t + 0.12, 0.22, l * 0.35, 'sine', 247);
          break;
        case 'jubel':
          [523, 659, 784, 1047, 1319].forEach((f, i) => glocke(c, f, t + i * 0.08, 0.8, l * 0.35));
          rausch(c, t + 0.3, 0.9, l * 0.18, 'highpass', 7000, 9000);
          break;
        case 'muenze':
          glocke(c, 1976, t, 0.35, l * 0.35);
          glocke(c, 2637, t + 0.05, 0.45, l * 0.3);
          break;
        case 'glocke':
          glocke(c, 523, t, 2.2, l * 0.7);
          glocke(c, 523, t + 0.35, 1.8, l * 0.45);
          break;
        case 'karte':
          rausch(c, t, 0.12, l * 0.4, 'bandpass', 1800, 3600, 1.5);
          ton(c, 1047, t + 0.08, 0.3, l * 0.3, 'triangle');
          break;
      }
    },
  };
}
