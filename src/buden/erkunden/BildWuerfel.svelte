<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Würfelbauer: Würfelgebäude im Schrägbild (vorne, oben, rechts sichtbar) oder als Bauplan mit Zahlen.
   * `hoehen[y][x]`, y = 0 ist die vordere Reihe.
   */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const hoehen = $derived((d.hoehen as number[][] | undefined) ?? []);
  const zeige = $derived(String(d.zeige ?? 'bau'));
  const FARBEN = [
    ['#e86f51', '#f6a58d', '#b84a33'],
    ['#3c78d8', '#8fb3ee', '#2a559c'],
    ['#3fae6a', '#8fd8a8', '#2b7a4a'],
    ['#f0a202', '#f8cf6e', '#b87a00'],
  ] as const;
  const farbe = $derived(FARBEN[Number(d.farbe ?? 0) % FARBEN.length] ?? FARBEN[0]);
  const breite = $derived(hoehen[0]?.length ?? 0);
  const tiefe = $derived(hoehen.length);
  const maxH = $derived(Math.max(1, ...hoehen.flat()));

  // Schrägbild: Kantenlänge S, Tiefe geht schräg nach rechts oben (halbe Länge)
  const S = 30;
  const T = 18;
  const wuerfel = $derived.by(() => {
    const liste: { x: number; y: number }[] = [];
    // Malreihenfolge: hinten zuerst, dann links nach rechts, unten nach oben
    for (let ty = tiefe - 1; ty >= 0; ty--)
      for (let tx = 0; tx < breite; tx++)
        for (let z = 0; z < (hoehen[ty]?.[tx] ?? 0); z++) liste.push({ x: tx * S + ty * T, y: -z * S - ty * T });
    return liste;
  });
  const bauB = $derived(breite * S + tiefe * T + 4);
  const bauH = $derived(maxH * S + tiefe * T + 4);
  const flaeche = (x: number, y: number) => ({
    vorne: `${x},${y} ${x + S},${y} ${x + S},${y - S} ${x},${y - S}`,
    oben: `${x},${y - S} ${x + S},${y - S} ${x + S + T},${y - S - T} ${x + T},${y - S - T}`,
    rechts: `${x + S},${y} ${x + S + T},${y - T} ${x + S + T},${y - S - T} ${x + S},${y - S}`,
  });
  const beschreibung = $derived(
    zeige === 'plan'
      ? `Bauplan: ${hoehen.map((r, i) => `Reihe ${i === 0 ? 'vorne' : 'hinten'}: ${r.join(', ')}`).join('; ')}`
      : `Würfelgebäude aus Türmen: ${hoehen.map((r) => r.join(', ')).join(' und dahinter ')}`,
  );
</script>

<figure class="wuerfel" aria-label={beschreibung}>
  {#if zeige === 'plan'}
    <svg viewBox="-4 -4 {breite * 44 + 8} {tiefe * 44 + 30}" class="plan" role="img" aria-hidden="true">
      <!-- hintere Reihe oben, vordere unten; unten steht „vorne“ -->
      {#each hoehen as reihe, y (y)}
        {#each reihe as z, x (x)}
          <rect x={x * 44} y={(tiefe - 1 - y) * 44} width="44" height="44" fill={z ? farbe[1] : '#fff'} stroke="#1f2a6b" stroke-width="2" />
          {#if z}<text x={x * 44 + 22} y={(tiefe - 1 - y) * 44 + 30} text-anchor="middle">{z}</text>{/if}
        {/each}
      {/each}
      <text x={(breite * 44) / 2} y={tiefe * 44 + 20} text-anchor="middle" class="vorne">vorne</text>
    </svg>
  {:else}
    <svg viewBox="-2 {-bauH + 2} {bauB} {bauH + 6}" class="bau" role="img" aria-hidden="true">
      <polygon points="-2,2 {breite * S + 2},2 {breite * S + tiefe * T + 2},{-tiefe * T + 2} {tiefe * T - 2},{-tiefe * T + 2}" fill="#e8e1d2" />
      {#each wuerfel as w, i (i)}
        {@const f = flaeche(w.x, w.y)}
        <polygon points={f.vorne} fill={farbe[0]} stroke="#1f2a6b" stroke-width="1.5" stroke-linejoin="round" />
        <polygon points={f.oben} fill={farbe[1]} stroke="#1f2a6b" stroke-width="1.5" stroke-linejoin="round" />
        <polygon points={f.rechts} fill={farbe[2]} stroke="#1f2a6b" stroke-width="1.5" stroke-linejoin="round" />
      {/each}
    </svg>
  {/if}
</figure>

<style>
  .wuerfel {
    margin: 0;
    display: grid;
    place-items: center;
  }
  svg {
    width: min(100%, 15rem);
    max-height: 13rem;
  }
  .plan {
    width: min(100%, 13rem);
  }
  text {
    font: 900 22px Nunito, sans-serif;
    fill: #1f2a6b;
  }
  .vorne {
    font-size: 14px;
    font-weight: 700;
    fill: #5a628c;
  }
</style>
