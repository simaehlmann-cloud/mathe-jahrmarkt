<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { zehntel } from '../../domain/aufgaben/klasse5';
  /** Hau den Lukas: senkrechte Skala von `von` bis `von + 1` in Zehnteln, der Puck steht bei `pos` Zehnteln. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const von = $derived(Number(d.von ?? 0));
  const pos = $derived(d.pos === undefined ? null : Number(d.pos));
  const marken = $derived((d.marken as number[] | undefined) ?? []);
  const namen = $derived((d.namen as string[] | undefined) ?? []);
  const H = 260;
  const y = (t: number): number => H - (t / 10) * H;
  /** Beschriftungen nicht übereinander: von oben nach unten mindestens 22 px Abstand. */
  const schilder = $derived.by(() => {
    const r = marken.map((m, i) => ({ i, y: H - (m / 10) * H }));
    r.sort((p, q) => p.y - q.y);
    for (let k = 1; k < r.length; k++) {
      const a = r[k - 1];
      const b = r[k];
      if (a && b && b.y - a.y < 22) b.y = a.y + 22;
    }
    return r;
  });
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#7b5ea7'];
</script>

<svg viewBox="-70 -24 230 {H + 70}" width="220" role="img" aria-label="Skala von {von} bis {von + 1} in Zehnteln">
  <rect x="-12" y="-8" width="24" height={H + 16} rx="10" fill="#fff" stroke="#232a5c" stroke-width="3" />
  {#each Array(11) as _, k (k)}
    <line x1={k % 5 === 0 ? -22 : -14} x2="14" y1={y(k)} y2={y(k)} stroke="#232a5c" stroke-width={k % 5 === 0 ? 3 : 2} />
  {/each}
  <text x="-30" y={y(0) + 6} text-anchor="end" font-size="20" font-weight="900" fill="#232a5c">{von}</text>
  <text x="-30" y={y(10) + 6} text-anchor="end" font-size="20" font-weight="900" fill="#232a5c">{von + 1}</text>
  <circle cx="0" cy={y(10) - 4} r="14" fill="#f2c41b" stroke="#232a5c" stroke-width="3" />
  {#if pos !== null}
    <g transform="translate(0 {y(pos)})">
      <rect x="-20" y="-8" width="40" height="16" rx="6" fill="#e23a4e" stroke="#232a5c" stroke-width="3" />
      {#if d.zeige === false && zustand === 'richtig'}<text x="30" y="7" font-size="20" font-weight="900" fill="#232a5c">{aufgabe.labels?.[aufgabe.antwort]}</text>{/if}
      {#if d.zeige !== false && zustand === 'richtig'}<text x="30" y="7" font-size="20" font-weight="900" fill="#232a5c">{zehntel(aufgabe.antwort)}</text>{/if}
    </g>
  {/if}
  {#if zustand === 'richtig'}
    {#each schilder as { i, y: ys } (i)}
      <polygon points="16,{y(marken[i] ?? 0)} 30,{ys - 7} 30,{ys + 7}" fill={FARBEN[i]} />
      <text x="36" y={ys + 6} font-size="17" font-weight="900" fill={FARBEN[i]}>{namen[i]}</text>
    {/each}
  {/if}
  <rect x="-40" y={H + 14} width="80" height="22" rx="4" fill="#b8763f" stroke="#232a5c" stroke-width="3" />
</svg>

<style>
  svg {
    max-height: 40vh;
    width: auto;
  }
</style>
