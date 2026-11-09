<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Uhr-Karussell: Bahnhofsuhr. Bei Zeitspannen zeigt die Uhr die Abfahrt. */
  let { aufgabe, zustand, gewaehlt }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const spanne = $derived(aufgabe.art === 'auswahl' && aufgabe.form === 'spanne');
  // Nach richtiger Antwort bei Zeitspannen: Uhr springt auf die Ankunft
  const min = $derived(spanne && zustand === 'richtig' && gewaehlt !== null ? gewaehlt : Number(d.min ?? 0));
  const m = $derived(min % 60);
  const h = $derived((min / 60) % 12);
  const zeiger = (winkel: number, laenge: number) => {
    const r = ((winkel - 90) * Math.PI) / 180;
    return { x: 100 + Math.cos(r) * laenge, y: 100 + Math.sin(r) * laenge };
  };
  const lang = $derived(zeiger(m * 6, 68));
  const kurz = $derived(zeiger(h * 30, 44));
</script>

<svg viewBox="0 0 200 200" class="bild" role="img" aria-label="Uhr">
  <circle cx="100" cy="100" r="92" fill="#fffdf7" stroke="#1f2a6b" stroke-width="6" />
  {#each Array.from({ length: 60 }, (_, i) => i) as i (i)}
    {@const a = zeiger(i * 6, 86)}
    {@const b = zeiger(i * 6, i % 5 === 0 ? 74 : 81)}
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1f2a6b" stroke-width={i % 5 === 0 ? 3 : 1.2} />
  {/each}
  {#each Array.from({ length: 12 }, (_, i) => i + 1) as z (z)}
    {@const p = zeiger(z * 30, 62)}
    <text x={p.x} y={p.y + 6} text-anchor="middle" font-size="17" font-weight="900" fill="#1f2a6b">{z}</text>
  {/each}
  <line x1="100" y1="100" x2={kurz.x} y2={kurz.y} stroke="#1f2a6b" stroke-width="8" stroke-linecap="round" class="zeiger" />
  <line x1="100" y1="100" x2={lang.x} y2={lang.y} stroke="#e23a4e" stroke-width="5" stroke-linecap="round" class="zeiger" />
  <circle cx="100" cy="100" r="7" fill="#ffc62b" stroke="#1f2a6b" stroke-width="2" />
</svg>

<style>
  .bild {
    width: min(100%, 15rem);
    max-height: 100%;
  }
</style>
