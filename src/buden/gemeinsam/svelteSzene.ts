import { mount, unmount, type Component } from 'svelte';
import type { Aufgabe } from '../../domain/aufgaben/typen';
import type { BudeSzene, SzenenKontext } from '../typen';

/** Was eine Bude als Svelte-Komponente (ohne PixiJS) bereitstellen muss. */
export interface SvelteSzenenExporte {
  zeige(a: Aufgabe): void;
  treffer(wert: number): Promise<void>;
  daneben(wert: number): Promise<void>;
  sperre(x: boolean): void;
}

/**
 * Bude, deren Bühne aus normalen Bedienelementen besteht (Rechenblatt, Tresor).
 * Das ist für Bildschirmleser besser als eine Zeichenfläche und braucht keine Grafikkarte.
 */
export function svelteSzene(komponente: Component<{ kontext: SzenenKontext }, SvelteSzenenExporte>) {
  return async (host: HTMLElement, kontext: SzenenKontext): Promise<BudeSzene> => {
    const ort = document.createElement('div');
    ort.style.cssText = 'position:absolute;inset:0;overflow:auto;';
    host.appendChild(ort);
    const s = mount(komponente, { target: ort, props: { kontext } }) as SvelteSzenenExporte;
    return {
      zeige: (a) => s.zeige(a),
      treffer: (w) => s.treffer(w),
      daneben: (w) => s.daneben(w),
      sperre: (x) => s.sperre(x),
      zerstoere: () => {
        void unmount(s as unknown as Record<string, unknown>);
        ort.remove();
      },
    };
  };
}

export const warte = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));
