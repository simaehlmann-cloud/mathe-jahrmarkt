<script lang="ts">
  export type IconName = 'zurueck' | 'laut' | 'stumm' | 'musik' | 'musikAus' | 'schloss' | 'taler' | 'profil' | 'haken' | 'kreuz';
  let { name, groesse = 24 }: { name: IconName; groesse?: number } = $props();
</script>

<svg viewBox="0 0 24 24" width={groesse} height={groesse} aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
  {#if name === 'zurueck'}
    <path d="M15 5 L8 12 L15 19" />
  {:else if name === 'laut'}
    <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke-width="2" />
    <path d="M16.5 9 Q18.5 12 16.5 15 M19 6.5 Q22.5 12 19 17.5" />
  {:else if name === 'stumm'}
    <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" stroke-width="2" />
    <path d="M16.5 9.5 L21.5 14.5 M21.5 9.5 L16.5 14.5" />
  {:else if name === 'musik' || name === 'musikAus'}
    <path d="M9 17.5 V5.5 L19 3.5 V15.5" />
    <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" stroke-width="2" />
    <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" stroke-width="2" />
    {#if name === 'musikAus'}<path d="M3 3 L21 21" stroke-width="2.8" />{/if}
  {:else if name === 'schloss'}
    <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke-width="2" />
    <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" />
  {:else if name === 'taler'}
    <circle cx="12" cy="12" r="9" fill="#ffc62b" stroke="#b07a00" stroke-width="2" />
    <path d="M12 7 V17 M9 9.5 H15" stroke="#b07a00" stroke-width="2" />
  {:else if name === 'profil'}
    <path d="M4 20 V13 M9 20 V8 M14 20 V11 M19 20 V5" stroke-width="3" />
  {:else if name === 'haken'}
    <path d="M5 12.5 L10 17 L19 7" stroke-width="3" />
  {:else}
    <path d="M6 6 L18 18 M18 6 L6 18" stroke-width="3" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>
