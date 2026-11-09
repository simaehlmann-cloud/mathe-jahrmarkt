<script lang="ts">
  import type { BudenZustand } from '../../domain/fortschritt/fortschritt';
  import { stilFuer } from './budenStil';
  import Motiv from './Motiv.svelte';

  /**
   * Eine Jahrmarktbude. Dachform, Farben und Motiv kommen aus dem Budenstil,
   * das Aussehen folgt allein dem Zustand: grau (still), licht (Bronze), farbe (Silber),
   * fest (Gold), zu (noch nicht gebaut).
   */
  let {
    bude,
    zustand,
    besitzer = false,
    katze = false,
  }: {
    bude: string;
    zustand: BudenZustand | 'zu';
    besitzer?: boolean;
    /** Entdeckung auf dem Dach. Nur Grafik; der Knopf dafür liegt außerhalb (kein Knopf im Knopf). */
    katze?: boolean;
  } = $props();

  const uid = $props.id();
  let stil = $derived(stilFuer(bude));
  let an = $derived(zustand === 'licht' || zustand === 'farbe' || zustand === 'fest');
  let spitze = $derived(stil.dach === 'zelt' ? -14 : stil.dach === 'kuppel' ? -14 : stil.dach === 'giebel' ? 6 : 20);
  const acht = Array.from({ length: 8 }, (_, i) => i);
  const lampen = Array.from({ length: 8 }, (_, i) => 30 + i * 20);
  const wimpel = ['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a', '#7b5ea7', '#ffc62b', '#e23a4e', '#3c78d8', '#3fae6a'];
</script>

