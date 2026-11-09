<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import BildRiesenrad from '../musterbahn/BildRiesenrad.svelte';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';
  import Eingabe from './Eingabe.svelte';
  import Tastenfeld from './Tastenfeld.svelte';

  /**
   * Riesenrad-Techniker: erst rechnen, dann prüft die Fahrt. Bei richtiger Antwort dreht sich das Rad
   * (bei der Division mit Rest erscheinen die besetzten Gondeln).
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let wert = $state('');
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});

  export function zeige(neu: Aufgabe) {
    a = neu;
    wert = '';
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    await warte(kontext.reduziert ? 500 : 1400);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
    wert = '';
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
</script>

{#if a}
  <div class="rad spielflaeche" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    <div class="bild"><BildRiesenrad aufgabe={a} {zustand} gewaehlt={zustand === 'richtig' ? a.antwort : null} /></div>
    <Eingabe {wert} einheit={String(d.einheit ?? '')} {zustand} />
    <Tastenfeld bind:wert gesperrt={gesperrt} maxStellen={4} okText="Los!" onok={() => kontext.onAntwort(Number(wert))} />
  </div>
{/if}

<style>
  .rad {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 10px;
    background: linear-gradient(#cfe4fb, #e8f0fb);
  }
  .bild {
    display: grid;
    place-items: center;
    max-height: 36vh;
  }
  .bild :global(svg) {
    max-height: 34vh;
  }
  .richtig .bild :global(svg) {
    animation: drehen 1.3s ease-in-out;
  }
  @keyframes drehen {
    40% {
      transform: scale(1.08);
    }
  }
  .falsch .bild {
    animation: wackeln 0.4s;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>
