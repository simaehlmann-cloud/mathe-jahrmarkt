<script lang="ts">
  import { TUECHER, koerperFarben, type Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';
  import Figur, { type Ansicht } from './Figur.svelte';

  /**
   * Die Spielfigur auf der Bauinsel – nach demselben Bauplan wie der Läufer auf dem Jahrmarkt (Laeufer.svelte):
   * Kopf aus dem Baukasten, Hemdchen in Halstuchfarbe, Arme, Beine mit Schuhen, Umrisse.
   * Als SVG-Gruppe mit dem Fußpunkt bei (0, 0). `links` spiegelt die Seitenansicht.
   */
  let {
    figur,
    aussehen,
    ansicht = 'vorne',
    links = false,
    laeuft = false,
    sitzt = false,
    g = 58,
  }: { figur: FigurId; aussehen: Aussehen; ansicht?: Ansicht; links?: boolean; laeuft?: boolean; sitzt?: boolean; g?: number } = $props();
  const farben = $derived(koerperFarben(figur, aussehen.fell));
  const tuch = $derived(TUECHER.find((t) => t.id === aussehen.tuch)?.farbe ?? '#3c78d8');
  const TINTE = '#1f2a6b';
  const seite = $derived(ansicht === 'seite');
  const kopf = $derived(g * 0.62);
</script>

<g class="inselfigur" class:laeuft class:sitzt class:seite class:ruecken={ansicht === 'hinten'} transform={links ? 'scale(-1 1)' : undefined}>
  <g class="koerper">
    <svg x={seite ? -g * 0.29 : -g * 0.35} y={-g * 0.62} width={seite ? g * 0.58 : g * 0.7} height={g * 0.62} viewBox="0 0 60 70" overflow="visible">
      {#if !sitzt}<ellipse cx="30" cy="66" rx="20" ry="4.5" fill={TINTE} opacity="0.18" />{/if}
      <g class="bein hinten"><rect x="20" y="40" width="9" height="22" rx="4.5" fill={farben.bein} stroke={TINTE} stroke-width="2" /><ellipse cx="25" cy="63" rx="7" ry="4" fill={TINTE} /></g>
      <g class="bein vorne"><rect x="31" y="40" width="9" height="22" rx="4.5" fill={farben.bein} stroke={TINTE} stroke-width="2" /><ellipse cx="36" cy="63" rx="7" ry="4" fill={TINTE} /></g>
      <g class="arm hinten"><rect x="13" y="20" width="8" height="20" rx="4" fill={farben.arm} stroke={TINTE} stroke-width="2" /></g>
      <path d="M17 18 Q30 12 43 18 L45 44 Q30 50 15 44 Z" fill={tuch} stroke={TINTE} stroke-width="2.4" />
      {#if ansicht !== 'hinten'}<path d="M24 24 Q30 30 36 24" fill="none" stroke="#fff" stroke-width="2" opacity="0.6" />{/if}
      <g class="arm vorne"><rect x="39" y="20" width="8" height="20" rx="4" fill={farben.arm} stroke={TINTE} stroke-width="2" /></g>
    </svg>
  </g>
  <g class="kopf" transform="translate({-kopf / 2} {-g})"><Figur {figur} {aussehen} {ansicht} groesse={kopf} /></g>
</g>

<style>
  .bein,
  .arm {
    transform-box: fill-box;
    transform-origin: 50% 8%;
  }
  /* Sitzen: Beine verschwinden im Sitz */
  .sitzt .bein {
    display: none;
  }
  .laeuft .koerper,
  .laeuft .kopf {
    animation: wippen 0.36s ease-in-out infinite;
  }
  .laeuft .bein.vorne,
  .laeuft .arm.hinten {
    animation: schwingen 0.36s ease-in-out infinite alternate;
  }
  .laeuft .bein.hinten,
  .laeuft .arm.vorne {
    animation: schwingen 0.36s ease-in-out infinite alternate-reverse;
  }
  @keyframes schwingen {
    from {
      rotate: -28deg;
    }
    to {
      rotate: 28deg;
    }
  }
  @keyframes wippen {
    50% {
      translate: 0 -2px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .laeuft * {
      animation: none !important;
    }
  }
</style>
