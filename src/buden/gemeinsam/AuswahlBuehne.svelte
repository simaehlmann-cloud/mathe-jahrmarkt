<script lang="ts">
  import type { Component } from 'svelte';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import type { SzenenKontext } from '../typen';
  import { warte } from './svelteSzene';
  import Wahlknoepfe from './Wahlknoepfe.svelte';

  /**
   * Gemeinsame Bühne für Auswahl-Buden: oben das Bild der Bude, unten die Antwortknöpfe.
   * Das Bild bekommt Aufgabe und Ergebnis (`zustand`), um selbst zu reagieren (z. B. Uhr dreht, Murmel rollt).
   */
  type BildProps = { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null };
  let {
    kontext,
    bild,
    spalten = 2,
    hintergrund = '#fff8e6',
  }: { kontext: SzenenKontext; bild: Component<BildProps>; spalten?: number; hintergrund?: string } = $props();

  let a = $state<Aufgabe | undefined>();
  let gesperrt = $state(true);
  let gewaehlt = $state<number | null>(null);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');

  export function zeige(neu: Aufgabe) {
    a = neu;
    gewaehlt = null;
    zustand = '';
  }
  export async function treffer(wert: number) {
    gewaehlt = wert;
    zustand = 'richtig';
    kontext.klang('richtig');
    await warte(800);
  }
  export async function daneben(wert: number) {
    gewaehlt = wert;
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  const Bild = $derived(bild);
</script>

{#if a}
  <div class="buehne-dom" style="background: {hintergrund}">
    <div class="bild"><Bild aufgabe={a} {zustand} {gewaehlt} /></div>
    <Wahlknoepfe aufgabe={a} {gesperrt} markiert={gewaehlt} richtig={zustand === 'richtig'} {spalten} onwahl={(w) => !gesperrt && kontext.onAntwort(w)} />
  </div>
{/if}

<style>
  .buehne-dom {
    min-height: 100%;
    display: grid;
    grid-template-rows: 1fr auto;
    justify-items: center;
    gap: 10px;
    padding: 10px 12px 14px;
  }
  .bild {
    width: 100%;
    min-height: 0;
    display: grid;
    place-items: center;
  }
  @media (orientation: landscape) and (min-width: 640px) {
    .buehne-dom {
      grid-template-rows: none;
      grid-template-columns: 1.3fr 1fr;
      align-items: center;
    }
  }
</style>
