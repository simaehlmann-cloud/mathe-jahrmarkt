import { baueGluecksrad, baueLageplan, baueWuerfel } from '../../domain/aufgaben/erkunden';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import BildGluecksrad from './BildGluecksrad.svelte';
import BildLageplan from './BildLageplan.svelte';
import BildWuerfel from './BildWuerfel.svelte';

/** Würfelbauer (Spiegelzelt-Gasse), Lageplan (Größenmarkt) und Glücksrad (Forschergasse). */
export const wuerfelbauer = auswahlBude({
  id: 'wuerfelbauer',
  baue: baueWuerfel,
  probe: (rng) => baueWuerfel('bronze', rng, 'reihe'),
  bild: BildWuerfel,
  ladetext: 'Die Bauklötze werden gestapelt …',
  anleitung: 'Zähle die Würfel oder lies den Bauplan: Jede Zahl sagt, wie hoch der Turm auf dem Feld ist.',
  hintergrund: '#eef3fb',
});
export const lageplan = auswahlBude({
  id: 'lageplan',
  baue: baueLageplan,
  probe: (rng) => baueLageplan('bronze', rng, 'wo'),
  bild: BildLageplan,
  ladetext: 'Der Plan wird aufgefaltet …',
  anleitung: 'Jedes Feld hat einen Buchstaben (oben) und eine Zahl (an der Seite). Finde Stände, gehe Wege und miss mit dem Maßstab.',
  hintergrund: '#eefaf7',
});
export const gluecksrad = auswahlBude({
  id: 'gluecksrad',
  baue: baueGluecksrad,
  probe: (rng) => baueGluecksrad('bronze', rng, 'meist'),
  bild: BildGluecksrad,
  ladetext: 'Das Glücksrad wird angeschubst …',
  anleitung: 'Schau dir die Felder an: Welche Farbe hat die besten Chancen? Passt die Strichliste zum Rad?',
});
