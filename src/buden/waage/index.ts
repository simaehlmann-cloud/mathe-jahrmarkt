import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheUeberschlag, ueberschlagAufgabe, ueberschlagProbe } from '../../domain/aufgaben/ueberschlag';
import type { BudeDefinition } from '../typen';
import HilfeUeberschlag from './HilfeUeberschlag.svelte';
import { erstelleWaageSzene } from './szene';

export const ueberschlagswaage: BudeDefinition = {
  id: 'ueberschlagswaage',
  erstelleSzene: erstelleWaageSzene,
  erzeuge: ueberschlagAufgabe,
  aehnlich: aehnlicheUeberschlag,
  probe: ueberschlagProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeUeberschlag,
  ladetext: 'Die Waage wird geeicht …',
  anleitung: 'Links liegt ein Sack. Lege das runde Gewicht dazu, das ungefähr gleich schwer ist. Dafür musst du nicht genau rechnen, runden reicht!',
};
