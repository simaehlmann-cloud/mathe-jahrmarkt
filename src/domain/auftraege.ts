import { BUDEN, GASSEN, STUFEN, budeInfo, type Stufe } from './buden';
import { istGeschafft } from './fortschritt/fortschritt';
import { stufeFreigabe } from './fortschritt/kaufgrenze';
import type { Profil, Runde } from './profil';
import { createRng } from './rng';

/**
 * Tagesaufträge: Jeden Tag drei Aufträge quer durch die Gassen. Das verteilt das Üben über die Themen
 * (verteiltes Wiederholen) und gibt einen kurzen, klaren Grund zum Spielen.
 * Erledigt ist ein Auftrag mit einer Runde an der Bude, in der mindestens 7 Antworten beim ersten Versuch stimmen.
 */
export interface Tagesauftrag {
  bude: string;
  stufe: Stufe;
  erledigt: boolean;
}
export interface AuftragsTag {
  tag: string;
  liste: Tagesauftrag[];
  /** Bonus für alle drei schon vergeben? */
  bonus: boolean;
}

export const AUFTRAG_RICHTIG = 7;
export const AUFTRAG_TALER = 15;
export const AUFTRAG_BLOECKE = 10;
export const BONUS_BLOECKE = 20;

/** Kalendertag in Ortszeit als „JJJJ-MM-TT“. */
export function tagKennung(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hash(t: string): number {
  let h = 2166136261;
  for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Stufe für einen Auftrag: die erste freie, noch nicht geschaffte; sonst die höchste freie. */
export function auftragsStufe(p: Profil, bude: string, paket: boolean): Stufe | undefined {
  const frei = STUFEN.filter((s) => stufeFreigabe(p, bude, s, paket).frei);
  return frei.find((s) => !istGeschafft(p, bude, s)) ?? frei[frei.length - 1];
}

export function neueAuftraege(p: Profil, paket: boolean, tag: string, empfehlung: readonly string[] = []): AuftragsTag {
  const rng = createRng(hash(`${tag}:${p.id}`));
  const offen = BUDEN.filter((b) => auftragsStufe(p, b.id, paket) !== undefined).map((b) => b.id);
  const gewaehlt: string[] = [];
  const nimm = (kandidaten: readonly string[]): void => {
    const rest = kandidaten.filter((k) => offen.includes(k) && !gewaehlt.includes(k));
    // Möglichst aus einer Gasse, die noch nicht dran ist
    const gassen = new Set(gewaehlt.map((g) => budeInfo(g).gasse));
    const neueGasse = rest.filter((k) => !gassen.has(budeInfo(k).gasse));
    const auswahl = neueGasse.length ? neueGasse : rest;
    if (auswahl.length) gewaehlt.push(rng.pick(auswahl));
  };
  // 1. Empfehlung aus dem Jahrmarkt-Check, 2. angefangene Bude, 3. etwas Neues
  nimm(empfehlung);
  nimm(offen.filter((id) => (p.fortschritt[id] && Object.values(p.fortschritt[id] ?? {}).some((s) => s && s.gespielt > 0)) && !istGeschafft(p, id, 'bronze')));
  nimm(offen.filter((id) => !p.fortschritt[id]));
  while (gewaehlt.length < 3 && gewaehlt.length < offen.length) nimm(offen);
  return {
    tag,
    liste: gewaehlt.map((bude) => ({ bude, stufe: auftragsStufe(p, bude, paket) ?? 'bronze', erledigt: false })),
    bonus: false,
  };
}

/** Aufträge des Tages: vorhandene behalten, am neuen Tag neue würfeln. */
export const auftraegeFuerTag = (p: Profil, paket: boolean, tag: string, empfehlung: readonly string[] = []): AuftragsTag =>
  p.auftraege && p.auftraege.tag === tag ? p.auftraege : neueAuftraege(p, paket, tag, empfehlung);

export interface AuftragsErgebnis {
  stand: AuftragsTag;
  /** Neu erledigte Aufträge in dieser Runde. */
  neu: Tagesauftrag[];
  /** Mit dieser Runde alle drei erledigt. */
  bonus: boolean;
}

export function auftragPruefen(stand: AuftragsTag | null, r: Pick<Runde, 'bude' | 'stufe' | 'richtig'>, tag: string): AuftragsErgebnis | null {
  if (!stand || stand.tag !== tag) return null;
  const neu: Tagesauftrag[] = [];
  const liste = stand.liste.map((a) => {
    const passt = a.bude === r.bude && !a.erledigt && STUFEN.indexOf(r.stufe) >= STUFEN.indexOf(a.stufe) && r.richtig >= AUFTRAG_RICHTIG;
    if (!passt) return a;
    const e = { ...a, erledigt: true };
    neu.push(e);
    return e;
  });
  const alle = liste.length > 0 && liste.every((a) => a.erledigt);
  const bonus = alle && !stand.bonus;
  return { stand: { ...stand, liste, bonus: stand.bonus || alle }, neu, bonus };
}

export function pruefeAuftraege(x: unknown): AuftragsTag | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (typeof o.tag !== 'string' || !Array.isArray(o.liste)) return null;
  const liste = o.liste
    .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
    .filter((a) => typeof a.bude === 'string' && BUDEN.some((b) => b.id === a.bude) && STUFEN.includes(a.stufe as Stufe))
    .map((a) => ({ bude: a.bude as string, stufe: a.stufe as Stufe, erledigt: a.erledigt === true }))
    .slice(0, 3);
  return { tag: o.tag, liste, bonus: o.bonus === true };
}

export const gasseFarbe = (bude: string): string => GASSEN.find((g) => g.id === budeInfo(bude).gasse)?.farbe ?? '#3c78d8';
