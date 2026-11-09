import { pruefeAussehen } from '../domain/aussehen';
import { STUFEN } from '../domain/buden';
import { FIGUREN, MAX_PROFILE, bereinigeName, type Abzeichen, type FigurId, type Profil, type Runde, type StufenStand } from '../domain/profil';
import type { Ereignis, Wochenwert } from '../domain/lernprofil/lernprofil';

export type Schrift = 'normal' | 'gross' | 'sehrGross';
export type Subtraktionsverfahren =
  | 'abziehen-entbuendeln'
  | 'abziehen-erweitern'
  | 'ergaenzen-entbuendeln'
  | 'ergaenzen-erweitern'
  | 'ergaenzen-auffuellen';

export const SUBTRAKTION_NAMEN: Readonly<Record<Subtraktionsverfahren, string>> = {
  'abziehen-entbuendeln': 'Abziehen mit Entbündeln',
  'abziehen-erweitern': 'Abziehen mit Erweitern',
  'ergaenzen-entbuendeln': 'Ergänzen mit Entbündeln',
  'ergaenzen-erweitern': 'Ergänzen mit Erweitern',
  'ergaenzen-auffuellen': 'Ergänzen mit Auffüllen',
};

export interface Einstellungen {
  lautMusik: number;
  lautEffekte: number;
  lautSprache: number;
  animationenReduziert: boolean;
  schrift: Schrift;
  subtraktion: Subtraktionsverfahren;
  automatischVorlesen: boolean;
  /** Sprechtempo, 1 = normal. */
  sprechtempo: number;
  /** Kennung der gewählten Stimme, '' = automatisch die beste. */
  stimme: string;
  /** Musik auch während der Aufgaben (Standard: aus, damit das Kind sich konzentrieren kann). */
  musikImSpiel: boolean;
  /** Schalter oben in der Kopfzeile. Die App startet still, bis das Kind sie einschaltet. */
  musikAn: boolean;
  stimmeAn: boolean;
}

export interface Datenbestand {
  schema: number;
  profile: Profil[];
  aktiv?: string | undefined;
  einstellungen: Einstellungen;
  paket: { gekauft: boolean; seit?: number | undefined };
}

export const SCHEMA = 3;

export const standardEinstellungen = (): Einstellungen => ({
  lautMusik: 0.4,
  lautEffekte: 0.8,
  lautSprache: 1,
  animationenReduziert: false,
  schrift: 'normal',
  subtraktion: 'abziehen-entbuendeln',
  automatischVorlesen: true,
  sprechtempo: 1.1,
  stimme: '',
  musikImSpiel: false,
  musikAn: false,
  stimmeAn: false,
});

export const leererBestand = (): Datenbestand => ({
  schema: SCHEMA,
  profile: [],
  einstellungen: standardEinstellungen(),
  paket: { gekauft: false },
});

/* ---------- Prüfung unbekannter Daten (Speicher, Sicherungsdatei) ---------- */

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const zahl = (x: unknown, ersatz: number, min = -Infinity, max = Infinity): number =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : ersatz;
const text = (x: unknown, ersatz = ''): string => (typeof x === 'string' ? x : ersatz);
const bool = (x: unknown, ersatz = false): boolean => (typeof x === 'boolean' ? x : ersatz);
const liste = <T>(x: unknown, element: (y: unknown) => T | undefined): T[] =>
  Array.isArray(x) ? x.map(element).filter((y): y is T => y !== undefined) : [];

function pruefeStand(x: unknown): StufenStand | undefined {
  if (!istObjekt(x)) return undefined;
  return {
    geschafft: bool(x.geschafft),
    rekord: zahl(x.rekord, 0, 0),
    gespielt: zahl(x.gespielt, 0, 0),
    verlauf: liste(x.verlauf, (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)).slice(-10),
  };
}

function pruefeEreignis(x: unknown): Ereignis | undefined {
  if (!istObjekt(x) || typeof x.t !== 'number' || typeof x.kompetenz !== 'string') return undefined;
  return {
    t: x.t,
    bude: text(x.bude),
    kompetenz: x.kompetenz as Ereignis['kompetenz'],
    dimension: (['wissen', 'sicherheit', 'anwendung'].includes(text(x.dimension)) ? x.dimension : 'sicherheit') as Ereignis['dimension'],
    richtig: bool(x.richtig),
    ms: zahl(x.ms, 0, 0),
    fakt: typeof x.fakt === 'string' ? x.fakt : undefined,
    fehlerArt: typeof x.fehlerArt === 'string' ? (x.fehlerArt as Ereignis['fehlerArt']) : undefined,
    ursache: typeof x.ursache === 'string' ? (x.ursache as Ereignis['ursache']) : undefined,
    gewertet: bool(x.gewertet),
  };
}

