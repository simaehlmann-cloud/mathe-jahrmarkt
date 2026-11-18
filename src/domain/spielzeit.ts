/**
 * Spielzeit-Erinnerung: Die App will nicht möglichst lange laufen, sondern gut genutzt werden.
 * Gezählt wird die Zeit im Vordergrund je Kind und Kalendertag – Rechnen, Bauen und Insel zusammen.
 * Ist die eingestellte Dauer erreicht, schlägt Flinka nach der laufenden Runde eine Pause vor.
 * Wer „Noch 5 Minuten“ wählt, wird danach wieder erinnert. Es gibt keine Sperre und keinen Druck.
 */

/** Auswahl im Elternbereich (Minuten), 0 = aus. */
export const SPIELZEIT_OPTIONEN = [0, 15, 20, 30, 45, 60] as const;
/** Standard: 20 Minuten am Tag – eingeschaltet, Eltern können es ändern. */
export const STANDARD_SPIELZEIT = 20;
/** Nachschlag nach „Noch 5 Minuten“. */
export const NACHSCHLAG_MIN = 5;
/** Mehr als so viel Zeit zwischen zwei Zählschritten zählt nicht (Gerät schlief, App im Hintergrund). */
export const MAX_SCHRITT_MS = 90_000;

export interface Spielzeit {
  /** Kalendertag (YYYY-MM-DD) der Zählung. */
  tag: string;
  /** Gespielte Zeit an diesem Tag. */
  ms: number;
  /** Wie oft heute schon „Noch 5 Minuten“ gewählt wurde. */
  nachschlag: number;
  /** Nach „Noch 5 Minuten“: erst ab dieser Spielzeit wieder erinnern (0 = gleich bei der Grenze). */
  erinnernAb: number;
}

export const leereSpielzeit = (tag = ''): Spielzeit => ({ tag, ms: 0, nachschlag: 0, erinnernAb: 0 });

/** Zeit dazuzählen; an einem neuen Tag beginnt die Zählung von vorn. */
export function zaehleSpielzeit(sz: Spielzeit, tag: string, plusMs: number): Spielzeit {
  const basis = sz.tag === tag ? sz : leereSpielzeit(tag);
  const plus = Math.max(0, Math.min(MAX_SCHRITT_MS, Math.round(plusMs)));
  return { ...basis, ms: basis.ms + plus };
}

/** Minuten, die heute gespielt wurden (für Eltern). */
export const minutenHeute = (sz: Spielzeit, tag: string): number => (sz.tag === tag ? Math.floor(sz.ms / 60_000) : 0);

/** Ist jetzt ein Pausenvorschlag fällig? */
export function pauseFaellig(sz: Spielzeit, tag: string, grenzeMin: number): boolean {
  if (grenzeMin <= 0 || sz.tag !== tag) return false;
  return sz.ms >= Math.max(grenzeMin * 60_000, sz.erinnernAb);
}

/** „Noch 5 Minuten“: ab jetzt fünf Minuten weiter, dann erinnert Flinka wieder. */
export function mitNachschlag(sz: Spielzeit, tag: string): Spielzeit {
  const basis = sz.tag === tag ? sz : leereSpielzeit(tag);
  return { ...basis, nachschlag: basis.nachschlag + 1, erinnernAb: basis.ms + NACHSCHLAG_MIN * 60_000 };
}

/** Text für Flinka. */
export function pausenText(name: string, minuten: number, nachschlag: number): string {
  if (nachschlag === 0) {
    return `${name}, du hast heute schon ${minuten} Minuten gerechnet und gebaut. Dein Kopf hat sich eine Pause verdient! Alles ist gespeichert.`;
  }
  return `Jetzt sind es ${minuten} Minuten. Zeit für eine echte Pause – raus an die frische Luft! Morgen geht es genau hier weiter.`;
}

export function pruefeSpielzeit(x: unknown): Spielzeit {
  if (typeof x !== 'object' || x === null) return leereSpielzeit();
  const o = x as Record<string, unknown>;
  const tag = typeof o.tag === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.tag) ? o.tag : '';
  const ms = typeof o.ms === 'number' && Number.isFinite(o.ms) && o.ms >= 0 ? Math.min(o.ms, 24 * 3600_000) : 0;
  const nachschlag = typeof o.nachschlag === 'number' && Number.isInteger(o.nachschlag) && o.nachschlag >= 0 ? Math.min(o.nachschlag, 100) : 0;
  const erinnernAb = typeof o.erinnernAb === 'number' && Number.isFinite(o.erinnernAb) && o.erinnernAb >= 0 ? Math.min(o.erinnernAb, 25 * 3600_000) : 0;
  return tag ? { tag, ms, nachschlag, erinnernAb } : leereSpielzeit();
}
