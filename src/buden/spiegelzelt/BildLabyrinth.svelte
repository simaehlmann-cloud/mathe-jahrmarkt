<script lang="ts">
  import { LAB, PFEIL } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Labyrinth-Robo: Gitter mit Mauern, Roboter und Stern; nach richtiger Antwort der Weg. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const start = $derived<[number, number]>((d.start as [number, number] | undefined) ?? [0, 0]);
  const ziel = $derived<[number, number]>((d.ziel as [number, number] | undefined) ?? [4, 4]);
  const mauern = $derived(((d.mauern as string[] | undefined) ?? []).map((m): [number, number] => [Number(m.split(',')[0]), Number(m.split(',')[1])]));
  const weg = $derived.by(() => {
    const punkte: [number, number][] = [start];
    let x: number = start[0];
    let y: number = start[1];
    for (const p of String(d.weg ?? '')) {
      const r = PFEIL[p];
      if (!r) continue;
      x += r[0];
      y += r[1];
      punkte.push([x, y]);
    }
    return punkte;
  });
  const K = 50;
  const m = (v: number) => v * K + K / 2;
</script>

<svg viewBox="0 0 {LAB * K} {LAB * K}" class="lab" role="img" aria-label="Labyrinth mit Roboter und Stern">
  {#each Array.from({ length: LAB * LAB }, (_, i) => i) as i (i)}
    <rect x={(i % LAB) * K} y={Math.floor(i / LAB) * K} width={K} height={K} fill="#fffdf7" stroke="#cfd8ef" stroke-width="2" />
  {/each}
  {#each mauern as [x, y], i (i)}<rect x={x * K + 3} y={y * K + 3} width={K - 6} height={K - 6} rx="4" fill="#b9763f" stroke="#1f2a6b" stroke-width="2" />{/each}
  {#if zustand === 'richtig'}
    <polyline points={weg.map(([x, y]) => `${m(x)},${m(y)}`).join(' ')} fill="none" stroke="#3fae6a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 10" />
  {/if}
  <text x={m(ziel[0])} y={m(ziel[1]) + 12} text-anchor="middle" font-size="34" fill="#ffc62b" stroke="#1f2a6b" stroke-width="1.5">★</text>
  <g transform="translate({m(start[0])} {m(start[1])})">
    <rect x="-16" y="-14" width="32" height="28" rx="7" fill="#3c78d8" stroke="#1f2a6b" stroke-width="2.5" />
    <circle cx="-6" cy="-2" r="4" fill="#fff" /><circle cx="6" cy="-2" r="4" fill="#fff" />
    <line x1="0" y1="-14" x2="0" y2="-22" stroke="#1f2a6b" stroke-width="2.5" /><circle cx="0" cy="-23" r="3" fill="#e23a4e" />
  </g>
</svg>

<style>
  .lab {
    width: min(100%, 20rem, 40vh);
  }
</style>
