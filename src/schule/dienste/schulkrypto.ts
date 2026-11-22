/**
 * Kryptografie der Schulversion mit der Web-Crypto-Schnittstelle des Systems (keine eigene Bibliothek):
 * - Lehrer-PIN und Wiederherstellungscode werden nur als PBKDF2-Hash gespeichert.
 * - Dateien zum Weitergeben (Klassenliste, Ergebnisse) werden mit AES-GCM verschlüsselt; der Schlüssel
 *   entsteht per PBKDF2 aus der Lehrer-PIN. Vorher wird der Inhalt mit gzip verkleinert.
 *
 * Grenzen ehrlich benannt: Eine PIN mit 6 Ziffern hält jemanden mit viel Rechenzeit nicht dauerhaft auf.
 * Sie schützt die Dateien vor neugierigen Blicken, wenn sie irgendwo liegen bleiben (AirDrop, Schulcloud).
 */
import { erzeugeRettungscode, rettungscodeNormal } from '../domain/pin';
import type { Geheimnis } from '../domain/schuldaten';

/** PBKDF2-Runden für PIN und Code (gespeichert je Hash, damit sich der Wert später erhöhen lässt). */
export const ITER_HASH = 210_000;
/** PBKDF2-Runden für den Dateischlüssel. */
export const ITER_DATEI = 210_000;

const krypto = (): Crypto => {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('Die Verschlüsselung des Systems ist nicht verfügbar.');
  return c;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

export function zuBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function ausBase64(text: string): Uint8Array {
  const s = atob(text);
  const aus = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) aus[i] = s.charCodeAt(i);
  return aus;
}

export function zufallsBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  krypto().getRandomValues(b);
  return b;
}

/** Gleichverteilte Zufallszahl in [0, n) ohne Modulo-Verzerrung. */
export function zufallsZahl(n: number): number {
  const grenze = Math.floor(0x1_0000_0000 / n) * n;
  const z = new Uint32Array(1);
  for (;;) {
    krypto().getRandomValues(z);
    if ((z[0] as number) < grenze) return (z[0] as number) % n;
  }
}

async function pbkdf2(geheim: string, salz: Uint8Array, iter: number, bits = 256): Promise<Uint8Array> {
  const c = krypto();
  const roh = await c.subtle.importKey('raw', enc.encode(geheim), 'PBKDF2', false, ['deriveBits']);
  const out = await c.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salz as BufferSource, iterations: iter }, roh, bits);
  return new Uint8Array(out);
}

export async function hashe(geheim: string, iter = ITER_HASH): Promise<Geheimnis> {
  const salz = zufallsBytes(16);
  return { hash: zuBase64(await pbkdf2(geheim, salz, iter)), salz: zuBase64(salz), iter };
}

/** Vergleich in konstanter Zeit (ohne frühen Abbruch). */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function pruefeGeheimnis(geheim: string, g: Geheimnis): Promise<boolean> {
  const h = zuBase64(await pbkdf2(geheim, ausBase64(g.salz), g.iter));
  return gleich(h, g.hash);
}

/** Neuer Wiederherstellungscode mit Hash. Der Code selbst wird nur einmal angezeigt. */
export async function neuerRettungscode(): Promise<{ code: string; geheimnis: Geheimnis }> {
  const code = erzeugeRettungscode(zufallsZahl);
  return { code, geheimnis: await hashe(rettungscodeNormal(code)) };
}

/* ---------- Dateien ---------- */

async function packen(bytes: Uint8Array): Promise<{ daten: Uint8Array; gz: boolean }> {
  if (typeof CompressionStream === 'undefined') return { daten: bytes, gz: false };
  const strom = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'));
  return { daten: new Uint8Array(await new Response(strom).arrayBuffer()), gz: true };
}

