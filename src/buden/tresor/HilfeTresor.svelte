<script lang="ts">
  import type { TresorAufgabe } from '../../domain/aufgaben/typen';
  import HilfeRahmen from '../gemeinsam/HilfeRahmen.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe am Tresor. Rätsel: die eigene Zahl Hinweis für Hinweis prüfen (✓ / ✗).
   * Kombinatorik: alle Codes geordnet aufschreiben, nach der ersten Ziffer sortiert.
   */
  let { aufgabe: allgemein, gewaehlt, onfertig }: HilfeProps = $props();
  const a = $derived(allgemein as TresorAufgabe);
  const pruefung = $derived(a.hinweise.map((h, i) => ({ h, ok: a.pruefungen[i]?.(gewaehlt) ?? false })));
  const gruppen = $derived.by(() => {
    const g = new Map<string, string[]>();
    for (const c of a.moeglichkeiten ?? []) g.set(c[0] ?? '', [...(g.get(c[0] ?? '') ?? []), c]);
    return [...g.entries()];
  });
  const texte = $derived.by((): [string, string, string] =>
    a.form === 'kombinatorik'
      ? [
          `Du hast ${gewaehlt} gewählt. Wir schreiben alle Codes geordnet auf: zuerst alle mit derselben ersten Ziffer.`,
          `Das sind ${gruppen.length} Gruppen mit je ${gruppen[0]?.[1].length ?? 0} Codes, zusammen ${a.antwort}.`,
          'Jetzt du: Wie viele Codes gibt es?',
        ]
      : [
          `Du hast ${gewaehlt} gewählt. Wir prüfen deine Zahl mit jedem Hinweis.`,
          `${pruefung.filter((p) => !p.ok).length} Hinweise passen nicht. Die gesuchte Zahl erfüllt alle Hinweise.`,
          'Jetzt du: Welche Zahl passt zu allen Hinweisen?',
        ],
  );
</script>

<HilfeRahmen
  {gewaehlt}
  loesung={a.antwort}
  frage={a.form === 'kombinatorik' ? 'Wie viele Codes gibt es?' : 'Welche Zahl passt zu allen Hinweisen?'}
  {texte}
  kandidaten={a.optionen.map((o) => o.wert).filter((w) => w !== a.antwort)}
  hinweisFalsch={a.form === 'kombinatorik' ? 'Zähle die Codes in der Liste.' : 'Prüfe jeden Hinweis einzeln.'}
  {onfertig}
>
  {#snippet inhalt(schritt: number)}
    {#if a.form === 'kombinatorik'}
      {#if schritt === 1}
        <p>{a.hinweise[0]}</p>
        <p>Wir beginnen mit allen Codes, die mit <strong>{gruppen[0]?.[0]}</strong> anfangen:</p>
        <p class="codes">{gruppen[0]?.[1].join('  ')}</p>
      {:else if schritt === 2}
        {#each gruppen as [erste, liste] (erste)}<p class="codes"><strong>{erste}…</strong> {liste.join('  ')}</p>{/each}
        <p>{gruppen.length} · {gruppen[0]?.[1].length} = <strong>{a.antwort}</strong></p>
      {:else if schritt === 3}
        <p>{a.hinweise[0]}</p>
      {:else}
        <p>Richtig: <strong>{a.antwort}</strong> Codes.</p>
      {/if}
    {:else if schritt === 1}
      <p>Deine Zahl: <strong>{gewaehlt}</strong></p>
      <ul class="liste">
        {#each pruefung as p, i (i)}<li class:nein={!p.ok}><span aria-hidden="true">{p.ok ? '✓' : '✗'}</span> {p.h}</li>{/each}
      </ul>
    {:else if schritt === 2}
      <p>Die gesuchte Zahl erfüllt <strong>alle</strong> Hinweise:</p>
      <ul class="liste">
        {#each a.hinweise as h, i (i)}<li><span aria-hidden="true">✓</span> {h}</li>{/each}
      </ul>
      <p>Das ist die <strong>{a.antwort}</strong>.</p>
    {:else if schritt === 3}
      <ul class="liste">
        {#each a.hinweise as h, i (i)}<li>{h}</li>{/each}
      </ul>
    {:else}
      <p>Richtig: Der Code ist <strong>{a.antwort}</strong>.</p>
    {/if}
  {/snippet}
</HilfeRahmen>

<style>
  .liste {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 4px;
    font-weight: 700;
  }
  .liste span {
    font-weight: 900;
    color: var(--wiese);
  }
  .liste .nein span {
    color: var(--markise);
  }
  .codes {
    font-weight: 800;
    font-size: 1.15rem;
    word-spacing: 0.3em;
    font-variant-numeric: tabular-nums;
  }
</style>
