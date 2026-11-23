<script lang="ts">
  import { onMount } from 'svelte';
  import { BREITE, HAUPT_HOEHE as HOEHE, LANDSCHAFT, imFreienTeil, type InselStand } from '../../domain/insel';

  /**
   * Übersicht (seit 0.14): alle Inseln von oben als kleine Karte. Gebautes ist braun, die Figur ein roter Punkt.
   * Ein Tipp auf die Karte zeigt diese Stelle in der großen Ansicht.
   */
  let { stand, paket, onwahl, onzu }: { stand: InselStand; paket: boolean; onwahl: (x: number, y: number) => void; onzu: () => void } = $props();
  let leinwand = $state<HTMLCanvasElement>();
  const FARBE: Record<string, string> = { gras: '#8bd17a', sand: '#f1dc9c', weg: '#e6c995', wasser: '#5fb7e6', bruecke: '#b07a42', blumen: '#a6dc8e', wueste: '#f2c67e' };
  const Z = 8;

  onMount(() => {
    const c = leinwand;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    c.width = BREITE * Z;
    c.height = HOEHE * Z;
    for (let y = 0; y < HOEHE; y++)
      for (let x = 0; x < BREITE; x++) {
        const i = y * BREITE + x;
        const art = LANDSCHAFT.art[i] ?? 'wasser';
        g.fillStyle = FARBE[art] ?? '#5fb7e6';
        g.fillRect(x * Z, y * Z, Z, Z);
        if ((LANDSCHAFT.hoehe[i] ?? 0) > 0 && art !== 'wasser') {
          g.fillStyle = 'rgba(0,0,0,0.12)';
          g.fillRect(x * Z, y * Z, Z, Z);
        }
        if ((stand.stapel[i] ?? []).length) {
          g.fillStyle = '#a8402f';
          g.fillRect(x * Z + 1, y * Z + 1, Z - 2, Z - 2);
        }
        if (LANDSCHAFT.baum[i]) {
          g.fillStyle = LANDSCHAFT.pflanze[i] === 'kaktus' ? '#3f8a4a' : '#2b8550';
          g.beginPath();
          g.arc(x * Z + Z / 2, y * Z + Z / 2, Z / 2.6, 0, Math.PI * 2);
          g.fill();
        }
        if (!paket && !imFreienTeil(x, y) && art !== 'wasser') {
          g.fillStyle = 'rgba(255,253,247,0.55)';
          g.fillRect(x * Z, y * Z, Z, Z);
        }
      }
    for (const t of stand.tiere) {
      g.fillStyle = '#fffdf7';
      g.fillRect(t.x * Z + 2, t.y * Z + 2, Z - 4, Z - 4);
    }
    const f = stand.figur;
    g.fillStyle = '#e23a4e';
    g.strokeStyle = '#1f2a6b';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(f.x * Z + Z / 2, f.y * Z + Z / 2, Z * 0.9, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  });

  function tippen(e: MouseEvent) {
    const c = leinwand;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * BREITE);
    const y = Math.floor(((e.clientY - r.top) / r.height) * HOEHE);
    if (x >= 0 && y >= 0 && x < BREITE && y < HOEHE) onwahl(x, y);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="schleier" onclick={(e) => e.target === e.currentTarget && onzu()}>
  <div class="karte" role="dialog" aria-modal="true" aria-labelledby="karte-titel">
    <div class="kopf">
      <h2 id="karte-titel">Übersicht</h2>
      <button class="zu" onclick={onzu} aria-label="Übersicht schließen">✕</button>
    </div>
    <p>Alle Inseln von oben. Der rote Punkt bist du. Tippe auf eine Stelle, dann schaust du dorthin.</p>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <canvas bind:this={leinwand} onclick={tippen} aria-label="Karte aller Inseln"></canvas>
  </div>
</div>

<style>
  .schleier {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    background: rgb(31 42 107 / 0.45);
  }
  .karte {
    display: grid;
    gap: 8px;
    max-height: 100%;
    width: min(100%, 28rem);
    padding: 12px 16px 16px;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 18px;
    box-shadow: 0 6px 0 var(--tinte);
    overflow: auto;
  }
  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2,
  p {
    margin: 0;
  }
  p {
    font-weight: 700;
    font-size: 0.95rem;
  }
  .zu {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: #fff;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  canvas {
    width: 100%;
    max-height: 62vh;
    object-fit: contain;
    border: 2px solid var(--tinte);
    border-radius: 10px;
    image-rendering: pixelated;
    cursor: pointer;
    background: #5fb7e6;
  }
</style>
