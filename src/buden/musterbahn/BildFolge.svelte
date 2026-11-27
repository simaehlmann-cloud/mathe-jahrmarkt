<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Zahlenfolgen-Zug: Lok und Waggons mit Zahlen, ein Waggon trägt das „?“.
   * Richtig: Der Waggon wird angekuppelt und der Zug fährt ab. Falsch: Die gewählte Zahl steht rot im Waggon, er wackelt.
   */
  let {
    aufgabe,
    zustand,
    gewaehlt,
    reduziert = false,
    buehne = false,
  }: {
    aufgabe: Aufgabe;
    zustand: '' | 'richtig' | 'falsch';
    gewaehlt: number | null;
    reduziert?: boolean;
    /** Nur auf der Bühne fährt der Zug ab; in der Hilfe bleibt er stehen. */
    buehne?: boolean;
  } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const folge = $derived((d.folge as number[] | undefined) ?? []);
  const luecke = $derived(Number(d.luecke ?? -1));
  const FARBEN = ['#e23a4e', '#3c78d8', '#3fae6a', '#f2a31b', '#7b5ea7'];
</script>

<div class="gleis"><div class="zug" class:abfahrt={zustand === 'richtig' && buehne && !reduziert} role="img" aria-label="Zug mit den Zahlen {folge.map((z, i) => (i === luecke ? 'Lücke' : z)).join(', ')}">
  <div class="lok" aria-hidden="true">
    <svg viewBox="0 0 60 50" width="60" height="50"
      ><rect x="4" y="16" width="40" height="24" rx="4" fill="#232a5c" /><rect x="30" y="4" width="16" height="16" rx="2" fill="#232a5c" /><rect x="8" y="6" width="8" height="12" fill="#232a5c" /><rect x="33" y="7" width="10" height="9" rx="2" fill="#bfe3ff" /><path d="M44 24 L58 40 L44 40Z" fill="#e23a4e" /><circle cx="14" cy="42" r="6" fill="#fff" stroke="#232a5c" stroke-width="3" /><circle cx="34" cy="42" r="6" fill="#fff" stroke="#232a5c" stroke-width="3" /></svg
    >
  </div>
  {#each folge as z, i (i)}
    <div class="wagen" class:luecke={i === luecke} class:geloest={i === luecke && zustand === 'richtig'} class:falsch={i === luecke && zustand === 'falsch'} style="--f: {FARBEN[i % FARBEN.length]}">
      <span>{i === luecke ? (zustand === 'richtig' ? aufgabe.antwort : zustand === 'falsch' && gewaehlt !== null ? gewaehlt : '?') : z}</span>
      <i aria-hidden="true"></i><i aria-hidden="true"></i>
    </div>
  {/each}
</div></div>

<style>
  .gleis {
    overflow: hidden;
    max-width: 100%;
  }
  .zug.abfahrt {
    animation: abfahrt 1.3s ease-in 0.45s forwards;
  }
  @keyframes abfahrt {
    to {
      transform: translateX(-130%);
    }
  }
  .wagen.falsch span {
    background: #ffd0d0;
    color: #b3122c;
    outline: 3px solid #e23a4e;
  }
  .wagen.falsch {
    animation: wackeln 0.45s 2;
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-5px) rotate(-3deg);
    }
    75% {
      transform: translateX(5px) rotate(3deg);
    }
  }
  .lok svg {
    transform: scaleX(-1);
  }
  .zug {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: center;
    gap: 14px 6px;
    padding: 8px;
  }
  .lok {
    order: -1;
  }
  .wagen {
    position: relative;
    min-width: 4.2rem;
    padding: 10px 6px 14px;
    background: var(--f);
    border: 3px solid var(--tinte);
    border-radius: 8px;
    text-align: center;
  }
  .wagen span {
    display: inline-block;
    min-width: 2.6rem;
    padding: 2px 4px;
    background: #fff;
    border-radius: 6px;
    font-weight: 900;
    font-size: 1.3rem;
    color: var(--tinte);
  }
  .wagen.luecke span {
    background: #fff4c2;
    outline: 3px dashed var(--tinte);
  }
  .wagen.geloest span {
    background: #c9f2d6;
    outline-style: solid;
  }
  .wagen i {
    position: absolute;
    bottom: -9px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--tinte);
  }
  .wagen i:first-of-type {
    left: 8px;
  }
  .wagen i:last-of-type {
    right: 8px;
  }
</style>
