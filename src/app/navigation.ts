import type { Bildschirm } from './zustand.svelte';

/**
 * Wohin die Zurück-Taste (Android) von einem Bildschirm aus führt.
 * 'jahrmarktVerlassen' heißt: Hinweis zeigen und erst beim zweiten Druck die App in den Hintergrund legen.
 */
export type ZurueckZiel = Bildschirm | 'jahrmarktVerlassen' | 'nichts';

export function zurueckZiel(b: Bildschirm, hatProfil: boolean): ZurueckZiel {
  switch (b.name) {
    case 'laden':
      return 'nichts';
    case 'start':
      return hatProfil ? { name: 'jahrmarkt' } : 'jahrmarktVerlassen';
    case 'jahrmarkt':
      return 'jahrmarktVerlassen';
    case 'profil':
    case 'andenken':
    case 'eltern':
      return hatProfil ? { name: 'jahrmarkt' } : { name: 'start' };
    case 'bude':
      return { name: 'jahrmarkt' };
    case 'spiel':
      return { name: 'bude', bude: b.bude };
    case 'figur':
      return { name: 'profil' };
  }
}

/** Zeitfenster für den zweiten Druck auf dem Jahrmarkt. */
export const DOPPELDRUCK_MS = 2500;
