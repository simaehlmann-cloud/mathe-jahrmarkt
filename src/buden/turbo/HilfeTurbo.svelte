<script lang="ts">
  import { alsEinmaleins } from '../../domain/aufgaben/einmaleins';
  import HilfeEinmaleins from '../dartbude/HilfeEinmaleins.svelte';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import Stellentafel from '../gemeinsam/Stellentafel.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe im Einmaleins-Turbo. Normale 1×1-Aufgaben: Punktefeld wie in der Dartbude.
   * Analogaufgaben (7 · 80): erst die Grundaufgabe, dann „8 Zehner“ in der Stellentafel.
   */
  let props: HilfeProps = $props();
  const a = $derived(alsEinmaleins(props.aufgabe));
  const grund = $derived(a.a * a.b);
  const zehnerFaktor = $derived(a.analog?.seite === 'a' ? `${a.a * 10}` : `${a.b * 10}`);
  const zehnerAnzahl = $derived(a.analog?.seite === 'a' ? a.a : a.b);
  const anderer = $derived(a.analog?.seite === 'a' ? a.b : a.a);
</script>

{#if !a.analog}
  <HilfeEinmaleins {...props} />
{:else}
  <HilfeRahmen
    gewaehlt={props.gewaehlt}
    loesung={a.antwort}
    frage={`${a.text} = ?`}
    texte={[
      `Du hast ${props.gewaehlt} eingetippt. Denk zuerst an die Grundaufgabe ${a.a} mal ${a.b}. Das ist ${grund}.`,
      `${zehnerFaktor} sind ${zehnerAnzahl} Zehner. ${anderer} mal ${zehnerAnzahl} Zehner sind ${grund} Zehner, also ${a.antwort}.`,
      `Jetzt du: Was ist ${a.text.replace('·', 'mal')}?`,
    ]}
    hinweisFalsch="Denk an die Zehner: Die Null kommt dazu."
    onfertig={props.onfertig}
  >
    {#snippet inhalt(schritt: number)}
      {#if schritt === 1}
        <p>Du hast <strong>{props.gewaehlt}</strong> eingetippt.</p>
        <p class="gross">Grundaufgabe: {a.a} · {a.b} = <strong>{grund}</strong></p>
      {:else if schritt === 2}
        <p class="gross">{zehnerFaktor} = {zehnerAnzahl} Zehner</p>
        <p class="gross">{anderer} · {zehnerAnzahl} Z = {grund} Z</p>
        <Stellentafel bausteine={[{ stelle: 1, anzahl: grund }]} stellen={4} />
        <p>{grund} Zehner sind <strong>{a.antwort}</strong>: eine Stelle weiter links, die Null kommt dazu.</p>
      {:else if schritt === 3}
        <p class="gross">{a.a} · {a.b} = {grund}</p>
      {:else}
        <p>{a.text} = <strong>{a.antwort}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
      {/if}
    {/snippet}
  </HilfeRahmen>
{/if}

<style>
  .gross {
    font-weight: 900;
    font-size: 1.4rem;
  }
</style>
