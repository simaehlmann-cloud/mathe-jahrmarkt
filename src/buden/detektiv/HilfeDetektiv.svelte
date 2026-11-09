<script lang="ts">
  import { app } from '../../app/zustand.svelte';
  import { STIMMT, detektivRechnung, falscheStelle, kontrollUeberschlag, stelleName } from '../../domain/aufgaben/detektiv';
  import { additionsSchritte, multiplikationsSchritte, subtraktionsSchritte } from '../../domain/aufgaben/schriftlich';
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { DetektivAufgabe } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import type { HilfeProps } from '../typen';

  /** Hilfe beim Fehlerdetektiv: 1. Überschlag, 2. Spalte für Spalte nachrechnen, 3. selbst entscheiden. */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as DetektivAufgabe);
  const x = $derived(a.zahlen[0] ?? 0);
  const y = $derived(a.zahlen[1] ?? 0);
  const u = $derived(kontrollUeberschlag(a.op, x, y));
  const stelle = $derived(falscheStelle(a.gezeigt, a.richtig));
  const schritte = $derived(
    a.op === '+' ? additionsSchritte(x, y).map((s) => s.text) : a.op === '−' ? subtraktionsSchritte(x, y, app.einstellungen.subtraktion).map((s) => s.text) : multiplikationsSchritte(x, y),
  );
  const ursache = $derived(
    {
      keiner: 'Alles richtig gerechnet.',
      uebertrag: 'Hier wurde der Übertrag vergessen.',
      kleinerVonGroesser: 'Hier wurde „kleiner von größer“ gerechnet statt zu entbündeln.',
      einmaleins: 'Hier steckt ein Einmaleins-Fehler.',
      verschoben: 'Hier wurde ein Teilprodukt nicht verschoben.',
    }[a.fehler],
  );
  const gewaehltText = $derived(stelleName(gewaehlt));
  const codes = $derived(a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort));
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage="Welche Ziffer ist falsch?"
  texte={[
    `Du hast „${gewaehltText}“ gewählt. Erst der Überschlag: ungefähr ${u.ergebnis}.`,
    `Jetzt rechnen wir genau nach. ${schritte.join(' ')} ${ursache}`,
    'Jetzt du: Welche Ziffer ist falsch, oder stimmt alles?',
  ]}
  format={stelleName}
  kandidaten={codes}
  hinweisFalsch="Vergleiche das richtige Ergebnis Ziffer für Ziffer mit der Rechnung."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p class="gross">{detektivRechnung(a)}</p>
      <p>Überschlag: {zahlText(u.a)} {a.op} {zahlText(u.b)} ≈ <strong>{zahlText(u.ergebnis)}</strong></p>
      <p>Das Ergebnis {zahlText(a.gezeigt)} liegt {Math.abs(a.gezeigt - u.ergebnis) <= u.ergebnis * 0.15 ? 'in der Nähe. Ein kleiner Fehler kann trotzdem drin sein.' : 'weit weg. Da stimmt etwas nicht!'}</p>
    {:else if schritt === 2}
      <ol class="weg">
        {#each schritte as s, i (i)}<li>{s}</li>{/each}
      </ol>
      <p>Richtig ist <strong>{zahlText(a.richtig)}</strong>. {ursache}</p>
    {:else if schritt === 3}
      <p class="gross">{detektivRechnung(a)}</p>
      <p>Richtig: {zahlText(a.richtig)}</p>
    {:else}
      <p>{a.antwort === STIMMT ? 'Genau, alles richtig.' : `Genau, die ${stelleName(stelle + 1)} ist falsch.`} Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .gross {
    font-weight: 900;
    font-size: 1.35rem;
  }
  .weg {
    font-weight: 800;
    font-size: 1.02rem;
    margin: 0;
    padding-left: 1.4rem;
    display: grid;
    gap: 4px;
  }
</style>