<svg viewBox="-8 -24 216 250" class="bude {zustand}" aria-hidden="true">
  <defs>
    <clipPath id="markise-{uid}"><path d="M12 66 L32 26 L168 26 L188 66 Z" /></clipPath>
    <clipPath id="kuppel-{uid}"><path d="M12 66 C12 18 56 0 100 0 C144 0 188 18 188 66 Z" /></clipPath>
  </defs>

  <!-- Schatten -->
  <ellipse cx="100" cy="212" rx="98" ry="8" fill="#1f2a6b" opacity="0.12" />

  {#if zustand === 'fest'}
    <g class="ballons">
      <path d="M186 100 Q192 70 196 40 M186 100 Q182 72 178 48" stroke="#4a5394" stroke-width="1.2" fill="none" />
      <ellipse cx="196" cy="34" rx="9" ry="11" fill="#ffc62b" />
      <ellipse cx="178" cy="42" rx="9" ry="11" fill="#3c78d8" />
    </g>
  {/if}

  <!-- Pfosten und Rückwand -->
  <rect x="22" y="60" width="10" height="146" fill="#87521f" />
  <rect x="168" y="60" width="10" height="146" fill="#87521f" />
  <rect x="32" y="64" width="136" height="92" fill="#f6dfb3" />
  {#each [52, 76, 100, 124, 148] as x (x)}<rect x={x} y="64" width="2" height="92" fill="#ecd09b" />{/each}

  {#if zustand === 'zu'}
    <!-- Rollladen mit Motiv als Vorgeschmack -->
    <rect x="32" y="64" width="136" height="92" fill="#d9dce6" />
    {#each Array.from({ length: 9 }, (_, i) => 72 + i * 10) as y (y)}
      <line x1="32" x2="168" y1={y} y2={y} stroke="#b9bdcc" stroke-width="2" />
    {/each}
    <circle cx="100" cy="108" r="34" fill="#fffdf7" stroke="#87521f" stroke-width="4" />
    <g transform="translate(100 108) scale(0.48)"><Motiv {bude} /></g>
  {:else}
    <g transform="translate(100 {besitzer ? 94 : 110}) scale({besitzer ? 0.75 : 0.95})"><Motiv {bude} /></g>
  {/if}

  {#if besitzer && zustand !== 'zu'}
    <!-- Bruno, der Dachs -->
    <g class="bruno">
      <ellipse cx="100" cy="150" rx="24" ry="20" fill="#5d6175" />
      <ellipse cx="100" cy="124" rx="19" ry="17" fill="#e9e9ef" />
      <path d="M87 111 Q100 105 113 111 L107 138 Q100 142 93 138 Z" fill="#3a3d4f" />
      <path d="M96 109 L104 109 L102 138 L98 138 Z" fill="#fff" />
      <circle cx="92" cy="123" r="2.6" fill="#1f2a6b" />
      <circle cx="108" cy="123" r="2.6" fill="#1f2a6b" />
      <ellipse cx="100" cy="134" rx="4" ry="3" fill="#1f2a6b" />
      <g class="pfote"><ellipse cx="128" cy="130" rx="6" ry="11" fill="#5d6175" transform="rotate(-25 128 130)" /></g>
    </g>
  {/if}

  <!-- Theke mit Zierstreifen -->
  <rect x="12" y="152" width="176" height="56" rx="4" fill="#b9763f" />
  <rect x="12" y="152" width="176" height="10" fill="#87521f" />
  {#each [0, 1, 2, 3] as i (i)}
    <rect x={22 + i * 41} y="168" width="33" height="34" rx="3" fill={i % 2 === 0 ? stil.farbe : stil.zweit} opacity="0.92" />
  {/each}

  <!-- Dach -->
  {#if stil.dach === 'markise'}
    <g clip-path="url(#markise-{uid})">
      {#each acht as i (i)}<rect x={12 + i * 22} y="26" width="22" height="40" fill={i % 2 === 0 ? stil.farbe : stil.zweit} />{/each}
    </g>
    {#each acht as i (i)}<path d="M{13 + i * 22} 66 a11 11 0 0 0 22 0 Z" fill={i % 2 === 0 ? stil.farbe : stil.zweit} />{/each}
    <rect x="28" y="20" width="144" height="8" rx="3" fill="#87521f" />
  {:else if stil.dach === 'zelt'}
    {#each acht as i (i)}
      <path d="M100 -14 L{8 + i * 23} 66 L{8 + (i + 1) * 23} 66 Z" fill={i % 2 === 0 ? stil.farbe : stil.zweit} />
    {/each}
    {#each acht as i (i)}<path d="M{8 + i * 23} 66 a11.5 11.5 0 0 0 23 0 Z" fill={i % 2 === 0 ? stil.farbe : stil.zweit} />{/each}
    <circle cx="100" cy="-14" r="4" fill="#ffc62b" stroke="#87521f" stroke-width="2" />
  {:else if stil.dach === 'kuppel'}
    <g clip-path="url(#kuppel-{uid})">
      {#each acht as i (i)}<rect x={12 + i * 22} y="0" width="22" height="66" fill={i % 2 === 0 ? stil.farbe : stil.zweit} />{/each}
    </g>
    <path d="M12 66 C12 18 56 0 100 0 C144 0 188 18 188 66" fill="none" stroke="#87521f" stroke-width="3" />
    <rect x="8" y="62" width="184" height="8" rx="3" fill="#87521f" />
    <path d="M100 0 V-12" stroke="#87521f" stroke-width="3" />
    <circle cx="100" cy="-14" r="5" fill="#ffc62b" stroke="#87521f" stroke-width="2" />
  {:else}
    <path d="M0 70 L100 4 L200 70 Z" fill="#87521f" />
    <path d="M18 64 L100 14 L182 64 Z" fill={stil.farbe} />
    {#each [28, 40, 52] as y (y)}<path d="M{100 - (y - 14) * 1.6} {y} H{100 + (y - 14) * 1.6}" stroke={stil.zweit} stroke-width="2" opacity="0.6" />{/each}
    <circle cx="100" cy="42" r="10" fill={stil.zweit} stroke="#87521f" stroke-width="2" />
  {/if}

  <!-- Lampen unter dem Dach -->
  {#each lampen as x, i (x)}
    <circle cx={x + 4} cy="82" r="4" class="lampe" class:an style="animation-delay: {i * 0.15}s" />
  {/each}

  {#if zustand === 'farbe' || zustand === 'fest'}
    <line x1="100" y1={spitze} x2="100" y2={spitze - 24} stroke="#87521f" stroke-width="3" />
    <path d="M100 {spitze - 24} L124 {spitze - 18} L100 {spitze - 11} Z" fill="#ffc62b" class="fahne" style="transform-origin: 100px {spitze - 18}px" />
  {/if}
  {#if zustand === 'fest'}
    <path d="M22 60 Q100 92 178 60" stroke="#4a5394" stroke-width="1.5" fill="none" />
    {#each wimpel as f, i (i)}
      {@const x = 30 + i * 17.5}
      {@const y = 60 + Math.sin((i / (wimpel.length - 1)) * Math.PI) * 15}
      <path d="M{x - 6} {y} L{x + 6} {y} L{x} {y + 12} Z" fill={f} />
    {/each}
  {/if}

  {#if katze}
    <g>
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
    filter: grayscale(0.7) brightness(0.97);
  }
  .bude.zu {
    filter: saturate(0.45) brightness(0.98);
  }
  .bude.licht {
    filter: saturate(0.78);
  }
  .lampe {
    fill: #6b6f80;
  }
  .lampe.an {
    fill: #ffe57a;
    animation: funkeln 2.4s ease-in-out infinite;
  }
  @keyframes funkeln {
    50% {
      fill: #fff6c4;
    }
  }
  .pfote {
    transform-origin: 122px 142px;
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
    animation: flattern 1.4s ease-in-out infinite;
  }
  @keyframes flattern {
    50% {
      transform: scaleX(0.82);
    }
  }
  .ballons {
    animation: schaukeln 3s ease-in-out infinite;
    transform-origin: 186px 100px;
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
