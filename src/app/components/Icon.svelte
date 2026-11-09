<script lang="ts">
  export type IconName = 'zurueck' | 'laut' | 'stumm' | 'musik' | 'musikAus' | 'schloss' | 'taler' | 'profil' | 'haken' | 'kreuz' | 'menue' | 'block' | 'auftrag' | 'check' | 'stern' | 'blitz' | 'album' | 'raetsel' | 'insel';
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
  {:else if name === 'menue'}
    <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke-width="2.8" />
  {:else if name === 'block'}
    <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" fill="#8bc34a" stroke-width="2" />
    <path d="M4 7.5 L12 12 L20 7.5 M12 12 V21" stroke-width="2" />
  {:else if name === 'auftrag'}
    <rect x="5" y="4" width="14" height="17" rx="2" stroke-width="2.2" />
    <path d="M9 4 V2.5 H15 V4 M8.5 10 L10.5 12 L15.5 8 M8.5 16 H15.5" stroke-width="2.2" />
  {:else if name === 'check'}
    <circle cx="11" cy="11" r="6.5" stroke-width="2.4" />
    <path d="M16 16 L21 21" stroke-width="3" />
  {:else if name === 'stern'}
    <path d="M12 3 L14.6 9 L21 9.5 L16 13.7 L17.6 20 L12 16.6 L6.4 20 L8 13.7 L3 9.5 L9.4 9 Z" fill="#ffc62b" stroke="#b07a00" stroke-width="1.8" />
  {:else if name === 'insel'}
    <path d="M2 17 Q12 12 22 17 L22 20 L2 20 Z" fill="#3c8fc2" stroke-width="1.8" />
    <path d="M5 16 Q12 9 19 16" fill="#7cc96b" stroke-width="1.8" />
    <path d="M12 12 V5 M12 5 Q15 3 17 6 M12 5 Q9 3 7 6" stroke-width="1.8" />
  {:else if name === 'raetsel'}
    <circle cx="12" cy="12" r="9.5" fill="#7b5ea7" stroke-width="2" />
    <path d="M9.2 9.3 a2.9 2.9 0 1 1 4.3 2.5 c-1 .6 -1.5 1.2 -1.5 2.4" stroke="#fff" stroke-width="2.4" />
    <circle cx="12" cy="17.4" r="1.4" fill="#fff" stroke="none" />
  {:else if name === 'blitz'}
    <path d="M13.5 2.5 L5 13.5 H11 L9.5 21.5 L19 9.5 H13 Z" fill="#ffc62b" stroke-width="2" />
  {:else if name === 'album'}
    <rect x="3.5" y="5" width="11" height="15" rx="2" stroke-width="2.2" transform="rotate(-8 9 12.5)" />
    <rect x="9.5" y="4" width="11" height="15" rx="2" fill="#ffc62b" stroke-width="2.2" transform="rotate(8 15 11.5)" />
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
