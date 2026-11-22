<script lang="ts">
  /** Kulisse des Startbildschirms: Wimpelkette, dahinter Riesenrad und Zeltdächer, vorne das Eingangstor. Gemeinsam für Familien-App und Schulversion. */
</script>

  <svg class="kulisse" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g class="ferne">
      <!-- Riesenrad hinter dem Tor -->
      <g transform="translate(600 300)">
        <g class="rad">
          <circle r="135" fill="none" stroke="#7d86c4" stroke-width="9" />
          {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
            <line x1="0" y1="0" x2={135 * Math.cos((i * Math.PI) / 6)} y2={135 * Math.sin((i * Math.PI) / 6)} stroke="#7d86c4" stroke-width="4" />
          {/each}
        </g>
        {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
          <rect x={135 * Math.cos((i * Math.PI) / 6) - 13} y={135 * Math.sin((i * Math.PI) / 6) - 2} width="26" height="20" rx="6" fill={['#f2b705', '#e23a4e', '#3c78d8', '#3fae6a'][i % 4]} opacity="0.8" />
        {/each}
        <path d="M0 0 L-80 200 M0 0 L80 200" stroke="#7d86c4" stroke-width="11" />
        <circle r="12" fill="#e23a4e" />
      </g>
      <!-- Zelte links und rechts -->
      <path d="M300 500 L380 380 L460 500 Z" fill="#c9a6e8" />
      <path d="M380 380 V350 M380 350 L404 358 L380 366" stroke="#7d86c4" stroke-width="5" fill="#f2b705" />
      <path d="M740 500 L820 370 L900 500 Z" fill="#f4a6b0" />
      <path d="M820 370 V340 M820 340 L844 348 L820 356" stroke="#7d86c4" stroke-width="5" fill="#3fae6a" />
      <path d="M160 500 L230 410 L300 500 Z" fill="#a6d4f4" />
      <path d="M900 500 L970 420 L1040 500 Z" fill="#ffd98a" />
    </g>
    <path d="M0 470 Q300 430 600 470 T1200 460 V700 H0 Z" fill="#9ed98a" />
    <!-- Eingangstor -->
    <g class="tor">
      <rect x="430" y="400" width="34" height="300" fill="#e23a4e" stroke="#1f2a6b" stroke-width="6" />
      <rect x="736" y="400" width="34" height="300" fill="#e23a4e" stroke="#1f2a6b" stroke-width="6" />
      <path d="M410 420 Q600 300 790 420 L790 470 Q600 352 410 470 Z" fill="#ffc62b" stroke="#1f2a6b" stroke-width="6" stroke-linejoin="round" />
      {#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as k (k)}<circle cx={440 + k * 40} cy={430 - Math.sin((k / 8) * Math.PI) * 74} r="7" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2" class="lampe" style="--v: {k * 0.15}s" />{/each}
    </g>
  </svg>
  <svg class="wimpel" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 8 Q600 70 1200 8" stroke="#1f2a6b" stroke-width="3" fill="none" />
    {#each Array.from({ length: 24 }, (_, i) => i) as i (i)}
      {@const x = 25 + i * 50}
      {@const y = 8 + Math.sin((x / 1200) * Math.PI) * 31}
      <path d="M{x - 16} {y} L{x + 16} {y} L{x} {y + 30} Z" fill={['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7'][i % 5]} stroke="#1f2a6b" stroke-width="2" />
    {/each}
  </svg>

<style>
  .kulisse {
    position: fixed;
    inset: auto 0 0 0;
    width: 100%;
    height: 62%;
    z-index: -1;
    pointer-events: none;
  }
  .ferne {
    opacity: 0.85;
  }
  .rad {
    animation: rad 60s linear infinite;
  }
  @keyframes rad {
    to {
      rotate: 360deg;
    }
  }
  .lampe {
    animation: lampe 1.8s ease-in-out infinite alternate;
    animation-delay: var(--v);
  }
  @keyframes lampe {
    to {
      fill: #ffe57a;
    }
  }
  .wimpel {
    position: fixed;
    top: calc(var(--oben) - 6px);
    left: 0;
    width: 100%;
    height: 56px;
    z-index: -1;
    pointer-events: none;
  }
  /* Wenig Höhe (Handy quer): Kulisse flacher und blasser, damit nichts kollidiert */
  @media (max-height: 32rem) {
    .wimpel {
      height: 30px;
    }
    .kulisse {
      height: 42%;
      opacity: 0.55;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lampe,
    .rad {
      animation: none;
    }
  }
</style>
