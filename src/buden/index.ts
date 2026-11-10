import { BUDEN } from '../domain/buden';
import { dartbude } from './dartbude';
import { dosenwerfen } from './dosenwerfen';
import { fehlerdetektiv } from './detektiv';
import { rechendomino } from './domino';
import { formensortierer, labyrinth, spiegelkabinett, wuerfelnetz, zeltdekorateur } from './spiegelzelt';
import { achterbahn, kasse, schaetzbude, uhrkarussell, umrechnungsmemory } from './groessenmarkt';
import { diagrammreporter, murmellabor, rechenmauer, riesenradtechniker, zahlenfolgenzug } from './musterbahn';
import { geisterbahn, hauDenLukas, pizzabaeckerei } from './sternenmarkt';
import { seilbahn } from './seilbahn';
import { gluecksrad, lageplan, wuerfelbauer } from './erkunden';
import { einmaleinsTurbo } from './turbo';
import { zahlenraetselTresor } from './tresor';
import { waage } from './waage';
import { rechenwerkstatt } from './werkstatt';
import type { BudeDefinition } from './typen';

/** Anmeldung aller spielbaren Buden. Muss zu `spielbar` im Budenregister passen (wird getestet). */
export const BUDEN_DEFINITIONEN: Readonly<Record<string, BudeDefinition>> = {
  dartbude,
  'einmaleins-turbo': einmaleinsTurbo,
  dosenwerfen,
  seilbahn,
  waage,
  rechendomino,
  rechenwerkstatt,
  fehlerdetektiv,
  tresor: zahlenraetselTresor,
  kasse,
  schaetzbude,
  uhrkarussell,
  umrechnungsmemory,
  achterbahn,
  spiegelkabinett,
  wuerfelnetz,
  labyrinth,
  formensortierer,
  zeltdekorateur,
  zahlenfolgenzug,
  rechenmauer,
  riesenradtechniker,
  murmellabor,
  diagrammreporter,
  geisterbahn,
  pizzabaeckerei,
  hauDenLukas,
  wuerfelbauer,
  lageplan,
  gluecksrad,
};

export function budeDefinition(id: string): BudeDefinition {
  const d = BUDEN_DEFINITIONEN[id];
  if (!d) throw new Error(`Bude ${id} ist noch nicht gebaut`);
  return d;
}

export const spielbareIds = (): string[] => BUDEN.filter((b) => b.spielbar).map((b) => b.id);
