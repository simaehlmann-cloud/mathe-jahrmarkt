<script lang="ts">
  import type { AttraktionsArt } from '../../domain/karte';

  /**
   * Jahrmarkt-Attraktionen (seit 0.15): Karussells, Essbuden und Blickfänge zwischen den Mathe-Buden.
   * Eigene Zeichnungen; `aktiv` lässt sie kurz schneller laufen (nach dem Antippen).
   */
  let { art, aktiv = false, preis }: { art: AttraktionsArt; aktiv?: boolean; preis?: number } = $props();
  const T = '#1f2a6b';
  const essen = $derived(art === 'zuckerwatte' || art === 'popcorn' || art === 'crepes' || art === 'eis');
  const FARBE: Record<string, [string, string]> = { zuckerwatte: ['#f6a6c9', '#fffdf7'], popcorn: ['#e23a4e', '#fffdf7'], crepes: ['#f0a202', '#fffdf7'], eis: ['#6cc3ec', '#fffdf7'] };
</script>

<svg viewBox="0 0 200 200" class:aktiv aria-hidden="true" overflow="visible">
  <ellipse cx="100" cy="196" rx="92" ry="7" fill={T} opacity="0.12" />
  {#if essen}
    {@const [f1, f2] = FARBE[art] ?? ['#e23a4e', '#fff']}
    <!-- kleiner Stand mit Markise und Ware -->
    <rect x="34" y="96" width="8" height="98" fill="#87521f" />
    <rect x="158" y="96" width="8" height="98" fill="#87521f" />
    <rect x="42" y="100" width="116" height="50" fill="#fff4cc" />
    {#each [0, 1, 2, 3, 4, 5] as i (i)}<path d="M{24 + i * 26} 100 L{30 + i * 26} 70 L{56 + i * 26} 70 L{50 + i * 26} 100 Z" fill={i % 2 ? f2 : f1} stroke={T} stroke-width="2" />{/each}
    {#each [0, 1, 2, 3, 4, 5] as i (i)}<path d="M{24 + i * 26} 100 a13 13 0 0 0 26 0 Z" fill={i % 2 ? f2 : f1} stroke={T} stroke-width="2" />{/each}
    <rect x="22" y="146" width="156" height="48" rx="5" fill="#b9763f" stroke={T} stroke-width="3" />
    {#if art === 'zuckerwatte'}
      {#each [56, 100, 144] as x (x)}<rect x={x - 2} y="118" width="4" height="30" fill="#fffdf7" stroke={T} stroke-width="1" /><circle cx={x} cy="114" r="16" fill="#f6a6c9" stroke={T} stroke-width="2" /><circle cx={x - 6} cy="108" r="6" fill="#fbd0e2" />{/each}
    {:else if art === 'popcorn'}
      {#each [60, 100, 140] as x (x)}<path d="M{x - 14} 122 L{x + 14} 122 L{x + 10} 148 L{x - 10} 148 Z" fill="#fffdf7" stroke={T} stroke-width="2" /><path d="M{x - 6} 122 V148 M{x + 4} 122 V148" stroke="#e23a4e" stroke-width="3" />{#each [-9, 0, 9] as d (d)}<circle cx={x + d} cy={116 - Math.abs(d) / 3} r="6" fill="#fff6d6" stroke={T} stroke-width="1" />{/each}{/each}
    {:else if art === 'crepes'}
      <circle cx="100" cy="128" r="22" fill="#f6c46a" stroke={T} stroke-width="2" />
      <path d="M86 124 Q100 116 114 124 Q100 132 86 124 Z" fill="#7a3b14" />
      <path d="M58 118 L72 146 L44 146 Z" fill="#f6c46a" stroke={T} stroke-width="2" /><path d="M142 118 L156 146 L128 146 Z" fill="#f6c46a" stroke={T} stroke-width="2" />
    {:else}
      {#each [[64, '#f6a6c9'], [100, '#fff6d6'], [136, '#a8dc93']] as [x, kugel] (x)}<path d="M{Number(x) - 9} 126 L{Number(x) + 9} 126 L{x} 150 Z" fill="#e8b46e" stroke={T} stroke-width="2" /><circle cx={x} cy="118" r="11" fill={String(kugel)} stroke={T} stroke-width="2" />{/each}
    {/if}
    <!-- Preisschild -->
    <g transform="translate(100 52)">
      <rect x="-44" y="-20" width="88" height="30" rx="8" fill="#fffdf7" stroke={T} stroke-width="3" />
      <circle cx="-22" cy="-5" r="9" fill="#ffc62b" stroke="#b07a00" stroke-width="2" />
      <text x="10" y="3" text-anchor="middle" font-size="20" font-weight="900" fill={T}>{preis}</text>
    </g>
  {:else if art === 'kettenkarussell'}
    <rect x="94" y="40" width="12" height="154" fill="#b7bccb" stroke={T} stroke-width="2" />
    <rect x="58" y="180" width="84" height="14" rx="4" fill="#87521f" stroke={T} stroke-width="2" />
    <g class="schwingen" style="transform-origin: 100px 46px">
      {#each [-80, -56, -28, 0, 28, 56, 80] as dx, i (i)}
        <line x1={100 + dx * 0.55} y1="50" x2={100 + dx} y2="126" stroke={T} stroke-width="1.5" />
        <rect x={100 + dx - 7} y="126" width="14" height="12" rx="3" fill={['#e23a4e', '#ffc62b', '#3c78d8', '#3fae6a'][i % 4]} stroke={T} stroke-width="2" />
      {/each}
    </g>
    <path d="M40 54 L100 12 L160 54 Z" fill="#e23a4e" stroke={T} stroke-width="3" stroke-linejoin="round" />
    {#each [0, 1, 2, 3, 4] as i (i)}<path d="M{40 + i * 24} 54 a12 12 0 0 0 24 0 Z" fill={i % 2 ? '#fffdf7' : '#ffc62b'} stroke={T} stroke-width="2" />{/each}
    <circle cx="100" cy="10" r="6" fill="#ffc62b" stroke={T} stroke-width="2" />
  {:else if art === 'autoscooter'}
    <rect x="10" y="60" width="180" height="16" fill="#3c78d8" stroke={T} stroke-width="3" />
    {#each [16, 96, 176] as x (x)}<rect x={x} y="76" width="8" height="100" fill="#b7bccb" stroke={T} stroke-width="1.5" />{/each}
    <path d="M10 60 L30 34 L170 34 L190 60 Z" fill="#ffc62b" stroke={T} stroke-width="3" />
    <text x="100" y="56" text-anchor="middle" font-size="18" font-weight="900" fill={T}>AUTOSCOOTER</text>
    <rect x="8" y="170" width="184" height="22" rx="4" fill="#5b5f97" stroke={T} stroke-width="3" />
    <g class="fahren"><rect x="30" y="150" width="40" height="22" rx="8" fill="#e23a4e" stroke={T} stroke-width="2" /><line x1="50" y1="150" x2="50" y2="78" stroke={T} stroke-width="1.5" /></g>
    <g class="fahren zwei"><rect x="120" y="152" width="40" height="22" rx="8" fill="#3fae6a" stroke={T} stroke-width="2" /><line x1="140" y1="152" x2="140" y2="78" stroke={T} stroke-width="1.5" /></g>
  {:else if art === 'schiffschaukel'}
    <path d="M40 194 L100 30 L160 194" fill="none" stroke="#87521f" stroke-width="10" stroke-linejoin="round" />
    <g class="schaukel" style="transform-origin: 100px 34px">
      <line x1="84" y1="34" x2="70" y2="140" stroke={T} stroke-width="3" /><line x1="116" y1="34" x2="130" y2="140" stroke={T} stroke-width="3" />
      <path d="M52 136 L148 136 L134 166 L66 166 Z" fill="#e23a4e" stroke={T} stroke-width="3" stroke-linejoin="round" />
      <path d="M70 146 H130" stroke="#ffc62b" stroke-width="4" />
    </g>
  {:else if art === 'musikpavillon'}
    <rect x="30" y="150" width="140" height="44" rx="6" fill="#fffdf7" stroke={T} stroke-width="3" />
    {#each [40, 80, 120, 160] as x (x)}<rect x={x - 4} y="80" width="8" height="72" fill="#fffdf7" stroke={T} stroke-width="2" />{/each}
    <path d="M20 84 Q100 6 180 84 Z" fill="#3fae6a" stroke={T} stroke-width="3" />
    <path d="M100 30 V12" stroke={T} stroke-width="3" /><circle cx="100" cy="10" r="5" fill="#ffc62b" stroke={T} stroke-width="2" />
    <g class="noten" fill={T}>
      <g class="note"><circle cx="70" cy="132" r="6" /><path d="M76 132 V110 L84 114" stroke={T} stroke-width="3" fill="none" /></g>
      <g class="note n2"><circle cx="122" cy="128" r="6" /><path d="M128 128 V106 L136 110" stroke={T} stroke-width="3" fill="none" /></g>
    </g>
  {:else if art === 'kinderkarussell'}
    <ellipse cx="100" cy="180" rx="88" ry="14" fill="#b9763f" stroke={T} stroke-width="3" />
    <rect x="96" y="56" width="8" height="122" fill="#ffc62b" stroke={T} stroke-width="2" />
    {#each [[44, 0], [100, 0.4], [156, 0.8]] as [x, v] (x)}
      <g class="pferd" style="animation-delay: {v}s">
        <line x1={x} y1="62" x2={x} y2="170" stroke="#ffc62b" stroke-width="3" />
        <ellipse cx={x} cy="140" rx="20" ry="11" fill="#fffdf7" stroke={T} stroke-width="2" />
        <circle cx={Number(x) + 18} cy="128" r="8" fill="#fffdf7" stroke={T} stroke-width="2" />
        <path d="M{Number(x) - 14} 148 V160 M{Number(x) + 10} 148 V160" stroke={T} stroke-width="3" />
      </g>
    {/each}
    <path d="M8 62 L100 10 L192 62 Z" fill="#3c78d8" stroke={T} stroke-width="3" stroke-linejoin="round" />
    {#each [0, 1, 2, 3, 4, 5, 6] as i (i)}<path d="M{8 + i * 26.3} 62 a13 13 0 0 0 26 0 Z" fill={i % 2 ? '#fffdf7' : '#e23a4e'} stroke={T} stroke-width="2" />{/each}
  {:else if art === 'zirkuszelt'}
    {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}<path d="M100 10 L{4 + i * 24} 150 L{28 + i * 24} 150 Z" fill={i % 2 ? '#fffdf7' : '#e23a4e'} stroke={T} stroke-width="1.5" />{/each}
    <rect x="4" y="150" width="192" height="44" fill="#e23a4e" stroke={T} stroke-width="3" />
    {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}<rect x={4 + i * 24} y="150" width="12" height="44" fill="#fffdf7" opacity="0.85" />{/each}
    <path d="M78 194 Q100 150 122 194 Z" fill="#2b2f5e" />
    <path d="M100 10 V-14" stroke={T} stroke-width="3" /><path class="flagge" d="M100 -14 L124 -8 L100 -2 Z" fill="#ffc62b" stroke={T} stroke-width="2" />
  {:else if art === 'achterbahn'}
    <ellipse cx="100" cy="190" rx="98" ry="9" fill="rgba(42,47,99,0.18)" />
    <!-- Stützen bis zum Boden, mit Querstreben -->
    <g stroke="#9aa0b5" stroke-width="5" stroke-linecap="round">
      <line x1="86" y1="34" x2="86" y2="188" /><line x1="66" y1="96" x2="66" y2="188" /><line x1="106" y1="70" x2="106" y2="188" />
      <line x1="134" y1="140" x2="134" y2="188" /><line x1="168" y1="96" x2="168" y2="188" /><line x1="152" y1="112" x2="152" y2="188" />
    </g>
    <g stroke="#b7bccb" stroke-width="3"><line x1="66" y1="130" x2="106" y2="100" /><line x1="66" y1="100" x2="106" y2="140" /><line x1="152" y1="140" x2="168" y2="120" /></g>
    <path d="M24 168 H44 C58 168 62 30 86 30 C110 30 112 142 134 136 C150 132 152 92 168 92 C186 92 190 168 176 168 Z" fill="none" stroke="#e23a4e" stroke-width="8" stroke-linejoin="round" />
    <path d="M24 168 H44 C58 168 62 30 86 30 C110 30 112 142 134 136 C150 132 152 92 168 92 C186 92 190 168 176 168 Z" fill="none" stroke="#fffdf7" stroke-width="2" stroke-dasharray="6 6" />
    <!-- Bahnhof -->
    <rect x="4" y="150" width="44" height="38" fill="#fffdf7" stroke={T} stroke-width="3" />
    <path d="M0 152 L26 132 L52 152 Z" fill="#3c78d8" stroke={T} stroke-width="3" stroke-linejoin="round" />
    <rect x="16" y="164" width="20" height="24" fill="#4a5394" />
    <rect x="0" y="186" width="200" height="6" rx="3" fill="#87521f" />
    {#each [0, 0.35] as v (v)}
      <g>
        <rect x="-11" y="-14" width="22" height="12" rx="4" fill={v ? '#3c78d8' : '#ffc62b'} stroke={T} stroke-width="2" />
        <animateMotion dur={aktiv ? '2.4s' : '6s'} begin="{-v}s" repeatCount="indefinite" rotate="auto" path="M24 168 H44 C58 168 62 30 86 30 C110 30 112 142 134 136 C150 132 152 92 168 92 C186 92 190 168 176 168 Z" />
      </g>
    {/each}
  {:else if art === 'brunnen'}
    <ellipse cx="100" cy="170" rx="80" ry="22" fill="#b7bccb" stroke={T} stroke-width="3" />
    <ellipse cx="100" cy="164" rx="66" ry="14" fill="#6cc3ec" />
    <rect x="92" y="96" width="16" height="66" fill="#b7bccb" stroke={T} stroke-width="2" />
    <ellipse cx="100" cy="96" rx="28" ry="8" fill="#b7bccb" stroke={T} stroke-width="2" />
    <g class="wasser" fill="none" stroke="#6cc3ec" stroke-width="5" stroke-linecap="round">
      <path d="M100 90 Q80 60 60 150" /><path d="M100 90 Q120 60 140 150" /><path d="M100 90 V56" />
    </g>
  {:else}
    <path d="M70 194 L100 120 L130 194" fill="none" stroke="#87521f" stroke-width="7" stroke-linejoin="round" />
    <g class="fernrohr"><rect x="70" y="96" width="80" height="22" rx="8" fill="#3c78d8" stroke={T} stroke-width="3" transform="rotate(-24 100 118)" /><circle cx="148" cy="80" r="10" fill="#ffc62b" stroke={T} stroke-width="2" /></g>
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .schwingen {
    animation: kreisen 3s ease-in-out infinite alternate;
  }
  .aktiv .schwingen {
    animation-duration: 0.8s;
  }
  @keyframes kreisen {
    from {
      transform: scaleX(0.8) rotate(-4deg);
    }
    to {
      transform: scaleX(1.12) rotate(4deg);
    }
  }
  .fahren {
    animation: scooter 4s ease-in-out infinite alternate;
  }
  .fahren.zwei {
    animation-direction: alternate-reverse;
  }
  .aktiv .fahren {
    animation-duration: 1.2s;
  }
  @keyframes scooter {
    to {
      transform: translateX(46px);
    }
  }
  .schaukel {
    animation: schaukeln 3s ease-in-out infinite alternate;
  }
  .aktiv .schaukel {
    animation-duration: 1s;
  }
  @keyframes schaukeln {
    from {
      transform: rotate(-22deg);
    }
    to {
      transform: rotate(22deg);
    }
  }
  .note {
    animation: note 2.4s ease-out infinite;
  }
  .note.n2 {
    animation-delay: 1.2s;
  }
  .aktiv .note {
    animation-duration: 1s;
  }
  @keyframes note {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(-70px);
      opacity: 0;
    }
  }
  .pferd {
    animation: auf 1.6s ease-in-out infinite alternate;
  }
  .aktiv .pferd {
    animation-duration: 0.5s;
  }
  @keyframes auf {
    to {
      transform: translateY(-14px);
    }
  }
  .flagge {
    transform-origin: 100px -8px;
    animation: wehen 1.2s ease-in-out infinite alternate;
  }
  @keyframes wehen {
    to {
      transform: scaleX(0.7);
    }
  }
  .wasser {
    animation: plaetschern 1.2s ease-in-out infinite alternate;
  }
  .aktiv .wasser {
    animation-duration: 0.3s;
  }
  @keyframes plaetschern {
    to {
      opacity: 0.5;
    }
  }
  .fernrohr {
    transform-origin: 100px 120px;
    animation: schauen 4s ease-in-out infinite alternate;
  }
  .aktiv .fernrohr {
    animation-duration: 1s;
  }
  @keyframes schauen {
    to {
      transform: rotate(10deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
    }
  }
</style>
