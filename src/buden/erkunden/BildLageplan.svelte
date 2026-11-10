<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { PLAN_GROESSE, SPALTEN, feld, type PlanOrt } from '../../domain/aufgaben/erkunden';
  /** Lageplan: 5 × 5 Planquadrate mit Buchstaben oben und Zahlen an der Seite, darin die Stände. */
  let { aufgabe }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const orte = $derived((d.orte as PlanOrt[] | undefined) ?? []);
  const start = $derived(d.start as [number, number] | undefined);
  const linie = $derived(d.linie as [number, number, number, number] | undefined);
  const massstab = $derived(d.massstab as number | undefined);
  const Z = 44;
  const R = 24;
  const mitte = (i: number) => R + i * Z + Z / 2;
  const reihen = Array.from({ length: PLAN_GROESSE }, (_, i) => i);
</script>

<figure class="plan" aria-label="Lageplan: {orte.map((o) => `${o.name} in ${feld(o.x, o.y)}`).join(', ')}">
  <svg viewBox="0 0 {R + PLAN_GROESSE * Z + 4} {R + PLAN_GROESSE * Z + (massstab ? 30 : 4)}" role="img" aria-hidden="true">
    <rect x={R} y={R} width={PLAN_GROESSE * Z} height={PLAN_GROESSE * Z} fill="#e9f5df" stroke="#1f2a6b" stroke-width="2" />
    {#each reihen as i (i)}
      <text x={mitte(i)} y="17" class="kopf">{SPALTEN[i]}</text>
      <text x="12" y={mitte(i) + 6} class="kopf">{i + 1}</text>
      {#if i > 0}
        <line x1={R + i * Z} y1={R} x2={R + i * Z} y2={R + PLAN_GROESSE * Z} stroke="#9fb38f" />
        <line x1={R} y1={R + i * Z} x2={R + PLAN_GROESSE * Z} y2={R + i * Z} stroke="#9fb38f" />
      {/if}
    {/each}
    {#if linie}
      <line x1={mitte(linie[0])} y1={mitte(linie[1])} x2={mitte(linie[2])} y2={mitte(linie[3])} stroke="#e23a4e" stroke-width="3" stroke-dasharray="6 4" />
    {/if}
    {#each orte as o (o.name)}
      {@const st = start && start[0] === o.x && start[1] === o.y}
      <rect x={R + o.x * Z + 3} y={R + o.y * Z + 3} width={Z - 6} height={Z - 6} rx="7" fill={o.farbe} stroke={st ? '#f2b705' : '#1f2a6b'} stroke-width={st ? 4 : 1.5} />
      <text x={mitte(o.x)} y={mitte(o.y) + 4} class="ort" font-size="10" textLength={o.name.length > 5 ? Z - 10 : undefined} lengthAdjust="spacingAndGlyphs">{o.name}</text>
    {/each}
    {#if massstab}
      <line x1={R} y1={R + PLAN_GROESSE * Z + 16} x2={R + Z} y2={R + PLAN_GROESSE * Z + 16} stroke="#1f2a6b" stroke-width="3" />
      <line x1={R} y1={R + PLAN_GROESSE * Z + 10} x2={R} y2={R + PLAN_GROESSE * Z + 22} stroke="#1f2a6b" stroke-width="2" />
      <line x1={R + Z} y1={R + PLAN_GROESSE * Z + 10} x2={R + Z} y2={R + PLAN_GROESSE * Z + 22} stroke="#1f2a6b" stroke-width="2" />
      <text x={R + Z + 8} y={R + PLAN_GROESSE * Z + 21} class="mass">= {massstab} m</text>
    {/if}
  </svg>
</figure>

<style>
  .plan {
    margin: 0;
    display: grid;
    place-items: center;
  }
  svg {
    width: min(100%, 19rem);
  }
  .kopf {
    font: 900 15px Nunito, sans-serif;
    fill: #1f2a6b;
    text-anchor: middle;
  }
  .ort {
    font-family: Nunito, sans-serif;
    font-weight: 900;
    fill: #fff;
    text-anchor: middle;
  }
  .mass {
    font: 800 13px Nunito, sans-serif;
    fill: #1f2a6b;
  }
</style>
