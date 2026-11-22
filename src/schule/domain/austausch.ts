/**
 * Austausch zwischen Schul-iPads ohne Server (Schulversion):
 * - Klassenliste verteilen: Klassen, Namen und Bildpasswörter von einem iPad auf die anderen.
 * - Ergebnisse einsammeln: Jedes iPad gibt die Ergebnisse seiner Kinder weiter, das Lehrer-iPad wertet sie gemeinsam aus.
 *
 * Hier stehen nur die Inhalte und das Zusammenführen (rein, testbar). Verschlüsseln und Teilen: services/schulkrypto.ts
 * und services/schuldateien.ts.
 */
import { pruefeEinstellungen, SUBTRAKTION_NAMEN, type Datenbestand, type Einstellungen, type Subtraktionsverfahren } from '../../services/datenbestand';
import { pruefeAuftraege, pruefeKlassen, pruefeSammlung } from './pruefen';
import { pruefeAussehen, type Aussehen } from '../../domain/aussehen';
import { FIGUREN, bereinigeName, neuesProfil, profilGrenze, type FigurId, type Profil } from '../../domain/profil';
import { SPIELZEIT_OPTIONEN } from '../../domain/spielzeit';
import { passwortGueltig } from './bildpasswort';
import { INSEL_REGELN, KENNUNG, MAX_AUFTRAEGE, MAX_KLASSEN, MAX_SAMMLUNGEN, type ErgebnisProfil, type InselRegel, type Klasse, type LehrerAuftrag, type Sammlung } from './schuldaten';

export const TYP_KLASSENLISTE = 'klassenliste';
export const TYP_ERGEBNISSE = 'ergebnisse';

/* ---------- Klassenliste ---------- */

export interface ListenProfil {
  id: string;
  name: string;
  klasse: string;
  passwort: string[];
  figur: FigurId;
  aussehen: Aussehen;
  figurGewaehlt: boolean;
}

export interface Klassenliste {
  klassen: Klasse[];
  profile: ListenProfil[];
  einstellungen: { subtraktion: Subtraktionsverfahren; spielzeitMin: number; bestenliste: boolean; bauinsel: InselRegel };
  /** Aufträge der Lehrkraft für diese Klassen. */
  auftraege: LehrerAuftrag[];
}

/** Klassenliste der gewählten Klassen (Namen, Passwörter, Figuren – kein Fortschritt). */
export function klassenlisteErstellen(b: Datenbestand, klassenIds: readonly string[]): Klassenliste {
  const s = b.schule;
  if (!s) throw new Error('Nur in der Schulversion möglich.');
  const welche = new Set(klassenIds);
  const klassen = s.klassen.filter((k) => welche.has(k.id));
  return {
    klassen,
    profile: b.profile
      .filter((p): p is Profil & { klasse: string; passwort: string[] } => p.klasse !== undefined && welche.has(p.klasse) && !!p.passwort)
      .map((p) => ({ id: p.id, name: p.name, klasse: p.klasse, passwort: [...p.passwort], figur: p.figur, aussehen: { ...p.aussehen }, figurGewaehlt: p.figurGewaehlt === true })),
    einstellungen: { subtraktion: b.einstellungen.subtraktion, spielzeitMin: b.einstellungen.spielzeitMin, bestenliste: s.bestenliste, bauinsel: s.bauinsel },
    auftraege: s.auftraege.filter((a) => welche.has(a.klasse)),
  };
}

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Prüft eine Klassenliste aus einer fremden Datei. Wirft, wenn sie unbrauchbar ist. */
export function pruefeKlassenliste(x: unknown): Klassenliste {
  if (!istObjekt(x) || !Array.isArray(x.klassen) || !Array.isArray(x.profile)) throw new Error('Die Klassenliste ist beschädigt.');
  const klassen = pruefeKlassen(x.klassen);
  const ids = new Set(klassen.map((k) => k.id));
  const profile: ListenProfil[] = [];
  for (const p of x.profile) {
    if (!istObjekt(p) || typeof p.id !== 'string' || !KENNUNG.test(p.id) || typeof p.klasse !== 'string' || !ids.has(p.klasse)) continue;
    const name = bereinigeName(typeof p.name === 'string' ? p.name : '');
    if (!name || !passwortGueltig(p.passwort) || profile.some((q) => q.id === p.id)) continue;
    const figur = FIGUREN.some((f) => f.id === p.figur) ? (p.figur as FigurId) : 'mensch';
    profile.push({ id: p.id, name, klasse: p.klasse, passwort: [...p.passwort], figur, aussehen: pruefeAussehen(p.aussehen, []), figurGewaehlt: p.figurGewaehlt === true });
  }
  const e = istObjekt(x.einstellungen) ? x.einstellungen : {};
  const standard = pruefeEinstellungen({});
  return {
    klassen: klassen.slice(0, MAX_KLASSEN),
    profile: profile.slice(0, profilGrenze(true)),
    einstellungen: {
      subtraktion: typeof e.subtraktion === 'string' && e.subtraktion in SUBTRAKTION_NAMEN ? (e.subtraktion as Subtraktionsverfahren) : standard.subtraktion,
      spielzeitMin: (SPIELZEIT_OPTIONEN as readonly number[]).includes(e.spielzeitMin as number) ? (e.spielzeitMin as number) : standard.spielzeitMin,
      bestenliste: e.bestenliste === true,
      bauinsel: INSEL_REGELN.includes(e.bauinsel as InselRegel) ? (e.bauinsel as InselRegel) : 'nachRunde',
    },
    auftraege: pruefeAuftraege(x.auftraege, klassen),
  };
}

