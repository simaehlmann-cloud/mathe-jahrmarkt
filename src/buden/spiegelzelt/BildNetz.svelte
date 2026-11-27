<script lang="ts">
  import { flaechen } from '../../domain/aufgaben/raum';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Würfelnetz-Werkstatt: das Netz auf Karopapier; bei „gegenüber“ mit Buchstaben.
   * Nach der Antwort faltet sich das Netz wirklich zusammen (3D): Klappt es, entsteht ein Würfel.
   * Klappt es nicht, leuchten die Felder rot, die übereinander landen. Danach dreht sich der Würfel einmal.
   */
  let {
    aufgabe,
    zustand,
    gewaehlt,
    reduziert = false,
  }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null; reduziert?: boolean } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const netz = $derived((d.netz as [number, number][] | undefined) ?? []);
  const breite = $derived(Math.max(...netz.map(([x]) => x)) + 1);
  const hoehe = $derived(Math.max(...netz.map(([, y]) => y)) + 1);
  const buchstaben = $derived(aufgabe.art === 'auswahl' && aufgabe.form === 'gegenueber');
  const K = 54;
  const B = ['A', 'B', 'C', 'D', 'E', 'F'];

  /** Baum zum Falten: jedes Feld hängt an einem Nachbarn, der näher am ersten Feld liegt. */
  const baum = $derived.by(() => {
    const kinder: number[][] = netz.map(() => []);
    const besucht = new Set([0]);
    const schlange = [0];
    while (schlange.length) {
      const i = schlange.shift() ?? 0;
      const [x, y] = netz[i] ?? [0, 0];
      netz.forEach(([a, b], j) => {
        if (!besucht.has(j) && Math.abs(a - x) + Math.abs(b - y) === 1) {
          besucht.add(j);
          kinder[i]?.push(j);
          schlange.push(j);
        }
      });
    }
    return kinder;
  });
  /** Felder, die beim Falten auf derselben Würfelseite landen. */
  const doppelt = $derived.by(() => {
    const w = flaechen(netz);
    return new Set(w.flatMap((f, i) => (w.filter((g) => g === f).length > 1 ? [i] : [])));
  });
  /** Gefaltet wird nur mit Übergang; zurück ins flache Netz (neue Aufgabe) sofort, sonst entfaltet sich das neue Netz sichtbar aus dem alten Würfel. */
  const gefaltet = $derived(zustand !== '');
  // Neue Aufgabe: sofort flach (ohne Übergang), sonst würde sich das neue Netz sichtbar aus dem alten Würfel entfalten
  const gewaehlterBuchstabe = $derived(gewaehlt !== null && aufgabe.art === 'auswahl' ? B.indexOf(aufgabe.labels?.[gewaehlt] ?? '') : -1);

  function farbe(i: number): string {
    if (buchstaben) {
      if (i === d.frage) return '#ffe57a';
      if (zustand === 'richtig' && i === d.gegen) return '#9be3b0';
      if (zustand === 'falsch' && i === gewaehlterBuchstabe) return '#ffb3b3';
      return '#cdefff';
    }
    if (gefaltet && doppelt.has(i)) return '#ff9b9b';
    return '#cdefff';
  }
  /** Drehung eines Feldes um die Kante zu seinem Elternfeld (nach hinten geklappt). */
  function klappe(eltern: number, i: number): { ursprung: string; drehung: string } {
    const [ex, ey] = netz[eltern] ?? [0, 0];
    const [x, y] = netz[i] ?? [0, 0];
    if (x > ex) return { ursprung: 'left center', drehung: 'rotateY(90deg)' };
    if (x < ex) return { ursprung: 'right center', drehung: 'rotateY(-90deg)' };
    if (y > ey) return { ursprung: 'center top', drehung: 'rotateX(-90deg)' };
    return { ursprung: 'center bottom', drehung: 'rotateX(90deg)' };
  }
  const start = $derived<[number, number]>(netz[0] ?? [0, 0]);
</script>

{#snippet feld(i: number, eltern: number)}
  {@const [x, y] = netz[i] ?? [0, 0]}
  {@const [ex, ey] = eltern < 0 ? [0, 0] : (netz[eltern] ?? [0, 0])}
  {@const k = eltern < 0 ? null : klappe(eltern, i)}
  <div
    class="feld"
    style="left: {eltern < 0 ? x * K : (x - ex) * K}px; top: {eltern < 0 ? y * K : (y - ey) * K}px; width: {K}px; height: {K}px; background: {farbe(i)};
      transform-origin: {k?.ursprung ?? 'center'}; transform: {gefaltet && k ? k.drehung : 'none'}; transition-duration: {reduziert || !gefaltet ? 0 : 0.9}s; transition-delay: {reduziert || !gefaltet ? 0 : 0.15}s"
  >
    {#if buchstaben}<span>{B[i]}</span>{/if}
    {#each baum[i] ?? [] as kind (kind)}{@render feld(kind, i)}{/each}
  </div>
{/snippet}

<div class="buehne" role="img" aria-label={gefaltet ? (doppelt.size ? 'Gefaltetes Netz: Felder liegen übereinander' : 'Gefaltetes Netz: ein Würfel') : 'Würfelnetz aus 6 Quadraten'} style="width: {breite * K + 20}px; height: {hoehe * K + 20}px">
  <div
    class="welt"
    style="width: {breite * K}px; height: {hoehe * K}px; transform-origin: {start[0] * K + K / 2}px {start[1] * K + K / 2}px; transition-duration: {reduziert || !gefaltet ? 0 : 0.9}s;
      transform: {gefaltet ? `translate(${(breite * K) / 2 - start[0] * K - K / 2}px, ${(hoehe * K) / 2 - start[1] * K - K / 2}px) scale(1.6) rotateX(-28deg) rotateY(-32deg)` : 'none'}"
  >
    <div class="dreh" class:an={gefaltet && !reduziert} style="width: {breite * K}px; height: {hoehe * K}px; transform-origin: {start[0] * K + K / 2}px {start[1] * K + K / 2}px -{K / 2}px">
      {@render feld(0, -1)}
    </div>
  </div>
</div>

<style>
  .buehne {
    position: relative;
    max-width: 100%;
    perspective: 900px;
    padding: 10px;
    box-sizing: border-box;
  }
  .welt {
    position: relative;
    transform-style: preserve-3d;
    transition-property: transform;
    transition-timing-function: ease-in-out;
  }
  .dreh {
    position: relative;
    transform-style: preserve-3d;
  }
  /* Nach dem Falten dreht sich der Würfel einmal, damit man alle Seiten sieht */
  .dreh.an {
    animation: rundum 1.5s ease-in-out 1.05s both;
  }
  @keyframes rundum {
    to {
      transform: rotateY(360deg);
    }
  }
  .feld {
    position: absolute;
    box-sizing: border-box;
    /* Rand als Schatten innen: Ein echter Rahmen würde jedes angehängte Feld um seine Breite verschieben */
    box-shadow: inset 0 0 0 3px #1f2a6b;
    transform-style: preserve-3d;
    transition-property: transform, background-color;
    transition-timing-function: ease-in-out;
    display: grid;
    place-items: center;
  }
  .feld span {
    font-size: 24px;
    font-weight: 900;
    color: #1f2a6b;
    pointer-events: none;
  }
</style>
