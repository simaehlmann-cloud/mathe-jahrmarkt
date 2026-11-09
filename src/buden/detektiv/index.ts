import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheDetektiv, detektivAufgabe, detektivProbe, stelleName } from '../../domain/aufgaben/detektiv';
import { svelteSzene } from '../gemeinsam/svelteSzene';
import type { BudeDefinition } from '../typen';
import HilfeDetektiv from './HilfeDetektiv.svelte';
import Pruefblatt from './Pruefblatt.svelte';

export const fehlerdetektiv: BudeDefinition = {
  id: 'fehlerdetektiv',
  erstelleSzene: svelteSzene(Pruefblatt),
  erzeuge: detektivAufgabe,
  aehnlich: aehnlicheDetektiv,
  probe: detektivProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeDetektiv,
  ladetext: 'Die Lupe wird geputzt …',
  anleitung: 'Prüfe die Rechnung. Ein Überschlag zeigt, ob sie ungefähr stimmen kann. Tippe auf die falsche Ziffer oder auf „Alles richtig“.',
  eigeneBedienung: true,
  antwortText: stelleName,
};
