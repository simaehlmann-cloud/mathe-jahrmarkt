import { BUDEN } from '../domain/buden';
import { dartbude } from './dartbude';
import type { BudeDefinition } from './typen';

/** Anmeldung aller spielbaren Buden. Muss zu `spielbar` im Budenregister passen (wird getestet). */
export const BUDEN_DEFINITIONEN: Readonly<Record<string, BudeDefinition>> = {
  dartbude,
};

export function budeDefinition(id: string): BudeDefinition {
  const d = BUDEN_DEFINITIONEN[id];
  if (!d) throw new Error(`Bude ${id} ist noch nicht gebaut`);
  return d;
}

export const spielbareIds = (): string[] => BUDEN.filter((b) => b.spielbar).map((b) => b.id);
