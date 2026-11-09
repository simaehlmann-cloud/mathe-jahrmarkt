import { baueAchterbahn, baueKasse, baueMemory, baueSchaetzen, baueUhr } from '../../domain/aufgaben/groessen';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import SpielKasse from '../spiele/Kasse.svelte';
import SpielUhr from '../spiele/Uhr.svelte';
import SpielAchterbahn from '../spiele/Achterbahn.svelte';
import BildAchterbahn from './BildAchterbahn.svelte';
import BildKasse from './BildKasse.svelte';
import BildMemory from './BildMemory.svelte';
import BildSchaetzen from './BildSchaetzen.svelte';
import BildUhr from './BildUhr.svelte';

export const kasse = auswahlBude({
  id: 'kasse',
  spiel: SpielKasse,
  baue: baueKasse,
  probe: (rng) => baueKasse('bronze', rng, 'bezahlen'),
  bild: BildKasse,
  ladetext: 'Die Kasse wird geöffnet …',
  anleitung: 'Lege Münzen und Scheine auf den Tresen: passend bezahlen, Rückgeld geben, Einkauf bezahlen. Antippen legt zurück.',
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
  spiel: SpielUhr,
  baue: baueUhr,
  probe: (rng) => baueUhr('bronze', rng),
  bild: BildUhr,
  ladetext: 'Die Uhren werden gestellt …',
  anleitung: 'Stelle die Zeiger: Zieh am langen Zeiger für die Minuten und am kurzen für die Stunde.',
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
  spiel: SpielAchterbahn,
  baue: baueAchterbahn,
  probe: (rng) => baueAchterbahn('bronze', rng),
  bild: BildAchterbahn,
  ladetext: 'Die Schienen werden geliefert …',
  anleitung: 'Lege Schienen aus dem Lager, bis die Bahn genau das Ziel erreicht. Dann: Testfahrt!',
});
