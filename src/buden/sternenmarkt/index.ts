import { baueBruch, baueDezimal, baueDivision } from '../../domain/aufgaben/klasse5';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import SpielGeisterbahn from '../spiele/Geisterbahn.svelte';
import SpielPizza from '../spiele/Pizza.svelte';
import SpielLukas from '../spiele/Lukas.svelte';
import BildDivision from './BildDivision.svelte';
import BildLukas from './BildLukas.svelte';
import BildPizza from './BildPizza.svelte';

/** Sternenmarkt: Ausblick auf Klasse 5. */
export const geisterbahn = auswahlBude({
  id: 'geisterbahn',
  spiel: SpielGeisterbahn,
  baue: baueDivision,
  probe: (rng) => baueDivision('bronze', rng, 'ohne'),
  bild: BildDivision,
  ladetext: 'Die Gespenster verstecken sich …',
  anleitung: 'Teile Schritt für Schritt wie im Heft: Wie oft passt die Zahl hinein? Was bleibt übrig?',
  hintergrund: '#2b2f5e',
});
export const pizzabaeckerei = auswahlBude({
  id: 'pizzabaeckerei',
  spiel: SpielPizza,
  baue: baueBruch,
  probe: (rng) => baueBruch('bronze', rng, 'stamm'),
  bild: BildPizza,
  ladetext: 'Der Ofen heizt vor …',
  anleitung: 'Schneide die Pizza in gleich große Stücke und belege so viele, wie bestellt sind.',
});
export const hauDenLukas = auswahlBude({
  id: 'hauDenLukas',
  spiel: SpielLukas,
  baue: baueDezimal,
  probe: (rng) => baueDezimal('bronze', rng, 'zehntel'),
  bild: BildLukas,
  ladetext: 'Der Hammer wird geschwungen …',
  anleitung: 'Stelle die Kraft genau richtig ein und hau zu! Die Skala ist in Zehntel geteilt.',
  spalten: 2,
});
