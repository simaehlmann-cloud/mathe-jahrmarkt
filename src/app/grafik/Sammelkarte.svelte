<script lang="ts">
  import type { Sammelkarte } from '../../domain/belohnungen';
  import Motiv from './Motiv.svelte';

  /** Eine Sammelkarte: Bild, Titel, Text; Rahmen nach Seltenheit. Verdeckt nur Umriss und Fragezeichen. */
  let { karte, offen, neu = false, gross = false }: { karte: Sammelkarte; offen: boolean; neu?: boolean; gross?: boolean } = $props();
  const SELTEN = { normal: 'Normal', selten: 'Selten', legendaer: 'Legendär' } as const;
</script>

<div class="karte {karte.seltenheit}" class:offen class:neu class:gross style="--f: {karte.farbe}">
  {#if offen}
    <div class="bild">
      <svg viewBox="-64 -44 128 88" aria-hidden="true">
        <rect x="-64" y="-44" width="128" height="88" fill="var(--f)" opacity="0.18" />
        {#if 'bude' in karte.bild}
          <Motiv bude={karte.bild.bude} />
        {:else if karte.bild.symbol === 'stern'}
          <path d="M0 -32 L9 -10 L33 -9 L14 6 L21 30 L0 16 L-21 30 L-14 6 L-33 -9 L-9 -10 Z" fill="#ffc62b" stroke="#1f2a6b" stroke-width="3" stroke-linejoin="round" />
        {:else if karte.bild.symbol === 'blitz'}
          <path d="M8 -36 L-18 4 L-2 4 L-10 36 L18 -6 L2 -6 Z" fill="#ffc62b" stroke="#1f2a6b" stroke-width="3" stroke-linejoin="round" />
        {:else if karte.bild.symbol === 'katze'}
          <path d="M-26 22 Q-30 -6 -18 -14 L-22 -34 L-6 -20 Q0 -22 6 -20 L22 -34 L18 -14 Q30 -6 26 22 Z" fill="#8d93a8" stroke="#1f2a6b" stroke-width="3" />
          <circle cx="-9" cy="-2" r="4" fill="#1f2a6b" /><circle cx="9" cy="-2" r="4" fill="#1f2a6b" /><path d="M-4 8 L4 8 L0 12 Z" fill="#f48c8c" />
        {:else if karte.bild.symbol === 'block'}
          <path d="M0 -30 L28 -16 L28 18 L0 32 L-28 18 L-28 -16 Z" fill="#a06b47" stroke="#1f2a6b" stroke-width="3" />
          <path d="M-28 -16 L0 -2 L28 -16 M0 -2 V32" stroke="#1f2a6b" stroke-width="3" fill="none" />
          <path d="M0 -30 L28 -16 L0 -2 L-28 -16 Z" fill="#7cc96b" stroke="#1f2a6b" stroke-width="3" />
        {:else if karte.bild.symbol === 'kalender'}
          <rect x="-28" y="-26" width="56" height="54" rx="6" fill="#fff" stroke="#1f2a6b" stroke-width="3" />
          <rect x="-28" y="-26" width="56" height="14" rx="6" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" />
          {#each [0, 1, 2] as i (i)}<path d="M{-18 + i * 14} 4 l4 4 l8 -9" stroke="#3fae6a" stroke-width="4" fill="none" stroke-linecap="round" />{/each}
        {:else if karte.bild.symbol === 'raetsel'}
          <circle r="30" fill="#7b5ea7" stroke="#1f2a6b" stroke-width="3" />
          <text y="16" text-anchor="middle" font-size="46" font-weight="900" fill="#fff">?</text>
        {:else if karte.bild.symbol === 'herz'}
          <path d="M0 28 C-40 2 -26 -30 0 -14 C26 -30 40 2 0 28 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="3" />
        {:else}
          {#each Array(10) as _, i (i)}
            {@const w = (i / 10) * Math.PI * 2}
            <path d="M{Math.cos(w) * 8} {Math.sin(w) * 8} L{Math.cos(w) * 32} {Math.sin(w) * 32}" stroke={['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'][i % 5]} stroke-width="5" stroke-linecap="round" />
          {/each}
          <circle r="6" fill="#ffc62b" />
        {/if}
      </svg>
    </div>
    <div class="text">
      <strong>{karte.titel}</strong>
      {#if gross}<p>{karte.text}</p>{/if}
      <span class="selten">{SELTEN[karte.seltenheit]}</span>
    </div>
    {#if neu}<span class="neu-band">Neu</span>{/if}
  {:else}
    <div class="verdeckt" aria-hidden="true">?</div>
    {#if gross}<p class="hinweis">{karte.hinweis}</p>{/if}
  {/if}
</div>

<style>
  .karte {
    position: relative;
    aspect-ratio: 5 / 7;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    border: 4px solid var(--f);
    background: #fffdf7;
    overflow: hidden;
    box-shadow: 0 4px 0 rgb(31 42 107 / 0.25);
  }
  .karte.selten {
    border-color: #a9b4c4;
    background: linear-gradient(160deg, #fffdf7 60%, #e8ecf4);
  }
  .karte.legendaer {
    border-color: #f2b705;
    background: linear-gradient(160deg, #fff8dc, #fffdf7 40%, #fff1b8);
  }
  .karte.legendaer.offen::after,
  .karte.selten.offen::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.65) 45%, transparent 60%);
    background-size: 250% 100%;
    animation: glanz 3.2s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes glanz {
    from {
      background-position: 120% 0;
    }
    to {
      background-position: -120% 0;
    }
  }
  .karte.neu {
    animation: aufdecken 0.7s ease-out both;
  }
  @keyframes aufdecken {
    from {
      transform: rotateY(90deg) scale(0.9);
    }
    to {
      transform: none;
    }
  }
  .karte:not(.offen) {
    border-color: #b8bdd0;
    background: repeating-linear-gradient(45deg, #2b2f5e 0 10px, #33376b 10px 20px);
  }
  .bild {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    border-bottom: 3px solid var(--f);
  }
  .bild svg {
    width: 100%;
    height: 100%;
  }
  .text {
    padding: 4px 6px 6px;
    display: grid;
    gap: 2px;
    text-align: center;
    font-size: 0.78rem;
    line-height: 1.15;
  }
  .gross .text {
    font-size: 1rem;
    padding: 8px 10px 10px;
  }
  .text strong {
    hyphens: auto;
    overflow-wrap: anywhere;
  }
  .text p {
    margin: 0;
    font-weight: 700;
  }
  .selten {
    font-size: 0.7em;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--tinte-weich);
  }
  .legendaer .selten {
    color: #b07a00;
  }
  .verdeckt {
    flex: 1;
    display: grid;
    place-items: center;
    font-size: 2.6rem;
    font-weight: 900;
    color: #8b8fb8;
  }
  .gross .verdeckt {
    font-size: 4rem;
  }
  .hinweis {
    margin: 0;
    padding: 10px;
    color: #fff;
    font-weight: 700;
    text-align: center;
  }
  .neu-band {
    position: absolute;
    top: 8px;
    right: -26px;
    transform: rotate(35deg);
    background: #e23a4e;
    color: #fff;
    font-weight: 900;
    font-size: 0.75rem;
    padding: 2px 30px;
  }
</style>