export interface Listenergebnis {
  bestand: Datenbestand;
  neu: number;
  aktualisiert: number;
  /** Kein Platz mehr auf diesem Gerät. */
  uebersprungen: string[];
  klassenNeu: number;
}

const gleicherName = (a: string, b: string): boolean => a.toLocaleLowerCase('de').replace(/\s/g, '') === b.toLocaleLowerCase('de').replace(/\s/g, '');

/**
 * Übernimmt eine Klassenliste. Fortschritt auf diesem Gerät bleibt immer erhalten.
 * - Klassen: gleiche Kennung oder gleicher Name gelten als dieselbe Klasse.
 * - Kinder: gleiche Kennung, sonst gleicher Name in derselben Klasse. Name, Klasse und Bildpasswort kommen aus der Liste;
 *   die Kennung auch, damit die Ergebnisse später auf allen Geräten zusammenpassen.
 * - Die Figur kommt nur aus der Liste, wenn das Kind sie hier noch nicht gestaltet hat.
 * - Kinder, die nicht in der Liste stehen, bleiben unverändert.
 */
export function klassenlisteUebernehmen(b: Datenbestand, liste: Klassenliste, jetzt: number): Listenergebnis {
  const s = b.schule;
  if (!s) throw new Error('Nur in der Schulversion möglich.');
  let klassen = [...s.klassen];
  /** Kennung der Klasse in der Liste → Kennung hier */
  const klasseHier = new Map<string, string>();
  let klassenNeu = 0;
  for (const k of liste.klassen) {
    const gleich = klassen.find((q) => q.id === k.id) ?? klassen.find((q) => gleicherName(q.name, k.name));
    if (gleich) {
      klasseHier.set(k.id, gleich.id);
      const name = gleich.id === k.id && gleich.name !== k.name && !klassen.some((q) => q.id !== k.id && gleicherName(q.name, k.name)) ? k.name : gleich.name;
      // Name (bei gleicher Kennung) und „ohne Passwort“ kommen aus der Liste
      klassen = klassen.map((q) => (q.id === gleich.id ? { id: q.id, name, ...(k.ohnePasswort ? { ohnePasswort: true } : {}) } : q));
    } else if (klassen.length < MAX_KLASSEN) {
      klassen.push({ ...k });
      klasseHier.set(k.id, k.id);
      klassenNeu++;
    }
  }

  let profile = [...b.profile];
  const listenIds = new Set(liste.profile.map((p) => p.id));
  let neu = 0;
  let aktualisiert = 0;
  const uebersprungen: string[] = [];
  for (const lp of liste.profile) {
    const klasse = klasseHier.get(lp.klasse);
    if (!klasse) {
      uebersprungen.push(lp.name);
      continue;
    }
    let i = profile.findIndex((p) => p.id === lp.id);
    // Gleicher Name in derselben Klasse, aber andere Kennung (auf zwei Geräten getrennt angelegt): zusammenlegen
    if (i < 0) i = profile.findIndex((p) => p.klasse === klasse && !listenIds.has(p.id) && gleicherName(p.name, lp.name));
    if (i >= 0) {
      const alt = profile[i] as Profil;
      const figurAusListe = alt.figurGewaehlt !== true && lp.figurGewaehlt;
      const neuP: Profil = {
        ...alt,
        id: lp.id,
        name: lp.name,
        klasse,
        passwort: [...lp.passwort],
        ...(figurAusListe ? { figur: lp.figur, aussehen: { ...lp.aussehen }, figurGewaehlt: true } : {}),
      };
      profile = profile.map((p, j) => (j === i ? neuP : p));
      aktualisiert++;
    } else if (profile.length < profilGrenze(true)) {
      profile.push({ ...neuesProfil(lp.id, lp.name, lp.figur, jetzt), aussehen: { ...lp.aussehen }, klasse, passwort: [...lp.passwort], figurGewaehlt: lp.figurGewaehlt });
      neu++;
    } else {
      uebersprungen.push(lp.name);
    }
  }
  const e = liste.einstellungen;
  const einstellungen: Einstellungen = { ...b.einstellungen, subtraktion: e.subtraktion, spielzeitMin: e.spielzeitMin };
  return {
    bestand: {
      ...b,
      profile,
      einstellungen,
      schule: { ...s, klassen, bestenliste: e.bestenliste, bauinsel: e.bauinsel, auftraege: mischeAuftraege(s.auftraege, liste.auftraege, klasseHier) },
      aktiv: profile.some((p) => p.id === b.aktiv) ? b.aktiv : undefined,
    },
    neu,
    aktualisiert,
    uebersprungen,
    klassenNeu,
  };
}

