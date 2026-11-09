import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { aehnlicheTresor, tresorAufgabe, tresorProbe } from '../../domain/aufgaben/tresor';
import { svelteSzene } from '../gemeinsam/svelteSzene';
import type { BudeDefinition } from '../typen';
import HilfeTresor from './HilfeTresor.svelte';
import Tresor from './Tresor.svelte';

export const zahlenraetselTresor: BudeDefinition = {
  id: 'tresor',
  erstelleSzene: svelteSzene(Tresor),
  erzeuge: tresorAufgabe,
  aehnlich: aehnlicheTresor,
  probe: tresorProbe,
  gewichtung: faktGewichtung,
  hilfe: HilfeTresor,
  ladetext: 'Der Tresor wird verschlossen …',
  anleitung: 'Lies die Hinweise. Stelle die Rädchen auf die Zahl, die zu allen Hinweisen passt, und tippe auf „Öffnen“.',
  eigeneBedienung: true,
};
