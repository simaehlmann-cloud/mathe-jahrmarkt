/**
 * Klänge werden im Gerät erzeugt (Web Audio), es gibt keine Audiodateien.
 * Fehlerklänge sind bewusst leise und weich, nie ein „Buzzer“.
 */
export type Klangart = 'pop' | 'richtig' | 'fehler' | 'jubel' | 'tipp' | 'wurf';

export interface Klang {
  spiele(art: Klangart, lautstaerke: number): void;
}

export function erstelleKlang(): Klang {
  let ctx: AudioContext | undefined;
  const kontext = (): AudioContext | undefined => {
    if (typeof AudioContext === 'undefined') return undefined;
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };

  const ton = (c: AudioContext, frequenz: number, start: number, dauer: number, laut: number, typ: OscillatorType = 'sine', ziel?: number) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = typ;
    osc.frequency.setValueAtTime(frequenz, start);
    if (ziel) osc.frequency.exponentialRampToValueAtTime(ziel, start + dauer);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, laut), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dauer);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + dauer + 0.02);
  };

  return {
    spiele(art, lautstaerke) {
      if (lautstaerke <= 0) return;
      const c = kontext();
      if (!c) return;
      const t = c.currentTime;
      const l = 0.25 * lautstaerke;
      switch (art) {
        case 'wurf':
          ton(c, 900, t, 0.12, l * 0.4, 'triangle', 300);
          break;
        case 'pop':
          ton(c, 520, t, 0.08, l, 'square', 120);
          break;
        case 'richtig':
          ton(c, 660, t, 0.14, l * 0.8);
          ton(c, 990, t + 0.1, 0.22, l * 0.8);
          break;
        case 'fehler':
          ton(c, 330, t, 0.25, l * 0.5, 'sine', 260);
          break;
        case 'tipp':
          ton(c, 880, t, 0.06, l * 0.4);
          break;
        case 'jubel':
          [523, 659, 784, 1047].forEach((f, i) => ton(c, f, t + i * 0.11, 0.25, l * 0.7, 'triangle'));
          break;
      }
    },
  };
}
