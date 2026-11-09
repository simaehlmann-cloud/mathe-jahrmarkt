import type { FigurId } from './profil';

/**
 * Eigene Figur aus dem Baukasten: Tier, Fellfarbe, Halstuch, Extra.
 * Bewusst ohne Fotos oder Kamera: In einer Kinder-App bleiben keine Bilder von Kindern auf dem Gerät.
 */
export type Extra = 'keins' | 'cap' | 'sonnenbrille' | 'schleife' | 'brille' | 'muetze' | 'kopfhoerer' | 'strohhut';

export interface Aussehen {
  /** Index in FELL[figur], 0 bis 2. */
  fell: number;
  /** Kennung aus TUECHER oder 'keins'. */
  tuch: string;
  extra: Extra;
}

/** Je Tier drei Fellfarben: [Grundfarbe, Zweitfarbe]. */
export const FELL: Readonly<Record<FigurId, readonly (readonly [string, string])[]>> = {
  // Menschen: [Hautton, Haarfarbe]; Roboter: [Gehäuse, Akzent]
  mensch: [['#f3cfa8', '#6b4226'], ['#c98d5e', '#24160e'], ['#7a4b2a', '#140c08']],
  menschLang: [['#f3cfa8', '#d8a24a'], ['#c98d5e', '#5a2e1a'], ['#7a4b2a', '#140c08']],
  roboter: [['#b8c4d6', '#e23a4e'], ['#f2b705', '#1f2a6b'], ['#3a3d4f', '#3fd0c9']],
  fuchs: [['#e8833a', '#3b2314'], ['#b5532a', '#2a1a10'], ['#d9dde6', '#5d6175']],
  eule: [['#a56b45', '#8a5a3b'], ['#8d93a8', '#6b7191'], ['#e8d9b8', '#c4a87a']],
  igel: [['#6b4a2e', '#f2d3a8'], ['#8a6a4a', '#f7e3c4'], ['#4a4a52', '#e8d2b8']],
  katze: [['#a3a9bd', '#8d93a8'], ['#f0a050', '#d07a30'], ['#3a3d4f', '#2a2c3a']],
  baer: [['#8a5a3b', '#c99a6b'], ['#3a3d4f', '#7a7f95'], ['#f2efe8', '#d9d3c4']],
  hase: [['#f4f1f8', '#d7d3e2'], ['#c99a6b', '#a5784d'], ['#9aa0b8', '#7a8098']],
};

export const FELL_NAMEN: Readonly<Record<FigurId, readonly string[]>> = {
  mensch: ['Hell, braun', 'Mittel, schwarz', 'Dunkel, schwarz'],
  menschLang: ['Hell, blond', 'Mittel, braun', 'Dunkel, schwarz'],
  roboter: ['Silber', 'Gelb', 'Schwarz'],
  fuchs: ['Rotfuchs', 'Kupferfuchs', 'Polarfuchs'],
  eule: ['Waldkauz', 'Grau', 'Schneeeule'],
  igel: ['Braun', 'Hell', 'Dunkel'],
  katze: ['Grau', 'Rot getigert', 'Schwarz'],
  baer: ['Braunbär', 'Schwarzbär', 'Eisbär'],
  hase: ['Weiß', 'Feldhase', 'Grau'],
};

export const TUECHER: readonly { id: string; name: string; farbe: string }[] = [
  { id: 'rot', name: 'Rot', farbe: '#e23a4e' },
  { id: 'blau', name: 'Blau', farbe: '#3c78d8' },
  { id: 'gruen', name: 'Grün', farbe: '#3fae6a' },
  { id: 'gelb', name: 'Gelb', farbe: '#ffc62b' },
  { id: 'lila', name: 'Lila', farbe: '#7b5ea7' },
];

export const EXTRAS: readonly { id: Extra; name: string; braucht?: string }[] = [
  { id: 'keins', name: 'Ohne' },
  { id: 'cap', name: 'Cap' },
  { id: 'sonnenbrille', name: 'Sonnenbrille' },
  { id: 'schleife', name: 'Schleife' },
  { id: 'brille', name: 'Brille' },
  { id: 'muetze', name: 'Mütze' },
  { id: 'kopfhoerer', name: 'Kopfhörer' },
  // Aus dem Andenkenstand
  { id: 'strohhut', name: 'Strohhut', braucht: 'hut' },
];

export const standardAussehen = (): Aussehen => ({ fell: 0, tuch: 'keins', extra: 'keins' });

export const extraVerfuegbar = (extra: Extra, deko: readonly string[]): boolean => {
  const e = EXTRAS.find((x) => x.id === extra);
  return !!e && (!e.braucht || deko.includes(e.braucht));
};

/** Prüft unbekannte Daten (Speicher, Sicherung) und füllt Lücken. */
export function pruefeAussehen(x: unknown, deko: readonly string[]): Aussehen {
  const s = standardAussehen();
  if (typeof x !== 'object' || x === null) return s;
  const o = x as Record<string, unknown>;
  const fell = typeof o.fell === 'number' && Number.isInteger(o.fell) && o.fell >= 0 && o.fell <= 2 ? o.fell : s.fell;
  const tuch = typeof o.tuch === 'string' && (o.tuch === 'keins' || TUECHER.some((t) => t.id === o.tuch)) ? o.tuch : s.tuch;
  const extra = EXTRAS.some((e) => e.id === o.extra) && extraVerfuegbar(o.extra as Extra, deko) ? (o.extra as Extra) : s.extra;
  return { fell, tuch, extra };
}

export const fellFarben = (figur: FigurId, fell: number): readonly [string, string] =>
  FELL[figur][fell] ?? (FELL[figur][0] as readonly [string, string]);

export const istMensch = (figur: FigurId): boolean => figur === 'mensch' || figur === 'menschLang';

/** Farben für Arme und Beine der laufenden Figur: Menschen tragen Jeans, Roboter sind aus einem Guss. */
export function koerperFarben(figur: FigurId, fell: number): { arm: string; bein: string } {
  const [a, b] = fellFarben(figur, fell);
  if (istMensch(figur)) return { arm: a, bein: '#34508f' };
  if (figur === 'roboter') return { arm: a, bein: a };
  return { arm: a, bein: b };
}
