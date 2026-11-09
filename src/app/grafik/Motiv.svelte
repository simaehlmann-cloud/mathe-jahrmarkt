<script lang="ts">
  /**
   * Kleines Motiv an der Rückwand oder auf dem Rollladen einer Bude.
   * Zeichenfläche: Mittelpunkt (0, 0), etwa 120 × 70 Einheiten.
   */
  let { bude }: { bude: string } = $props();
  const T = '#1f2a6b';
  const W = '#fffdf7';
</script>

<g class="motiv" stroke={T} stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
  {#if bude === 'dartbude'}
    {#each [[-46, -14, '#e23a4e'], [-22, 6, '#ffc62b'], [0, -18, '#7b5ea7'], [26, 2, '#3c78d8'], [48, -12, '#3fae6a']] as [x, y, f] (x)}
      <ellipse cx={x as number} cy={y as number} rx="10" ry="12" fill={f as string} />
      <path d="M{x} {(y as number) + 12} q-3 10 0 18" fill="none" stroke-width="1.2" />
    {/each}
  {:else if bude === 'einmaleins-turbo'}
    <circle r="26" fill={W} /><circle r="26" fill="none" stroke-width="4" />
    <rect x="-5" y="-38" width="10" height="9" rx="2" fill="#e23a4e" />
    <path d="M0 0 L0 -18 M0 0 L12 6" stroke-width="3" fill="none" />
    <text x="0" y="-6" font-size="11" text-anchor="middle" fill={T} stroke="none" font-weight="900">×</text>
  {:else if bude === 'dosenwerfen'}
    {#each [[-27, 18], [-9, 18], [9, 18], [27, 18], [-18, -6], [0, -6], [18, -6], [-9, -30], [9, -30]] as [number, number][] as [x, y], i (i)}
      <rect x={x - 8} y={y - 11} width="16" height="22" rx="2" fill={i % 2 ? '#e23a4e' : '#3c78d8'} />
      <path d="M{x - 8} {y - 4} h16" stroke={W} stroke-width="2" />
    {/each}
  {:else if bude === 'seilbahn'}
    <path d="M-58 -26 L58 18" fill="none" stroke-width="2.5" />
    <path d="M6 -4 v8" fill="none" />
    <rect x="-10" y="4" width="32" height="22" rx="5" fill="#ffc62b" />
    <rect x="-5" y="8" width="9" height="8" rx="1" fill={W} /><rect x="8" y="8" width="9" height="8" rx="1" fill={W} />
    {#each [-48, -24, 24, 48] as x (x)}<path d="M{x} 28 v8" fill="none" />{/each}
  {:else if bude === 'waage'}
    <path d="M0 30 V-24 M-40 -18 L40 -10" fill="none" stroke-width="3" />
    <path d="M-48 -18 l8 18 h-16 z M40 -10 l8 18 h-16 z" fill="#17a398" transform="translate(8 0)" />
    <rect x="-14" y="28" width="28" height="7" rx="3" fill="#b9763f" />
  {:else if bude === 'rechendomino'}
    {#each [-36, 0, 36] as x, i (x)}
      <g transform="translate({x} 0) rotate({(i - 1) * 10})">
        <rect x="-12" y="-24" width="24" height="48" rx="4" fill={W} />
        <path d="M-12 0 h24" fill="none" />
        {#each Array.from({ length: i + 1 }, (_, k) => k) as k (k)}<circle cx={(k - i / 2) * 7} cy="-12" r="2.6" fill={T} stroke="none" />{/each}
        {#each Array.from({ length: 3 - i }, (_, k) => k) as k (k)}<circle cx={(k - (2 - i) / 2) * 7} cy="12" r="2.6" fill={T} stroke="none" />{/each}
      </g>
    {/each}
  {:else if bude === 'rechenwerkstatt'}
    <g fill="#ffc62b">
      <path
        d="M0 -26 l5 0 2 7 6 3 6 -4 4 4 -4 6 3 6 7 2 0 5 -7 2 -3 6 4 6 -4 4 -6 -4 -6 3 -2 7 -5 0 -2 -7 -6 -3 -6 4 -4 -4 4 -6 -3 -6 -7 -2 0 -5 7 -2 3 -6 -4 -6 4 -4 6 4 6 -3 z"
        transform="translate(-14 4) scale(1.15)"
      />
      <circle cx="-14" cy="4" r="7" fill={W} />
    </g>
    <text x="30" y="14" font-size="34" text-anchor="middle" fill="#3c78d8" stroke="none" font-weight="900">+</text>
  {:else if bude === 'fehlerdetektiv'}
    <circle cx="-8" cy="-6" r="22" fill="#d6f0fd" stroke-width="5" />
    <path d="M8 10 L32 32" stroke-width="9" />
    <text x="-8" y="2" font-size="22" text-anchor="middle" fill="#e23a4e" stroke="none" font-weight="900">?</text>
  {:else if bude === 'tresor'}
    <rect x="-34" y="-30" width="68" height="60" rx="6" fill="#9aa0b8" />
    <rect x="-26" y="-22" width="52" height="44" rx="4" fill="#c9cde0" />
    <circle cx="0" cy="0" r="13" fill="#ffc62b" />
    <path d="M0 0 L0 -10" fill="none" stroke-width="3" />
    {#each [0, 60, 120, 180, 240, 300] as w (w)}<path d="M0 -13 v3" transform="rotate({w})" fill="none" />{/each}
  {:else if bude === 'kasse'}
    {#each [[-36, '#e23a4e'], [0, '#3fae6a'], [36, '#7b5ea7']] as [x, f] (x)}
      <path d="M{x} 30 V-4" fill="none" stroke-width="3" />
      <circle cx={x as number} cy="-14" r="15" fill={f as string} />
      <path d="M{(x as number) - 9} -14 a9 9 0 1 1 9 9" fill="none" stroke={W} stroke-width="2.5" />
    {/each}
  {:else if bude === 'schaetzbude'}
    <rect x="-24" y="-26" width="48" height="58" rx="10" fill="#d6f0fd" />
    <rect x="-20" y="-34" width="40" height="10" rx="3" fill="#b9763f" />
    {#each Array.from({ length: 18 }, (_, i) => i) as i (i)}
      <circle cx={-14 + (i % 5) * 7 + ((i / 5) | 0) % 2 * 3} cy={24 - ((i / 5) | 0) * 9} r="3.5" fill={['#e23a4e', '#ffc62b', '#3fae6a'][i % 3]} stroke-width="1" />
    {/each}
    <text x="40" y="8" font-size="26" fill={T} stroke="none" font-weight="900">?</text>
  {:else if bude === 'uhrkarussell'}
    <circle r="30" fill={W} stroke-width="4" />
    {#each Array.from({ length: 12 }, (_, i) => i * 30) as w (w)}<path d="M0 -30 v6" transform="rotate({w})" fill="none" />{/each}
    <path d="M0 0 V-20 M0 0 L14 8" stroke-width="3.5" fill="none" />
    <circle r="3" fill={T} />
  {:else if bude === 'umrechnungsmemory'}
    {#each [[-30, -16, '1 m'], [0, -16, ''], [30, -16, ''], [-30, 16, ''], [0, 16, '100 cm'], [30, 16, '']] as [x, y, t], i (i)}
      <rect x={(x as number) - 13} y={(y as number) - 13} width="26" height="26" rx="4" fill={t ? W : '#f07f2a'} />
      {#if t}<text x={x as number} y={(y as number) + 4} font-size={(t as string).length > 4 ? 7 : 10} text-anchor="middle" fill={T} stroke="none" font-weight="900">{t}</text>{/if}
    {/each}
  {:else if bude === 'achterbahn'}
    <path d="M-58 28 C-40 28 -38 -30 -14 -30 C10 -30 6 10 20 10 C30 10 30 -12 20 -12 C10 -12 12 28 58 28" fill="none" stroke="#e23a4e" stroke-width="5" />
    <rect x="-24" y="-40" width="18" height="10" rx="3" fill="#ffc62b" />
  {:else if bude === 'spiegelkabinett'}
    <ellipse rx="22" ry="32" fill="#ffc62b" />
    <ellipse rx="16" ry="25" fill="#d6f0fd" />
    <path d="M-6 -14 l8 -8 M-2 -4 l10 -10" stroke={W} stroke-width="3" fill="none" />
    <path d="M-40 -30 V30 M40 -30 V30" stroke-dasharray="4 4" fill="none" />
  {:else if bude === 'wuerfelnetz'}
    {#each [[-1, 0], [0, 0], [1, 0], [2, 0], [0, -1], [0, 1]] as [number, number][] as [cx, cy], i (i)}
      <rect x={cx * 18 - 18} y={cy * 18 - 9} width="18" height="18" fill={i === 1 ? '#3fae6a' : W} />
    {/each}
  {:else if bude === 'labyrinth'}
    <rect x="-22" y="-20" width="44" height="38" rx="8" fill="#9aa0b8" />
    <circle cx="-9" cy="-4" r="6" fill={W} /><circle cx="9" cy="-4" r="6" fill={W} />
    <circle cx="-9" cy="-4" r="2.5" fill={T} /><circle cx="9" cy="-4" r="2.5" fill={T} />
    <path d="M-8 10 h16 M0 -20 v-10" fill="none" /><circle cx="0" cy="-32" r="4" fill="#e23a4e" />
    <rect x="-30" y="20" width="60" height="8" rx="4" fill={T} />
  {:else if bude === 'formensortierer'}
    <path d="M-40 18 L-24 -14 L-8 18 Z" fill="#e23a4e" />
    <circle cx="14" cy="2" r="16" fill="#ffc62b" />
    <rect x="34" y="-14" width="28" height="28" fill="#3c78d8" transform="translate(-6 0)" />
  {:else if bude === 'zeltdekorateur'}
    <rect x="-58" y="-14" width="116" height="28" fill={W} />
    {#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
      <path d="M{-58 + i * 19.3} 14 l9.6 -28 9.7 28 z" fill={i % 2 ? '#d6457f' : '#ffc62b'} />
    {/each}
  {:else if bude === 'zahlenfolgenzug'}
    <rect x="-56" y="-14" width="30" height="26" rx="4" fill="#e23a4e" />
    <rect x="-52" y="-28" width="10" height="14" fill="#e23a4e" />
    {#each [[-18, '2'], [12, '4'], [42, '6']] as [x, n] (x)}
      <rect x={x as number} y="-10" width="26" height="22" rx="3" fill="#ffc62b" />
      <text x={(x as number) + 13} y="6" font-size="14" text-anchor="middle" fill={T} stroke="none" font-weight="900">{n}</text>
    {/each}
    {#each [-48, -32, -10, 4, 20, 34, 50, 64] as x (x)}<circle cx={x} cy="16" r="4" fill={T} stroke="none" />{/each}
  {:else if bude === 'rechenmauer'}
    {#each [[-36, 16], [0, 16], [36, 16], [-18, -6], [18, -6], [0, -28]] as [number, number][] as [x, y], i (i)}
      <rect x={x - 17} y={y - 10} width="34" height="20" rx="2" fill={i === 5 ? '#ffc62b' : '#e07a4f'} />
    {/each}
  {:else if bude === 'riesenradtechniker'}
    <circle r="28" fill="none" stroke-width="3" />
    {#each Array.from({ length: 8 }, (_, i) => i * 45) as w (w)}
      <path d="M0 0 L0 -28" transform="rotate({w})" fill="none" />
      <rect x="-5" y="-34" width="10" height="9" rx="2" fill="#3c78d8" transform="rotate({w})" />
    {/each}
    <circle r="5" fill="#e23a4e" />
  {:else if bude === 'murmellabor'}
    <path d="M-26 -30 h52 v10 c0 0 6 6 6 20 v22 a10 10 0 0 1 -10 10 h-50 a10 10 0 0 1 -10 -10 v-22 c0 -14 6 -20 6 -20 z" fill="#d6f0fd" />
    {#each [[-14, 18, '#e23a4e'], [0, 20, '#3c78d8'], [14, 18, '#e23a4e'], [-7, 6, '#3fae6a'], [8, 6, '#e23a4e']] as [x, y, f] (`${x}${y}`)}
      <circle cx={x as number} cy={y as number} r="6.5" fill={f as string} stroke-width="1.5" />
    {/each}
  {:else if bude === 'diagrammreporter'}
    <path d="M-40 28 H44 M-40 28 V-32" fill="none" stroke-width="2.5" />
    {#each [[-30, 30, '#3c78d8'], [-8, 48, '#ffc62b'], [14, 22, '#3fae6a'], [36, 40, '#e23a4e']] as [x, h, f] (x)}
      <rect x={x as number} y={28 - (h as number)} width="14" height={h as number} fill={f as string} />
    {/each}
  {:else if bude === 'geisterbahn'}
    <path d="M-20 26 V-6 a20 20 0 0 1 40 0 V26 l-7 -6 -6 6 -7 -6 -7 6 -6 -6 z" fill={W} />
    <circle cx="-7" cy="-4" r="3.5" fill={T} /><circle cx="7" cy="-4" r="3.5" fill={T} />
    <ellipse cx="0" cy="8" rx="4" ry="5" fill={T} />
  {:else if bude === 'pizzabaeckerei'}
    <circle r="30" fill="#f0c070" /><circle r="25" fill="#e23a4e" />
    {#each [0, 90, 180, 270] as w (w)}<path d="M0 0 L0 -30" transform="rotate({w})" fill="none" stroke-width="2.5" />{/each}
    {#each [[-12, -12], [12, -10], [-10, 12], [12, 12]] as [x, y] (`${x}${y}`)}<circle cx={x} cy={y} r="4" fill="#ffc62b" stroke-width="1" />{/each}
  {:else if bude === 'hauDenLukas'}
    <rect x="-6" y="-36" width="12" height="66" fill={W} />
    <circle cx="0" cy="-38" r="8" fill="#ffc62b" />
    {#each [-24, -12, 0, 12, 24] as y (y)}<path d="M-6 {y} h12" fill="none" />{/each}
    <rect x="-3" y="10" width="6" height="8" fill="#e23a4e" />
    <rect x="18" y="14" width="24" height="10" rx="3" fill="#b9763f" transform="rotate(-30 30 19)" />
  {/if}
</g>
