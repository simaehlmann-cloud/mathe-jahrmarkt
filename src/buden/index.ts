import { BUDEN } from '../domain/buden';
import { dartbude } from './dartbude';
import { dosenwerfen } from './dosenwerfen';
import { rechendomino } from './domino';
import { seilbahn } from './seilbahn';
import { einmaleinsTurbo } from './turbo';
import { waage } from './waage';
import type { BudeDefinition } from './typen';

/** Anmeldung aller spielbaren Buden. Muss zu `spielbar` im Budenregister passen (wird getestet). */
export const BUDEN_DEFINITIONEN: Readonly<Record<string, BudeDefinition>> = {
  dartbude,
  'einmaleins-turbo': einmaleinsTurbo,
  dosenwerfen,
  seilbahn,
  waage,
  rechendomino,
};

export function budeDefinition(id: string): BudeDefinition {
  const d = BUDEN_DEFINITIONEN[id];
  if (!d) throw new Error(`Bude ${id} ist noch nicht gebaut`);
  return d;
}

export const spielbareIds = (): string[] => BUDEN.filter((b) => b.spielbar).map((b) => b.id);