/**
 * Aufträge aus der Liste übernehmen: Die Liste gilt für ihre Klassen vollständig (auch gelöschte Aufträge
 * verschwinden hier); Aufträge anderer Klassen bleiben unverändert.
 */
function mischeAuftraege(hier: readonly LehrerAuftrag[], aus: readonly LehrerAuftrag[], klasseHier: ReadonlyMap<string, string>): LehrerAuftrag[] {
  const betroffen = new Set(klasseHier.values());
  const neu = aus.flatMap((a) => {
    const k = klasseHier.get(a.klasse);
    return k ? [{ ...a, klasse: k }] : [];
  });
  return [...hier.filter((a) => !betroffen.has(a.klasse)), ...neu].slice(-MAX_AUFTRAEGE);
}

/* ---------- Ergebnisse ---------- */

export type Ergebnisse = Omit<Sammlung, 'eingesammelt'>;

export function ergebnisProfil(p: Profil): ErgebnisProfil {
  return {
    id: p.id,
    name: p.name,
    figur: p.figur,
    aussehen: p.aussehen,
    fortschritt: p.fortschritt,
    ereignisse: p.ereignisse,
    wochen: p.wochen,
    runden: p.runden,
    check: p.check,
    ...(p.klasse !== undefined ? { klasse: p.klasse } : {}),
    ...(p.checkVerlauf !== undefined ? { checkVerlauf: p.checkVerlauf } : {}),
  };
}

/** Ergebnisse aller Kinder dieses Geräts zum Weitergeben an das Lehrer-iPad. */
export function ergebnisseErstellen(b: Datenbestand, jetzt: number): Ergebnisse {
  const s = b.schule;
  if (!s) throw new Error('Nur in der Schulversion möglich.');
  return { geraetId: s.geraet.id, geraetName: s.geraet.name, erstellt: jetzt, klassen: s.klassen, profile: b.profile.map(ergebnisProfil) };
}

export interface Sammelergebnis {
  bestand: Datenbestand;
  kinder: number;
  /** Von diesem Gerät gab es schon Ergebnisse; sie wurden ersetzt. */
  ersetzt: boolean;
}

/** Ergebnisse eines anderen Geräts einsammeln. Wirft bei eigenen oder älteren Ergebnissen. */
export function ergebnisseEinsammeln(b: Datenbestand, roh: unknown, jetzt: number): Sammelergebnis {
  const s = b.schule;
  if (!s) throw new Error('Nur in der Schulversion möglich.');
  const sammlung = pruefeSammlung(istObjekt(roh) ? { ...roh, eingesammelt: jetzt } : roh);
  if (!sammlung) throw new Error('Die Ergebnisse sind beschädigt.');
  if (sammlung.geraetId === s.geraet.id) throw new Error('Das sind die Ergebnisse dieses iPads – sie sind hier schon enthalten.');
  const alt = s.gesammelt.find((g) => g.geraetId === sammlung.geraetId);
  if (alt && alt.erstellt > sammlung.erstellt) {
    throw new Error(`Von ${alt.geraetName || 'diesem iPad'} liegen schon neuere Ergebnisse vor.`);
  }
  const gesammelt = [...s.gesammelt.filter((g) => g.geraetId !== sammlung.geraetId), sammlung].slice(-MAX_SAMMLUNGEN);
  return { bestand: { ...b, schule: { ...s, gesammelt } }, kinder: sammlung.profile.length, ersetzt: !!alt };
}

export function sammlungEntfernen(b: Datenbestand, geraetId: string): Datenbestand {
  const s = b.schule;
  if (!s) return b;
  return { ...b, schule: { ...s, gesammelt: s.gesammelt.filter((g) => g.geraetId !== geraetId) } };
}
