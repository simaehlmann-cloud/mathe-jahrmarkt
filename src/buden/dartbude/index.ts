import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheAufgabe, baueAufgabe, einmaleinsAufgabe } from '../../domain/aufgaben/einmaleins';
import type { BudeDefinition } from '../typen';
import HilfeEinmaleins from './HilfeEinmaleins.svelte';
import { erstelleDartSzene } from './szene';

export const dartbude: BudeDefinition = {
  id: 'dartbude',
  erstelleSzene: erstelleDartSzene,
  erzeuge: einmaleinsAufgabe,
  aehnlich: aehnlicheAufgabe,
  // Probewurf: eine leichte Kernaufgabe, die nie gewertet wird.
  probe: (rng) => baueAufgabe({ a: 2, b: 5 }, 'mal', rng),
  gewichtung: faktGewichtung,
  hilfe: HilfeEinmaleins,
  anleitung: 'Tippe auf den Ballon mit dem richtigen Ergebnis. Bruno wirft dann den Pfeil für dich.',
};
