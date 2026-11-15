<svelte:options namespace="svg" />

<script lang="ts">
  /** Tier der Bauinsel als kleine Zeichnung (Fußpunkt bei 0, 0). Für die Insel und für die Vorschau im Andenkenstand. */
  let { art }: { art: number } = $props();
</script>

  <ellipse cx="0" cy="0" rx="9" ry="3.5" fill="#1f2a6b" opacity="0.22" />
  {#if art === 140}
    <g class="wackeln"><ellipse cx="0" cy="-9" rx="10" ry="7" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="-6" cy="-14" r="4" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1" /><circle cx="2" cy="-15" r="4" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1" /><ellipse cx="10" cy="-12" rx="4" ry="3.4" fill="#3a3d4f" /><rect x="-6" y="-3" width="2" height="4" fill="#3a3d4f" /><rect x="4" y="-3" width="2" height="4" fill="#3a3d4f" /></g>
  {:else if art === 141}
    <g class="wackeln"><ellipse cx="0" cy="-8" rx="9" ry="5.5" fill="#c98a4b" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="9" cy="-13" r="4.5" fill="#c98a4b" stroke="#1f2a6b" stroke-width="1.2" /><ellipse cx="7" cy="-16" rx="1.8" ry="3" fill="#87521f" /><path d="M-9 -9 Q-14 -15 -12 -18" stroke="#c98a4b" stroke-width="2.4" fill="none" class="schwanz" /><rect x="-6" y="-4" width="2.2" height="5" fill="#87521f" /><rect x="4" y="-4" width="2.2" height="5" fill="#87521f" /><circle cx="10.5" cy="-14" r="0.9" fill="#1f2a6b" /></g>
  {:else if art === 142}
    <g class="wackeln"><ellipse cx="0" cy="-7" rx="7" ry="5" fill="#6b6f86" stroke="#1f2a6b" stroke-width="1.2" /><circle cx="7" cy="-12" r="4" fill="#6b6f86" stroke="#1f2a6b" stroke-width="1.2" /><path d="M4.5 -15 L5.5 -18.5 L7.5 -15.5 M8 -15.5 L10 -18.5 L10.5 -14.5" fill="#6b6f86" stroke="#1f2a6b" stroke-width="0.8" /><path d="M-7 -8 Q-12 -14 -9 -19" stroke="#6b6f86" stroke-width="2.2" fill="none" class="schwanz" /></g>
  {:else if art === 144}
    <!-- Kaninchen -->
    <g class="wackeln"><ellipse cx="0" cy="-6" rx="7" ry="5" fill="#d9c8b4" stroke="#1f2a6b" stroke-width="1.1" /><circle cx="6" cy="-10" r="3.6" fill="#d9c8b4" stroke="#1f2a6b" stroke-width="1" /><ellipse cx="5" cy="-17" rx="1.4" ry="4" fill="#d9c8b4" stroke="#1f2a6b" stroke-width="0.9" /><ellipse cx="8" cy="-16.5" rx="1.4" ry="4" fill="#d9c8b4" stroke="#1f2a6b" stroke-width="0.9" /><circle cx="-7" cy="-7" r="2" fill="#fff" /><circle cx="7.5" cy="-10.5" r="0.8" fill="#1f2a6b" /></g>
  {:else if art === 145}
    <!-- Pferd -->
    <g class="wackeln"><ellipse cx="0" cy="-14" rx="12" ry="6.5" fill="#8a5a2b" stroke="#1f2a6b" stroke-width="1.2" /><path d="M9 -17 L14 -27 L19 -26 L16 -17 Z" fill="#8a5a2b" stroke="#1f2a6b" stroke-width="1.1" /><path d="M12 -26 Q9 -22 9 -17" stroke="#3a2410" stroke-width="2.4" fill="none" /><path d="M-12 -15 Q-17 -11 -15 -5" stroke="#3a2410" stroke-width="2.4" fill="none" class="schwanz" /><rect x="-9" y="-9" width="2.5" height="9" fill="#5a3416" /><rect x="-4" y="-9" width="2.5" height="9" fill="#5a3416" /><rect x="4" y="-9" width="2.5" height="9" fill="#5a3416" /><rect x="8" y="-9" width="2.5" height="9" fill="#5a3416" /><circle cx="16.5" cy="-24" r="0.9" fill="#1f2a6b" /></g>
  {:else if art === 146}
    <!-- Ente -->
    <g class="picken"><ellipse cx="0" cy="-5" rx="6.5" ry="4.5" fill="#f2c41b" stroke="#1f2a6b" stroke-width="1.1" /><circle cx="5" cy="-10" r="3.2" fill="#f2c41b" stroke="#1f2a6b" stroke-width="1" /><path d="M7.8 -10 L11 -9.4 L7.8 -8.4 Z" fill="#f08a24" /><circle cx="5.8" cy="-11" r="0.7" fill="#1f2a6b" /></g>
  {:else if art === 147}
    <!-- Kuh -->
    <g class="wackeln"><ellipse cx="0" cy="-12" rx="12" ry="7" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1.2" /><ellipse cx="-4" cy="-14" rx="4" ry="3" fill="#2a2c3a" /><ellipse cx="5" cy="-10" rx="3" ry="2.2" fill="#2a2c3a" /><ellipse cx="14" cy="-15" rx="4.5" ry="4" fill="#fbfaf5" stroke="#1f2a6b" stroke-width="1.1" /><ellipse cx="16" cy="-13" rx="2.5" ry="1.8" fill="#f4a6b0" /><path d="M11 -19 L10 -22 M16 -19 L17 -22" stroke="#c9ad60" stroke-width="1.6" /><rect x="-8" y="-6" width="2.5" height="6" fill="#3a3d4f" /><rect x="5" y="-6" width="2.5" height="6" fill="#3a3d4f" /></g>
  {:else}
    <g class="picken"><ellipse cx="0" cy="-6" rx="5.5" ry="5" fill="#fff" stroke="#1f2a6b" stroke-width="1.1" /><circle cx="4" cy="-11" r="3" fill="#fff" stroke="#1f2a6b" stroke-width="1" /><path d="M6.6 -11.4 L9 -10.6 L6.6 -10" fill="#f2b705" /><path d="M3 -14 Q4 -16 5 -14" fill="#e23a4e" /><line x1="-1" y1="-1" x2="-1" y2="1.5" stroke="#f2b705" stroke-width="1.2" /><line x1="2" y1="-1" x2="2" y2="1.5" stroke="#f2b705" stroke-width="1.2" /></g>
  {/if}


<style>
  .wackeln {
    animation: wackeln 2.4s ease-in-out infinite;
    transform-origin: 0 0;
  }
  .picken {
    animation: picken 1.6s ease-in-out infinite;
    transform-origin: 0 0;
  }
  @keyframes wackeln {
    0%,
    100% {
      rotate: 0deg;
    }
    50% {
      rotate: 3deg;
    }
  }
  @keyframes picken {
    0%,
    60%,
    100% {
      rotate: 0deg;
    }
    75% {
      rotate: 18deg;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wackeln,
    .picken {
      animation: none;
    }
  }
</style>
