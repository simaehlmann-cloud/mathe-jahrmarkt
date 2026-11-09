<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Umrechnungs-Memory: eine Karte liegt offen, die passende wird unten gesucht. */
  let { aufgabe, zustand, gewaehlt }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const partner = $derived(zustand === 'richtig' && gewaehlt !== null ? (aufgabe.labels?.[gewaehlt] ?? '') : '');
</script>

<div class="karten" aria-label="Memory-Karten">
  <div class="karte offen">{d.links}</div>
  <div class="karte" class:offen={partner !== ''}>{partner || '?'}</div>
  {#each [0, 1] as i (i)}<div class="karte zu" aria-hidden="true"></div>{/each}
</div>

<style>
  .karten {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 9rem));
    gap: 10px;
  }
  .karte {
    aspect-ratio: 3 / 2;
    display: grid;
    place-items: center;
    border: 3px solid var(--tinte);
    border-radius: 12px;
    font-weight: 900;
    font-size: 1.4rem;
    color: #fff;
    background: repeating-linear-gradient(45deg, #17a398 0 10px, #129087 10px 20px);
  }
  .karte.offen {
    background: var(--papier);
    color: var(--tinte);
  }
  .karte.zu {
    opacity: 0.6;
  }
</style>
