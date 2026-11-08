import type { Profil } from './profil';

/** Andenkenstand: feste Preise, keine Überraschungspakete, keine Zufallsgewinne. */
export interface DekoArtikel {
  id: string;
  name: string;
  beschreibung: string;
  preis: number;
}

export const DEKO: readonly DekoArtikel[] = [
  { id: 'wimpel', name: 'Wimpelkette', beschreibung: 'Bunte Wimpel über der Zahlengasse', preis: 20 },
  { id: 'ballons', name: 'Ballonstrauß', beschreibung: 'Ballons neben dem Riesenrad', preis: 25 },
  { id: 'lichterkette', name: 'Lichterkette', beschreibung: 'Warme Lichter über der Zahlengasse', preis: 30 },
  { id: 'hut', name: 'Strohhut', beschreibung: 'Ein Hut für deine Figur', preis: 40 },
];

export type KaufErgebnisDeko = { ok: true; profil: Profil } | { ok: false; grund: 'unbekannt' | 'schonDa' | 'zuWenig' };

export function dekoKaufen(p: Profil, id: string): KaufErgebnisDeko {
  const artikel = DEKO.find((d) => d.id === id);
  if (!artikel) return { ok: false, grund: 'unbekannt' };
  if (p.deko.includes(id)) return { ok: false, grund: 'schonDa' };
  if (p.taler < artikel.preis) return { ok: false, grund: 'zuWenig' };
  return { ok: true, profil: { ...p, taler: p.taler - artikel.preis, deko: [...p.deko, id] } };
}
