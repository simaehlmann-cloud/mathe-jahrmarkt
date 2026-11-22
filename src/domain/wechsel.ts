/** Spieler wechseln (seit 0.14): Geschwister spielen abwechselnd an einem Gerät. */

/** Ab dieser Pause (App im Hintergrund) fragt die App beim Zurückkommen, wer jetzt spielt. */
export const WECHSEL_NACH_PAUSE_MS = 5 * 60_000;

/** Hier spielt gerade kein Kind – keine Rückfrage. */
const OHNE_KIND = new Set(['laden', 'start', 'eltern', 'lehrer', 'ueber']);

/** „Wer spielt jetzt?“ zeigen? Nur bei mehreren Profilen, während ein Kind spielt, nach einer längeren Pause. */
export const wechselNachPause = (pauseMs: number, profile: number, bildschirm: string, aktiv: boolean): boolean =>
  pauseMs >= WECHSEL_NACH_PAUSE_MS && profile >= 2 && aktiv && !OHNE_KIND.has(bildschirm);
