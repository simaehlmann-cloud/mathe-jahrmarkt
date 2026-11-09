<script lang="ts">
  import { TUECHER, fellFarben, standardAussehen, type Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Figur from './Figur.svelte';

  /**
   * Die Spielfigur mit Körper zum Laufen über den Jahrmarkt.
   * Der Kopf ist dieselbe Figur wie im Baukasten; Körper, Arme und Beine in Fellfarbe.
   * `laeuft` schaltet die Laufbewegung ein, `rechts` die Blickrichtung.
   */
  let {
    figur,
    aussehen = standardAussehen(),
    laeuft = false,
    rechts = true,
    groesse = 96,
  }: { figur: FigurId; aussehen?: Aussehen; laeuft?: boolean; rechts?: boolean; groesse?: number } = $props();

  let farben = $derived(fellFarben(figur, aussehen.fell));
  let tuch = $derived(TUECHER.find((t) => t.id === aussehen.tuch)?.farbe ?? '#3c78d8');
  const TINTE = '#1f2a6b';
</script>

<div class="laeufer" class:laeuft class:links={!rechts} style="--g: {groesse}px">
  <svg class="koerper" viewBox="0 0 60 70" aria-hidden="true">
    <ellipse class="schatten" cx="30" cy="66" rx="20" ry="4.5" fill={TINTE} opacity="0.18" />
    <g class="bein hinten"><rect x="20" y="40" width="9" height="22" rx="4.5" fill={farben[1]} stroke={TINTE} stroke-width="2" /><ellipse cx="25" cy="63" rx="7" ry="4" fill={TINTE} /></g>
    <g class="bein vorne"><rect x="31" y="40" width="9" height="22" rx="4.5" fill={farben[1]} stroke={TINTE} stroke-width="2" /><ellipse cx="36" cy="63" rx="7" ry="4" fill={TINTE} /></g>
    <g class="arm hinten"><rect x="13" y="20" width="8" height="20" rx="4" fill={farben[0]} stroke={TINTE} stroke-width="2" /></g>
    <!-- Körper mit Hemdchen in Halstuchfarbe -->
    <path d="M17 18 Q30 12 43 18 L45 44 Q30 50 15 44 Z" fill={tuch} stroke={TINTE} stroke-width="2.4" />
    <path d="M24 24 Q30 30 36 24" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" />
    <g class="arm vorne"><rect x="39" y="20" width="8" height="20" rx="4" fill={farben[0]} stroke={TINTE} stroke-width="2" /></g>
  </svg>
  <div class="kopf"><Figur {figur} {aussehen} groesse={groesse * 0.62} /></div>
</div>

<style>
  .laeufer {
    position: relative;
    width: calc(var(--g) * 0.7);
    height: var(--g);
    pointer-events: none;
  }
  .links {
    transform: scaleX(-1);
  }
  .koerper {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 62%;
    overflow: visible;
  }
  .kopf {
    position: absolute;
    left: 50%;
    top: 0;
    transform: translateX(-50%);
  }
  .bein,
  .arm {
    transform-box: fill-box;
    transform-origin: 50% 8%;
  }
  .laeuft .koerper,
  .laeuft .kopf {
    animation: wippen 0.36s ease-in-out infinite;
  }
  .laeuft .kopf {
    animation-name: wippen-kopf;
  }
  .laeuft .bein.vorne,
  .laeuft .arm.hinten {
    animation: schwingen 0.36s ease-in-out infinite alternate;
  }
  .laeuft .bein.hinten,
  .laeuft .arm.vorne {
    animation: schwingen 0.36s ease-in-out infinite alternate-reverse;
  }
  .laeuft .schatten {
    animation: none;
  }
  @keyframes schwingen {
    from {
      transform: rotate(-28deg);
    }
    to {
      transform: rotate(28deg);
    }
  }
  @keyframes wippen {
    50% {
      transform: translateY(-3%);
    }
  }
  @keyframes wippen-kopf {
    0%,
    100% {
      transform: translateX(-50%) translateY(0) rotate(-2deg);
    }
    50% {
      transform: translateX(-50%) translateY(-5%) rotate(2deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .laeuft * {
      animation: none !important;
    }
  }
</style>
