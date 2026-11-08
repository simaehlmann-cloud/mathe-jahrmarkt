<script lang="ts">
  import type { FigurId } from '../../domain/profil';

  let { figur, groesse = 56, hut = false }: { figur: FigurId; groesse?: number; hut?: boolean } = $props();
</script>

<svg viewBox="0 0 64 64" width={groesse} height={groesse} aria-hidden="true">
  {#if figur === 'fuchs'}
    <path d="M12 26 L10 4 L27 17 Z" fill="#e8833a" /><path d="M12 10 L10 4 L17 9 Z" fill="#3b2314" />
    <path d="M52 26 L54 4 L37 17 Z" fill="#e8833a" /><path d="M52 10 L54 4 L47 9 Z" fill="#3b2314" />
    <circle cx="32" cy="36" r="22" fill="#e8833a" />
    <path d="M10 40 Q22 42 32 54 Q42 42 54 40 Q48 60 32 60 Q16 60 10 40 Z" fill="#fff" />
    <circle cx="24" cy="34" r="3" fill="#1f2a6b" /><circle cx="40" cy="34" r="3" fill="#1f2a6b" />
    <ellipse cx="32" cy="46" rx="3.5" ry="2.6" fill="#1f2a6b" />
  {:else if figur === 'eule'}
    <path d="M14 18 L18 6 L26 16 Z" fill="#8a5a3b" /><path d="M50 18 L46 6 L38 16 Z" fill="#8a5a3b" />
    <circle cx="32" cy="36" r="24" fill="#a56b45" />
    <ellipse cx="32" cy="48" rx="13" ry="10" fill="#e9c9a1" />
    <circle cx="22" cy="30" r="9" fill="#fff" /><circle cx="42" cy="30" r="9" fill="#fff" />
    <circle cx="23" cy="31" r="4.5" fill="#1f2a6b" /><circle cx="41" cy="31" r="4.5" fill="#1f2a6b" />
    <path d="M28 38 L36 38 L32 45 Z" fill="#ffc62b" />
  {:else if figur === 'igel'}
    <path
      d="M6 40 L2 30 L10 28 L6 16 L16 18 L16 6 L26 12 L32 2 L38 12 L48 6 L48 18 L58 16 L54 28 L62 30 L58 40 Z"
      fill="#6b4a2e"
    />
    <ellipse cx="32" cy="42" rx="20" ry="18" fill="#f2d3a8" />
    <circle cx="25" cy="38" r="3" fill="#1f2a6b" /><circle cx="39" cy="38" r="3" fill="#1f2a6b" />
    <ellipse cx="32" cy="48" rx="4" ry="3" fill="#3b2314" />
    <circle cx="20" cy="47" r="3" fill="#f48c8c" opacity="0.6" /><circle cx="44" cy="47" r="3" fill="#f48c8c" opacity="0.6" />
  {:else if figur === 'katze'}
    <path d="M10 28 L12 6 L28 18 Z" fill="#8d93a8" /><path d="M14 22 L15 12 L23 18 Z" fill="#f4a3b4" />
    <path d="M54 28 L52 6 L36 18 Z" fill="#8d93a8" /><path d="M50 22 L49 12 L41 18 Z" fill="#f4a3b4" />
    <circle cx="32" cy="37" r="23" fill="#a3a9bd" />
    <ellipse cx="32" cy="47" rx="10" ry="7" fill="#e8eaf2" />
    <ellipse cx="24" cy="34" rx="3" ry="4" fill="#3f9a5d" /><ellipse cx="40" cy="34" rx="3" ry="4" fill="#3f9a5d" />
    <path d="M30 43 L34 43 L32 46 Z" fill="#f48c8c" />
    <path d="M18 46 L6 44 M18 49 L6 51 M46 46 L58 44 M46 49 L58 51" stroke="#4a5394" stroke-width="1.5" stroke-linecap="round" />
  {:else if figur === 'baer'}
    <circle cx="13" cy="16" r="9" fill="#8a5a3b" /><circle cx="51" cy="16" r="9" fill="#8a5a3b" />
    <circle cx="13" cy="16" r="4.5" fill="#c99a6b" /><circle cx="51" cy="16" r="4.5" fill="#c99a6b" />
    <circle cx="32" cy="37" r="24" fill="#8a5a3b" />
    <ellipse cx="32" cy="46" rx="12" ry="9" fill="#e2bf95" />
    <circle cx="23" cy="33" r="3" fill="#1f2a6b" /><circle cx="41" cy="33" r="3" fill="#1f2a6b" />
    <ellipse cx="32" cy="42" rx="4.5" ry="3.2" fill="#3b2314" />
  {:else}
    <ellipse cx="22" cy="14" rx="6" ry="15" fill="#f4f1f8" /><ellipse cx="22" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <ellipse cx="42" cy="14" rx="6" ry="15" fill="#f4f1f8" /><ellipse cx="42" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <circle cx="32" cy="40" r="21" fill="#f4f1f8" stroke="#d7d3e2" stroke-width="1.5" />
    <circle cx="25" cy="37" r="3" fill="#1f2a6b" /><circle cx="39" cy="37" r="3" fill="#1f2a6b" />
    <ellipse cx="32" cy="45" rx="3" ry="2.2" fill="#f48c8c" />
    <rect x="29" y="48" width="6" height="5" rx="1" fill="#fff" stroke="#d7d3e2" />
  {/if}
  {#if hut}
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
