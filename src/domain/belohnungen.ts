import { BUDEN, GASSEN, TAGESBUDEN, budeInfo, type GasseId } from './buden';
import { gasseLaeuft, istGeschafft, sommerfest } from './fortschritt/fortschritt';
import type { Profil } from './profil';

/**
 * Langfristige Motivation ohne Druck: Wochenziel (3 Spieltage pro Woche statt Tagesserie),
 * Feiern für fertige Gassen und das Sommerfest, Sammelkarten.
 * Was schon belohnt wurde, steht in `profil.belohnt` (z. B. „woche:2026-W46“, „gasse:zahlengasse“).
 */

/* ---------- Wochenziel ---------- */

export const WOCHENZIEL_TAGE = 3;
export const WOCHENZIEL_BLOECKE = 15;

/** Kalenderwoche nach ISO 8601 („2026-W46“), in Ortszeit. */
export function wochenKennung(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wochentag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wochentag); // Donnerstag dieser Woche bestimmt das Jahr
  const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const woche = Math.ceil(((t.getTime() - jahresanfang.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(woche).padStart(2, '0')}`;
}

const tag = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Tage dieser Woche (Mo–So), an denen gespielt wurde: Runden, beantwortete Aufgaben (auch Knobelzelt), Blitzrechnen. */
export function spieltageDieseWoche(p: Profil, jetzt: Date): number {
  const woche = wochenKennung(jetzt);
  const zeiten = [...p.runden.map((r) => r.start), ...p.ereignisse.map((e) => e.t), ...(p.blitz.zuletzt ? [p.blitz.zuletzt] : [])];
  return new Set(zeiten.filter((t) => wochenKennung(new Date(t)) === woche).map(tag)).size;
}

/** Wochenziel erreicht und noch nicht belohnt? Dann Profil mit Belohnung, sonst undefined. */
export function wochenzielBelohnung(p: Profil, jetzt: Date): Profil | undefined {
  const k = `woche:${wochenKennung(jetzt)}`;
  if (p.belohnt.includes(k) || spieltageDieseWoche(p, jetzt) < WOCHENZIEL_TAGE) return undefined;
  return { ...p, belohnt: [...p.belohnt, k], bau: { ...p.bau, bloecke: p.bau.bloecke + WOCHENZIEL_BLOECKE } };
}

/* ---------- Feiern ---------- */

export type Feier = { art: 'gasse'; gasse: GasseId; name: string } | { art: 'sommerfest' };
export const FEIER_BLOECKE = 20;

/** Noch nicht gefeierte Erfolge: fertige Gassen (alle Buden Bronze) und das Sommerfest (alle Tagesbuden Bronze). */
export function offeneFeiern(p: Profil): Feier[] {
  const feiern: Feier[] = [];
  for (const g of GASSEN) {
    if (g.id === 'abendmarkt') continue;
    if (gasseLaeuft(p, g.id) && !p.belohnt.includes(`gasse:${g.id}`)) feiern.push({ art: 'gasse', gasse: g.id, name: g.name });
  }
  if (sommerfest(p) && !p.belohnt.includes('sommerfest')) feiern.push({ art: 'sommerfest' });
  return feiern;
}

export const feierSchluessel = (f: Feier): string => (f.art === 'gasse' ? `gasse:${f.gasse}` : 'sommerfest');

/* ---------- Sammelalbum ---------- */

export type Seltenheit = 'normal' | 'selten' | 'legendaer';
export interface Sammelkarte {
  id: string;
  titel: string;
  text: string;
  /** Wie man sie bekommt (wird bei verdeckten Karten gezeigt). */
  hinweis: string;
  seltenheit: Seltenheit;
  /** Bude für das Motiv oder ein eigenes Bild. */
  bild: { bude: string } | { symbol: 'stern' | 'blitz' | 'katze' | 'block' | 'kalender' | 'raetsel' | 'feuerwerk' | 'herz' };
  farbe: string;
  hat: (p: Profil) => boolean;
}

const gasseFarbe = (g: GasseId): string => GASSEN.find((x) => x.id === g)?.farbe ?? '#3c78d8';

export const KARTEN: readonly Sammelkarte[] = [
  // Je Bude eine Karte für Bronze, eine seltene Glanzkarte für Gold
  ...BUDEN.map(
    (b): Sammelkarte => ({
      id: `bude:${b.id}`,
      titel: b.name,
      text: b.mechanik.charAt(0).toUpperCase() + b.mechanik.slice(1) + '.',
      hinweis: `Schaffe Bronze an der Bude „${b.name}“.`,
      seltenheit: 'normal',
      bild: { bude: b.id },
      farbe: gasseFarbe(b.gasse),
      hat: (p) => istGeschafft(p, b.id, 'bronze'),
    }),
  ),
  ...GASSEN.filter((g) => g.id !== 'abendmarkt').map(
    (g): Sammelkarte => ({
      id: `gasse:${g.id}`,
      titel: `${g.name} komplett`,
      text: 'Alle Buden dieser Gasse laufen wieder.',
      hinweis: `Schaffe Bronze an allen Buden der ${g.name}.`,
      seltenheit: 'selten',
      bild: { symbol: 'feuerwerk' },
      farbe: g.farbe,
      // Einmal gefeiert bleibt die Karte, auch wenn später neue Buden in die Gasse kommen
      hat: (p) => p.belohnt.includes(`gasse:${g.id}`) || gasseLaeuft(p, g.id),
    }),
  ),
  {
    id: 'gold-drei', titel: 'Goldgräber', text: 'Drei Buden auf Gold – echte Profiarbeit.', hinweis: 'Schaffe an drei Buden die Goldstufe.',
    seltenheit: 'selten', bild: { symbol: 'stern' }, farbe: '#f2b705', hat: (p) => BUDEN.filter((b) => istGeschafft(p, b.id, 'gold')).length >= 3,
  },
  {
    id: 'durchhalten', titel: 'Dranbleiber', text: 'Nach einem Fehler weitergemacht und es geschafft.', hinweis: 'Löse nach einem Fehler die ähnliche Aufgabe (ab Silber).',
    seltenheit: 'normal', bild: { symbol: 'herz' }, farbe: '#e23a4e', hat: (p) => p.abzeichen.some((a) => a.id === 'durchhalte'),
  },
  {
    id: 'woche', titel: 'Wochenheld', text: 'An drei Tagen in einer Woche gespielt.', hinweis: 'Spiele in einer Woche an drei verschiedenen Tagen.',
    seltenheit: 'normal', bild: { symbol: 'kalender' }, farbe: '#3fae6a', hat: (p) => p.belohnt.some((b) => b.startsWith('woche:')),
  },
  {
    id: 'woche-vier', titel: 'Dauerbrenner', text: 'Vier Wochen das Wochenziel geschafft.', hinweis: 'Schaffe das Wochenziel in vier Wochen.',
    seltenheit: 'legendaer', bild: { symbol: 'kalender' }, farbe: '#7b5ea7', hat: (p) => p.belohnt.filter((b) => b.startsWith('woche:')).length >= 4,
  },
  {
    id: 'blitz', titel: 'Blitzrechner', text: '20 Aufgaben in einer Minute.', hinweis: 'Schaffe beim Blitzrechnen 20 richtige in einer Minute.',
    seltenheit: 'selten', bild: { symbol: 'blitz' }, farbe: '#ffc62b', hat: (p) => Object.values(p.blitz.rekorde).some((r) => r >= 20),
  },
  {
    id: 'blitz-30', titel: 'Kopfrechen-Rakete', text: '30 Aufgaben in einer Minute.', hinweis: 'Schaffe beim Blitzrechnen 30 richtige in einer Minute.',
    seltenheit: 'legendaer', bild: { symbol: 'blitz' }, farbe: '#e23a4e', hat: (p) => Object.values(p.blitz.rekorde).some((r) => r >= 30),
  },
  {
    id: 'raetsel', titel: 'Rätselfuchs', text: 'Ein Rätsel der Woche gelöst.', hinweis: 'Löse ein Rätsel der Woche in der Knobelbude.',
    seltenheit: 'selten', bild: { symbol: 'raetsel' }, farbe: '#7b5ea7', hat: (p) => p.belohnt.some((b) => b.startsWith('raetsel:')),
  },
  {
    id: 'bau', titel: 'Baumeister', text: 'Fünf Bauaufträge gelöst.', hinweis: 'Löse fünf Bauaufträge auf dem Bauplatz.',
    seltenheit: 'selten', bild: { symbol: 'block' }, farbe: '#a06b47', hat: (p) => p.bau.erledigt.length >= 5,
  },
  {
    id: 'katze', titel: 'Mieze', text: 'Die Dachkatze der Dartbude entdeckt.', hinweis: 'Schau genau hin, wenn die Dartbude wieder leuchtet.',
    seltenheit: 'selten', bild: { symbol: 'katze' }, farbe: '#8d93a8', hat: (p) => p.gesehen.entdeckungen.includes('katze'),
  },
  {
    id: 'sommerfest', titel: 'Sommerfest', text: 'Der ganze Jahrmarkt läuft wieder. Danke!', hinweis: 'Bring alle Buden auf dem Jahrmarkt mindestens auf Bronze.',
    seltenheit: 'legendaer', bild: { symbol: 'feuerwerk' }, farbe: '#e23a4e', hat: (p) => p.belohnt.includes('sommerfest') || sommerfest(p),
  },
];

export const karteVon = (id: string): Sammelkarte | undefined => KARTEN.find((k) => k.id === id);

/** Karten, die das Kind hat, aber noch nicht angesehen (für „Neu“-Markierung und die Aufdeck-Animation). */
export const neueKarten = (p: Profil): Sammelkarte[] => KARTEN.filter((k) => k.hat(p) && !p.album.includes(k.id));

export const gesammelt = (p: Profil): number => KARTEN.filter((k) => k.hat(p)).length;

/** Nur fürs Anzeigen von Gassenname/Farbe einer Budenkarte. */
export const gasseDerBude = (bude: string): GasseId => budeInfo(bude).gasse;
export const ANZAHL_TAGESBUDEN = TAGESBUDEN.length;
