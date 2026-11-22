<script lang="ts">
  import { SYMBOL_SVG } from './bildsymbole';

  /** Ein Bildsymbol des Bildpasswords (Schulversion). Die Zeichnungen stammen aus der App selbst. */
  let { id, groesse = 48 }: { id: string; groesse?: number } = $props();
</script>

<svg viewBox="0 0 64 64" width={groesse} height={groesse} aria-hidden="true">{@html SYMBOL_SVG[id] ?? ''}</svg>
