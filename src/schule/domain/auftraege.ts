/**
 * Aufträge der Lehrkraft (Schulversion): an eine ganze Klasse oder einzelne Kinder, für eine Bude (optional mit Stufe)
 * oder den Jahrmarkt-Check. Erledigt ist ein Auftrag, sobald das Kind nach dem Erteilen eine passende Runde gespielt
 * bzw. den Check gemacht hat – abgeleitet aus Runden und Check, also auch aus eingesammelten Ergebnissen.
 */
import { BUDEN, STUFEN_NAME, type Stufe } from '../../domain/buden';
import type { Profil } from '../../domain/profil';
import type { Datenbestand } from '../../services/datenbestand';
import type { KindAuftrag } from '../../app/schulschnittstelle';
import { MAX_AUFTRAEGE, type LehrerAuftrag, type SchulDaten } from './schuldaten';

type Spielstand = Pick<Profil, 'id' | 'klasse' | 'runden' | 'check' | 'checkVerlauf'>;

export const budeName = (id: string): string => BUDEN.find((b) => b.id === id)?.name ?? id;

export function auftragText(a: LehrerAuftrag): string {
  if (a.ziel.art === 'check') return 'Jahrmarkt-Check';
  return a.ziel.stufe ? `${budeName(a.ziel.bude)}, ${STUFEN_NAME[a.ziel.stufe]}` : budeName(a.ziel.bude);
}

export const giltFuer = (a: LehrerAuftrag, p: Pick<Profil, 'id' | 'klasse'>): boolean => (a.fuer ? a.fuer.includes(p.id) : p.klasse === a.klasse);

export function auftragErledigt(a: LehrerAuftrag, p: Spielstand): boolean {
  if (a.ziel.art === 'check') return [p.check, ...(p.checkVerlauf ?? [])].some((c) => !!c && c.am >= a.erstellt);
  const z = a.ziel;
  return p.runden.some((r) => r.bude === z.bude && r.start >= a.erstellt && (z.stufe === null || r.stufe === z.stufe));
}

/** Aufträge für ein Kind, offene zuerst, dann die neuesten. */
export function auftraegeFuer(b: Datenbestand, p: Profil): KindAuftrag[] {
  const liste = (b.schule?.auftraege ?? []).filter((a) => giltFuer(a, p));
  return liste
    .map((a) => ({
      id: a.id,
      bude: a.ziel.art === 'bude' ? a.ziel.bude : null,
      stufe: a.ziel.art === 'bude' ? a.ziel.stufe : null,
      erledigt: auftragErledigt(a, p),
      text: auftragText(a),
      erstellt: a.erstellt,
    }))
    .sort((x, y) => Number(x.erledigt) - Number(y.erledigt) || y.erstellt - x.erstellt)
    .map(({ erstellt: _e, ...k }) => k);
}

/** Stand eines Auftrags in der Klasse: wer ihn hat und wer ihn erledigt hat. */
export function auftragStand(a: LehrerAuftrag, kinder: readonly (Spielstand & { name: string })[]): { kinder: { name: string; erledigt: boolean }[]; erledigt: number } {
  const betroffen = kinder.filter((k) => giltFuer(a, k)).map((k) => ({ name: k.name, erledigt: auftragErledigt(a, k) }));
  return { kinder: betroffen, erledigt: betroffen.filter((k) => k.erledigt).length };
}

export class AuftragsFehler extends Error {}

export function auftragAnlegen(
  s: SchulDaten,
  a: { id: string; klasse: string; fuer: string[] | null; bude: string | null; stufe: Stufe | null },
  jetzt: number,
): SchulDaten {
  if (!s.klassen.some((k) => k.id === a.klasse)) throw new AuftragsFehler('Diese Klasse gibt es nicht mehr.');
  if (a.fuer !== null && a.fuer.length === 0) throw new AuftragsFehler('Bitte mindestens ein Kind wählen.');
  if (a.bude !== null && !BUDEN.some((x) => x.id === a.bude && x.spielbar)) throw new AuftragsFehler('Diese Bude gibt es nicht.');
  const neu: LehrerAuftrag = {
    id: a.id,
    klasse: a.klasse,
    fuer: a.fuer ? [...new Set(a.fuer)] : null,
    ziel: a.bude === null ? { art: 'check' } : { art: 'bude', bude: a.bude, stufe: a.stufe },
    erstellt: jetzt,
  };
  return { ...s, auftraege: [...s.auftraege, neu].slice(-MAX_AUFTRAEGE) };
}

export const auftragEntfernen = (s: SchulDaten, id: string): SchulDaten => ({ ...s, auftraege: s.auftraege.filter((a) => a.id !== id) });
