<script lang="ts">
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { UeberschlagAufgabe } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import ZahlenstrahlBild from '../gemeinsam/ZahlenstrahlBild.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe an der Waage: 1. Runden am Zahlenstrahl (Mitte als Grenze), 2. mit den runden Zahlen rechnen.
   * Beim reinen Runden zeigt Schritt 2 die Regel „ab 5 aufrunden“.
   */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as UeberschlagAufgabe);
  const NAMEN = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'];
  const z0 = $derived(a.zahlen[0] ?? 0);
  const s0 = $derived(a.stellen[0] ?? 1);
  const e0 = $derived(10 ** s0);
  const unten0 = $derived(Math.floor(z0 / e0) * e0);
  const strahl0 = $derived({ start: unten0, ende: unten0 + e0, schritt: e0 / 10, beschriftung: e0 / 2 });
  const zeichen = $derived(a.form === 'plus' ? '+' : a.form === 'minus' ? '−' : '·');
  const rundungen = $derived(a.zahlen.map((z, i) => (a.stellen[i] === 0 ? `${zahlText(z)} bleibt` : `${zahlText(z)} ≈ ${zahlText(a.gerundet[i] ?? z)}`)));
  const rechnung = $derived(a.gerundet.map(zahlText).join(` ${zeichen} `));
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={a.form === 'runden' ? `${zahlText(z0)} gerundet auf ${NAMEN[s0]}?` : `${rechnung} = ?`}
  texte={[
    `Du hast ${gewaehlt} gewählt. ${z0} liegt zwischen ${unten0} und ${unten0 + e0}. Die Mitte ist ${unten0 + e0 / 2}.`,
    a.form === 'runden'
      ? `${z0} liegt ${z0 >= unten0 + e0 / 2 ? 'ab der Mitte, also wird aufgerundet' : 'vor der Mitte, also wird abgerundet'}: ${a.antwort}.`
      : `Erst runden: ${rundungen.join(', ')}. Mit den runden Zahlen rechnet es sich leicht.`,
    'Jetzt du!',
  ]}
  format={zahlText}
  kandidaten={a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort)}
  hinweisFalsch="Erst runden, dann mit den runden Zahlen rechnen."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{zahlText(gewaehlt)}</strong> gewählt. Wo liegt {zahlText(z0)}?</p>
      <ZahlenstrahlBild strahl={strahl0} marke={z0} zusatz={[unten0 + e0 / 2]} />
      <p>Die Mitte ist <strong>{zahlText(unten0 + e0 / 2)}</strong>. Ab der Mitte wird aufgerundet.</p>
    {:else if schritt === 2}
      {#if a.form === 'runden'}
        <ZahlenstrahlBild strahl={strahl0} marke={z0} zusatz={[a.antwort]} />
        <p>{zahlText(z0)} ist näher an <strong>{zahlText(a.antwort)}</strong>.</p>
      {:else}
        {#each rundungen as r (r)}<p class="gross">{r}</p>{/each}
        <p>Mit runden Zahlen: <strong>{rechnung}</strong></p>
      {/if}
    {:else if schritt === 3}
      <p class="gross">{a.form === 'runden' ? `${zahlText(z0)} → ?` : `${rechnung} = ?`}</p>
    {:else}
      <p>Richtig: ungefähr <strong>{zahlText(a.antwort)}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .gross {
    font-weight: 900;
    font-size: 1.35rem;
  }
</style>
