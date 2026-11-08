<script lang="ts">
  import { onMount } from 'svelte';
  import { zerlegung } from '../../domain/aufgaben/einmaleins';
  import { createRng, randomSeed } from '../../domain/rng';
  import { app } from '../../app/zustand.svelte';
  import Icon from '../../app/components/Icon.svelte';
  import type { HilfeProps } from '../typen';

  /**
   * Hilfe nach Fehlern in vier Schritten: zeigen, hervorheben, selbst vergleichen, nochmal.
   * Darstellung: Punktefeld mit a Reihen zu je b Punkten, zerlegt in Kernaufgaben (z. B. 7·8 = 5·8 + 2·8).
   */
  let { aufgabe, gewaehlt, onfertig }: HilfeProps = $props();

  const a = $derived(aufgabe.a);
  const bb = $derived(aufgabe.b);
  const p = $derived(a * bb);
  const z = $derived(zerlegung(a, bb));
  const kern = $derived(z.teile.length === 1);
  /** Reihen und Reihenlänge des Punktefelds (bei Kernaufgaben ggf. gedreht). */
  const zeilen = $derived(z.zeilen);
  const spalten = $derived(z.spalten);

  let schritt = $state(1);
  let falschGetippt = $state<number | null>(null);

  const FARBEN = ['var(--markise)', 'var(--stelle-z)'];
  /** Reihe → Teil, für die Färbung im Schritt „Hervorheben“. */
  const teilVonReihe = (r: number): number => (r < (z.teile[0] ?? zeilen) ? 0 : 1);

  const frage = $derived.by(() => {
    if (aufgabe.art === 'mal') return { text: kern ? `${a} · ${bb} = ?` : `${z.teile.map((t) => t * spalten).join(' + ')} = ?`, loesung: p };
    return { text: `${aufgabe.text.replace('_', '?')}`, loesung: bb };
  });

  const auswahl = $derived.by(() => {
    const rng = createRng(randomSeed());
    const kandidaten = new Set<number>([frage.loesung]);
    if (gewaehlt !== frage.loesung && gewaehlt > 0) kandidaten.add(gewaehlt);
    for (const d of [10, -10, 1, -1, 2]) {
      if (kandidaten.size >= 3) break;
      const x = frage.loesung + d;
      if (x > 0) kandidaten.add(x);
    }
    return rng.shuffle([...kandidaten]);
  });

  const SPRECHTEXT = $derived<Record<number, string>>({
    1:
      aufgabe.art === 'mal'
        ? `Du hast ${gewaehlt} gewählt. Schauen wir uns ${a} mal ${bb} als Punktefeld an: ${zeilen} Reihen mit je ${spalten} Punkten.`
        : `Du hast ${gewaehlt} gewählt. ${aufgabe.sprechtext} Das heißt: ${a} mal wie viel ist ${p}?`,
    2: kern
      ? `Zähle in ${spalten}er-Schritten. Jede Reihe hat ${spalten} Punkte.`
      : `Wir teilen das Feld: ${z.teile.map((t) => `${t} mal ${spalten} ist ${t * spalten}`).join(', und ')}.`,
    3: 'Jetzt du: Welche Zahl ist richtig?',
  });

  function sag() {
    app.sprich(SPRECHTEXT[schritt] ?? '');
  }

  function weiter() {
    app.spieleKlang('tipp');
    schritt++;
    if (app.einstellungen.automatischVorlesen) sag();
  }

  function waehle(w: number) {
    if (w === frage.loesung) {
      app.spieleKlang('richtig');
      falschGetippt = null;
      schritt = 4;
      if (app.einstellungen.automatischVorlesen) app.sprich('Genau! Jetzt kommt eine ähnliche Aufgabe.');
    } else {
      app.spieleKlang('fehler');
      falschGetippt = w;
    }
  }

  onMount(() => {
    if (app.einstellungen.automatischVorlesen) sag();
  });
</script>

