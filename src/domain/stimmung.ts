/** Tageszeit und Jahreszeit für die Karte – ein Grund, zu verschiedenen Zeiten wiederzukommen. */
export type Jahreszeit = 'fruehling' | 'sommer' | 'herbst' | 'winter';
export type Tageszeit = 'tag' | 'abend' | 'nacht';

export function jahreszeit(d: Date): Jahreszeit {
  const m = d.getMonth();
  return m >= 2 && m <= 4 ? 'fruehling' : m >= 5 && m <= 7 ? 'sommer' : m >= 8 && m <= 10 ? 'herbst' : 'winter';
}

/** Abends gehen die Lichter an; im Winter wird es früher dunkel. */
export function tageszeit(d: Date): Tageszeit {
  const h = d.getHours();
  const dunkel = jahreszeit(d) === 'winter' ? 17 : jahreszeit(d) === 'sommer' ? 20 : 18;
  if (h >= 22 || h < 6) return 'nacht';
  if (h >= dunkel) return 'abend';
  return 'tag';
}

/** Baumfarben je Jahreszeit (drei Töne für die Krone). */
export const BAUMKRONE: Record<Jahreszeit, [string, string, string]> = {
  fruehling: ['#3fae6a', '#4fbf78', '#f6b6c8'],
  sommer: ['#3fae6a', '#4fbf78', '#5ccc85'],
  herbst: ['#d9822b', '#e8a33d', '#c9572f'],
  winter: ['#5b8f6c', '#6a9d7a', '#ffffff'],
};

export const STIMMUNG_TEXT: Record<Jahreszeit, string> = {
  fruehling: 'Frühlingsmarkt',
  sommer: 'Sommermarkt',
  herbst: 'Herbstmarkt',
  winter: 'Wintermarkt',
};
