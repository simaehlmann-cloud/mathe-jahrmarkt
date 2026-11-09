import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheZahlenstrahl, zahlenstrahlAufgabe, zahlenstrahlProbe } from '../../domain/aufgaben/zahlenstrahl';
import type { BudeDefinition } from '../typen';
import HilfeZahlenstrahl from './HilfeZahlenstrahl.svelte';
import { erstelleSeilbahnSzene } from './szene';

export const seilbahn: BudeDefinition = {
  id: 'seilbahn',
  erstelleSzene: erstelleSeilbahnSzene,
  erzeuge: zahlenstrahlAufgabe,
  aehnlich: aehnlicheZahlenstrahl,
  probe: zahlenstrahlProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeZahlenstrahl,
  ladetext: 'Die Seilbahn wird gespannt …',
  anleitung: 'Ziehe die Gondel am Seil an die richtige Stelle und tippe auf „Hier halten!“. Manchmal hält die Gondel schon, dann tippst du die passende Zahl an.',
};
