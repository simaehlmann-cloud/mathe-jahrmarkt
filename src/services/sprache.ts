/**
 * Vorlesen mit der deutschen Systemstimme des Geräts.
 * Offline, kostenlos, ohne Audiodateien. Eingesprochene Aufnahmen lassen sich später hier einhängen.
 */
export interface Sprache {
  sprich(text: string, lautstaerke: number): Promise<void>;
  stopp(): Promise<void>;
}

/** Ersetzt Zeichen, die Sprachausgaben uneinheitlich lesen. */
export function sprechbar(text: string): string {
  return text
    .replace(/·/g, ' mal ')
    .replace(/(\d)\s*:\s*(\d)/g, '$1 geteilt durch $2')
    .replace(/_/g, ' wie viel ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function erstelleSprache(): Sprache {
  let plugin: Promise<typeof import('@capacitor-community/text-to-speech')> | undefined;
  const lade = () => (plugin ??= import('@capacitor-community/text-to-speech'));
  return {
    async sprich(text, lautstaerke) {
      if (lautstaerke <= 0 || !text) return;
      try {
        const { TextToSpeech } = await lade();
        await TextToSpeech.stop();
        await TextToSpeech.speak({ text: sprechbar(text), lang: 'de-DE', rate: 0.95, volume: lautstaerke, category: 'playback' });
      } catch {
        // Keine Stimme verfügbar (z. B. Browser ohne Sprachausgabe): still weiterspielen.
      }
    },
    async stopp() {
      try {
        const { TextToSpeech } = await lade();
        await TextToSpeech.stop();
      } catch {
        /* nichts zu stoppen */
      }
    },
  };
}
