<script lang="ts">
  import { ziffer } from '../../domain/aufgaben/schriftlich';
  import type { Aufgabe, SchriftlichAufgabe } from '../../domain/aufgaben/typen';
  import { warte } from '../gemeinsam/svelteSzene';
  import type { SzenenKontext } from '../typen';

  /**
   * Rechen-Werkstatt: Rechnung auf Karopapier. Das Kind schreibt das Ergebnis Ziffer für Ziffer
   * von rechts nach links (Ziffernfeld oder Tastatur). Die Merkzeile für Überträge ist ein Notizfeld:
   * Antippen schaltet 1 → 2 → leer; sie wird nicht bewertet.
   * Bei Mal gibt es zwei Zeilen für die Teilprodukte, ebenfalls als Notiz.
   */
  let { kontext }: { kontext: SzenenKontext } = $props();

  let a = $state<SchriftlichAufgabe | undefined>();
  let gesperrt = $state(true);
  /** Eingaben je Zeile als Ziffern von rechts (Index 0 = Einer). */
  let ergebnis = $state<(number | null)[]>([]);
  let teil1 = $state<(number | null)[]>([]);
  let teil2 = $state<(number | null)[]>([]);
  let merk = $state<number[]>([]);
  let zeile = $state<'ergebnis' | 'teil1' | 'teil2'>('ergebnis');
  let pos = $state(0);
  let zustand = $state<'' | 'richtig' | 'falsch'>('');

  /** Breite des Rasters in Kästchen (Ziffern plus Rechenzeichen). */
  /** Eine Spalte mehr als nötig, damit die Zahl der Kästchen das Ergebnis nicht verrät. */
  const breite = $derived(a ? Math.max(String(a.antwort).length, ...a.zahlen.map((z) => String(z).length)) + 2 : 5);
  const spalten = $derived(Array.from({ length: breite }, (_, i) => breite - 1 - i));
  const mal = $derived(a?.op === '·');

  const zeilenLaenge = (_z: typeof zeile): number => breite - 1;
  const leer = (n: number) => Array.from({ length: n }, () => null as number | null);

  export function zeige(neu: Aufgabe) {
    if (neu.art !== 'schriftlich') return;
    a = neu;
    const n = Math.max(String(neu.antwort).length, ...neu.zahlen.map((z) => String(z).length)) + 2;
    ergebnis = leer(n);
    teil1 = leer(n);
    teil2 = leer(n);
    merk = Array.from({ length: n }, () => 0);
    zeile = neu.op === '·' ? 'teil1' : 'ergebnis';
    // Teilprodukt mit den Zehnern ist um eine Stelle verschoben: erstes Kästchen ist die Zehnerstelle
    pos = 0;
    zustand = '';
  }
  export async function treffer() {
    zustand = 'richtig';
    kontext.klang('richtig');
    await warte(700);
  }
  export async function daneben() {
    zustand = 'falsch';
    kontext.klang('fehler');
    await warte(700);
  }
  export function sperre(x: boolean) {
    gesperrt = x;
  }

  const reihe = (z: typeof zeile) => (z === 'ergebnis' ? ergebnis : z === 'teil1' ? teil1 : teil2);

  function setze(z: typeof zeile, i: number, wert: number | null) {
    const r = [...reihe(z)];
    r[i] = wert;
    if (z === 'ergebnis') ergebnis = r;
    else if (z === 'teil1') teil1 = r;
    else teil2 = r;
  }

  function tippe(d: number) {
    if (gesperrt || !a) return;
    zustand = '';
    if (pos >= zeilenLaenge(zeile)) return;
    setze(zeile, pos, d);
    pos++;
    kontext.klang('tipp');
  }
  function zurueck() {
    if (gesperrt) return;
    zustand = '';
    if (pos > 0) pos--;
    setze(zeile, pos, null);
  }
  function waehle(z: typeof zeile, i: number) {
    if (gesperrt) return;
    zeile = z;
    pos = i;
  }
  function merken(i: number) {
    if (gesperrt) return;
    const m = [...merk];
    m[i] = ((m[i] ?? 0) + 1) % 3;
    merk = m;
  }

  /** Zahl aus der Ergebniszeile (Lücken zählen als 0, leere Zeile = nichts). */
  const zahlAus = (r: (number | null)[]): number | null => {
    if (r.every((x) => x === null)) return null;
    return r.reduce<number>((s, x, i) => s + (x ?? 0) * 10 ** i, 0);
  };
  function fertig() {
    if (gesperrt || !a) return;
    const n = zahlAus(ergebnis);
    if (n === null) {
      zeile = 'ergebnis';
      pos = 0;
      return;
    }
    kontext.onAntwort(n);
  }

  $effect(() => {
    const taste = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) tippe(Number(e.key));
      else if (e.key === 'Backspace') zurueck();
      else if (e.key === 'Enter') fertig();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  });

  /** Ziffer einer Zahl an einer Spalte (Spalte = Stelle) oder leer. */
  const zeigeZiffer = (n: number, s: number): string => (s < String(n).length ? String(ziffer(n, s)) : '');
  const naechsteZeile = () => {
    if (zeile === 'teil1') {
      zeile = 'teil2';
      pos = 0;
    } else if (zeile === 'teil2') {
      zeile = 'ergebnis';
      pos = 0;
    }
  };
