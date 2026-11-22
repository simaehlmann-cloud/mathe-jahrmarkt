import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheSchriftlich, schriftlichAufgabe, schriftlichProbe } from '../../domain/aufgaben/schriftlich';
import { svelteSzene } from '../gemeinsam/svelteSzene';
import type { BudeDefinition } from '../typen';
import HilfeSchriftlich from './HilfeSchriftlich.svelte';
import Rechenblatt from './Rechenblatt.svelte';

export const rechenwerkstatt: BudeDefinition = {
  id: 'rechenwerkstatt',
  erstelleSzene: svelteSzene(Rechenblatt),
  erzeuge: schriftlichAufgabe,
  aehnlich: aehnlicheSchriftlich,
  probe: schriftlichProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeSchriftlich,
  ladetext: 'Das Rechenheft wird aufgeschlagen …',
  anleitung: 'Rechne schriftlich. Schreibe das Ergebnis von rechts nach links, Ziffer für Ziffer, und drücke OK.',
  eigeneBedienung: true,
};
