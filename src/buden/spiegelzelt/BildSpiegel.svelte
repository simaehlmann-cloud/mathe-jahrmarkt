<script lang="ts">
  import { GITTER, freieZellen, istGegeben, type Achse } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Spiegelkabinett: Gitter mit Achse. Gegeben ist eine Seite, die andere färbt das Kind.
   * Mit `zustand = 'richtig'` (Hilfe) wird die Lösung gezeigt.
   */
  let {
    aufgabe,
    zustand,
    gefaerbt = new Set<string>(),
    ontipp,
    falten = false,
    reduziert = false,
  }: {
    aufgabe: Aufgabe;
    zustand: '' | 'richtig' | 'falsch';
    gewaehlt: number | null;
    gefaerbt?: ReadonlySet<string>;
    ontipp?: (k: string) => void;
    /** Nach „Fertig“: Die gegebene Seite klappt an der Achse um und legt sich auf die andere. */
    falten?: boolean;
    reduziert?: boolean;
  } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const achse = $derived((d.achse as Achse | undefined) ?? 'senkrecht');
  const gegeben = $derived(new Set(((d.gegeben as [number, number][] | undefined) ?? []).map((z) => z.join(','))));
  const loesung = $derived(new Set(freieZellen(achse).filter((_, i) => ((aufgabe.antwort - 1) >> i) & 1).map((z) => z.join(','))));
  const zellen = Array.from({ length: GITTER * GITTER }, (_, i) => [i % GITTER, Math.floor(i / GITTER)] as const);
  const K = 52;
  const M = (GITTER * K) / 2;

  /** Umklappen: Drehung um 180° um die Spiegelachse (räumlich), gezeichnet von oben. */
  let t = $state(0);
  $effect(() => {
    if (!falten) {
      t = 0;
      return;
    }
    if (reduziert) {
      t = 1;
      return;
    }
    t = 0;
    let anfang = 0;
    let id = 0;
    const schritt = (jetzt: number) => {
      if (!anfang) anfang = jetzt;
      t = Math.min(1, (jetzt - anfang) / 900);
      if (t < 1) id = requestAnimationFrame(schritt);
    };
    id = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(id);
  });
  /** Punkt (x, y) um die Achse drehen; Achse durch die Mitte (senkrecht, waagerecht) bzw. die Diagonale. */
  function drehe(x: number, y: number, w: number): [number, number] {
    const u = achse === 'senkrecht' ? [0, 1] : achse === 'waagerecht' ? [1, 0] : [Math.SQRT1_2, Math.SQRT1_2];
    const px = x - M;
    const py = y - M;
    const dot = px * (u[0] ?? 0) + py * (u[1] ?? 0);
    // Rodrigues mit z = 0: Anteil längs der Achse bleibt, der Rest wird mit cos(w) gestaucht (und kippt in die Tiefe)
    const ax = dot * (u[0] ?? 0);
    const ay = dot * (u[1] ?? 0);
    return [M + ax + (px - ax) * Math.cos(w), M + ay + (py - ay) * Math.cos(w)];
  }
  const klappe = (x: number, y: number): string =>
    [
      [x * K, y * K],
      [(x + 1) * K, y * K],
      [(x + 1) * K, (y + 1) * K],
      [x * K, (y + 1) * K],
    ]
      .map(([a, b]) => drehe(a ?? 0, b ?? 0, Math.PI * t).join(','))
      .join(' ');
  const geklappt = $derived(falten && t >= 1);
</script>

<svg viewBox="-6 -6 {GITTER * K + 12} {GITTER * K + 12}" class="gitter" role="img" aria-label="Spiegelgitter">
  {#each zellen as [x, y] (`${x},${y}`)}
    {@const k = `${x},${y}`}
    {@const frei = !istGegeben(x, y, achse) && !(achse === 'schraeg' && x === y)}
    {@const an = gegeben.has(k) || (zustand === 'richtig' && !ontipp ? loesung.has(k) : gefaerbt.has(k))}
    {@const farbe = an ? (gegeben.has(k) ? '#3c78d8' : '#e23a4e') : frei ? '#fffdf7' : '#e6ebf5'}
    {#if frei && ontipp}
      <rect
        x={x * K}
        y={y * K}
        width={K}
        height={K}
        fill={farbe}
        stroke="#9cb6d6"
        stroke-width="2"
        role="button"
        tabindex="0"
        aria-label="Kästchen Spalte {x + 1}, Zeile {y + 1}{an ? ', gefärbt' : ''}"
        onclick={() => ontipp?.(k)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && ontipp?.(k)}
      />
    {:else}
      <rect x={x * K} y={y * K} width={K} height={K} fill={farbe} stroke="#9cb6d6" stroke-width="2" />
    {/if}
  {/each}
  {#if falten}
    <!-- Die gegebene Seite klappt um; danach Haken für Richtiges, Kreuz für zu viel, Rahmen für Fehlendes -->
    {#each [...gegeben] as k (k)}
      {@const [x, y] = k.split(',').map(Number)}
      <polygon points={klappe(x ?? 0, y ?? 0)} fill="#3c78d8" fill-opacity="0.55" stroke="#1f2a6b" stroke-width="2" />
    {/each}
    {#if geklappt}
      {#each zellen as [x, y] (`m${x},${y}`)}
        {@const k = `${x},${y}`}
        {#if loesung.has(k) && gefaerbt.has(k)}
          <text x={x * K + K / 2} y={y * K + K / 2 + 9} text-anchor="middle" font-size="26" font-weight="900" fill="#fff">✓</text>
        {:else if gefaerbt.has(k)}
          <text x={x * K + K / 2} y={y * K + K / 2 + 10} text-anchor="middle" font-size="30" font-weight="900" fill="#fff" stroke="#1f2a6b" stroke-width="1.5">✕</text>
        {:else if loesung.has(k)}
          <rect x={x * K + 4} y={y * K + 4} width={K - 8} height={K - 8} fill="none" stroke="#e23a4e" stroke-width="4" stroke-dasharray="7 5" />
        {/if}
      {/each}
    {/if}
  {/if}
  {#if achse === 'senkrecht'}
    <line x1={(GITTER * K) / 2} y1="-6" x2={(GITTER * K) / 2} y2={GITTER * K + 6} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {:else if achse === 'waagerecht'}
    <line x1="-6" y1={(GITTER * K) / 2} x2={GITTER * K + 6} y2={(GITTER * K) / 2} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {:else}
    <line x1="-6" y1="-6" x2={GITTER * K + 6} y2={GITTER * K + 6} stroke="#1f2a6b" stroke-width="5" stroke-dasharray="10 6" />
  {/if}
</svg>

<style>
  .gitter {
    width: min(100%, 22rem, 46vh);
  }
  rect[role='button'] {
    cursor: pointer;
  }
</style>
