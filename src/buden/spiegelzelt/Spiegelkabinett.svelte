<script lang="ts">
  import { maske, type Achse } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';
  import BildSpiegel from './BildSpiegel.svelte';

  /** Spiegelkabinett: Kästchen antippen zum Färben, dann „Fertig“. */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let gefaerbt = $state(new Set<string>());
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');

  export function zeige(neu: Aufgabe) {
    a = neu;
    gefaerbt = new Set();
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    await warte(800);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(600);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function tippe(k: string) {
    if (gesperrt) return;
    const n = new Set(gefaerbt);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    gefaerbt = n;
    zustand = '';
    kontext.klang('tipp');
  }
  function fertig() {
    if (gesperrt || !a || a.art !== 'auswahl') return;
    kontext.onAntwort(maske(gefaerbt, a.daten.achse as Achse));
  }
</script>

{#if a}
  <div class="kabinett" class:falsch={zustand === 'falsch'}>
    <div class="spiegel"><BildSpiegel aufgabe={a} {zustand} gewaehlt={null} {gefaerbt} ontipp={tippe} /></div>
    <button class="ticket gruen" onclick={fertig} disabled={gesperrt}>Fertig</button>
    <p class="tipp">Tippe die Kästchen an, die gespiegelt gefärbt sein müssen.</p>
  </div>
{/if}

<style>
  .kabinett {
    min-height: 100%;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #e8eefa, #cfd8ef);
  }
  .spiegel {
    padding: 10px;
    border: 8px solid #b9c3de;
    border-radius: 16px;
    background: #fff;
  }
  .falsch .spiegel {
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
  .tipp {
    margin: 0;
    font-size: 0.95rem;
    text-align: center;
  }
</style>
