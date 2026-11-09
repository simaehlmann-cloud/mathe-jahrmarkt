<script lang="ts">
  import { euro } from '../../domain/aufgaben/baukasten';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Süßigkeitenkasse: Münzen und Scheine aus der Kasse auf den Tresen legen (antippen), mit „Bezahlen“ abgeben.
   * Die Summe wird nicht angezeigt: Das Kind zählt selbst. Antippen auf dem Tresen legt eine Münze zurück.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();
  let a = $state<Aufgabe | undefined>();
  let gelegt = $state<number[]>([]);
  let gesperrt = $state(true);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');
  const GELD = [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const d = $derived(a?.art === 'auswahl' ? a.daten : {});
  const modus = $derived(String(d.modus ?? 'bezahlen'));
  // Bei kleinen Beträgen keine großen Scheine anbieten
  const kasse = $derived(GELD.filter((g) => g <= Math.max(500, Number(a?.antwort ?? 0))));
  const summe = $derived(gelegt.reduce((s, x) => s + x, 0));

  export function zeige(neu: Aufgabe) {
    a = neu;
    gelegt = [];
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('jubel');
    await warte(900);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }
  function lege(g: number) {
    if (gesperrt || gelegt.length >= 30) return;
    gelegt = [...gelegt, g].sort((x, y) => y - x);
    zustand = '';
    kontext.klang('pop');
  }
  function zurueck(i: number) {
    if (gesperrt) return;
    gelegt = gelegt.filter((_, j) => j !== i);
    zustand = '';
  }
  function abgeben() {
    if (gesperrt || gelegt.length === 0) return;
    kontext.onAntwort(summe);
  }
  const text = (g: number): string => (g >= 100 ? `${g / 100} €` : `${g} ct`);
  const art = (g: number): string => (g >= 500 ? 'schein' : g >= 100 ? 'euro' : g >= 10 ? 'gold' : 'kupfer');
</script>

{#if a}
  <div class="kasse spielflaeche" class:falsch={zustand === 'falsch'} class:richtig={zustand === 'richtig'}>
    <div class="zettel" aria-label="Einkauf">
      {#if modus === 'einkauf'}
        {#each (d.waren as string[]) ?? [] as w, i (w)}<p><span>{w}</span><b>{euro((d.preise as number[])[i] ?? 0)}</b></p>{/each}
        <p class="summe"><span>Zusammen</span><b>?</b></p>
      {:else if modus === 'rueckgeld'}
        <p><span>{d.ware}</span><b>{euro(Number(d.preis))}</b></p>
        <p><span>Kunde gibt</span><b>{euro(Number(d.schein))}</b></p>
        <p class="summe"><span>Rückgeld</span><b>?</b></p>
      {:else}
        <p><span>{d.ware}</span><b>{euro(Number(d.preis))}</b></p>
        <p class="summe"><span>Passend bezahlen</span><b>?</b></p>
      {/if}
    </div>

    <div class="tresen" aria-label="Auf dem Tresen: {gelegt.length ? gelegt.map(text).join(', ') : 'nichts'}">
      {#if gelegt.length === 0}<span class="leer">{modus === 'rueckgeld' ? 'Lege das Rückgeld hierher' : 'Lege das Geld hierher'}</span>{/if}
      {#each gelegt as g, i (i)}
        <button class="geld {art(g)}" onclick={() => zurueck(i)} aria-label="{text(g)} zurücklegen" disabled={gesperrt}>{text(g)}</button>
      {/each}
      {#if zustand === 'richtig'}<span class="stempel">Stimmt!</span>{/if}
    </div>

    <div class="schublade" role="group" aria-label="Kasse">
      {#each kasse as g (g)}
        <button class="geld {art(g)}" onclick={() => lege(g)} disabled={gesperrt} aria-label="{text(g)} hinlegen">{text(g)}</button>
      {/each}
    </div>

    <button class="ticket gruen" onclick={abgeben} disabled={gesperrt || gelegt.length === 0}>{modus === 'rueckgeld' ? 'Rückgeld geben' : 'Bezahlen'}</button>
  </div>
{/if}

<style>
  .kasse {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 10px 12px 14px;
    background: linear-gradient(#fdf1dc, #f4dfb8);
  }
  .zettel {
    width: min(100%, 22rem);
    background: #fff;
    border: 3px solid var(--tinte);
    border-radius: 6px;
    padding: 6px 12px;
    box-shadow: 4px 4px 0 rgb(31 42 107 / 0.15);
    transform: rotate(-1deg);
  }
  .zettel p {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin: 2px 0;
    font-weight: 800;
    font-size: 1.05rem;
  }
  .zettel .summe {
    border-top: 2px dashed var(--tinte);
    padding-top: 4px;
    color: var(--markise-dunkel);
  }
  .tresen {
    position: relative;
    width: min(100%, 26rem);
    min-height: 92px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: flex-start;
    justify-content: center;
    padding: 10px;
    background: #b9763f;
    border: 4px solid var(--holz-dunkel);
    border-radius: 12px;
    box-shadow: inset 0 -6px 0 rgb(0 0 0 / 0.15);
  }
  .falsch .tresen {
    animation: wackeln 0.4s;
  }
  .leer {
    align-self: center;
    color: #fff3dc;
    font-weight: 800;
  }
  .stempel {
    position: absolute;
    right: 10px;
    bottom: 6px;
    transform: rotate(-8deg);
    padding: 2px 10px;
    border: 3px solid #fff;
    border-radius: 8px;
    color: #fff;
    font-weight: 900;
    font-size: 1.3rem;
    background: var(--wiese);
  }
  .schublade {
    width: min(100%, 26rem);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    padding: 8px;
    background: #3a3d4f;
    border-radius: 12px;
  }
  .geld {
    display: grid;
    place-items: center;
    font: inherit;
    font-weight: 900;
    color: var(--tinte);
    border: 3px solid var(--tinte);
    padding: 0;
  }
  .geld.kupfer,
  .geld.gold,
  .geld.euro {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    font-size: 0.9rem;
  }
  .geld.kupfer {
    background: radial-gradient(circle at 35% 30%, #f0b27a, #c26a2c);
    width: 46px;
    height: 46px;
  }
  .geld.gold {
    background: radial-gradient(circle at 35% 30%, #ffe28a, #d9a520);
  }
  .geld.euro {
    background: radial-gradient(circle at 35% 30%, #f3f4f8 40%, #ffd75e 41%, #d9a520);
  }
  .geld.schein {
    width: 78px;
    height: 46px;
    border-radius: 6px;
    font-size: 1rem;
    background: linear-gradient(135deg, #8fd3a8, #4aa36d);
  }
  .tresen .geld {
    transform: scale(0.9);
  }
  .geld:active:not([disabled]) {
    transform: scale(0.92);
  }
  @keyframes wackeln {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
</style>
