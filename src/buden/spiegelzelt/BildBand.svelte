<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Zelt-Dekorateur: Zeltbahn mit Bandornament; Lücke als „?“, beim Fehlerfinden mit Nummern. */
  let { aufgabe, zustand, gewaehlt }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const folge = $derived((d.folge as string[] | undefined) ?? []);
  const luecke = $derived(Number(d.luecke ?? -1));
  const nummern = $derived(d.nummern === true);
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#7b5ea7'];
</script>

<div class="bahn" role="img" aria-label="Bandornament: {folge.map((z, i) => (i === luecke ? 'Lücke' : z)).join(' ')}">
  {#each folge as z, i (i)}
    <div class="feld" class:luecke={i === luecke} class:markiert={nummern && gewaehlt === i + 1}>
      <span style="color: {FARBEN[i % 2 === 0 ? 0 : 1]}">{i === luecke ? (zustand === 'richtig' && gewaehlt !== null ? (aufgabe.labels?.[gewaehlt] ?? '?') : '?') : z}</span>
      {#if nummern}<small>{i + 1}</small>{/if}
    </div>
  {/each}
</div>

<style>
  .bahn {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    padding: 14px 10px;
    background: repeating-linear-gradient(90deg, #fffdf7 0 30px, #f6e7c8 30px 60px);
    border-top: 10px solid #e23a4e;
    border-bottom: 10px solid #e23a4e;
    border-radius: 8px;
  }
  .feld {
    width: clamp(34px, 9vw, 52px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    position: relative;
    font-size: clamp(1.6rem, 6vw, 2.4rem);
    border-radius: 8px;
  }
  .feld.luecke {
    border: 3px dashed #1f2a6b;
    background: #fff;
  }
  .feld.markiert {
    outline: 3px solid #e23a4e;
  }
  small {
    position: absolute;
    bottom: -14px;
    font-size: 0.7rem;
    font-weight: 900;
  }
</style>
