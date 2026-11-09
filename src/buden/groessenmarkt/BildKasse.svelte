<script lang="ts">
  import { euro } from '../../domain/aufgaben/baukasten';
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Süßigkeitenkasse: Verkaufstresen mit Preisschild(ern) und Kasse. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const schilder = $derived<{ name: string; preis: number }[]>(
    Array.isArray(d.waren) ? (d.waren as string[]).map((n, i) => ({ name: n, preis: (d.preise as number[])[i] ?? 0 })) : [{ name: String(d.ware ?? ''), preis: Number(d.preis ?? 0) }],
  );
</script>

<svg viewBox="0 0 320 210" class="bild" role="img" aria-label="Verkaufsstand mit Preisen">
  <rect x="10" y="20" width="300" height="24" rx="6" fill="#e23a4e" />
  {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}<path d="M{10 + i * 30} 44 q15 16 30 0" fill={i % 2 ? '#fff' : '#e23a4e'} stroke="#1f2a6b" stroke-width="1.5" />{/each}
  <rect x="20" y="130" width="280" height="70" rx="8" fill="#b9763f" stroke="#1f2a6b" stroke-width="3" />
  {#each schilder as s, i (i)}
    {@const x = 30 + i * (260 / schilder.length)}
    {@const b = 260 / schilder.length - 12}
    <rect x={x} y="66" width={b} height="58" rx="8" fill="#fffdf7" stroke="#1f2a6b" stroke-width="2.5" />
    <text x={x + b / 2} y="88" text-anchor="middle" font-size={schilder.length > 1 ? 10 : 15} font-weight="800" fill="#1f2a6b">{s.name}</text>
    <text x={x + b / 2} y="113" text-anchor="middle" font-size={schilder.length > 1 ? 16 : 24} font-weight="900" fill="#e23a4e">{euro(s.preis)}</text>
  {/each}
  {#if d.schein}
    <rect x="200" y="148" width="86" height="40" rx="5" fill="#8fd18a" stroke="#1f2a6b" stroke-width="2" />
    <text x="243" y="174" text-anchor="middle" font-size="18" font-weight="900" fill="#1f2a6b">{Number(d.schein) / 100} €</text>
  {/if}
  <circle cx="60" cy="166" r="20" fill={zustand === 'richtig' ? '#3fae6a' : zustand === 'falsch' ? '#ffc62b' : '#cfd3e2'} stroke="#1f2a6b" stroke-width="2.5" />
  <text x="60" y="172" text-anchor="middle" font-size="16" font-weight="900" fill="#1f2a6b">€</text>
</svg>

<style>
  .bild {
    width: min(100%, 30rem);
    max-height: 100%;
  }
</style>
