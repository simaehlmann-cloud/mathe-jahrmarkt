<script lang="ts">
  import { TUECHER, fellFarben, standardAussehen, type Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';

  /** Spielfigur als Kopfbild. Aussehen aus dem Baukasten: Fellfarbe, Halstuch, Extra. */
  let { figur, groesse = 56, aussehen = standardAussehen() }: { figur: FigurId; groesse?: number; aussehen?: Aussehen } = $props();

  let farben = $derived(fellFarben(figur, aussehen.fell));
  let f1 = $derived(farben[0]);
  let f2 = $derived(farben[1]);
  let tuch = $derived(TUECHER.find((t) => t.id === aussehen.tuch)?.farbe);
  const TINTE = '#1f2a6b';
</script>

<svg viewBox="-4 -6 72 74" width={groesse} height={groesse} aria-hidden="true">
  {#if tuch}
    <!-- Halstuch -->
    <path d="M12 52 Q32 62 52 52 L50 60 Q32 68 14 60 Z" fill={tuch} />
    <path d="M28 60 L36 60 L32 68 Z" fill={tuch} />
  {/if}

  {#if figur === 'fuchs'}
    <path d="M12 26 L10 4 L27 17 Z" fill={f1} /><path d="M12 10 L10 4 L17 9 Z" fill={f2} />
    <path d="M52 26 L54 4 L37 17 Z" fill={f1} /><path d="M52 10 L54 4 L47 9 Z" fill={f2} />
    <circle cx="32" cy="36" r="22" fill={f1} />
    <path d="M10 40 Q22 42 32 54 Q42 42 54 40 Q48 60 32 60 Q16 60 10 40 Z" fill="#fff" />
    <circle cx="24" cy="34" r="3" fill={TINTE} /><circle cx="40" cy="34" r="3" fill={TINTE} />
    <ellipse cx="32" cy="46" rx="3.5" ry="2.6" fill={TINTE} />
  {:else if figur === 'eule'}
    <path d="M14 18 L18 6 L26 16 Z" fill={f2} /><path d="M50 18 L46 6 L38 16 Z" fill={f2} />
    <circle cx="32" cy="36" r="24" fill={f1} />
    <ellipse cx="32" cy="48" rx="13" ry="10" fill="#f3e3c8" />
    <circle cx="22" cy="30" r="9" fill="#fff" /><circle cx="42" cy="30" r="9" fill="#fff" />
    <circle cx="23" cy="31" r="4.5" fill={TINTE} /><circle cx="41" cy="31" r="4.5" fill={TINTE} />
    <path d="M28 38 L36 38 L32 45 Z" fill="#ffc62b" />
  {:else if figur === 'igel'}
    <path d="M6 40 L2 30 L10 28 L6 16 L16 18 L16 6 L26 12 L32 2 L38 12 L48 6 L48 18 L58 16 L54 28 L62 30 L58 40 Z" fill={f1} />
    <ellipse cx="32" cy="42" rx="20" ry="18" fill={f2} />
    <circle cx="25" cy="38" r="3" fill={TINTE} /><circle cx="39" cy="38" r="3" fill={TINTE} />
    <ellipse cx="32" cy="48" rx="4" ry="3" fill="#3b2314" />
    <circle cx="20" cy="47" r="3" fill="#f48c8c" opacity="0.6" /><circle cx="44" cy="47" r="3" fill="#f48c8c" opacity="0.6" />
  {:else if figur === 'katze'}
    <path d="M10 28 L12 6 L28 18 Z" fill={f2} /><path d="M14 22 L15 12 L23 18 Z" fill="#f4a3b4" />
    <path d="M54 28 L52 6 L36 18 Z" fill={f2} /><path d="M50 22 L49 12 L41 18 Z" fill="#f4a3b4" />
    <circle cx="32" cy="37" r="23" fill={f1} />
    <ellipse cx="32" cy="47" rx="10" ry="7" fill="#eceef5" />
    <ellipse cx="24" cy="34" rx="3" ry="4" fill="#3f9a5d" /><ellipse cx="40" cy="34" rx="3" ry="4" fill="#3f9a5d" />
    <path d="M30 43 L34 43 L32 46 Z" fill="#f48c8c" />
    <path d="M18 46 L6 44 M18 49 L6 51 M46 46 L58 44 M46 49 L58 51" stroke="#4a5394" stroke-width="1.5" stroke-linecap="round" />
  {:else if figur === 'baer'}
    <circle cx="13" cy="16" r="9" fill={f1} /><circle cx="51" cy="16" r="9" fill={f1} />
    <circle cx="13" cy="16" r="4.5" fill={f2} /><circle cx="51" cy="16" r="4.5" fill={f2} />
    <circle cx="32" cy="37" r="24" fill={f1} />
    <ellipse cx="32" cy="46" rx="12" ry="9" fill={f2} />
    <circle cx="23" cy="33" r="3" fill={TINTE} /><circle cx="41" cy="33" r="3" fill={TINTE} />
    <ellipse cx="32" cy="42" rx="4.5" ry="3.2" fill="#3b2314" />
  {:else}
    <ellipse cx="22" cy="14" rx="6" ry="15" fill={f1} /><ellipse cx="22" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <ellipse cx="42" cy="14" rx="6" ry="15" fill={f1} /><ellipse cx="42" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <circle cx="32" cy="40" r="21" fill={f1} stroke={f2} stroke-width="1.5" />
    <circle cx="25" cy="37" r="3" fill={TINTE} /><circle cx="39" cy="37" r="3" fill={TINTE} />
    <ellipse cx="32" cy="45" rx="3" ry="2.2" fill="#f48c8c" />
    <rect x="29" y="48" width="6" height="5" rx="1" fill="#fff" stroke={f2} />
  {/if}

  {#if aussehen.extra === 'brille'}
    <g fill="none" stroke={TINTE} stroke-width="2.4">
      <circle cx={figur === 'eule' ? 22 : 24} cy={figur === 'hase' ? 37 : 33} r="6.5" />
      <circle cx={figur === 'eule' ? 42 : 40} cy={figur === 'hase' ? 37 : 33} r="6.5" />
      <path d="M{figur === 'eule' ? 28.5 : 30.5} {figur === 'hase' ? 37 : 33} H{figur === 'eule' ? 35.5 : 33.5}" />
    </g>
  {:else if aussehen.extra === 'schleife'}
    <g transform="translate({figur === 'hase' ? 44 : 46} {figur === 'hase' ? 22 : 14})">
      <path d="M0 0 L-9 -6 L-9 6 Z M0 0 L9 -6 L9 6 Z" fill="#e23a4e" stroke={TINTE} stroke-width="1.2" />
      <circle r="3" fill="#ff6b7d" stroke={TINTE} stroke-width="1.2" />
    </g>
  {:else if aussehen.extra === 'muetze'}
    <path d="M10 {figur === 'hase' ? 26 : 22} Q32 -4 54 {figur === 'hase' ? 26 : 22} Z" fill="#3c78d8" />
    <rect x="9" y={figur === 'hase' ? 22 : 18} width="46" height="7" rx="3.5" fill="#fffdf7" />
    <circle cx="32" cy={figur === 'hase' ? 4 : 1} r="5" fill="#fffdf7" />
  {:else if aussehen.extra === 'kopfhoerer'}
    <path d="M9 38 Q9 6 32 6 Q55 6 55 38" fill="none" stroke={TINTE} stroke-width="3.5" />
    <rect x="3" y="32" width="10" height="14" rx="4" fill="#e23a4e" stroke={TINTE} stroke-width="1.5" />
    <rect x="51" y="32" width="10" height="14" rx="4" fill="#e23a4e" stroke={TINTE} stroke-width="1.5" />
  {:else if aussehen.extra === 'strohhut'}
    <ellipse cx="32" cy="14" rx="20" ry="4.5" fill="#ffc62b" />
    <rect x="21" y="3" width="22" height="11" rx="3" fill="#ffd75e" />
    <rect x="21" y="9" width="22" height="4" fill="#e23a4e" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }
</style>
