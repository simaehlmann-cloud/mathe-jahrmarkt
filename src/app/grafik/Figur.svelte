<script lang="ts" module>
  export type Ansicht = 'vorne' | 'seite' | 'hinten';
</script>

<script lang="ts">
  import { TUECHER, fellFarben, standardAussehen, type Aussehen } from '../../domain/aussehen';
  import type { FigurId } from '../../domain/profil';

  /**
   * Spielfigur als Kopfbild. Aussehen aus dem Baukasten: Fellfarbe, Halstuch, Extra.
   * `ansicht`: vorne (Standard), seite (Kopf zur Laufrichtung gedreht, Blick nach rechts) oder hinten (Hinterkopf).
   */
  let {
    figur,
    groesse = 56,
    aussehen = standardAussehen(),
    ansicht = 'vorne',
  }: { figur: FigurId; groesse?: number; aussehen?: Aussehen; ansicht?: Ansicht } = $props();
  /** Seitenansicht: Das Gesicht wandert zur Seite, der Kopf bleibt. */
  let dx = $derived(ansicht === 'seite' ? 8 : 0);
  let gesicht = $derived(ansicht !== 'hinten');

  let farben = $derived(fellFarben(figur, aussehen.fell));
  let f1 = $derived(farben[0]);
  let f2 = $derived(farben[1]);
  let tuch = $derived(TUECHER.find((t) => t.id === aussehen.tuch)?.farbe);
  let mensch = $derived(figur === 'mensch' || figur === 'menschLang');
  /** Augenhöhe je Figur, für Brillen. */
  let augeY = $derived(figur === 'hase' ? 37 : mensch ? 38 : figur === 'roboter' ? 35 : 33);
  let augeX = $derived(figur === 'eule' ? [22, 42] : [24, 40]);
  let hutY = $derived(figur === 'hase' ? 26 : mensch ? 24 : figur === 'roboter' ? 20 : 22);
  const TINTE = '#1f2a6b';
</script>

