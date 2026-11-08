/**
 * Vorlesen mit einer deutschen Systemstimme des Geräts.
 * Offline, kostenlos, ohne Audiodateien. Stimmen, die über das Internet sprechen,
 * werden nie verwendet: Dabei gingen die Texte an einen fremden Server.
 */
export interface Stimme {
  /** Index in der Liste des Geräts (für die Sprachausgabe). */
  index: number;
  name: string;
  lang: string;
  /** Kennung zum Speichern in den Einstellungen. */
  uri: string;
}

export interface Sprechoptionen {
  lautstaerke: number;
  /** 1 = normal. */
  tempo: number;
  /** Gespeicherte Stimmen-Kennung oder '' für automatisch. */
  stimme: string;
}

export interface Sprache {
  sprich(text: string, o: Sprechoptionen): Promise<void>;
  stopp(): Promise<void>;
  /** Deutsche Stimmen, die ohne Internet funktionieren, beste zuerst. */
  stimmen(): Promise<Stimme[]>;
}

export const STANDARD_TEMPO = 1.1;

/** Ersetzt Zeichen, die Sprachausgaben uneinheitlich lesen. */
export function sprechbar(text: string): string {
  return text
    .replace(/·/g, ' mal ')
    .replace(/(\d)\s*:\s*(\d)/g, '$1 geteilt durch $2')
    .replace(/_/g, ' wie viel ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RohStimme {
  default: boolean;
  lang: string;
  localService: boolean;
  name: string;
  voiceURI: string;
}

/**
 * Bewertet eine Stimme. Höher = besser. Bevorzugt deutsche Stimmen in hoher Qualität,
 * die auf dem Gerät laufen. Netzstimmen fallen ganz heraus (Rückgabe < 0).
 */
export function stimmenWert(s: RohStimme): number {
  const name = `${s.name} ${s.voiceURI}`.toLowerCase();
  if (!/^de([-_]|$)/i.test(s.lang)) return -1;
  if (/network|netz|online|cloud/.test(name)) return -1;
  if (s.localService === false && !/local/.test(name)) return -1;
  let w = 10;
  if (/de[-_]de/i.test(s.lang)) w += 5;
  if (/enhanced|premium|neural|natural|hohe qualität|high/.test(name)) w += 8;
  if (/google|samsung|anna|petra|markus|helena/.test(name)) w += 3;
  if (/compact|kompakt|low|espeak/.test(name)) w -= 8;
  if (s.default) w += 1;
  return w;
}

export function waehleStimmen(roh: readonly RohStimme[]): Stimme[] {
  return roh
    .map((s, index) => ({ s, index, wert: stimmenWert(s) }))
    .filter((x) => x.wert >= 0)
    .sort((a, b) => b.wert - a.wert)
    .map(({ s, index }) => ({ index, name: anzeigename(s), lang: s.lang, uri: s.voiceURI || s.name }));
}

function anzeigename(s: RohStimme): string {
  // Android liefert Namen wie „de-de-x-deb-local“; daraus wird „Stimme deb“.
  const m = /de-de-x-([a-z]+)-local/i.exec(s.name);
  if (m) return `Stimme ${m[1]?.toUpperCase()}`;
  return s.name;
}

export function erstelleSprache(): Sprache {
  let plugin: Promise<typeof import('@capacitor-community/text-to-speech')> | undefined;
  let liste: Promise<Stimme[]> | undefined;
  const lade = () => (plugin ??= import('@capacitor-community/text-to-speech'));
  const stimmen = (): Promise<Stimme[]> =>
    (liste ??= lade()
      .then(({ TextToSpeech }) => TextToSpeech.getSupportedVoices())
      .then((r) => waehleStimmen(r.voices))
      .catch(() => []));

  return {
    stimmen,
    async sprich(text, o) {
      if (o.lautstaerke <= 0 || !text) return;
      try {
        const { TextToSpeech } = await lade();
        const verfuegbar = await stimmen();
        const gewaehlt = verfuegbar.find((s) => s.uri === o.stimme) ?? verfuegbar[0];
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: sprechbar(text),
          lang: 'de-DE',
          rate: o.tempo,
          pitch: 1,
          volume: o.lautstaerke,
          category: 'playback',
          ...(gewaehlt ? { voice: gewaehlt.index } : {}),
        });
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
