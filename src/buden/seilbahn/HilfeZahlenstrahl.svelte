<script lang="ts">
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { ZahlenstrahlAufgabe } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import ZahlenstrahlBild from '../gemeinsam/ZahlenstrahlBild.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe an der Seilbahn: 1. Wie viel ist ein Strich? 2. Vom nächsten beschrifteten Strich aus weiterzählen.
   * 3. Selbst ablesen.
   */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as ZahlenstrahlAufgabe);
  const s = $derived(a.strahl);
  /** Striche zwischen zwei Beschriftungen und Wert eines Strichs. */
  const zwischen = $derived(Math.round(s.beschriftung / s.schritt));
  const basis = $derived(s.start + Math.floor((a.antwort - s.start) / s.beschriftung) * s.beschriftung);
  const weiter = $derived(Math.round((a.antwort - basis) / s.schritt));
  const naechsteBeschriftung = $derived(Math.min(s.ende, basis + s.beschriftung));
  const bogen = $derived(
    Array.from({ length: weiter }, (_, i) => ({ von: basis + i * s.schritt, bis: basis + (i + 1) * s.schritt, text: `+${zahlText(s.schritt)}` })).slice(0, 10),
  );
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage="Welche Zahl gehört an den Pfeil?"
  texte={[
    `${a.form === 'ziehen' ? 'Deine Gondel hielt bei' : 'Du hast'} ${gewaehlt} ${a.form === 'ziehen' ? '' : 'gewählt'}. Von ${basis} bis ${naechsteBeschriftung} sind ${zwischen} Abschnitte. Ein Strich ist also ${s.schritt} weiter.`,
    `Von ${basis} aus gehen wir ${weiter} Striche weiter, immer plus ${s.schritt}.`,
    'Jetzt du: Welche Zahl gehört an den Pfeil?',
  ]}
  format={zahlText}
  kandidaten={[a.antwort + s.schritt, a.antwort - s.schritt].filter((x) => x > s.start)}
  hinweisFalsch="Zähle die Striche von der letzten Zahl aus. Jeder Strich ist ein gleich großer Schritt."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>{a.form === 'ziehen' ? 'Deine Gondel hielt bei' : 'Du hast'} <strong>{zahlText(gewaehlt)}</strong>{a.form === 'ziehen' ? '' : ' gewählt'}.</p>
      <ZahlenstrahlBild strahl={s} zusatz={[basis, naechsteBeschriftung]} />
      <p>Von {zahlText(basis)} bis {zahlText(naechsteBeschriftung)} sind <strong>{zwischen} Abschnitte</strong>. Ein Strich ist <strong>{zahlText(s.schritt)}</strong>.</p>
    {:else if schritt === 2}
      <ZahlenstrahlBild strahl={s} zusatz={[basis]} {bogen} marke={a.antwort} />
      <p>{zahlText(basis)} und {weiter}-mal +{zahlText(s.schritt)} sind <strong>{zahlText(a.antwort)}</strong>.</p>
    {:else if schritt === 3}
      <ZahlenstrahlBild strahl={s} marke={a.antwort} ohneZahl />
    {:else}
      <p>Richtig: <strong>{zahlText(a.antwort)}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>
