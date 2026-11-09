import { faktGewichtung } from '../../domain/adaptiv/gewichtung';
import type { Stufe } from '../../domain/buden';
import type { Rng } from '../../domain/rng';
import type { AuswahlAufgabe } from '../../domain/aufgaben/typen';
import type { BildKomponente, BudeDefinition } from '../typen';
import HilfeErklaerung from './HilfeErklaerung.svelte';
import { auswahlSzene } from './svelteSzene';

/** Erzeuger einer Auswahl-Bude: Stufe, Zufall und (für „ähnliche Aufgabe“) dieselbe Form. */
export type Baue = (stufe: Stufe, rng: Rng, form?: string) => AuswahlAufgabe;

/** Bude aus Erzeuger und Bild zusammensetzen: Bühne, Hilfe und ähnliche Aufgabe kommen aus dem Baukasten. */
export function auswahlBude(o: {
  id: string;
  baue: Baue;
  probe: (rng: Rng) => AuswahlAufgabe;
  bild: BildKomponente;
  ladetext: string;
  anleitung: string;
  spalten?: number;
  hintergrund?: string;
}): BudeDefinition {
  return {
    id: o.id,
    erstelleSzene: auswahlSzene(o.bild, { spalten: o.spalten ?? 2, hintergrund: o.hintergrund ?? '#fff8e6' }),
    erzeuge: (stufe, rng) => o.baue(stufe, rng),
    aehnlich: (vorher, rng) => {
      if (vorher.art !== 'auswahl') throw new Error(`Keine Aufgabe dieser Bude: ${vorher.text}`);
      return o.baue((vorher.daten.stufe as Stufe | undefined) ?? 'bronze', rng, vorher.form);
    },
    probe: o.probe,
    gewichtung: faktGewichtung,
    hilfe: HilfeErklaerung,
    bild: o.bild,
    ladetext: o.ladetext,
    anleitung: o.anleitung,
    eigeneBedienung: true,
  };
}