</script>

{#if a}
  <div class="werkstatt" class:richtig={zustand === 'richtig'} class:falsch={zustand === 'falsch'}>
    <div class="blatt" style="--n: {breite}" role="group" aria-label="Rechenblatt">
      <!-- Zahlen: untereinander bei Plus und Minus, nebeneinander bei Mal -->
      {#if mal}
        <div class="zeile kopfzeile">
          <span class="k">{a.zahlen[0]}</span><span class="k">·</span><span class="k">{a.zahlen[1]}</span>
        </div>
      {:else}
        {#each a.zahlen as z, zi (zi)}
          <div class="zeile">
            {#each spalten as s (s)}
              <span class="k">{s === breite - 1 ? (zi === a.zahlen.length - 1 ? a.op : '') : zeigeZiffer(z, s)}</span>
            {/each}
          </div>
        {/each}
      {/if}
      {#if mal}
        <div class="linie"></div>
        {#each [{ z: 'teil1' as const, r: teil1, versatz: 1 }, { z: 'teil2' as const, r: teil2, versatz: 0 }] as t (t.z)}
          <div class="zeile notiz">
            {#each spalten as s (s)}
              {@const i = s - t.versatz}
              {#if i >= 0 && i < breite - 1}
                <button class="k feld" class:aktiv={zeile === t.z && pos === i} onclick={() => waehle(t.z, i)} aria-label="Teilprodukt {t.z === 'teil1' ? 1 : 2}, Stelle {i + 1}">{t.r[i] ?? ''}</button>
              {:else}
                <span class="k"></span>
              {/if}
            {/each}
          </div>
        {/each}
      {/if}
      <!-- Merkzeile für Überträge -->
      <div class="zeile merk">
        {#each spalten as s (s)}
          {#if s < breite - 1}
            <button class="k klein" onclick={() => merken(s)} aria-label="Übertrag bei Stelle {s + 1}: {merk[s] || 'leer'}">{merk[s] || ''}</button>
          {:else}
            <span class="k klein"></span>
          {/if}
        {/each}
      </div>
      <div class="linie doppelt"></div>
      <!-- Ergebnis -->
      <div class="zeile">
        {#each spalten as s (s)}
          {#if s < breite - 1}
            <button class="k feld ergebnis" class:aktiv={zeile === 'ergebnis' && pos === s} onclick={() => waehle('ergebnis', s)} aria-label="Ergebnis, Stelle {s + 1}">{ergebnis[s] ?? ''}</button>
          {:else}
            <span class="k"></span>
          {/if}
        {/each}
      </div>
    </div>

    <div class="tasten" aria-label="Ziffern">
      {#each [7, 8, 9, 4, 5, 6, 1, 2, 3] as d (d)}<button onclick={() => tippe(d)}>{d}</button>{/each}
      <button class="neben" onclick={zurueck} aria-label="Ziffer löschen">⌫</button>
      <button onclick={() => tippe(0)}>0</button>
      {#if mal && zeile !== 'ergebnis'}
        <button class="neben" onclick={naechsteZeile}>Zeile ↓</button>
      {:else}
        <button class="ok" onclick={fertig} aria-label="Fertig">OK</button>
      {/if}
    </div>
    <p class="tipp">Von rechts nach links schreiben. {mal ? 'Erst die Teilprodukte, dann zusammenzählen.' : 'Überträge kannst du in der kleinen Zeile notieren.'}</p>
  </div>
{/if}

<style>
  .werkstatt {
    min-height: 100%;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 10px;
    padding: 10px;
    background:
      linear-gradient(#cfe0f3 1px, transparent 1px) 0 0 / 22px 22px,
      linear-gradient(90deg, #cfe0f3 1px, transparent 1px) 0 0 / 22px 22px,
      #fbfdff;
  }
  .blatt {
    display: grid;
    gap: 2px;
    font-variant-numeric: tabular-nums;
    --k: clamp(30px, min(11vw, 6.5vh), 46px);
  }
  .zeile {
    display: flex;
    gap: 2px;
    position: relative;
  }
  .k {
    width: var(--k);
    height: var(--k);
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: calc(var(--k) * 0.62);
    color: var(--tinte);
  }
  .kopfzeile {
    justify-content: flex-end;
  }
  .kopfzeile .k {
    width: auto;
    padding: 0 3px;
  }
  .feld {
    border: 2px dashed #9cb6d6;
    border-radius: 6px;
    background: #fff;
    padding: 0;
    font: inherit;
    font-weight: 900;
    font-size: calc(var(--k) * 0.62);
    color: var(--tinte);
  }
  .feld.ergebnis {
    border-style: solid;
    border-color: var(--tinte);
  }
  .feld.aktiv {
    background: #fff3c4;
    box-shadow: 0 0 0 3px var(--senf);
  }
  .notiz .feld {
    color: #4a5394;
  }
  .merk .k {
    height: calc(var(--k) * 0.55);
  }
  .klein {
    border: 0;
    background: transparent;
    font: inherit;
    font-size: calc(var(--k) * 0.36);
    font-weight: 900;
    color: var(--markise);
    padding: 0;
  }
  button.klein {
    border: 1px dashed #9cb6d6;
    border-radius: 4px;
    background: rgb(255 255 255 / 0.6);
  }
  .linie {
    height: 3px;
    background: var(--tinte);
    border-radius: 2px;
  }
  .linie.doppelt {
    height: 6px;
    background: linear-gradient(var(--tinte) 0 2px, transparent 2px 4px, var(--tinte) 4px);
  }
  .richtig .ergebnis {
    background: #c9f2d4;
  }
  .falsch .ergebnis {
    background: #ffe2a8;
  }
  .tasten {
    display: grid;
    grid-template-columns: repeat(3, minmax(52px, 76px));
    gap: 6px;
  }
  .tasten button {
    min-height: clamp(42px, 6.6vh, 58px);
    border: 3px solid var(--tinte);
    border-radius: 12px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 1.5rem;
    box-shadow: 0 4px 0 var(--tinte);
    touch-action: manipulation;
  }
  .tasten .neben {
    background: #f1e6cf;
    font-size: 1.05rem;
  }
  .tasten .ok {
    background: var(--wiese);
    color: #fff;
  }
  .tipp {
    font-size: 0.95rem;
    text-align: center;
    margin: 0;
  }
  @media (orientation: landscape) and (min-width: 640px) {
    .werkstatt {
      grid-template-columns: auto auto;
      gap: 24px 40px;
    }
    .tipp {
      grid-column: 1 / -1;
    }
  }
</style>
