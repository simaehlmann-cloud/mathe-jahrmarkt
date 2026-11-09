import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { RELATION, aehnlicheGleichheit, gleichheitAufgabe, gleichheitProbe } from '../../domain/aufgaben/gleichheit';
import type { BudeDefinition } from '../typen';
import HilfeGleichheit from './HilfeGleichheit.svelte';
import { erstelleWaageSzene } from './szene';

export const waage: BudeDefinition = {
  id: 'waage',
  erstelleSzene: erstelleWaageSzene,
  erzeuge: gleichheitAufgabe,
  aehnlich: aehnlicheGleichheit,
  probe: gleichheitProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeGleichheit,
  ladetext: 'Die Waage wird ausgerichtet …',
  anleitung: 'Die Waage ist nur im Gleichgewicht, wenn beide Seiten genau gleich viel sind. Lege das passende Gewicht auf, oder entscheide: kleiner, gleich oder größer?',
  antwortText: (w) => RELATION[w] ?? String(w),
};