async function entpacken(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Dieses Gerät kann die Datei nicht entpacken. Bitte das System aktualisieren.');
  const strom = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

export const DATEI_ART = 'mathe-jahrmarkt-schule';

export interface Umschlag {
  art: typeof DATEI_ART;
  /** Inhaltstyp, steht unverschlüsselt da, damit die App falsch gewählte Dateien gleich erkennt. */
  typ: string;
  v: 1;
  /** Name des Geräts, von dem die Datei stammt (unverschlüsselt, hilft beim Zuordnen). */
  von: string;
  erstellt: number;
  salz: string;
  iv: string;
  iter: number;
  gz: boolean;
  daten: string;
}

export class FalschePin extends Error {
  constructor() {
    super('Die Datei lässt sich mit dieser PIN nicht öffnen.');
  }
}

/** Verschlüsselt einen Inhalt (JSON) mit der PIN zu einem Datei-Text. */
export async function verschluesseln(inhalt: unknown, typ: string, von: string, pin: string, jetzt: number, iter = ITER_DATEI): Promise<string> {
  const salz = zufallsBytes(16);
  const iv = zufallsBytes(12);
  const schluesselBits = await pbkdf2(pin, salz, iter);
  const c = krypto();
  const schluessel = await c.subtle.importKey('raw', schluesselBits as BufferSource, 'AES-GCM', false, ['encrypt']);
  const { daten, gz } = await packen(enc.encode(JSON.stringify(inhalt)));
  // Typ und Version gehören zu den geprüften Zusatzdaten: Wer sie in der Datei ändert, bricht die Entschlüsselung.
  const zusatz = enc.encode(`${DATEI_ART}|${typ}|1`);
  const geheim = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: zusatz as BufferSource }, schluessel, daten as BufferSource));
  const u: Umschlag = { art: DATEI_ART, typ, v: 1, von, erstellt: jetzt, salz: zuBase64(salz), iv: zuBase64(iv), iter, gz, daten: zuBase64(geheim) };
  return JSON.stringify(u);
}

/** Liest den Umschlag einer Datei, ohne zu entschlüsseln. Wirft bei fremden Dateien. */
export function leseUmschlag(text: string): Umschlag {
  let u: unknown;
  try {
    u = JSON.parse(text.trim());
  } catch {
    throw new Error('Das ist keine Datei vom Mathe-Jahrmarkt.');
  }
  const x = u as Partial<Umschlag>;
  if (typeof u !== 'object' || u === null || x.art !== DATEI_ART) throw new Error('Das ist keine Datei vom Mathe-Jahrmarkt (Schulversion).');
  if (x.v !== 1) throw new Error('Die Datei stammt aus einer neueren App-Version. Bitte die App aktualisieren.');
  if (typeof x.typ !== 'string' || typeof x.salz !== 'string' || typeof x.iv !== 'string' || typeof x.daten !== 'string' || typeof x.iter !== 'number') {
    throw new Error('Die Datei ist beschädigt.');
  }
  if (x.iter < 1000 || x.iter > 10_000_000) throw new Error('Die Datei ist beschädigt.');
  return { art: DATEI_ART, typ: x.typ, v: 1, von: typeof x.von === 'string' ? x.von.slice(0, 40) : '', erstellt: typeof x.erstellt === 'number' ? x.erstellt : 0, salz: x.salz, iv: x.iv, iter: x.iter, gz: x.gz === true, daten: x.daten };
}

/** Entschlüsselt einen Umschlag mit der PIN. Wirft FalschePin, wenn die PIN nicht passt. */
export async function entschluesseln(u: Umschlag, pin: string): Promise<unknown> {
  const c = krypto();
  let roh: Uint8Array;
  try {
    const schluesselBits = await pbkdf2(pin, ausBase64(u.salz), u.iter);
    const schluessel = await c.subtle.importKey('raw', schluesselBits as BufferSource, 'AES-GCM', false, ['decrypt']);
    const zusatz = enc.encode(`${DATEI_ART}|${u.typ}|1`);
    roh = new Uint8Array(await c.subtle.decrypt({ name: 'AES-GCM', iv: ausBase64(u.iv) as BufferSource, additionalData: zusatz as BufferSource }, schluessel, ausBase64(u.daten) as BufferSource));
  } catch {
    throw new FalschePin();
  }
  const klar = u.gz ? await entpacken(roh) : roh;
  try {
    return JSON.parse(dec.decode(klar));
  } catch {
    throw new Error('Die Datei ist beschädigt.');
  }
}
