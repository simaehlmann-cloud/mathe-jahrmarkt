import type { Component } from 'svelte';
import type { Gewichtung } from '../domain/aufgaben/einmaleins';
import type { Aufgabe } from '../domain/aufgaben/typen';
import type { Stufe } from '../domain/buden';
import type { Ereignis } from '../domain/lernprofil/lernprofil';
import type { Rng } from '../domain/rng';
import type { Klangart } from '../services/klang';

export interface SzenenKontext {
  reduziert: boolean;
  /** Das Kind hat eine Antwort gewählt. `bonus`: Zusatzpunkte der Bude (z. B. Turbo). */
  onAntwort: (wert: number, bonus?: number) => void;
  klang: (art: Klangart) => void;
}

/** Die Grafik einer Bude. Sie kennt nur Aufgaben und Antworten, keine Punkte oder Speicher. */
export interface BudeSzene {
  zeige(aufgabe: Aufgabe): void;
  /** Animation für einen Treffer. */
  treffer(wert: number): Promise<void>;
  /** Animation für einen Fehlversuch. */
  daneben(wert: number): Promise<void>;
  /** Während Animationen und Hilfe keine Eingaben annehmen. */
  sperre(gesperrt: boolean): void;
  zerstoere(): void;
}

export interface HilfeProps {
  aufgabe: Aufgabe;
  gewaehlt: number;
  onfertig: () => void;
}

/** Alles, was eine Bude ausmacht. Neue Buden melden sich in src/buden/index.ts an. */
export interface BudeDefinition {
  id: string;
  erstelleSzene(host: HTMLElement, kontext: SzenenKontext): Promise<BudeSzene>;
  erzeuge(stufe: Stufe, rng: Rng, gewichtung: Gewichtung): Aufgabe;
  aehnlich(vorher: Aufgabe, rng: Rng): Aufgabe;
  /** Probewurf für die allererste Runde. */
  probe(rng: Rng): Aufgabe;
  gewichtung(ereignisse: readonly Ereignis[]): Gewichtung;
  /** Hilfe nach Fehlern mit passender Darstellung. */
  hilfe: Component<HilfeProps>;
  /** Kurze Anleitung, die vor der ersten Runde vorgelesen wird. */
  anleitung: string;
  /** Text, solange die Grafik lädt. */
  ladetext: string;
  /** Die Bude bringt eine eigene zugängliche Eingabe mit (z. B. Ziffernfeld); dann entfallen die versteckten Antwortknöpfe. */
  eigeneBedienung?: boolean;
}
