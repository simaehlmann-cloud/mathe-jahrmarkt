<script lang="ts">
  import { LAB, PFEIL } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Labyrinth-Robo: Gitter mit Mauern, Roboter und Stern.
   * Nach der Antwort fährt der Roboter das gewählte Programm Pfeil für Pfeil ab:
   * an einer Mauer oder am Rand stößt er an, sonst hält er am Ende des Programms.
   */
  let {
    aufgabe,
    zustand,
    gewaehlt,
    reduziert = false,
  }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null; reduziert?: boolean } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const start = $derived<[number, number]>((d.start as [number, number] | undefined) ?? [0, 0]);
  const ziel = $derived<[number, number]>((d.ziel as [number, number] | undefined) ?? [4, 4]);
  const mauern = $derived(((d.mauern as string[] | undefined) ?? []).map((m): [number, number] => [Number(m.split(',')[0]), Number(m.split(',')[1])]));
  const mauerSet = $derived(new Set((d.mauern as string[] | undefined) ?? []));
  /** Gewähltes Programm (aus der Beschriftung des Knopfes), sonst der richtige Weg. */
  const programm = $derived(
    zustand !== '' && gewaehlt !== null && aufgabe.art === 'auswahl' ? (aufgabe.labels?.[gewaehlt] ?? String(d.weg ?? '')).replace(/\s/g, '') : '',
  );
  /** Fahrt: alle erreichten Felder und ob der Roboter angestoßen ist. */
  const fahrt = $derived.by(() => {
    const punkte: [number, number][] = [start];
    let [x, y] = start;
    for (const p of programm) {
      const r = PFEIL[p];
      if (!r) continue;
      const nx = x + r[0];
      const ny = y + r[1];
      if (nx < 0 || ny < 0 || nx >= LAB || ny >= LAB || mauerSet.has(`${nx},${ny}`)) return { punkte, anstoss: [nx, ny] as [number, number] };
      x = nx;
      y = ny;
      punkte.push([x, y]);
    }
    return { punkte, anstoss: null };
  });
  let schritt = $state(0);
  $effect(() => {
    const n = fahrt.punkte.length;
    if (!programm) {
      schritt = 0;
      return;
    }
    if (reduziert) {
      schritt = n - 1 + (fahrt.anstoss ? 1 : 0);
      return;
    }
    schritt = 0;
    const t = setInterval(() => {
      if (schritt >= n - 1 + (fahrt.anstoss ? 1 : 0)) clearInterval(t);
      else schritt++;
    }, 300);
    return () => clearInterval(t);
  });
  const K = 50;
  const m = (v: number) => v * K + K / 2;
  const bisher = $derived(fahrt.punkte.slice(0, Math.min(schritt, fahrt.punkte.length - 1) + 1));
  const robo = $derived(bisher[bisher.length - 1] ?? start);
  const fertig = $derived(programm !== '' && schritt >= fahrt.punkte.length - 1 + (fahrt.anstoss ? 1 : 0));
  const amZiel = $derived(fertig && !fahrt.anstoss && robo[0] === ziel[0] && robo[1] === ziel[1]);
  /** Beim Anstoßen ruckt der Roboter ein Stück in Richtung Mauer. */
  const ruck = $derived<[number, number]>(fertig && fahrt.anstoss ? [(fahrt.anstoss[0] - robo[0]) * 10, (fahrt.anstoss[1] - robo[1]) * 10] : [0, 0]);
</script>

<svg viewBox="0 0 {LAB * K} {LAB * K}" class="lab" role="img" aria-label="Labyrinth mit Roboter und Stern{fertig ? (amZiel ? ': Der Roboter ist am Stern' : fahrt.anstoss ? ': Der Roboter stößt an' : ': Der Roboter hält nicht am Stern') : ''}">
  {#each Array.from({ length: LAB * LAB }, (_, i) => i) as i (i)}
    <rect x={(i % LAB) * K} y={Math.floor(i / LAB) * K} width={K} height={K} fill="#fffdf7" stroke="#cfd8ef" stroke-width="2" />
  {/each}
  {#each mauern as [x, y], i (i)}<rect x={x * K + 3} y={y * K + 3} width={K - 6} height={K - 6} rx="4" fill="#b9763f" stroke="#1f2a6b" stroke-width="2" />{/each}
  {#if bisher.length > 1}
    <polyline points={bisher.map(([x, y]) => `${m(x)},${m(y)}`).join(' ')} fill="none" stroke={fertig && !amZiel ? '#e23a4e' : '#3fae6a'} stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 10" />
  {/if}
  <text x={m(ziel[0])} y={m(ziel[1]) + 12} text-anchor="middle" font-size="34" fill="#ffc62b" stroke="#1f2a6b" stroke-width="1.5" class:funkeln={amZiel}>★</text>
  <g class="robo" style="transform: translate({m(robo[0]) + ruck[0]}px, {m(robo[1]) + ruck[1]}px)">
    <rect x="-16" y="-14" width="32" height="28" rx="7" fill={fertig && !amZiel ? '#e23a4e' : '#3c78d8'} stroke="#1f2a6b" stroke-width="2.5" />
    <circle cx="-6" cy="-2" r="4" fill="#fff" /><circle cx="6" cy="-2" r="4" fill="#fff" />
    <line x1="0" y1="-14" x2="0" y2="-22" stroke="#1f2a6b" stroke-width="2.5" /><circle cx="0" cy="-23" r="3" fill="#e23a4e" />
  </g>
  {#if fertig && fahrt.anstoss}
    <text x={m(robo[0]) + ruck[0] * 2.2} y={m(robo[1]) + ruck[1] * 2.2 - 18} text-anchor="middle" font-size="16" font-weight="900" fill="#e23a4e" class="rand">Bumm!</text>
  {:else if fertig && !amZiel}
    <text x={m(robo[0]) + 20} y={m(robo[1]) - 16} text-anchor="middle" font-size="22" font-weight="900" fill="#e23a4e" class="rand">?</text>
  {/if}
</svg>

<style>
  .lab {
    width: min(100%, 20rem, 40vh);
  }
  .robo {
    transition: transform 0.25s ease-in-out;
  }
  .rand {
    paint-order: stroke;
    stroke: #fffdf7;
    stroke-width: 4px;
  }
  .funkeln {
    transform-box: fill-box;
    transform-origin: center;
    animation: funkeln 0.6s ease-in-out 2;
  }
  @keyframes funkeln {
    50% {
      transform: scale(1.4) rotate(20deg);
    }
  }
</style>
