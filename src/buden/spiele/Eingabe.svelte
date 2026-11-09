<script lang="ts">
  /** Anzeige der getippten Zahl mit Einheit, z. B. „36 Kinder“ oder „? €“. */
  let { wert, einheit = '', zustand = '' }: { wert: string; einheit?: string; zustand?: '' | 'richtig' | 'falsch' } = $props();
</script>

<div class="eingabe {zustand}" aria-live="polite"><b>{wert || '?'}</b>{#if einheit}<span>{einheit}</span>{/if}</div>

<style>
  .eingabe {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 8rem;
    justify-content: center;
    padding: 4px 16px;
    background: #fff;
    border: 3px solid var(--tinte);
    border-radius: 12px;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--tinte);
  }
  b {
    font-size: 1.9rem;
    font-weight: 900;
  }
  .richtig {
    background: #c9f2d6;
  }
  .falsch {
    background: #f9d0d6;
  }
</style>
