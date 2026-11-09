import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheHalbschriftlich, halbschriftlichAufgabe, halbschriftlichProbe } from '../../domain/aufgaben/halbschriftlich';
import type { BudeDefinition } from '../typen';
import HilfeHalbschriftlich from './HilfeHalbschriftlich.svelte';
import { erstelleDominoSzene } from './szene';

export const rechendomino: BudeDefinition = {
  id: 'rechendomino',
  erstelleSzene: erstelleDominoSzene,
  erzeuge: halbschriftlichAufgabe,
  aehnlich: aehnlicheHalbschriftlich,
  probe: halbschriftlichProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeHalbschriftlich,
  ladetext: 'Die Dominosteine werden gemischt …',
  anleitung: 'Am Ende der Kette steht eine Aufgabe. Tippe auf den Stein mit dem richtigen Ergebnis, dann wächst die Kette weiter.',
};
