/**
 * Lehrer-PIN der Schulversion: 6 bis 8 Ziffern. Gespeichert wird nur ein Hash (PBKDF2, services/schulkrypto.ts).
 * Kinder sollen die PIN nicht durch Ausprobieren finden: nach 5 Fehlversuchen wächst die Wartezeit
 * (1, 2, 4 … höchstens 30 Minuten). Die Sperre steht im Speicher und übersteht einen Neustart der App.
 */
export const PIN_MIN = 6;
export const PIN_MAX = 8;
export const PIN_VERSUCHE = 5;
export const PIN_WARTEN_MS = 60_000;
export const PIN_WARTEN_MAX_MS = 30 * 60_000;

/** Fehler beim Festlegen einer PIN oder null, wenn sie taugt. */
export function pinFehler(pin: string): string | null {
  if (!/^\d+$/.test(pin)) return 'Bitte nur Ziffern eingeben.';
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) return `Die PIN braucht ${PIN_MIN} bis ${PIN_MAX} Ziffern.`;
  if (/^(\d)\1+$/.test(pin)) return 'Bitte nicht nur eine Ziffer wiederholen.';
  const ziffern = [...pin].map(Number);
  const schritte = new Set(ziffern.slice(1).map((z, i) => (z - (ziffern[i] as number) + 10) % 10));
  if (schritte.size === 1 && (schritte.has(1) || schritte.has(9))) return 'Bitte keine Zahlenreihe wie 123456 verwenden.';
  return null;
}

export interface PinSperre {
  /** Fehlversuche seit dem letzten Erfolg. */
  fehl: number;
  /** Bis wann (ms) keine Eingabe möglich ist. */
  bis: number;
}

export const keineSperre = (): PinSperre => ({ fehl: 0, bis: 0 });

/** Nach einem Fehlversuch: ab dem 5. Fehler wartet man, jedes weitere Mal doppelt so lange. */
export function nachFehlversuch(s: PinSperre, jetzt: number): PinSperre {
  const fehl = s.fehl + 1;
  if (fehl < PIN_VERSUCHE) return { fehl, bis: 0 };
  const warten = Math.min(PIN_WARTEN_MAX_MS, PIN_WARTEN_MS * 2 ** (fehl - PIN_VERSUCHE));
  return { fehl, bis: jetzt + warten };
}

/** Zeichen des Wiederherstellungscodes: ohne Verwechsler (0/O, 1/I/L). */
export const RETTUNG_ZEICHEN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Wiederherstellungscode für eine vergessene PIN: 12 Zeichen in drei Vierergruppen (31^12 ≈ 7 · 10^17).
 * `ziehe(n)` liefert eine Zufallszahl in [0, n) – in der App aus crypto.getRandomValues.
 */
export function erzeugeRettungscode(ziehe: (n: number) => number): string {
  const z = Array.from({ length: 12 }, () => RETTUNG_ZEICHEN[ziehe(RETTUNG_ZEICHEN.length)]).join('');
  return `${z.slice(0, 4)}-${z.slice(4, 8)}-${z.slice(8)}`;
}

/** Eingegebenen Code vereinheitlichen: Großbuchstaben, ohne Leerzeichen und Striche. */
export const rettungscodeNormal = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
