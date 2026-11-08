import type { Rng } from './rng';

/**
 * Elternsperre (Apple-Richtlinie 1.3, Google Families): Vor Kauf, Elternbereich und allem,
 * was die App verlässt. Die Aufgabe steht in Worten, damit sie Lesen und Rechnen auf
 * Erwachsenen-Niveau verlangt: zweistellig mal zweistellig. Sie lässt sich nicht abschalten.
 */

const EINER = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const EINER_VOR_UND = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const ZEHN_BIS_NEUNZEHN = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const ZEHNER = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** Zahlwort für 0 bis 9999. */
export function zahlInWorten(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new RangeError(`Zahl außerhalb 0..9999: ${n}`);
  if (n < 10) return EINER[n] as string;
  if (n < 20) return ZEHN_BIS_NEUNZEHN[n - 10] as string;
  if (n < 100) {
    const e = n % 10;
    const z = ZEHNER[Math.floor(n / 10)] as string;
    return e === 0 ? z : `${EINER_VOR_UND[e]}und${z}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return `${EINER_VOR_UND[h]}hundert${rest ? zahlInWorten(rest) : ''}`;
  }
  const t = Math.floor(n / 1000);
  const rest = n % 1000;
  return `${EINER_VOR_UND[t]}tausend${rest ? zahlInWorten(rest) : ''}`;
}

export interface Sperrfrage {
  frage: string;
  loesung: number;
}

export function erzeugeSperrfrage(rng: Rng): Sperrfrage {
  const a = rng.int(12, 19);
  const b = rng.int(13, 29);
  return { frage: `Was ist ${zahlInWorten(a)} mal ${zahlInWorten(b)}?`, loesung: a * b };
}

export function pruefeSperre(frage: Sperrfrage, eingabe: string): boolean {
  const ziffern = eingabe.replace(/\s/g, '');
  if (!/^\d{1,5}$/.test(ziffern)) return false;
  return Number(ziffern) === frage.loesung;
}