<svg viewBox="-4 -6 72 74" width={groesse} height={groesse} aria-hidden="true">
  {#if tuch}
    <!-- Halstuch -->
    <path d="M12 52 Q32 62 52 52 L50 60 Q32 68 14 60 Z" fill={tuch} />
    {#if gesicht}<path d="M{28 + dx} 60 L{36 + dx} 60 L{32 + dx} 68 Z" fill={tuch} />{/if}
  {/if}

  {#if mensch}
    <g>
    {#if figur === 'menschLang'}<path d="M9 34 Q8 8 32 8 Q56 8 55 34 L57 62 Q46 66 40 58 L24 58 Q18 66 7 62 Z" fill={f2} />{/if}
    <circle cx="11" cy="39" r="4.5" fill={f1} /><circle cx="53" cy="39" r="4.5" fill={f1} />
    <circle cx="32" cy="37" r="21" fill={gesicht ? f1 : f2} />
    {#if gesicht}
      <path d="M11 33 Q10 11 32 11 Q54 11 53 33 Q47 21 34 22 Q30 26 22 24 Q15 25 11 33 Z" fill={f2} />
    {/if}
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <path d="M21 32 Q24 30 27 32 M37 32 Q40 30 43 32" stroke={f2} stroke-width="1.8" fill="none" stroke-linecap="round" />
    <circle cx="24" cy="38" r="2.8" fill={TINTE} /><circle cx="40" cy="38" r="2.8" fill={TINTE} />
    <path d="M26 47 Q32 52 38 47" stroke={TINTE} stroke-width="2.2" fill="none" stroke-linecap="round" />
    <circle cx="19" cy="45" r="3" fill="#f48c8c" opacity="0.35" /><circle cx="45" cy="45" r="3" fill="#f48c8c" opacity="0.35" />
    </g>{/if}
  {:else if figur === 'roboter'}
    <g>
    <path d="M32 14 V5" stroke={TINTE} stroke-width="2.5" /><circle cx="32" cy="4" r="3.5" fill={f2} stroke={TINTE} stroke-width="1.5" />
    <rect x="5" y="30" width="6" height="12" rx="2" fill={f2} stroke={TINTE} stroke-width="1.5" />
    <rect x="53" y="30" width="6" height="12" rx="2" fill={f2} stroke={TINTE} stroke-width="1.5" />
    <rect x="10" y="14" width="44" height="44" rx="11" fill={f1} stroke={TINTE} stroke-width="2.5" />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <rect x="16" y="26" width="32" height="18" rx="6" fill="#1f2a6b" />
    <circle cx="25" cy="35" r="3.6" fill="#7fe3ff" /><circle cx="39" cy="35" r="3.6" fill="#7fe3ff" />
    <path d="M24 50 H40" stroke={TINTE} stroke-width="2.4" stroke-linecap="round" /><path d="M28 48 V52 M32 48 V52 M36 48 V52" stroke={TINTE} stroke-width="1.5" />
    </g>{:else}<g><circle cx="22" cy="24" r="2" fill={TINTE} /><circle cx="42" cy="24" r="2" fill={TINTE} /><rect x="22" y="34" width="20" height="12" rx="3" fill={f2} opacity="0.6" /></g>{/if}
  {:else if figur === 'fuchs'}
    <g>
    <path d="M12 26 L10 4 L27 17 Z" fill={f1} /><path d="M12 10 L10 4 L17 9 Z" fill={f2} />
    <path d="M52 26 L54 4 L37 17 Z" fill={f1} /><path d="M52 10 L54 4 L47 9 Z" fill={f2} />
    <circle cx="32" cy="36" r="22" fill={f1} />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <path d="M10 40 Q22 42 32 54 Q42 42 54 40 Q48 60 32 60 Q16 60 10 40 Z" fill="#fff" />
    <circle cx="24" cy="34" r="3" fill={TINTE} /><circle cx="40" cy="34" r="3" fill={TINTE} />
    <ellipse cx="32" cy="46" rx="3.5" ry="2.6" fill={TINTE} />
    </g>{/if}
  {:else if figur === 'eule'}
    <g>
    <path d="M14 18 L18 6 L26 16 Z" fill={f2} /><path d="M50 18 L46 6 L38 16 Z" fill={f2} />
    <circle cx="32" cy="36" r="24" fill={f1} />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <ellipse cx="32" cy="48" rx="13" ry="10" fill="#f3e3c8" />
    <circle cx="22" cy="30" r="9" fill="#fff" /><circle cx="42" cy="30" r="9" fill="#fff" />
    <circle cx="23" cy="31" r="4.5" fill={TINTE} /><circle cx="41" cy="31" r="4.5" fill={TINTE} />
    <path d="M28 38 L36 38 L32 45 Z" fill="#ffc62b" />
    </g>{/if}
  {:else if figur === 'igel'}
    <g>
    <path d="M6 40 L2 30 L10 28 L6 16 L16 18 L16 6 L26 12 L32 2 L38 12 L48 6 L48 18 L58 16 L54 28 L62 30 L58 40 Z" fill={f1} />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <ellipse cx="32" cy="42" rx="20" ry="18" fill={f2} />
    <circle cx="25" cy="38" r="3" fill={TINTE} /><circle cx="39" cy="38" r="3" fill={TINTE} />
    <ellipse cx="32" cy="48" rx="4" ry="3" fill="#3b2314" />
    <circle cx="20" cy="47" r="3" fill="#f48c8c" opacity="0.6" /><circle cx="44" cy="47" r="3" fill="#f48c8c" opacity="0.6" />
    </g>{/if}
  {:else if figur === 'katze'}
    <g>
    <path d="M10 28 L12 6 L28 18 Z" fill={f2} /><path d="M14 22 L15 12 L23 18 Z" fill="#f4a3b4" />
    <path d="M54 28 L52 6 L36 18 Z" fill={f2} /><path d="M50 22 L49 12 L41 18 Z" fill="#f4a3b4" />
    <circle cx="32" cy="37" r="23" fill={f1} />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <ellipse cx="32" cy="47" rx="10" ry="7" fill="#eceef5" />
    <ellipse cx="24" cy="34" rx="3" ry="4" fill="#3f9a5d" /><ellipse cx="40" cy="34" rx="3" ry="4" fill="#3f9a5d" />
    <path d="M30 43 L34 43 L32 46 Z" fill="#f48c8c" />
    <path d="M18 46 L6 44 M18 49 L6 51 M46 46 L58 44 M46 49 L58 51" stroke="#4a5394" stroke-width="1.5" stroke-linecap="round" />
    </g>{/if}
  {:else if figur === 'baer'}
    <g>
    <circle cx="13" cy="16" r="9" fill={f1} /><circle cx="51" cy="16" r="9" fill={f1} />
    <circle cx="13" cy="16" r="4.5" fill={f2} /><circle cx="51" cy="16" r="4.5" fill={f2} />
    <circle cx="32" cy="37" r="24" fill={f1} />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <ellipse cx="32" cy="46" rx="12" ry="9" fill={f2} />
    <circle cx="23" cy="33" r="3" fill={TINTE} /><circle cx="41" cy="33" r="3" fill={TINTE} />
    <ellipse cx="32" cy="42" rx="4.5" ry="3.2" fill="#3b2314" />
    </g>{/if}
  {:else}
    <g>
    <ellipse cx="22" cy="14" rx="6" ry="15" fill={f1} /><ellipse cx="22" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <ellipse cx="42" cy="14" rx="6" ry="15" fill={f1} /><ellipse cx="42" cy="14" rx="2.8" ry="11" fill="#f4a3b4" />
    <circle cx="32" cy="40" r="21" fill={f1} stroke={f2} stroke-width="1.5" />
    </g>
    {#if gesicht}<g transform="translate({dx} 0)">
    <circle cx="25" cy="37" r="3" fill={TINTE} /><circle cx="39" cy="37" r="3" fill={TINTE} />
    <ellipse cx="32" cy="45" rx="3" ry="2.2" fill="#f48c8c" />
    <rect x="29" y="48" width="6" height="5" rx="1" fill="#fff" stroke={f2} />
    </g>{/if}
  {/if}

  {#if aussehen.extra === 'brille' && gesicht}
    <g fill="none" stroke={TINTE} stroke-width="2.4" transform="translate({dx} 0)">
      <circle cx={augeX[0]} cy={augeY} r="6.5" />
      <circle cx={augeX[1]} cy={augeY} r="6.5" />
      <path d="M{(augeX[0] ?? 24) + 6.5} {augeY} H{(augeX[1] ?? 40) - 6.5}" />
    </g>
  {:else if aussehen.extra === 'sonnenbrille' && gesicht}
    <g transform="translate({dx} 0)">
      <rect x={(augeX[0] ?? 24) - 8} y={augeY - 5} width="15" height="10" rx="4" fill="#1f2a6b" />
      <rect x={(augeX[1] ?? 40) - 7} y={augeY - 5} width="15" height="10" rx="4" fill="#1f2a6b" />
      <path d="M{(augeX[0] ?? 24) + 7} {augeY - 2} H{(augeX[1] ?? 40) - 7}" stroke="#1f2a6b" stroke-width="2.4" />
      <path d="M{(augeX[0] ?? 24) - 5} {augeY - 2} l4 -1.5" stroke="#fff" stroke-width="1.6" opacity="0.7" />
    </g>
  {:else if aussehen.extra === 'cap'}
    <path d="M9 {hutY + 2} Q10 4 32 4 Q54 4 55 {hutY + 2} Z" fill="#e23a4e" stroke={TINTE} stroke-width="1.5" />
    <path d="M30 4 Q32 2 34 4 L34 {hutY} M32 4 V{hutY}" stroke="#b52437" stroke-width="1.2" fill="none" />
    {#if gesicht}<path d="M{36 + dx} {hutY} Q{56 + dx} {hutY - 2} {64 + dx} {hutY + 5} L{38 + dx} {hutY + 5} Z" fill="#b52437" stroke={TINTE} stroke-width="1.5" />{/if}
  {:else if aussehen.extra === 'schleife'}
    <g transform="translate({figur === 'hase' ? 44 : 46} {figur === 'hase' ? 22 : 14})">
      <path d="M0 0 L-9 -6 L-9 6 Z M0 0 L9 -6 L9 6 Z" fill="#e23a4e" stroke={TINTE} stroke-width="1.2" />
      <circle r="3" fill="#ff6b7d" stroke={TINTE} stroke-width="1.2" />
    </g>
  {:else if aussehen.extra === 'muetze'}
    <path d="M10 {hutY} Q32 -4 54 {hutY} Z" fill="#3c78d8" />
    <rect x="9" y={hutY - 4} width="46" height="7" rx="3.5" fill="#fffdf7" />
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