<div class="hilfe tafel" role="dialog" aria-modal="true" aria-labelledby="hilfe-titel">
  <div class="markise"></div>
  <div class="inhalt">
    <div class="kopf">
      <h2 id="hilfe-titel">
        {#if schritt === 1}Schauen wir genau hin{:else if schritt === 2}So geht es leichter{:else if schritt === 3}Jetzt du{:else}Super!{/if}
      </h2>
      <button class="rund" onclick={sag} aria-label="Vorlesen"><Icon name="laut" /></button>
    </div>

    {#if schritt === 1}
      <p>
        Du hast <strong>{gewaehlt}</strong> gewählt.
        {#if aufgabe.art === 'mal'}
          <strong>{a} · {bb}</strong> heißt: {zeilen} Reihen mit je {spalten} Punkten.
        {:else}
          <strong>{aufgabe.text}</strong> heißt: {a} mal wie viel ist {p}?
        {/if}
      </p>
    {:else if schritt === 2}
      {#if kern}
        <p>Zähle in {spalten}er-Schritten: {Array.from({ length: zeilen }, (_, i) => (i + 1) * spalten).join(', ')}.</p>
      {:else}
        <p class="zerlegung">
          {#each z.teile as t, i (i)}
            <span style="color: {FARBEN[i]}">{t} · {spalten} = {t * spalten}</span>{#if i < z.teile.length - 1}{' und '}{/if}
          {/each}
        </p>
      {/if}
    {:else if schritt === 3}
      <p class="frage">{frage.text}</p>
    {:else}
      <p>
        {#if aufgabe.art === 'mal'}{a} · {bb} = <strong>{p}</strong>{:else}{a} · {bb} = {p}, also ist die Lösung <strong>{bb}</strong>{/if}.
        Jetzt kommt eine ähnliche Aufgabe.
      </p>
    {/if}

    <svg
      class="feld"
      viewBox="0 0 {spalten * 22 + 8} {zeilen * 22 + 8}"
      role="img"
      aria-label="Punktefeld mit {zeilen} Reihen zu je {spalten} Punkten"
    >
      {#each Array.from({ length: zeilen }, (_, r) => r) as r (r)}
        {#each Array.from({ length: spalten }, (_, c) => c) as c (c)}
          <circle
            cx={c * 22 + 15}
            cy={r * 22 + 15}
            r="8"
            fill={schritt >= 2 && !kern ? FARBEN[teilVonReihe(r)] : schritt >= 2 && kern && r % 2 === 0 ? 'var(--stelle-z)' : 'var(--tinte-weich)'}
          />
        {/each}
      {/each}
      {#if schritt >= 2 && !kern}
        <line x1="2" x2={spalten * 22 + 6} y1={(z.teile[0] ?? 0) * 22 + 4} y2={(z.teile[0] ?? 0) * 22 + 4} stroke="var(--tinte)" stroke-width="2.5" stroke-dasharray="5 4" />
      {/if}
    </svg>

    {#if schritt === 3}
      <div class="auswahl">
        {#each auswahl as w (w)}
          <button class="ticket" class:wackeln={falschGetippt === w} onclick={() => waehle(w)}>{w}</button>
        {/each}
      </div>
      {#if falschGetippt !== null}<p class="sanft">Schau noch einmal auf das Punktefeld.</p>{/if}
    {:else if schritt < 3}
      <button class="ticket weiter" onclick={weiter}>Weiter</button>
    {:else}
      <button class="ticket gruen weiter" onclick={onfertig}>Nochmal probieren</button>
    {/if}
  </div>
</div>

<style>
  .hilfe {
    width: min(100%, 34rem);
    max-height: 100%;
    overflow: auto;
  }
  .inhalt {
    padding: 12px 18px 18px;
    display: grid;
    gap: 12px;
  }
  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  p {
    font-size: 1.15rem;
  }
  .zerlegung,
  .frage {
    font-weight: 900;
    font-size: 1.45rem;
  }
  .feld {
    width: 100%;
    max-height: 34vh;
    justify-self: center;
  }
  .feld circle {
    transition: fill 0.4s;
  }
  .auswahl {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .auswahl .ticket {
    font-size: 1.5rem;
    min-width: 90px;
  }
  .wackeln {
    animation: wackeln 0.4s;
    --farbe: #f1f2f7;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  .sanft {
    text-align: center;
    font-size: 1rem;
  }
  .weiter {
    justify-self: end;
  }
</style>