function pruefeProfil(x: unknown): Profil | undefined {
  if (!istObjekt(x) || typeof x.id !== 'string' || x.id.length === 0) return undefined;
  const name = bereinigeName(text(x.name));
  if (!name) return undefined;
  const figur = FIGUREN.some((f) => f.id === x.figur) ? (x.figur as FigurId) : 'fuchs';
  const fortschritt: Profil['fortschritt'] = {};
  if (istObjekt(x.fortschritt)) {
    for (const [bude, stufen] of Object.entries(x.fortschritt)) {
      if (!istObjekt(stufen)) continue;
      const eintrag: Partial<Record<(typeof STUFEN)[number], StufenStand>> = {};
      for (const s of STUFEN) {
        const st = pruefeStand(stufen[s]);
        if (st) eintrag[s] = st;
      }
      fortschritt[bude] = eintrag;
    }
  }
  const gesehen = istObjekt(x.gesehen) ? x.gesehen : {};
  const deko = liste(x.deko, (d) => (typeof d === 'string' ? d : undefined));
  return {
    id: x.id,
    name,
    figur,
    erstellt: zahl(x.erstellt, 0),
    taler: zahl(x.taler, 0, 0),
    deko,
    aussehen: pruefeAussehen(x.aussehen, deko),
    abzeichen: liste(x.abzeichen, (a): Abzeichen | undefined =>
      istObjekt(a) && typeof a.id === 'string' ? { id: a.id as Abzeichen['id'], bezug: text(a.bezug), am: zahl(a.am, 0) } : undefined,
    ),
    fortschritt,
    ereignisse: liste(x.ereignisse, pruefeEreignis),
    wochen: liste(x.wochen, (w): Wochenwert | undefined =>
      istObjekt(w) && typeof w.woche === 'string'
        ? { woche: w.woche, kompetenz: text(w.kompetenz) as Wochenwert['kompetenz'], richtig: zahl(w.richtig, 0, 0), gesamt: zahl(w.gesamt, 0, 0) }
        : undefined,
    ),
    runden: liste(x.runden, (r): Runde | undefined =>
      istObjekt(r) && typeof r.bude === 'string' && STUFEN.includes(r.stufe as never)
        ? {
            bude: r.bude,
            stufe: r.stufe as Runde['stufe'],
            start: zahl(r.start, 0),
            dauerMs: zahl(r.dauerMs, 0, 0),
            punkte: zahl(r.punkte, 0, 0),
            richtig: zahl(r.richtig, 0, 0),
            gesamt: zahl(r.gesamt, 0, 0),
          }
        : undefined,
    ),
    gesehen: {
      intro: bool(gesehen.intro),
      entdeckungen: liste(gesehen.entdeckungen, (e) => (typeof e === 'string' ? e : undefined)),
      gassen: liste(gesehen.gassen, (e) => (typeof e === 'string' ? e : undefined)),
    },
  };
}

export function pruefeEinstellungen(x: unknown): Einstellungen {
  const s = standardEinstellungen();
  if (!istObjekt(x)) return s;
  return {
    lautMusik: zahl(x.lautMusik, s.lautMusik, 0, 1),
    lautEffekte: zahl(x.lautEffekte, s.lautEffekte, 0, 1),
    lautSprache: zahl(x.lautSprache, s.lautSprache, 0, 1),
    animationenReduziert: bool(x.animationenReduziert, s.animationenReduziert),
    schrift: (['normal', 'gross', 'sehrGross'].includes(text(x.schrift)) ? x.schrift : s.schrift) as Schrift,
    subtraktion: (Object.keys(SUBTRAKTION_NAMEN).includes(text(x.subtraktion)) ? x.subtraktion : s.subtraktion) as Subtraktionsverfahren,
    automatischVorlesen: bool(x.automatischVorlesen, s.automatischVorlesen),
    sprechtempo: zahl(x.sprechtempo, s.sprechtempo, 0.7, 1.6),
    stimme: text(x.stimme, s.stimme).slice(0, 200),
    musikImSpiel: bool(x.musikImSpiel, s.musikImSpiel),
    musikAn: bool(x.musikAn, s.musikAn),
    stimmeAn: bool(x.stimmeAn, s.stimmeAn),
  };
}

