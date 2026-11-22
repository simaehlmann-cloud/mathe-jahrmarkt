/**
 * Prüfung der Schuldaten (Schulversion). Wird beim Import dieser Datei bei services/datenbestand.ts angemeldet;
 * die Familien-App importiert sie nie und lässt ein Feld `schule` deshalb weg.
 */
import { STUFEN, type Stufe } from '../../domain/buden';
import { profilGrenze, type Profil } from '../../domain/profil';
import { bool, istObjekt, liste, neueKennung, pruefeProfil, setzeSchulPruefung, text, zahl } from '../../services/datenbestand';
import { passwortGueltig } from './bildpasswort';
import {
  INSEL_REGELN,
  KENNUNG,
  MAX_AUFTRAEGE,
  MAX_GERAETENAME,
  MAX_KLASSEN,
  MAX_KLASSENNAME,
  MAX_SAMMLUNGEN,
  bereinigeText,
  leereSchule,
  type ErgebnisProfil,
  type Geheimnis,
  type InselRegel,
  type Klasse,
  type LehrerAuftrag,
  type Sammlung,
  type SchulDaten,
} from './schuldaten';

function pruefeGeheimnis(x: unknown): Geheimnis | null {
  if (!istObjekt(x) || typeof x.hash !== 'string' || typeof x.salz !== 'string' || !x.hash || !x.salz) return null;
  return { hash: x.hash, salz: x.salz, iter: zahl(x.iter, 0, 1, 10_000_000) };
}

export function pruefeKlassen(x: unknown): Klasse[] {
  const klassen = liste(x, (k): Klasse | undefined => {
    if (!istObjekt(k) || typeof k.id !== 'string' || !KENNUNG.test(k.id)) return undefined;
    const name = bereinigeText(text(k.name), MAX_KLASSENNAME);
    return name ? { id: k.id, name, ...(k.ohnePasswort === true ? { ohnePasswort: true } : {}) } : undefined;
  });
  return klassen.filter((k, i) => klassen.findIndex((q) => q.id === k.id) === i).slice(0, MAX_KLASSEN);
}

export function pruefeAuftraege(x: unknown, klassen: readonly Klasse[]): LehrerAuftrag[] {
  const ids = new Set(klassen.map((k) => k.id));
  const aus = liste(x, (a): LehrerAuftrag | undefined => {
    if (!istObjekt(a) || typeof a.id !== 'string' || !KENNUNG.test(a.id) || typeof a.klasse !== 'string' || !ids.has(a.klasse)) return undefined;
    const fuer = Array.isArray(a.fuer) ? a.fuer.filter((f): f is string => typeof f === 'string' && KENNUNG.test(f)).slice(0, profilGrenze(true)) : null;
    if (fuer !== null && fuer.length === 0) return undefined;
    const z = istObjekt(a.ziel) ? a.ziel : {};
    let ziel: LehrerAuftrag['ziel'];
    if (z.art === 'check') ziel = { art: 'check' };
    else if (z.art === 'bude' && typeof z.bude === 'string' && /^[a-z0-9-]{1,40}$/i.test(z.bude)) {
      ziel = { art: 'bude', bude: z.bude, stufe: STUFEN.includes(z.stufe as Stufe) ? (z.stufe as Stufe) : null };
    } else return undefined;
    return { id: a.id, klasse: a.klasse, fuer, ziel, erstellt: zahl(a.erstellt, 0, 0) };
  });
  return aus.filter((a, i) => aus.findIndex((q) => q.id === a.id) === i).slice(-MAX_AUFTRAEGE);
}

/** Eingesammeltes Profil: dieselben Prüfungen wie ein eigenes Profil, dann nur die Felder für die Auswertung. */
export function pruefeErgebnisProfil(x: unknown): ErgebnisProfil | undefined {
  if (!istObjekt(x) || typeof x.id !== 'string' || !KENNUNG.test(x.id)) return undefined;
  const p = pruefeProfil(x);
  if (!p) return undefined;
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

export function pruefeSammlung(x: unknown): Sammlung | undefined {
  if (!istObjekt(x) || typeof x.geraetId !== 'string' || !KENNUNG.test(x.geraetId)) return undefined;
  const profile = liste(x.profile, pruefeErgebnisProfil);
  return {
    geraetId: x.geraetId,
    geraetName: bereinigeText(text(x.geraetName), MAX_GERAETENAME),
    erstellt: zahl(x.erstellt, 0, 0),
    eingesammelt: zahl(x.eingesammelt, 0, 0),
    klassen: pruefeKlassen(x.klassen),
    profile: profile.filter((p, i) => profile.findIndex((q) => q.id === p.id) === i).slice(0, profilGrenze(true)),
  };
}

export function pruefeSchule(x: unknown, ersatzGeraetId: string): SchulDaten {
  const leer = leereSchule(ersatzGeraetId);
  if (!istObjekt(x)) return leer;
  const geraet = istObjekt(x.geraet) ? x.geraet : {};
  const sperre = istObjekt(x.sperre) ? x.sperre : {};
  const gesammelt = liste(x.gesammelt, pruefeSammlung);
  const klassen = pruefeKlassen(x.klassen);
  return {
    pin: pruefeGeheimnis(x.pin),
    rettung: pruefeGeheimnis(x.rettung),
    sperre: { fehl: zahl(sperre.fehl, 0, 0, 1000), bis: zahl(sperre.bis, 0, 0) },
    klassen,
    geraet: {
      id: typeof geraet.id === 'string' && KENNUNG.test(geraet.id) ? geraet.id : leer.geraet.id,
      name: bereinigeText(text(geraet.name), MAX_GERAETENAME),
    },
    bestenliste: bool(x.bestenliste),
    bauinsel: INSEL_REGELN.includes(x.bauinsel as InselRegel) ? (x.bauinsel as InselRegel) : leer.bauinsel,
    auftraege: pruefeAuftraege(x.auftraege, klassen),
    gesammelt: gesammelt.filter((g, i) => gesammelt.findIndex((q) => q.geraetId === g.geraetId) === i).slice(-MAX_SAMMLUNGEN),
  };
}

/** Profile passend zu den Schuldaten: unbekannte Klasse und unbekannte Bildsymbole fallen weg. */
function profileZurSchule(profile: Profil[], s: SchulDaten): Profil[] {
  const ids = new Set(s.klassen.map((k) => k.id));
  return profile.map((p) => {
    let q = p;
    if (q.klasse !== undefined && !ids.has(q.klasse)) {
      const { klasse: _weg, ...rest } = q;
      q = rest;
    }
    if (q.passwort !== undefined && !passwortGueltig(q.passwort)) {
      const { passwort: _weg, ...rest } = q;
      q = rest;
    }
    return q;
  });
}

setzeSchulPruefung((roh, profile) => {
  const schule = pruefeSchule(roh, neueKennung('g'));
  return { schule, profile: profileZurSchule(profile, schule) };
});
