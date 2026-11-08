import { budeInfo } from '../buden';
import type { KompetenzId } from '../kompetenzen/modell';
import type { Profil } from '../profil';
import { tagSchluessel, type Ereignis } from './lernprofil';

const TAG = 24 * 3600 * 1000;
/** Mindestzahl gewerteter Aufgaben je Woche und Kompetenz für einen Vorher-Nachher-Vergleich. */
export const MIN_VERGLEICH = 10;

export interface Wochenbericht {
  /** Spielzeit in Minuten je Tag der letzten 7 Tage, ältester zuerst. */
  minutenProTag: { tag: string; minuten: number }[];
  gesamtMinuten: number;
  runden: number;
  buden: string[];
  /** Kompetenzen, deren Trefferquote gegenüber der Vorwoche um mindestens 10 Prozentpunkte gestiegen ist. */
  sicherer: KompetenzId[];
  /** Kompetenzen mit Trefferquote unter 70 % in dieser Woche. */
  ueben: KompetenzId[];
}

const quote = (e: readonly Ereignis[]): number | undefined => (e.length >= MIN_VERGLEICH ? e.filter((x) => x.richtig).length / e.length : undefined);

export function wochenbericht(p: Profil, jetzt: number): Wochenbericht {
  const start = jetzt - 7 * TAG;
  const runden = p.runden.filter((r) => r.start >= start && r.start <= jetzt);
  const minutenProTag = Array.from({ length: 7 }, (_, i) => {
    const tag = tagSchluessel(jetzt - (6 - i) * TAG);
    const ms = runden.filter((r) => tagSchluessel(r.start) === tag).reduce((s, r) => s + r.dauerMs, 0);
    return { tag, minuten: Math.round(ms / 60000) };
  });
  const diese = p.ereignisse.filter((e) => e.gewertet && e.t >= start && e.t <= jetzt);
  const vorher = p.ereignisse.filter((e) => e.gewertet && e.t >= start - 7 * TAG && e.t < start);
  const kompetenzen = [...new Set(diese.map((e) => e.kompetenz))];
  const sicherer: KompetenzId[] = [];
  const ueben: KompetenzId[] = [];
  for (const k of kompetenzen) {
    const q1 = quote(diese.filter((e) => e.kompetenz === k));
    const q0 = quote(vorher.filter((e) => e.kompetenz === k));
    if (q1 !== undefined && q0 !== undefined && q1 - q0 >= 0.1) sicherer.push(k);
    if (q1 !== undefined && q1 < 0.7) ueben.push(k);
  }
  const ms = runden.reduce((s, r) => s + r.dauerMs, 0);
  return {
    minutenProTag,
    gesamtMinuten: Math.round(ms / 60000),
    runden: runden.length,
    buden: [...new Set(runden.map((r) => budeInfo(r.bude).name))],
    sicherer,
    ueben,
  };
}
