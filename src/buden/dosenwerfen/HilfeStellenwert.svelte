<script lang="ts">
  import { STELLEN_NAME, bausteineVon, zahlText } from '../../domain/aufgaben/stellenwert';
  import type { Baustein, StellenwertAufgabe } from '../../domain/aufgaben/typen';
  import { zahlInWorten } from '../../domain/elternsperre';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import Stellentafel from '../gemeinsam/Stellentafel.svelte';
  import type { HilfeProps } from '../typen';

  /** Hilfe im Dosenwerfen: alles in der Stellenwerttafel, Nullen sichtbar machen, Entbündeln zeigen. */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as StellenwertAufgabe);

  const stellen = $derived(Math.max(String(a.zahl).length, ...a.bausteine.map((b) => b.stelle + 1)));
  const ganz = $derived(bausteineVon(a.antwort));
  /** Bei Bündelaufgaben: die Stelle mit 10 oder mehr. */
  const zuviel = $derived<Baustein | undefined>(a.bausteine.find((b) => b.anzahl >= 10));
  const ziffer = $derived(a.bausteine[0]);

  /** „dreitausend | fünfzig“: Zahlwort in Tausender- und Restteil. */
  const wortTeile = $derived.by(() => {
    const t = Math.floor(a.antwort / 1000);
    const r = a.antwort % 1000;
    const teile: string[] = [];
    if (t > 0) teile.push(`${zahlInWorten(t).replace(/eins$/, 'ein')}tausend`);
    if (r > 0) teile.push(zahlInWorten(r));
    return teile;
  });

  const texte = $derived.by((): [string, string, string] => {
    switch (a.form) {
      case 'ziffer':
        return [
          `Du hast ${gewaehlt} gewählt. Die ${ziffer?.anzahl} steht in der ${STELLEN_NAME[ziffer?.stelle ?? 0]}-Spalte.`,
          `${ziffer?.anzahl} ${STELLEN_NAME[ziffer?.stelle ?? 0]} sind ${a.antwort}.`,
          `Jetzt du: Welchen Wert hat die ${ziffer?.anzahl}?`,
        ];
      case 'buendeln':
        return [
          `Du hast ${gewaehlt} gewählt. ${zuviel?.anzahl} ${STELLEN_NAME[zuviel?.stelle ?? 0]} passen nicht in eine Spalte.`,
          `10 ${STELLEN_NAME[zuviel?.stelle ?? 0]} sind 1 ${STELLEN_NAME[(zuviel?.stelle ?? 0) + 1]}. Wir bündeln und tragen um.`,
          'Jetzt du: Welche Zahl ist es?',
        ];
      case 'wort':
        return [
          `Du hast ${gewaehlt} gewählt. Wir zerlegen das Zahlwort: ${wortTeile.join(', ')}.`,
          'Leere Stellen bekommen eine Null.',
          'Jetzt du: Welche Zahl ist es?',
        ];
      default:
        return [`Du hast ${gewaehlt} gewählt. Wir tragen alles in die Stellenwerttafel ein.`, 'Leere Stellen bekommen eine Null.', 'Jetzt du: Welche Zahl ist es?'];
    }
  });
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={a.form === 'ziffer' ? `Wert der ${ziffer?.anzahl} in ${zahlText(a.zahl)}?` : `${a.text} = ?`}
  {texte}
  format={zahlText}
  hinweisFalsch="Schau noch einmal in die Stellenwerttafel."
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if schritt === 1}
      <p>Du hast <strong>{zahlText(gewaehlt)}</strong> gewählt.</p>
      {#if a.form === 'wort'}
        <p class="wort">{#each wortTeile as t, i (i)}<span>{t}</span>{/each}</p>
      {/if}
      {#if a.form === 'ziffer'}
        <Stellentafel bausteine={bausteineVon(a.zahl)} {stellen} nullen hervor={ziffer?.stelle} />
        <p>Die <strong>{ziffer?.anzahl}</strong> steht bei den <strong>{STELLEN_NAME[ziffer?.stelle ?? 0]}n</strong>.</p>
      {:else if a.form === 'buendeln'}
        <Stellentafel bausteine={a.bausteine} {stellen} hervor={zuviel?.stelle} />
        <p><strong>{zuviel?.anzahl} {STELLEN_NAME[zuviel?.stelle ?? 0]}</strong> passen nicht in eine Spalte.</p>
      {:else}
        <Stellentafel bausteine={ganz} {stellen} />
      {/if}
    {:else if schritt === 2}
      {#if a.form === 'ziffer'}
        <Stellentafel bausteine={[ziffer ?? { stelle: 0, anzahl: 0 }]} stellen={(ziffer?.stelle ?? 0) + 1} nullen hervor={ziffer?.stelle} />
        <p>{ziffer?.anzahl} {STELLEN_NAME[ziffer?.stelle ?? 0]} = <strong>{zahlText(a.antwort)}</strong></p>
      {:else if a.form === 'buendeln'}
        <p>10 {STELLEN_NAME[zuviel?.stelle ?? 0]} = 1 {STELLEN_NAME[(zuviel?.stelle ?? 0) + 1]}. Also bündeln und umtragen:</p>
        <Stellentafel bausteine={ganz} {stellen} nullen hervor={(zuviel?.stelle ?? 0) + 1} />
      {:else}
        <Stellentafel bausteine={ganz} {stellen} nullen />
        <p>Leere Stellen bekommen eine <strong class="rot">Null</strong>.</p>
      {/if}
    {:else if schritt === 3}
      <Stellentafel bausteine={a.form === 'ziffer' ? bausteineVon(a.zahl) : ganz} {stellen} hervor={a.form === 'ziffer' ? ziffer?.stelle : undefined} />
    {:else}
      <p>Richtig: <strong>{zahlText(a.antwort)}</strong>. Jetzt kommt eine ähnliche Aufgabe.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .wort {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-weight: 900;
  }
  .wort span {
    background: #fff3c4;
    border: 2px dashed var(--senf-dunkel);
    border-radius: 8px;
    padding: 2px 8px;
  }
  .rot {
    color: var(--markise);
  }
</style>