/** Prüft einen Bestand aktueller Schema-Version. Ungültige Profile fallen weg, Lücken werden gefüllt. */
export function pruefeBestand(x: unknown): Datenbestand {
  if (!istObjekt(x)) throw new Error('Kein Datenbestand');
  const profile = liste(x.profile, pruefeProfil);
  const eindeutig = profile.filter((p, i) => profile.findIndex((q) => q.id === p.id) === i).slice(0, MAX_PROFILE);
  const aktiv = typeof x.aktiv === 'string' && eindeutig.some((p) => p.id === x.aktiv) ? x.aktiv : undefined;
  const paket = istObjekt(x.paket) ? x.paket : {};
  return {
    schema: SCHEMA,
    profile: eindeutig,
    aktiv,
    einstellungen: pruefeEinstellungen(x.einstellungen),
    paket: { gekauft: bool(paket.gekauft), seit: typeof paket.seit === 'number' ? paket.seit : undefined },
  };
}

/* ---------- Migrationen ---------- */

/**
 * Migration von Version n auf n+1. Jede Änderung am Datenformat bringt hier einen Eintrag mit.
 * Ein Update darf nie Fortschritt oder Rekorde löschen.
 */
export const MIGRATIONEN: Readonly<Record<number, (alt: Record<string, unknown>) => Record<string, unknown>>> = {
  // 0: Entwicklungsstand ohne Schema-Feld (nur Profile) → 1
  0: (alt) => ({ ...alt, schema: 1, einstellungen: alt.einstellungen ?? {}, paket: alt.paket ?? { gekauft: false } }),
  // 1 → 2: Figuren-Baukasten. Wer den Strohhut schon gekauft hatte, trug ihn automatisch – das bleibt so.
  1: (alt) => ({
    ...alt,
    profile: Array.isArray(alt.profile)
      ? alt.profile.map((p: unknown) =>
          istObjekt(p) && p.aussehen === undefined
            ? { ...p, aussehen: { fell: 0, tuch: 'keins', extra: Array.isArray(p.deko) && p.deko.includes('hut') ? 'strohhut' : 'keins' } }
            : p,
        )
      : alt.profile,
  }),
  // 2 → 3: Die Überschlags-Waage wurde zur Gleichgewichts-Waage (Kennung „waage“). Fortschritt und Lernprotokoll ziehen mit um.
  2: (alt) => ({
    ...alt,
    profile: Array.isArray(alt.profile) ? alt.profile.map((p: unknown) => (istObjekt(p) ? benenneBudeUm(p, 'ueberschlagswaage', 'waage') : p)) : alt.profile,
  }),
};

function benenneBudeUm(p: Record<string, unknown>, alt: string, neu: string): Record<string, unknown> {
  const fortschritt = istObjekt(p.fortschritt) ? { ...p.fortschritt } : p.fortschritt;
  if (istObjekt(fortschritt) && alt in fortschritt) {
    fortschritt[neu] = fortschritt[alt];
    delete fortschritt[alt];
  }
  const umbenennen = (x: unknown) => (istObjekt(x) && x.bude === alt ? { ...x, bude: neu } : x);
  return {
    ...p,
    fortschritt,
    ereignisse: Array.isArray(p.ereignisse) ? p.ereignisse.map(umbenennen) : p.ereignisse,
    runden: Array.isArray(p.runden) ? p.runden.map(umbenennen) : p.runden,
  };
}

export function migriere(roh: unknown): Datenbestand {
  if (!istObjekt(roh)) throw new Error('Kein Datenbestand');
  let daten: Record<string, unknown> = { ...roh };
  let version = typeof daten.schema === 'number' ? daten.schema : 0;
  if (version > SCHEMA) throw new Error(`Daten stammen aus einer neueren App-Version (${version})`);
  while (version < SCHEMA) {
    const schritt = MIGRATIONEN[version];
    if (!schritt) throw new Error(`Keine Migration von Version ${version}`);
    daten = schritt(daten);
    version++;
    daten.schema = version;
  }
  return pruefeBestand(daten);
}
