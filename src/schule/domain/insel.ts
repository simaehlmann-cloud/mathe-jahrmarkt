/**
 * Bauinsel und Bauplatz im Unterricht (Schulversion). Die Lehrkraft wählt:
 * frei, nach jeder gespielten Runde an einer Bude für 10 Minuten, oder geschlossen.
 * Abgeleitet aus den gespeicherten Runden – kein eigener Zähler, der verloren gehen könnte.
 */
import type { Profil } from '../../domain/profil';
import { INSEL_MINUTEN, type InselRegel } from './schuldaten';

export type InselZugang = { offen: true; bisMs: number | null } | { offen: false; grund: string };

/** Ende der letzten gespielten Runde (ms) oder 0. */
export const letzteRundeEnde = (p: Pick<Profil, 'runden'>): number => p.runden.reduce((m, r) => Math.max(m, r.start + r.dauerMs), 0);

export function inselZugang(regel: InselRegel, p: Pick<Profil, 'runden'>, jetzt: number): InselZugang {
  if (regel === 'frei') return { offen: true, bisMs: null };
  if (regel === 'aus') return { offen: false, grund: 'Die Bauinsel ist gerade geschlossen. Deine Lehrkraft hat sie für den Unterricht ausgeschaltet.' };
  const ende = letzteRundeEnde(p);
  const bis = ende + INSEL_MINUTEN * 60_000;
  // Noch keine Runde gespielt: zu. Eine Runde aus der Zukunft (falsch gestellte Uhr) öffnet nichts.
  if (ende > 0 && ende <= jetzt && bis > jetzt) return { offen: true, bisMs: bis };
  return { offen: false, grund: `Spiel erst eine Runde an einer Bude – danach ist die Bauinsel ${INSEL_MINUTEN} Minuten für dich offen.` };
}

export const INSEL_REGEL_TEXT: Readonly<Record<InselRegel, string>> = {
  frei: 'Immer offen',
  nachRunde: `Nach jeder gespielten Runde ${INSEL_MINUTEN} Minuten`,
  aus: 'Geschlossen',
};
