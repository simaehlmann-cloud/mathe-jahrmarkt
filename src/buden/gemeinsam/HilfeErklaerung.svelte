<script lang="ts">
  import type { Component } from 'svelte';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import type { HilfeProps } from '../typen';
  import HilfeRahmen from './HilfeRahmen.svelte';
  import { wertText } from '../../domain/aufgaben/anzeige';

  /**
   * Hilfe für Auswahl-Buden: 1. Grundidee, 2. Weg in Schritten mit dem Bild der Bude (richtige Antwort markiert),
   * 3. selbst wählen. Inhalt kommt aus `aufgabe.erklaerung`.
   */
  type BildProps = { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null };
  let { aufgabe, gewaehlt, onfertig, bild }: HilfeProps & { bild?: Component<BildProps> } = $props();
  const text = (w: number): string => wertText(aufgabe, w);
  const e = $derived(aufgabe.erklaerung ?? { idee: '', schritte: [] });
  const Bild = $derived(bild);
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={aufgabe.antwort}
  frage={aufgabe.text}
  texte={[`Du hast ${text(gewaehlt)} gewählt. ${e.idee}`, e.schritte.join(' '), 'Jetzt du!']}
  format={text}
  kandidaten={aufgabe.optionen.map((o) => o.wert).filter((w) => w !== aufgabe.antwort)}
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{text(gewaehlt)}</strong> gewählt.</p>
      <p>{e.idee}</p>
    {:else if schritt === 2}
      {#if Bild}<div class="bild"><Bild {aufgabe} zustand="richtig" gewaehlt={aufgabe.antwort} /></div>{/if}
      <ol class="weg">
        {#each e.schritte as s, i (i)}<li>{s}</li>{/each}
      </ol>
    {:else if schritt === 3}
      <p class="gross">{aufgabe.text}</p>
    {:else}
      <p>Richtig: <strong>{text(aufgabe.antwort)}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .bild {
    max-height: 34vh;
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .bild :global(svg) {
    max-height: 32vh;
  }
  .weg {
    font-weight: 800;
    font-size: 1.05rem;
    margin: 0;
    padding-left: 1.4rem;
    display: grid;
    gap: 4px;
  }
  .gross {
    font-weight: 900;
    font-size: 1.3rem;
  }
</style>
