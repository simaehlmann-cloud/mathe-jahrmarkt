import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheAufgabe, baueAufgabe, turboAufgabe } from '../../domain/aufgaben/einmaleins';
import type { BudeDefinition } from '../typen';
import HilfeTurbo from './HilfeTurbo.svelte';
import { erstelleTurboSzene } from './szene';

export const einmaleinsTurbo: BudeDefinition = {
  id: 'einmaleins-turbo',
  erstelleSzene: erstelleTurboSzene,
  erzeuge: turboAufgabe,
  aehnlich: aehnlicheAufgabe,
  probe: (rng) => baueAufgabe({ a: 2, b: 5 }, 'mal', rng, { eingabe: 'ziffern', tausch: false }),
  gewichtung: faktGewichtung,
  hilfe: HilfeTurbo,
  ladetext: 'Tilda tankt ihr Kart …',
  anleitung: 'Tippe das Ergebnis ein und drücke OK. Mit jeder richtigen Antwort fährt Tilda weiter. Wer mag, schaltet den Turbo ein.',
};
