<script lang="ts" module>
  /** Ein Schritt des Rundgangs: was Flinka sagt und welches Element dabei hervorgehoben wird. */
  export interface RundgangSchritt {
    text: string;
    /** CSS-Auswahl des Ziels; ohne Ziel (oder wenn es nicht zu sehen ist) nur die Blase. */
    ziel?: string;
  }
</script>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Flinka from '../grafik/Flinka.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Rundgang mit Flinka (seit 0.16): dunkelt den Bildschirm ab, lässt um das gerade erklärte Element ein Loch
   * mit Leuchtrand und zeigt Flinkas Blase auf der anderen Bildschirmhälfte. Weiter, Zurück, Überspringen.
   */
  let { schritte, onfertig }: { schritte: RundgangSchritt[]; onfertig: () => void } = $props();

  let i = $state(0);
  let rahmen = $state<{ x: number; y: number; b: number; h: number } | null>(null);
  let breite = $state(window.innerWidth);
  let hoehe = $state(window.innerHeight);
  let schritt = $derived(schritte[i] as RundgangSchritt);
  let letzter = $derived(i === schritte.length - 1);
  /** Blase oben, wenn das Ziel in der unteren Hälfte liegt (und umgekehrt). */
  let blaseOben = $derived(!!rahmen && rahmen.y + rahmen.h / 2 > hoehe / 2);

  /** Sichtbares Ziel suchen: bei mehreren Treffern das, dessen Mitte der Bildschirmmitte am nächsten liegt. */
  function messen() {
    breite = window.innerWidth;
    hoehe = window.innerHeight;
    const sel = schritt?.ziel;
    if (!sel) {
      rahmen = null;
      return;
    }
    let best: DOMRect | null = null;
    let bestD = Infinity;
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      // ganz oder fast ganz auf dem Bildschirm?
      if (r.left < -8 || r.top < -8 || r.right > breite + 8 || r.bottom > hoehe + 8) continue;
      const d = Math.hypot(r.left + r.width / 2 - breite / 2, r.top + r.height / 2 - hoehe / 2);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    rahmen = best ? { x: best.left - 8, y: best.top - 8, b: best.width + 16, h: best.height + 16 } : null;
  }

  function sprich() {
    if (app.einstellungen.automatischVorlesen && schritt) app.sprich(schritt.text);
  }
  function weiter() {
    app.spieleKlang('tipp');
    if (letzter) {
      onfertig();
      return;
    }
    i++;
    messen();
    sprich();
  }
  function zurueck() {
    if (i === 0) return;
    i--;
    messen();
    sprich();
  }

  const beiGroesse = () => messen();
  onMount(() => {
    messen();
    sprich();
    window.addEventListener('resize', beiGroesse);
  });
  onDestroy(() => window.removeEventListener('resize', beiGroesse));
</script>

<div class="rundgang" role="dialog" aria-modal="true" aria-label="Rundgang mit Flinka, Schritt {i + 1} von {schritte.length}">
  <svg class="dunkel" viewBox="0 0 {breite} {hoehe}" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <mask id="rundgang-loch">
        <rect width={breite} height={hoehe} fill="#fff" />
        {#if rahmen}<rect x={rahmen.x} y={rahmen.y} width={rahmen.b} height={rahmen.h} rx="16" fill="#000" />{/if}
      </mask>
    </defs>
    <rect width={breite} height={hoehe} fill="rgba(20, 24, 60, 0.62)" mask="url(#rundgang-loch)" />
    {#if rahmen}
      <rect class="leuchtrand" x={rahmen.x} y={rahmen.y} width={rahmen.b} height={rahmen.h} rx="16" fill="none" stroke="#ffc62b" stroke-width="5" />
    {/if}
  </svg>

  <div class="szene" class:oben={blaseOben}>
    <div class="flinka"><Flinka groesse={96} /></div>
    <div class="blase">
      <button class="ueberspringen" onclick={onfertig}>Überspringen</button>
      {#key i}<p aria-live="polite">{schritt.text}</p>{/key}
      <div class="fuss">
        <span class="zaehler" aria-hidden="true">{i + 1} / {schritte.length}</span>
        {#if i > 0}<button class="ticket hell klein" onclick={zurueck}>Zurück</button>{/if}
        <button class="ticket" onclick={weiter}>{letzter ? 'Los geht’s' : 'Weiter'}</button>
      </div>
    </div>
  </div>
</div>

<style>
  .rundgang {
    position: fixed;
    inset: 0;
    z-index: 80;
  }
  .dunkel {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .leuchtrand {
    animation: leuchten 1.4s ease-in-out infinite;
  }
  @keyframes leuchten {
    50% {
      opacity: 0.45;
    }
  }
  .szene {
    position: absolute;
    left: var(--rand);
    right: var(--rand-r);
    bottom: calc(var(--unten) + 0.75rem);
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    max-width: 40rem;
    margin: 0 auto;
  }
  .szene.oben {
    bottom: auto;
    top: calc(var(--oben) + 0.75rem);
    align-items: flex-start;
  }
  .flinka {
    flex: none;
  }
  .blase {
    flex: 1;
    background: #fffdf7;
    border: 4px solid var(--tinte, #1f2a6b);
    border-radius: 18px;
    padding: 0.8rem 1rem;
    box-shadow: 0 6px 0 rgb(31 42 107 / 0.25);
  }
  .blase {
    position: relative;
  }
  .ueberspringen {
    position: absolute;
    top: -0.9rem;
    right: 0.8rem;
    background: #fffdf7;
    border: 3px solid var(--tinte, #1f2a6b);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 800;
    color: inherit;
    cursor: pointer;
  }
  .blase p {
    margin: 0.3rem 0 0.7rem;
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.35;
  }
  .fuss {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .zaehler {
    margin-right: auto;
    font-weight: 800;
    opacity: 0.6;
  }
  .klein {
    font-size: 0.95rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .leuchtrand {
      animation: none;
    }
  }
</style>
