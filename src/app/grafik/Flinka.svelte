<script lang="ts">
  /** Flinka, das Eichhörnchen mit Schiebermütze, leitet den Jahrmarkt. Eigene Figur. */
  let { groesse = 120, winkt = true }: { groesse?: number; winkt?: boolean } = $props();
</script>

<svg viewBox="0 0 120 140" width={groesse} height={groesse * (140 / 120)} role="img" aria-label="Flinka, das Eichhörnchen">
  <!-- Schwanz -->
  <path
    d="M66 124 C110 122 122 74 104 46 C92 27 66 30 70 50 C73 64 96 60 96 78 C96 96 76 96 64 108 Z"
    fill="#d9672a"
  />
  <path d="M84 52 C96 56 102 66 99 78" fill="none" stroke="#f0a060" stroke-width="5" stroke-linecap="round" />
  <!-- Körper -->
  <ellipse cx="50" cy="102" rx="27" ry="30" fill="#e8833a" />
  <ellipse cx="50" cy="108" rx="16" ry="20" fill="#fce3c2" />
  <!-- Füße -->
  <ellipse cx="36" cy="131" rx="10" ry="5" fill="#b9531f" />
  <ellipse cx="64" cy="131" rx="10" ry="5" fill="#b9531f" />
  <!-- linker Arm hält die Seite -->
  <ellipse cx="27" cy="102" rx="7" ry="13" fill="#d9672a" transform="rotate(20 27 102)" />
  <!-- rechter Arm winkt -->
  <g class:winkt>
    <ellipse cx="78" cy="78" rx="7" ry="15" fill="#d9672a" transform="rotate(-35 78 78)" />
    <circle cx="86" cy="66" r="7" fill="#e8833a" />
  </g>
  <!-- Kopf -->
  <circle cx="50" cy="56" r="25" fill="#e8833a" />
  <!-- Ohren mit Pinseln -->
  <path d="M30 40 L25 16 L42 33 Z" fill="#d9672a" />
  <path d="M25 16 L22 9 L29 15 Z" fill="#9b4318" />
  <path d="M70 40 L75 16 L58 33 Z" fill="#d9672a" />
  <path d="M75 16 L78 9 L71 15 Z" fill="#9b4318" />
  <!-- Schiebermütze -->
  <path d="M26 46 C25 27 73 25 75 44 C64 40 38 40 26 46 Z" fill="#1f2a6b" />
  <path d="M60 41 Q82 38 88 45 Q74 49 58 46 Z" fill="#2c3a8c" />
  <circle cx="50" cy="29" r="3" fill="#2c3a8c" />
  <!-- Gesicht -->
  <ellipse cx="50" cy="67" rx="11" ry="8" fill="#fce3c2" />
  <circle cx="41" cy="56" r="4" fill="#1f2a6b" />
  <circle cx="59" cy="56" r="4" fill="#1f2a6b" />
  <circle cx="42.4" cy="54.6" r="1.4" fill="#fff" />
  <circle cx="60.4" cy="54.6" r="1.4" fill="#fff" />
  <ellipse cx="50" cy="63.5" rx="3.2" ry="2.4" fill="#3b2314" />
  <path d="M45 68 Q50 73 55 68" fill="none" stroke="#3b2314" stroke-width="2" stroke-linecap="round" />
  <circle cx="34" cy="65" r="4" fill="#f48c8c" opacity="0.55" />
  <circle cx="66" cy="65" r="4" fill="#f48c8c" opacity="0.55" />
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
  .winkt {
    transform-origin: 72px 90px;
    animation: winken 1.6s ease-in-out infinite;
  }
  @keyframes winken {
    0%,
    60%,
    100% {
      transform: rotate(0deg);
    }
    15%,
    45% {
      transform: rotate(-14deg);
    }
    30% {
      transform: rotate(8deg);
    }
  }
</style>
