import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheStellenwert, stellenwertAufgabe, stellenwertProbe } from '../../domain/aufgaben/stellenwert';
import type { BudeDefinition } from '../typen';
import HilfeStellenwert from './HilfeStellenwert.svelte';
import { erstelleDosenSzene } from './szene';

export const dosenwerfen: BudeDefinition = {
  id: 'dosenwerfen',
  erstelleSzene: erstelleDosenSzene,
  erzeuge: stellenwertAufgabe,
  aehnlich: aehnlicheStellenwert,
  probe: stellenwertProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeStellenwert,
  ladetext: 'Kalle stapelt die Dosen …',
  anleitung: 'Welche Zahl ist gesucht? Tippe auf den Dosenturm mit der richtigen Zahl. Kalle wirft dann den Ball.',
};
