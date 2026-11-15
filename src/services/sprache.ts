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
  geschlecht?: 'w' | 'm' | '?';
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

export type Geschlecht = 'w' | 'm' | '?';

/**
 * Bekannte Stimmen-Kennungen: Google (de-de-x-…), Samsung (SMTf…/SMTm…), Apple (Vornamen).
 * Auf dem Samsung S25+ angehört (11/2026): dea Frau, deb Mann, deg Mann.
 */
const GOOGLE: Readonly<Record<string, Geschlecht>> = { dea: 'w', deb: 'm', nfh: 'w', dec: 'w', deg: 'm', def: 'm', ded: 'm' };
const WEIBLICH = /anna|helena|petra|marlene|vicki|katja|hedda|sabine|julia|frau|female|weiblich/;
const MAENNLICH = /markus|yannick|martin|stefan|hans|conrad|tom|male|männlich|maennlich|mann/;

/** Kurze Kennung einer Stimme, damit gleiche Stimmen (z. B. dieselbe Stimme in zwei Paketen) nur einmal vorkommen. */
export function stimmenKennung(s: Pick<RohStimme, 'name' | 'voiceURI'>): string {
  const t = `${s.voiceURI} ${s.name}`.toLowerCase();
  const g = /de-de-x-([a-z]+)/.exec(t);
  if (g) return `g-${g[1]}`;
  const sm = /smt([fm]\d+)/.exec(t);
  if (sm) return `s-${sm[1]}`;
  return t.replace(/\(.*?\)|enhanced|premium|kompakt|compact|-local|local/g, '').replace(/\s+/g, ' ').trim();
}

export function geschlecht(s: Pick<RohStimme, 'name' | 'voiceURI'>): Geschlecht {
  const t = `${s.voiceURI} ${s.name}`.toLowerCase();
  const g = /de-de-x-([a-z]+)/.exec(t);
  if (g) return GOOGLE[g[1] ?? ''] ?? '?';
  const sm = /smt([fm])\d/.exec(t);
  if (sm) return sm[1] === 'f' ? 'w' : 'm';
  // „female“ enthält „male“: Frau zuerst prüfen
  if (WEIBLICH.test(t)) return 'w';
  if (MAENNLICH.test(t)) return 'm';
  return '?';
}

/**
 * Höchstens vier gut unterscheidbare Stimmen: je zwei Frauen- und Männerstimmen (die beste Fassung jeder Stimme),
 * Stimmen ohne erkennbares Geschlecht füllen auf. Namen „Frau 1“, „Frau 2“, „Mann 1“, „Mann 2“, „Stimme 3“ …
 * Viele Geräte nennen alle Stimmen gleich („Deutsch (Deutschland)“), deshalb zählt die interne Kennung.
 */
export function waehleStimmen(roh: readonly RohStimme[]): Stimme[] {
  const gut = roh
    .map((s, index) => ({ s, index, wert: stimmenWert(s), kennung: stimmenKennung(s), g: geschlecht(s) }))
    .filter((x) => x.wert >= 0)
    .sort((a, b) => b.wert - a.wert);
  const einzeln: typeof gut = [];
  for (const x of gut) if (!einzeln.some((y) => y.kennung === x.kennung)) einzeln.push(x);
  // „de-DE-language“ ist nur ein Verweis auf die Gerätestandardstimme (Klang je Gerät verschieden): weglassen,
  // sobald es echte Stimmen mit Kennung gibt
  const allgemein = (x: (typeof gut)[number]) => /^[a-z]{2}-[a-z]{2}-language$/i.test(x.s.voiceURI || x.s.name);
  if (einzeln.some((x) => !allgemein(x))) for (let i = einzeln.length - 1; i >= 0; i--) if (allgemein(einzeln[i]!)) einzeln.splice(i, 1);
  const frauen = einzeln.filter((x) => x.g === 'w').slice(0, 2);
  // deg klingt am besten (Test auf dem S25+): zuerst, damit sie „Mann 1“ und Standard wird
  const maenner = einzeln
    .filter((x) => x.g === 'm')
    .sort((a, b) => Number(b.kennung === 'g-deg') - Number(a.kennung === 'g-deg'))
    .slice(0, 2);
  const rest = einzeln.filter((x) => !frauen.includes(x) && !maenner.includes(x));
  const auswahl = [...frauen, ...maenner, ...rest].slice(0, 4);
  let unbekannt = 0;
  return auswahl.map((x) => {
    const name =
      x.g === 'w' ? `Frau ${frauen.indexOf(x) + 1}` : x.g === 'm' ? `Mann ${maenner.indexOf(x) + 1}` : `Stimme ${frauen.length + maenner.length + ++unbekannt}`;
    return { index: x.index, name, lang: x.s.lang, uri: x.s.voiceURI || x.s.name, geschlecht: x.g };
  });
}

/** Standard, wenn nichts gewählt ist: die erste Männerstimme (Wunsch aus dem Test), sonst die erste Frauenstimme, sonst die erste. */
export function standardStimme(liste: readonly Stimme[]): Stimme | undefined {
  return liste.find((s) => s.name === 'Mann 1') ?? liste.find((s) => s.name === 'Frau 1') ?? liste[0];
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
        const gewaehlt = verfuegbar.find((s) => s.uri === o.stimme) ?? standardStimme(verfuegbar);
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
