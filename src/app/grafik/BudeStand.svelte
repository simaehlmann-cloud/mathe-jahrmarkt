<script lang="ts">
  import type { BudenZustand } from '../../domain/fortschritt/fortschritt';

  /**
   * Eine Jahrmarktbude. Ihr Aussehen folgt allein aus dem Zustand:
   * grau (still), licht (Bronze), farbe (Silber), fest (Gold), zu (noch nicht gebaut).
   */
  let {
    zustand,
    farbe = '#e23a4e',
    besitzer = false,
    katze = false,
  }: {
    zustand: BudenZustand | 'zu';
    farbe?: string;
    besitzer?: boolean;
    /** Entdeckung auf dem Dach. Nur Grafik; der Knopf dafür liegt außerhalb (kein Knopf im Knopf). */
    katze?: boolean;
  } = $props();

  const streifen = Array.from({ length: 8 }, (_, i) => i);
  const zacken = Array.from({ length: 8 }, (_, i) => i);
  const lampen = Array.from({ length: 8 }, (_, i) => 30 + i * 20);
  const wimpel = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7', '#ffc62b', '#e23a4e', '#3c78d8', '#3fae6a'];
  const uid = $props.id();
  let an = $derived(zustand === 'licht' || zustand === 'farbe' || zustand === 'fest');
</script>

