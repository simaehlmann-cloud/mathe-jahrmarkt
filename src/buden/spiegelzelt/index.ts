import { baueBand, baueFormen, baueLabyrinth, baueNetz, baueSpiegel } from '../../domain/aufgaben/raum';
import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import { auswahlBude } from '../gemeinsam/auswahlBude';
import HilfeErklaerung from '../gemeinsam/HilfeErklaerung.svelte';
import { svelteSzene } from '../gemeinsam/svelteSzene';
import type { BudeDefinition } from '../typen';
import BildBand from './BildBand.svelte';
import BildFormen from './BildFormen.svelte';
import BildLabyrinth from './BildLabyrinth.svelte';
import BildNetz from './BildNetz.svelte';
import BildSpiegel from './BildSpiegel.svelte';
import Spiegelkabinett from './Spiegelkabinett.svelte';
import type { Stufe } from '../../domain/buden';

export const spiegelkabinett: BudeDefinition = {
  id: 'spiegelkabinett',
  erstelleSzene: svelteSzene(Spiegelkabinett),
  erzeuge: (stufe, rng) => baueSpiegel(stufe, rng),
  aehnlich: (vorher, rng) => {
    if (vorher.art !== 'auswahl') throw new Error('Keine Spiegel-Aufgabe');
    return baueSpiegel((vorher.daten.stufe as Stufe | undefined) ?? 'bronze', rng, vorher.form);
  },
  probe: (rng) => baueSpiegel('bronze', rng),
  gewichtung: faktGewichtung,
  hilfe: HilfeErklaerung,
  bild: BildSpiegel,
  ladetext: 'Die Spiegel werden geputzt …',
  anleitung: 'Färbe die Kästchen auf der anderen Seite so, dass ein Spiegelbild entsteht. Dann tippe auf „Fertig“.',
  eigeneBedienung: true,
};
export const wuerfelnetz = auswahlBude({ id: 'wuerfelnetz', baue: baueNetz, probe: (rng) => baueNetz('bronze', rng), bild: BildNetz, ladetext: 'Das Papier wird zugeschnitten …', anleitung: 'Stell dir vor, du faltest das Netz. Wird es ein Würfel?', hintergrund: '#eef3fb' });
export const labyrinth = auswahlBude({ id: 'labyrinth', baue: baueLabyrinth, probe: (rng) => baueLabyrinth('bronze', rng), bild: BildLabyrinth, ladetext: 'Der Roboter wird aufgeladen …', anleitung: 'Jeder Pfeil bewegt den Roboter ein Feld weiter. Welches Programm bringt ihn zum Stern?', spalten: 1, hintergrund: '#eef3fb' });
export const formensortierer = auswahlBude({ id: 'formensortierer', baue: baueFormen, probe: (rng) => baueFormen('bronze', rng), bild: BildFormen, ladetext: 'Die Formen werden ausgeschnitten …', anleitung: 'Wie heißt die Form oder der Körper? Beim Flächeninhalt zählst du die Kästchen.', hintergrund: '#eef3fb' });
export const zeltdekorateur = auswahlBude({ id: 'zeltdekorateur', baue: baueBand, probe: (rng) => baueBand('bronze', rng), bild: BildBand, ladetext: 'Die Zeltbahnen werden ausgerollt …', anleitung: 'Setze das Muster fort, finde den Fehler oder erkenne, wie das Muster entsteht.', hintergrund: '#eef3fb' });
