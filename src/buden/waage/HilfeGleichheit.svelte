<script lang="ts">
  import { RELATION, ergaenzenSchritte, loese, termText, termWert } from '../../domain/aufgaben/gleichheit';
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { GleichheitAufgabe, Term } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe an der Gleichgewichts-Waage.
   * Ergänzen: in Schritten bis zur Zielzahl. Mal/Geteilt: Umkehraufgabe. Vergleichen: beide Seiten ausrechnen
   * oder den Trick „was die eine Zahl mehr hat, hat die andere weniger“.
   */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as GleichheitAufgabe);
  const lueckeLinks = $derived(termText(a.links).includes('?'));
  const luecke = $derived<Term>(lueckeLinks ? a.links : a.rechts);
  const ziel = $derived(termWert(lueckeLinks ? a.rechts : a.links));
  const gewaehltText = $derived(a.form === 'vergleichen' ? (RELATION[gewaehlt] ?? '?') : zahlText(gewaehlt));

  /** Ergänzen: von der bekannten Zahl bis zur größeren. */
  const ergaenzen = $derived.by(() => {
    if (a.form !== 'ergaenzen') return [];
    const bekannt = (luecke.a ?? luecke.b ?? 0) as number;
    // a + ? = c, ? + b = c: von b bis c; c − ? = a: von a bis c
    return luecke.op === '−' ? ergaenzenSchritte(ziel, bekannt) : ergaenzenSchritte(bekannt, ziel);
  });

  const umkehr = $derived.by(() => {
    if (a.form !== 'platzhalter') return '';
    const x = loese(luecke, ziel);
    if (luecke.op === '·') return `${zahlText(ziel)} : ${luecke.a ?? luecke.b} = ${zahlText(x)}`;
    return luecke.a === null ? `${zahlText(ziel)} · ${luecke.b} = ${zahlText(x)}` : `${zahlText(luecke.a ?? 0)} : ${zahlText(ziel)} = ${zahlText(x)}`;
  });

  const lw = $derived(termWert(a.links));
  const rw = $derived(termWert(a.rechts));

  const texte = $derived.by((): [string, string, string] => {
    switch (a.form) {
      case 'ergaenzen':
        return [
          `Du hast ${gewaehlt} gewählt. Die Waage ist nur im Gleichgewicht, wenn beide Seiten genau gleich sind. Wir ergänzen in Schritten.`,
          `${ergaenzen.map((s) => `${s.von} plus ${s.plus} ist ${s.bis}`).join('. ')}. Zusammen also ${a.antwort}.`,
          'Jetzt du: Welche Zahl fehlt?',
        ];
      case 'platzhalter':
        return [`Du hast ${gewaehlt} gewählt. Hier hilft die Umkehraufgabe.`, `Die Umkehraufgabe heißt ${umkehr.replace(/·/g, 'mal').replace(/:/g, 'geteilt durch')}.`, 'Jetzt du: Welche Zahl fehlt?'];
      default:
        return [
          `Du hast ${gewaehltText} gewählt. Rechnen wir beide Seiten aus.`,
          `Links sind es ${lw}, rechts ${rw}. Also ist links ${lw < rw ? 'weniger' : lw > rw ? 'mehr' : 'gleich viel'}.`,
          'Jetzt du: kleiner, gleich oder größer?',
        ];
    }
  });
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={a.form === 'vergleichen' ? `${termText(a.links)} ○ ${termText(a.rechts)}` : a.text}
  {texte}
  format={a.form === 'vergleichen' ? (w: number) => RELATION[w] ?? '?' : zahlText}
  kandidaten={a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort)}
  hinweisFalsch={a.form === 'vergleichen' ? 'Schau auf die beiden Ergebnisse.' : 'Probiere die Zahl in Gedanken aus: Sind dann beide Seiten gleich?'}
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{gewaehltText}</strong> gewählt.</p>
      <p class="gross">{a.form === 'vergleichen' ? `${termText(a.links)} ○ ${termText(a.rechts)}` : a.text}</p>
      {#if a.form === 'vergleichen'}
        <p>Rechne beide Seiten aus oder vergleiche die Zahlen geschickt.</p>
      {:else if a.form === 'ergaenzen'}
        <p>Gleichgewicht heißt: beide Seiten <strong>genau</strong> gleich. Wir ergänzen in Schritten.</p>
      {:else}
        <p>Die Umkehraufgabe hilft: Aus Mal wird Geteilt, aus Geteilt wird Mal.</p>
      {/if}
    {:else if schritt === 2}
      {#if a.form === 'ergaenzen'}
        <ol class="weg">
          {#each ergaenzen as s (s.von)}<li>{zahlText(s.von)} + <strong>{zahlText(s.plus)}</strong> = {zahlText(s.bis)}</li>{/each}
        </ol>
        <p>{ergaenzen.map((s) => zahlText(s.plus)).join(' + ')} = <strong>{zahlText(a.antwort)}</strong></p>
      {:else if a.form === 'platzhalter'}
        <p class="gross">{umkehr}</p>
      {:else}
        <p class="gross">{zahlText(lw)} {RELATION[a.antwort]} {zahlText(rw)}</p>
        <p>Links {termText(a.links)} = {zahlText(lw)}, rechts {termText(a.rechts)} = {zahlText(rw)}.</p>
      {/if}
    {:else if schritt === 3}
      <p class="gross">{a.form === 'vergleichen' ? `${termText(a.links)} ○ ${termText(a.rechts)}` : a.text}</p>
    {:else}
      <p>Richtig! Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .gross {
    font-weight: 900;
    font-size: 1.4rem;
  }
  .weg {
    font-weight: 800;
    font-size: 1.2rem;
    margin: 0;
    padding-left: 1.6rem;
    display: grid;
    gap: 4px;
  }
</style>
