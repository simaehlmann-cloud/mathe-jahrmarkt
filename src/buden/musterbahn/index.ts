import { baueDiagramm, baueFolge, baueMauer, baueMurmeln, baueRiesenrad } from '../../domain/aufgaben/muster';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import BildDiagramm from './BildDiagramm.svelte';
import BildFolge from './BildFolge.svelte';
import BildMauer from './BildMauer.svelte';
import BildMurmeln from './BildMurmeln.svelte';
import BildRiesenrad from './BildRiesenrad.svelte';

/** Musterbahn (Muster und Strukturen) und Forschergasse (Daten und Zufall). */
export const zahlenfolgenzug = auswahlBude({
  id: 'zahlenfolgenzug',
  baue: baueFolge,
  probe: (rng) => baueFolge('bronze', rng, 'plusminus'),
  bild: BildFolge,
  ladetext: 'Der Zug rollt ein …',
  anleitung: 'Finde die Regel des Zuges und setze die fehlende Zahl ein.',
});
export const rechenmauer = auswahlBude({
  id: 'rechenmauer',
  baue: baueMauer,
  probe: (rng) => baueMauer('bronze', rng, 'drei'),
  bild: BildMauer,
  ladetext: 'Die Steine werden gestapelt …',
  anleitung: 'Jeder Stein ist die Summe der beiden Steine darunter. Welche Zahl fehlt?',
});
export const riesenradtechniker = auswahlBude({
  id: 'riesenradtechniker',
  baue: baueRiesenrad,
  probe: (rng) => baueRiesenrad('bronze', rng, 'plaetze'),
  bild: BildRiesenrad,
  ladetext: 'Das Riesenrad wird geölt …',
  anleitung: 'Plätze, Gondeln, Preise: Rechne für das Riesenrad.',
  hintergrund: '#e8f0fb',
});
export const murmellabor = auswahlBude({
  id: 'murmellabor',
  baue: baueMurmeln,
  probe: (rng) => baueMurmeln('bronze', rng, 'moeglich'),
  bild: BildMurmeln,
  ladetext: 'Die Murmeln rollen in die Tüte …',
  anleitung: 'Du ziehst blind eine Murmel. Was ist sicher, möglich oder unmöglich?',
});
export const diagrammreporter = auswahlBude({
  id: 'diagrammreporter',
  baue: baueDiagramm,
  probe: (rng) => baueDiagramm('bronze', rng, 'strichliste'),
  bild: BildDiagramm,
  ladetext: 'Die Umfrage wird ausgewertet …',
  anleitung: 'Lies die Strichliste oder das Diagramm genau ab.',
});
