<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /**
   * Schätz-Bude: großes Plakat mit dem Ding und dem passenden Messgerät.
   * Nach der Antwort steht die richtige Größe auf dem Plakat, dazu ein Vergleich aus dem Alltag
   * (1 m ist ein großer Schritt …) und bei einer falschen Wahl, ob sie viel zu groß oder zu klein wäre.
   */
  let { aufgabe, zustand, gewaehlt }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const art = $derived(String(d.art ?? 'laenge'));
  /** Umrechnung auf die kleinste Einheit je Größe, um „zu groß“ und „zu klein“ zu erkennen. */
  const FAKTOR: Record<string, number> = { mm: 1, cm: 10, m: 1000, km: 1e6, g: 1, kg: 1000, t: 1e6, ml: 1, l: 1000, Sekunden: 1, Minuten: 60, Stunden: 3600, Tage: 86400 };
  const VERGLEICH: Record<string, string> = {
    mm: '1 mm ist so dick wie eine Bankkarte.',
    cm: '1 cm ist so breit wie ein Fingernagel.',
    m: '1 m ist ungefähr ein großer Schritt.',
    km: '1 km gehst du in ungefähr 15 Minuten.',
    g: '1 g wiegt ungefähr eine Büroklammer.',
    kg: '1 kg wiegt eine Packung Mehl.',
    t: '1 t wiegt ungefähr ein kleines Auto.',
    ml: 'In einen Teelöffel passen ungefähr 5 ml.',
    l: '1 l passt in eine Milchtüte.',
    Sekunden: '1 Sekunde dauert es, „einundzwanzig“ zu sagen.',
    Minuten: '1 Minute hat 60 Sekunden.',
    Stunden: '1 Stunde ist etwas länger als eine Schulstunde.',
    Tage: '1 Tag hat 24 Stunden.',
  };
  const GROSS: Record<string, [string, string]> = { laenge: ['lang', 'kurz'], gewicht: ['schwer', 'leicht'], volumen: ['viel', 'wenig'], zeit: ['lang', 'kurz'] };
  const zerlege = (t: string): { zahl: number; einheit: string } => {
    const m = /^([\d.,\s]+)\s*(.+)$/.exec(t.trim());
    return { zahl: Number((m?.[1] ?? '0').replace(/[.\s]/g, '').replace(',', '.')), einheit: m?.[2] ?? '' };
  };
  const richtigText = $derived(aufgabe.art === 'auswahl' ? (aufgabe.labels?.[aufgabe.antwort] ?? '') : '');
  const richtigE = $derived(zerlege(richtigText));
  const vergleich = $derived(zustand !== '' ? (VERGLEICH[richtigE.einheit] ?? '') : '');
  const falschText = $derived.by(() => {
    if (zustand !== 'falsch' || gewaehlt === null || aufgabe.art !== 'auswahl') return '';
    const t = aufgabe.labels?.[gewaehlt] ?? '';
    const g = zerlege(t);
    const a = richtigE.zahl * (FAKTOR[richtigE.einheit] ?? 1);
    const b = g.zahl * (FAKTOR[g.einheit] ?? 1);
    const [gross, klein] = GROSS[art] ?? ['groß', 'klein'];
    return b > a ? `${t} wäre viel zu ${gross}.` : b < a ? `${t} wäre viel zu ${klein}.` : '';
  });
</script>

<div class="plakat">
<svg viewBox="0 0 320 200" class="bild" role="img" aria-label={String(d.ding ?? '')}>
  <rect x="20" y="14" width="280" height="172" rx="14" fill="#fffdf7" stroke="#1f2a6b" stroke-width="3" />
  <text x="160" y="58" text-anchor="middle" font-size="20" font-weight="900" fill="#1f2a6b">{d.ding}</text>
  {#if zustand}
    <text x="160" y="90" text-anchor="middle" font-size="22" font-weight="900" fill="#2f7d47">ungefähr {richtigText}</text>
  {:else}
    <text x="160" y="84" text-anchor="middle" font-size="14" font-weight="700" fill="#4a5394">ungefähr wie viel?</text>
  {/if}
  {#if art === 'laenge'}
    <rect x="50" y="120" width="220" height="34" rx="4" fill="#ffc62b" stroke="#1f2a6b" stroke-width="2.5" />
    {#each Array.from({ length: 23 }, (_, i) => i) as i (i)}<line x1={55 + i * 9.5} y1="120" x2={55 + i * 9.5} y2={i % 5 === 0 ? 138 : 130} stroke="#1f2a6b" stroke-width="1.5" />{/each}
  {:else if art === 'zeit'}
    <circle cx="160" cy="140" r="34" fill="#fff" stroke="#1f2a6b" stroke-width="3" />
    <line x1="160" y1="140" x2="160" y2="114" stroke="#1f2a6b" stroke-width="3" stroke-linecap="round" />
    <line x1="160" y1="140" x2="178" y2="146" stroke="#e23a4e" stroke-width="3" stroke-linecap="round" />
  {:else if art === 'volumen'}
    <path d="M134 112 h52 l-6 66 h-40 z" fill="#cdefff" stroke="#1f2a6b" stroke-width="3" />
    <path d="M139 140 h42 l-3 36 h-36 z" fill="#3c78d8" opacity="0.6" />
  {:else}
    <path d="M110 170 h100 l-12 -26 h-76 z" fill="#5b6075" stroke="#1f2a6b" stroke-width="3" />
    <line x1="160" y1="144" x2="160" y2="118" stroke="#1f2a6b" stroke-width="4" />
    <rect x="120" y="110" width="80" height="10" rx="4" fill="#cfa45a" stroke="#1f2a6b" stroke-width="2" />
  {/if}
</svg>
{#if zustand}
  <p class="vergleich">Zum Vergleich: {vergleich}</p>
  {#if falschText}<p class="falsch">{falschText}</p>{/if}
{/if}
</div>

<style>
  .plakat {
    display: grid;
    justify-items: center;
    width: 100%;
  }
  .plakat p {
    margin: 4px 0 0;
    text-align: center;
    font-weight: 800;
    max-width: 30rem;
  }
  .plakat .falsch {
    color: #b3122c;
    font-weight: 900;
  }
  .bild {
    width: min(100%, 30rem);
    max-height: 100%;
  }
</style>
