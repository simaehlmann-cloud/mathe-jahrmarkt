<script lang="ts">
  import { app } from '../../app/zustand.svelte';
  import { additionsSchritte, multiplikationsSchritte, subtraktionsSchritte } from '../../domain/aufgaben/schriftlich';
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { SchriftlichAufgabe } from '../../domain/aufgaben/typen';
  import { SUBTRAKTION_NAMEN } from '../../services/datenbestand';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import type { HilfeProps } from '../typen';

  /** Hilfe in der Rechen-Werkstatt: das Verfahren Spalte für Spalte, bei Minus im Verfahren der Schule. */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as SchriftlichAufgabe);
  const x = $derived(a.zahlen[0] ?? 0);
  const y = $derived(a.zahlen[1] ?? 0);
  const verfahren = $derived(app.einstellungen.subtraktion);
  const schritte = $derived(
    a.op === '+' ? additionsSchritte(x, y).map((s) => s.text) : a.op === '−' ? subtraktionsSchritte(x, y, verfahren).map((s) => s.text) : multiplikationsSchritte(x, y),
  );
  const idee = $derived(
    a.op === '+'
      ? 'Wir addieren Spalte für Spalte, von rechts nach links. Ab 10 schreiben wir den Übertrag in die nächste Spalte.'
      : a.op === '−'
        ? `Wir subtrahieren Spalte für Spalte von rechts nach links (${SUBTRAKTION_NAMEN[verfahren]}).`
        : 'Erst die Zehner des zweiten Faktors, dann die Einer. Zum Schluss beide Teilprodukte addieren.',
  );
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={`${a.text} = ?`}
  texte={[`Du hast ${gewaehlt} geschrieben. ${idee}`, schritte.join(' '), 'Jetzt du!']}
  format={zahlText}
  kandidaten={a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort)}
  hinweisFalsch="Schau dir die Spalten im Rechenweg noch einmal an."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{zahlText(gewaehlt)}</strong> geschrieben.</p>
      <p>{idee}</p>
      <p class="weg">{schritte[0]}</p>
    {:else if schritt === 2}
      <ol class="weg">
        {#each schritte as s, i (i)}<li>{s}</li>{/each}
      </ol>
    {:else if schritt === 3}
      <p class="gross">{a.text} = ?</p>
    {:else}
      <p>Richtig: {a.text} = <strong>{zahlText(a.antwort)}</strong>.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .weg {
    font-weight: 800;
    font-size: 1.05rem;
    margin: 0;
    padding-left: 1.4rem;
    display: grid;
    gap: 4px;
  }
  p.weg {
    padding-left: 0;
    color: var(--markise);
  }
  .gross {
    font-weight: 900;
    font-size: 1.4rem;
  }
</style>
