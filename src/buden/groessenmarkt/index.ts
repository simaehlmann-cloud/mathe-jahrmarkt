import { baueAchterbahn, baueKasse, baueMemory, baueSchaetzen, baueUhr } from '../../domain/aufgaben/groessen';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import BildAchterbahn from './BildAchterbahn.svelte';
import BildKasse from './BildKasse.svelte';
import BildMemory from './BildMemory.svelte';
import BildSchaetzen from './BildSchaetzen.svelte';
import BildUhr from './BildUhr.svelte';

export const kasse = auswahlBude({
  id: 'kasse',
  baue: baueKasse,
  probe: (rng) => baueKasse('bronze', rng, 'bezahlen'),
  bild: BildKasse,
  ladetext: 'Die Kasse wird geöffnet …',
  anleitung: 'Bezahle passend, berechne das Rückgeld oder rechne den Einkauf zusammen.',
  spalten: 1,
});
export const schaetzbude = auswahlBude({
  id: 'schaetzbude',
  baue: baueSchaetzen,
  probe: (rng) => baueSchaetzen('bronze', rng),
  bild: BildSchaetzen,
  ladetext: 'Das Maßband wird ausgerollt …',
  anleitung: 'Wie groß, wie schwer, wie lange ungefähr? Wähle die passende Angabe.',
});
export const uhrkarussell = auswahlBude({
  id: 'uhrkarussell',
  baue: baueUhr,
  probe: (rng) => baueUhr('bronze', rng),
  bild: BildUhr,
  ladetext: 'Die Uhren werden gestellt …',
  anleitung: 'Lies die Uhr ab oder rechne aus, wann das Bähnchen ankommt.',
  hintergrund: '#e8f4ee',
});
export const umrechnungsmemory = auswahlBude({
  id: 'umrechnungsmemory',
  baue: baueMemory,
  probe: (rng) => baueMemory('bronze', rng),
  bild: BildMemory,
  ladetext: 'Die Karten werden gemischt …',
  anleitung: 'Eine Karte liegt offen. Finde die Karte mit derselben Größe in einer anderen Schreibweise.',
});
export const achterbahn = auswahlBude({
  id: 'achterbahn',
  baue: baueAchterbahn,
  probe: (rng) => baueAchterbahn('bronze', rng),
  bild: BildAchterbahn,
  ladetext: 'Die Schienen werden geliefert …',
  anleitung: 'Baue die Achterbahn genau auf die Ziellänge. Welches Stück fehlt?',
});
