import { describe, expect, it } from 'vitest';
import { WECHSEL_NACH_PAUSE_MS, wechselNachPause } from '../src/domain/wechsel';

describe('Spieler wechseln nach einer Pause', () => {
  it('fragt nur nach längerer Pause, bei mehreren Profilen und während ein Kind spielt', () => {
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 2, 'jahrmarkt', true)).toBe(true);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS - 1, 2, 'jahrmarkt', true)).toBe(false);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 1, 'jahrmarkt', true)).toBe(false);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 3, 'spiel', true)).toBe(true);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 2, 'start', true)).toBe(false);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 2, 'eltern', true)).toBe(false);
    expect(wechselNachPause(WECHSEL_NACH_PAUSE_MS, 2, 'jahrmarkt', false)).toBe(false);
  });
});