<svg viewBox="0 0 200 220" class="bude {zustand}" aria-hidden="true">
  <defs>
    <clipPath id="markise-{uid}">
      <path d="M12 66 L32 26 L168 26 L188 66 Z" />
    </clipPath>
  </defs>

  {#if zustand === 'fest'}
    <!-- Ballons an der Seite -->
    <g class="ballons">
      <path d="M184 100 Q190 70 194 40 M184 100 Q180 72 176 48" stroke="#4a5394" stroke-width="1.2" fill="none" />
      <ellipse cx="194" cy="34" rx="9" ry="11" fill="#ffc62b" />
      <ellipse cx="176" cy="42" rx="9" ry="11" fill="#3c78d8" />
    </g>
  {/if}

  <!-- Pfosten -->
  <rect x="22" y="60" width="10" height="145" fill="#87521f" />
  <rect x="168" y="60" width="10" height="145" fill="#87521f" />
  <!-- Rückwand -->
  <rect x="32" y="64" width="136" height="92" fill="#f6dfb3" />
  <!-- Zielwand der Dartbude: kleine Ballons -->
  {#if besitzer}
    {#each [[52, 84, '#e23a4e'], [76, 96, '#ffc62b'], [128, 86, '#3c78d8'], [150, 100, '#3fae6a'], [104, 78, '#7b5ea7']] as [x, y, f] (x)}
      <ellipse cx={x as number} cy={y as number} rx="8" ry="10" fill={f as string} />
    {/each}
  {/if}

  {#if zustand === 'zu'}
    <!-- Rollladen -->
    <rect x="32" y="64" width="136" height="92" fill="#cfd3df" />
    {#each Array.from({ length: 9 }, (_, i) => 72 + i * 10) as y (y)}
      <line x1="32" x2="168" y1={y} y2={y} stroke="#aeb3c5" stroke-width="2" />
    {/each}
  {/if}

  <!-- Besitzer: Bruno, der Dachs, hinter der Theke -->
  {#if besitzer && zustand !== 'zu'}
    <g class="bruno">
      <ellipse cx="100" cy="150" rx="24" ry="20" fill="#5d6175" />
      <ellipse cx="100" cy="122" rx="20" ry="18" fill="#e9e9ef" />
      <path d="M86 108 Q100 102 114 108 L108 136 Q100 140 92 136 Z" fill="#3a3d4f" />
      <path d="M96 106 L104 106 L102 136 L98 136 Z" fill="#fff" />
      <circle cx="91" cy="121" r="2.6" fill="#1f2a6b" />
      <circle cx="109" cy="121" r="2.6" fill="#1f2a6b" />
      <ellipse cx="100" cy="132" rx="4" ry="3" fill="#1f2a6b" />
      <g class="pfote">
        <ellipse cx="128" cy="128" rx="6" ry="11" fill="#5d6175" transform="rotate(-25 128 128)" />
      </g>
    </g>
  {/if}

  <!-- Theke -->
  <rect x="12" y="152" width="176" height="56" rx="4" fill="#b9763f" />
  <rect x="12" y="152" width="176" height="10" fill="#87521f" />
  {#each [70, 112, 154] as x (x)}
    <line x1={x} x2={x} y1="166" y2="204" stroke="#a0652f" stroke-width="3" />
  {/each}

  <!-- Markise -->
  <g clip-path="url(#markise-{uid})">
    {#each streifen as i (i)}
      <rect x={12 + i * 22} y="26" width="22" height="40" fill={i % 2 === 0 ? farbe : '#fffdf7'} />
    {/each}
  </g>
  {#each zacken as i (i)}
    <path d="M{13 + i * 22} 66 a11 11 0 0 0 22 0 Z" fill={i % 2 === 0 ? farbe : '#fffdf7'} />
  {/each}
  <rect x="28" y="20" width="144" height="8" rx="3" fill="#87521f" />

  <!-- Lampen unter der Markise -->
  {#each lampen as x, i (x)}
    <circle cx={x + 4} cy="82" r="4" class="lampe" class:an style="animation-delay: {i * 0.15}s" />
  {/each}

  {#if zustand === 'farbe' || zustand === 'fest'}
    <!-- Fahne auf dem Dach -->
    <line x1="100" y1="20" x2="100" y2="-4" stroke="#87521f" stroke-width="3" />
    <path d="M100 -4 L124 2 L100 9 Z" fill="#ffc62b" class="fahne" />
  {/if}
  {#if zustand === 'fest'}
    <!-- Wimpelkette über der Bude -->
    <path d="M22 60 Q100 92 178 60" stroke="#4a5394" stroke-width="1.5" fill="none" />
    {#each wimpel as f, i (i)}
      {@const x = 30 + i * 17.5}
      {@const y = 60 + Math.sin((i / (wimpel.length - 1)) * Math.PI) * 15}
      <path d="M{x - 6} {y} L{x + 6} {y} L{x} {y + 12} Z" fill={f} />
    {/each}
  {/if}

  {#if katze}
    <!-- Entdeckung: Katze auf dem Dach -->
    <g class="katze">
      <path d="M170 16 Q182 8 176 -2" stroke="#3a3d4f" stroke-width="4" fill="none" stroke-linecap="round" class="schwanz" />
      <ellipse cx="156" cy="14" rx="15" ry="9" fill="#3a3d4f" />
      <circle cx="142" cy="8" r="8" fill="#3a3d4f" />
      <path d="M136 3 L137 -5 L142 1 Z M148 3 L147 -5 L142 1 Z" fill="#3a3d4f" />
      <circle cx="139" cy="8" r="1.4" fill="#ffc62b" />
      <circle cx="145" cy="8" r="1.4" fill="#ffc62b" />
    </g>
  {/if}
</svg>

<style>
  .bude {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .bude.grau {
    filter: grayscale(0.92) brightness(0.92);
  }
  .bude.zu {
    filter: grayscale(1) brightness(0.97);
  }
  .bude.licht {
    filter: saturate(0.55);
  }
  .lampe {
    fill: #6b6f80;
  }
  .lampe.an {
    fill: #ffe57a;
    animation: funkeln 2.4s ease-in-out infinite;
  }
  @keyframes funkeln {
    0%,
    100% {
      fill: #ffe57a;
    }
    50% {
      fill: #fff6c4;
    }
  }
  .pfote {
    transform-origin: 122px 140px;
    animation: winken 1.8s ease-in-out infinite;
  }
  .grau .pfote {
    animation-duration: 3.2s;
  }
  @keyframes winken {
    0%,
    55%,
    100% {
      transform: rotate(0);
    }
    20%,
    40% {
      transform: rotate(-18deg);
    }
    30% {
      transform: rotate(6deg);
    }
  }
  .fahne {
    transform-origin: 100px 2px;
    animation: flattern 1.4s ease-in-out infinite;
  }
  @keyframes flattern {
    50% {
      transform: scaleX(0.82);
    }
  }
  .ballons {
    animation: schaukeln 3s ease-in-out infinite;
    transform-origin: 184px 100px;
  }
  @keyframes schaukeln {
    50% {
      transform: rotate(4deg);
    }
  }
  .schwanz {
    transform-origin: 170px 16px;
    animation: schwanz 2s ease-in-out infinite;
  }
  @keyframes schwanz {
    50% {
      transform: rotate(-16deg);
    }
  }
</style>
