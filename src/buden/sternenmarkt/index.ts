import { baueBruch, baueDezimal, baueDivision } from '../../domain/aufgaben/klasse5';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import BildDivision from './BildDivision.svelte';
import BildLukas from './BildLukas.svelte';
import BildPizza from './BildPizza.svelte';

/** Sternenmarkt: Ausblick auf Klasse 5. */
export const geisterbahn = auswahlBude({
  id: 'geisterbahn',
  baue: baueDivision,
  probe: (rng) => baueDivision('bronze', rng, 'ohne'),
  bild: BildDivision,
  ladetext: 'Die Gespenster verstecken sich …',
  anleitung: 'Teile Schritt für Schritt wie im Heft: Wie oft passt die Zahl hinein? Was bleibt übrig?',
  hintergrund: '#2b2f5e',
});
export const pizzabaeckerei = auswahlBude({
  id: 'pizzabaeckerei',
  baue: baueBruch,
  probe: (rng) => baueBruch('bronze', rng, 'stamm'),
  bild: BildPizza,
  ladetext: 'Der Ofen heizt vor …',
  anleitung: 'Pizzen werden in gleich große Stücke geschnitten. Welcher Bruch passt?',
});
export const hauDenLukas = auswahlBude({
  id: 'hauDenLukas',
  baue: baueDezimal,
  probe: (rng) => baueDezimal('bronze', rng, 'zehntel'),
  bild: BildLukas,
  ladetext: 'Der Hammer wird geschwungen …',
  anleitung: 'Lies die Höhe auf der Zehntel-Skala ab und vergleiche Kommazahlen.',
  spalten: 2,
});
