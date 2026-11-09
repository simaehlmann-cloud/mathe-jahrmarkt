<script lang="ts">
  import { zahlText } from '../../domain/aufgaben/stellenwert';
  import type { Strahl } from '../../domain/aufgaben/typen';

  /**
   * Zahlenstrahl als Bild für die Hilfe. Beschriftet sind Anfang, Ende und die Beschriftungsstriche;
   * `zusatz` beschriftet weitere Striche, `marke` zeigt mit einem Pfeil auf eine Stelle (ohne Zahl, wenn `ohneZahl`),
   * `bogen` zeichnet Sprünge (z. B. „+ 50“) von Strich zu Strich.
   */
  let {
    strahl,
    marke,
    ohneZahl = false,
    zusatz = [],
    bogen = [],
  }: {
    strahl: Strahl;
    marke?: number | undefined;
    ohneZahl?: boolean;
    zusatz?: number[];
    bogen?: { von: number; bis: number; text: string }[];
  } = $props();

  const B = 320;
  const R = 18;
  const anzahl = $derived(Math.round((strahl.ende - strahl.start) / strahl.schritt));
  const x = (wert: number): number => R + ((B - 2 * R) * (wert - strahl.start)) / (strahl.ende - strahl.start);
  const striche = $derived(Array.from({ length: anzahl + 1 }, (_, i) => strahl.start + i * strahl.schritt));
  const beschriftet = (w: number): boolean =>
    w === strahl.start || w === strahl.ende || (w - strahl.start) % strahl.beschriftung === 0 || zusatz.includes(w);
</script>

<svg viewBox="0 0 {B} 92" class="strahl" role="img" aria-label="Zahlenstrahl von {strahl.start} bis {strahl.ende}">
  {#each bogen as s, i (s.von)}
    <path d="M{x(s.von)} 40 Q{(x(s.von) + x(s.bis)) / 2} {14} {x(s.bis)} 40" fill="none" stroke="var(--markise)" stroke-width="2.4" marker-end="url(#pfeil)" />
    {#if i === 0}<text x={(x(s.von) + x(s.bis)) / 2} y="12" text-anchor="middle" class="sprung">{s.text}</text>{/if}
  {/each}
  <defs>
    <marker id="pfeil" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="var(--markise)" /></marker>
  </defs>
  <line x1={R} y1="46" x2={B - R} y2="46" stroke="var(--tinte)" stroke-width="3" />
  {#each striche as w (w)}
    {@const lang = beschriftet(w)}
    <line x1={x(w)} x2={x(w)} y1={lang ? 38 : 41} y2={lang ? 54 : 51} stroke="var(--tinte)" stroke-width={lang ? 2.4 : 1.4} />
    {#if lang && w !== marke}
      <text x={x(w)} y="70" text-anchor="middle" class="zahl" class:zusatz={zusatz.includes(w)}>{zahlText(w)}</text>
    {/if}
  {/each}
  {#if marke !== undefined}
    <path d="M{x(marke) - 7} 24 L{x(marke) + 7} 24 L{x(marke)} 36 Z" fill="var(--senf)" stroke="var(--tinte)" stroke-width="1.6" />
    <text x={x(marke)} y="86" text-anchor="middle" class="zahl marke">{ohneZahl ? '?' : zahlText(marke)}</text>
  {/if}
</svg>

<style>
  .strahl {
    width: 100%;
    max-width: 30rem;
    justify-self: center;
    overflow: visible;
  }
  .zahl {
    font-size: 11px;
    font-weight: 800;
    fill: var(--tinte);
  }
  .zahl.zusatz {
    fill: var(--markise);
  }
  .zahl.marke {
    font-size: 14px;
    font-weight: 900;
    fill: var(--markise);
  }
  .sprung {
    font-size: 11px;
    font-weight: 900;
    fill: var(--markise);
  }
</style>
