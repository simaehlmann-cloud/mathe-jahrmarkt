<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Formen-Sortierer: eine Form oder ein Körper (Schrägbild), beim Flächeninhalt Kästchen auf Karopapier. */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const name = $derived(String(d.name ?? ''));
  const zellen = $derived((d.zellen as [number, number][] | undefined) ?? []);
  // Abwechslung: vier Farben, Drehung und Größe kommen aus der Aufgabe
  const FARBEN = [
    ['#7b5ea7', '#a993d6'],
    ['#2f7d6d', '#7cc8b4'],
    ['#b8572f', '#f0a57e'],
    ['#2e5aa8', '#8fb0ea'],
  ] as const;
  const paar = $derived(FARBEN[Number(d.farbe ?? 0) % FARBEN.length] ?? FARBEN[0]);
  const F = $derived(paar[0]);
  const H = $derived(paar[1]);
  const dreh = $derived(Number(d.dreh ?? 0));
  const groesse = $derived(Number(d.groesse ?? 1));
  const ecken = (n: number, r = 70) => Array.from({ length: n }, (_, i) => `${100 + r * Math.cos((i * 2 * Math.PI) / n - Math.PI / 2)},${100 + r * Math.sin((i * 2 * Math.PI) / n - Math.PI / 2)}`).join(' ');
</script>

<svg viewBox="0 0 200 200" class="form" role="img" aria-label="Form">
  {#if zellen.length}
    {#each Array.from({ length: 49 }, (_, i) => i) as i (i)}<rect x={20 + (i % 7) * 24} y={20 + Math.floor(i / 7) * 24} width="24" height="24" fill="none" stroke="#cfd8ef" />{/each}
    {#each zellen as [x, y], i (i)}<rect x={20 + x * 24} y={20 + y * 24} width="24" height="24" fill={H} stroke={F} stroke-width="1.5" />{/each}
  {:else}
  <g transform="translate(100 100) rotate({dreh}) scale({groesse}) translate(-100 -100)">
  {#if name === 'Dreieck'}<polygon points={ecken(3)} fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Quadrat'}<rect x="45" y="45" width="110" height="110" fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Rechteck'}<rect x="20" y="60" width="160" height="80" fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Kreis'}<circle cx="100" cy="100" r="70" fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Fünfeck'}<polygon points={ecken(5)} fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Sechseck'}<polygon points={ecken(6)} fill={H} stroke={F} stroke-width="4" />
  {:else if name === 'Würfel'}
    <polygon points="50,80 130,80 130,160 50,160" fill={H} stroke={F} stroke-width="3" /><polygon points="50,80 80,50 160,50 130,80" fill={H} opacity="0.7" stroke={F} stroke-width="3" /><polygon points="130,80 160,50 160,130 130,160" fill={F} opacity="0.75" stroke={F} stroke-width="3" />
  {:else if name === 'Quader'}
    <polygon points="20,90 140,90 140,150 20,150" fill={H} stroke={F} stroke-width="3" /><polygon points="20,90 50,65 170,65 140,90" fill={H} opacity="0.7" stroke={F} stroke-width="3" /><polygon points="140,90 170,65 170,125 140,150" fill={F} opacity="0.75" stroke={F} stroke-width="3" />
  {:else if name === 'Kugel'}
    <circle cx="100" cy="100" r="70" fill={H} stroke={F} stroke-width="3" /><ellipse cx="100" cy="100" rx="70" ry="20" fill="none" stroke={F} stroke-width="2" stroke-dasharray="6 5" /><circle cx="75" cy="72" r="14" fill="#fff" opacity="0.5" />
  {:else if name === 'Zylinder'}
    <path d="M45 50 v100 a55 16 0 0 0 110 0 v-100" fill={H} stroke={F} stroke-width="3" /><ellipse cx="100" cy="50" rx="55" ry="16" fill={H} opacity="0.7" stroke={F} stroke-width="3" />
  {:else if name === 'Kegel'}
    <path d="M100 25 L45 150 a55 16 0 0 0 110 0 Z" fill={H} stroke={F} stroke-width="3" /><path d="M45 150 a55 16 0 0 1 110 0" fill="none" stroke={F} stroke-width="2" stroke-dasharray="6 5" />
  {:else if name === 'Pyramide'}
    <polygon points="100,25 40,150 120,170" fill={H} stroke={F} stroke-width="3" /><polygon points="100,25 120,170 170,140" fill={F} opacity="0.75" stroke={F} stroke-width="3" />
  {/if}
  </g>
  {/if}
</svg>

<style>
  .form {
    width: min(100%, 16rem, 38vh);
  }
</style>
