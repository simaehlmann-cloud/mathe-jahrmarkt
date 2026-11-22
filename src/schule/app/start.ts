/**
 * Start der Schulversion: Spielstand aus einzelnen Dateien laden (bis zu 32 Profile), Schuldaten-Prüfung anmelden,
 * Nahtstelle bereitstellen und das Öffnen von .jahrmarkt-Dateien vorbereiten.
 * Wird von src/app/zustand.svelte.ts nur in der Schulversion dynamisch geladen.
 */
import '../domain/pruefen';
import { leererBestand, neueKennung, type Datenbestand } from '../../services/datenbestand';
import type { Ablage } from '../../services/speicher';
import { TeilAblage, geraeteDateien } from '../dienste/ablage';
import { leereSchule } from '../domain/schuldaten';
import { schulErweiterung } from './erweiterung';

export { dateiOeffnenVorbereiten } from './dateiOeffnen';

export async function schulStart(): Promise<{ bestand: Datenbestand; wiederhergestellt: boolean; ablage: Ablage; erweiterung: typeof schulErweiterung }> {
  const ablage = new TeilAblage(await geraeteDateien());
  const { bestand, wiederhergestellt } = await ablage.laden(() => leererBestand(leereSchule(neueKennung('g'))));
  return {
    // Nach dem Start meldet sich jedes Kind selbst an
    bestand: { ...bestand, aktiv: undefined, schule: bestand.schule ?? leereSchule(neueKennung('g')) },
    wiederhergestellt,
    ablage,
    erweiterung: schulErweiterung,
  };
}
