<script lang="ts">
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { HalbschriftlichAufgabe } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import type { HilfeProps } from '../typen';

  /** Hilfe am Rechendomino: Rechenweg in Schritten (Zerlegen), dann selbst das Ergebnis wählen. */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as HalbschriftlichAufgabe);
  const idee = $derived(
    a.op === '+' || a.op === '−'
      ? `Wir zerlegen ${zahlText(a.b)} und rechnen in Schritten.`
      : a.op === '·'
        ? `Wir zerlegen ${zahlText(a.a)} in Zehner und Einer und nehmen beide mal ${a.b}.`
        : `Wir teilen ${zahlText(a.a)} in zwei Teile, die sich gut durch ${a.b} teilen lassen.`,
  );
  const sprechbar = (s: string) => s.replace(/·/g, 'mal').replace(/:/g, 'geteilt durch').replace(/−/g, 'minus').replace(/ /g, '');
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={`${a.text} = ?`}
  texte={[`Du hast ${gewaehlt} gewählt. ${idee}`, a.weg.map(sprechbar).join('. '), 'Jetzt du!']}
  format={zahlText}
  kandidaten={a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort)}
  hinweisFalsch="Schau dir den letzten Schritt im Rechenweg an."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{zahlText(gewaehlt)}</strong> gewählt.</p>
      <p class="aufgabe">{a.text}</p>
      <p>{idee}</p>
      <p class="weg">{a.weg[0]}</p>
    {:else if schritt === 2}
      <p class="aufgabe">{a.text}</p>
      <ol class="weg">
        {#each a.weg as w, i (i)}<li>{w}</li>{/each}
      </ol>
    {:else if schritt === 3}
      <ol class="weg">
        {#each a.weg.slice(0, -1) as w, i (i)}<li>{w}</li>{/each}
      </ol>
    {:else}
      <p>Richtig: {a.text} = <strong>{zahlText(a.antwort)}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .aufgabe {
    font-weight: 900;
    font-size: 1.5rem;
  }
  .weg {
    font-weight: 800;
    font-size: 1.25rem;
    margin: 0;
    padding-left: 1.6rem;
    display: grid;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }
  p.weg {
    padding-left: 0;
    color: var(--markise);
  }
</style>
