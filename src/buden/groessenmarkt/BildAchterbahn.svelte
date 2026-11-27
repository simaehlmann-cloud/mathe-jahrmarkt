<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  import { BODEN, BREITE, HOEHE, bogen, profilFuer, punktBei, strecke, stueckPfad, stuetzen } from '../spiele/achterbahnStrecke';
  /**
   * Achterbahn-Architekt in der Hilfe: dieselbe Strecke wie im Spiel (seit 0.20.1, vorher gerade Bögen).
   * Die Stücke liegen maßstäblich auf der Schiene; das fehlende Stück ist gestrichelt bzw. nach der Lösung grün.
   */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const teile = $derived((d.teile as number[] | undefined) ?? []);
  const rechteck = $derived(d.rechteck === true);
  const summe = $derived(teile.reduce((s, t) => s + t, 0) || 1);
  const ziel = $derived(Number(d.ziel ?? summe));
  const gebaut = $derived(Number(d.gebaut ?? 0));
  const cm = $derived(d.anzeige === 'mcm');
  const laenge = (v: number): string => (cm ? (v >= 100 ? `${v / 100} m` : `${v} cm`) : `${v} m`);
  const st = $derived(strecke(profilFuer(ziel, gebaut)));
  const zielPunkt = $derived(punktBei(st, st.laengeZiel));
</script>

{#if rechteck}
<svg viewBox="0 0 320 190" class="bild" role="img" aria-label="Achterbahn">
  <rect width="320" height="190" fill="#bfe6ff" rx="12" />
  <rect y="150" width="320" height="40" fill="#8fd18a" />
    <rect x="50" y="40" width="220" height="100" rx="10" fill="none" stroke="#1f2a6b" stroke-width="10" />
    <rect x="50" y="40" width="220" height="100" rx="10" fill="none" stroke="#ffc62b" stroke-width="4" stroke-dasharray="8 8" />
    <text x="160" y="32" text-anchor="middle" font-size="16" font-weight="900" fill="#1f2a6b">{teile[0]} m</text>
    <text x="284" y="96" font-size="16" font-weight="900" fill="#1f2a6b">{teile[1]} m</text>
    <circle cx="80" cy="140" r="9" fill="#e23a4e" stroke="#1f2a6b" stroke-width="2" />
</svg>
{/if}
{#if !rechteck}
  <svg viewBox="0 0 {BREITE} {HOEHE}" class="bild" role="img" aria-label="Achterbahn mit {teile.length} Stücken, Ziel {laenge(ziel)}">
    <rect width={BREITE} height={HOEHE} fill="#bfe6ff" rx="12" />
    <rect x="0" y={BODEN} width={BREITE} height={HOEHE - BODEN} fill="#8fd18a" />
    {#each stuetzen(st, 0, st.laengeZiel) as q, i (i)}
      <line x1={q.x} y1={q.y + 4} x2={q.x} y2={BODEN} stroke="#8a90a8" stroke-width="3" stroke-linecap="round" />
    {/each}
    <rect x="0" y="170" width="60" height={BODEN - 170} fill="#c8a06a" stroke="#1f2a6b" stroke-width="2" />
    <rect x={zielPunkt.x - 20} y={zielPunkt.y} width="40" height={BODEN - zielPunkt.y} fill="#c8a06a" stroke="#1f2a6b" stroke-width="2" />
    <line x1={zielPunkt.x} y1={zielPunkt.y - 2} x2={zielPunkt.x} y2={zielPunkt.y - 58} stroke="#1f2a6b" stroke-width="3" />
    <path d="M{zielPunkt.x} {zielPunkt.y - 58} l26 8 l-26 8 Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="2" stroke-linejoin="round" />
    <text x={zielPunkt.x} y={zielPunkt.y - 64} text-anchor="middle" font-size="14" font-weight="900" fill="#e23a4e" class="rand">Ziel {laenge(ziel)}</text>
    {#each teile as t, i (i)}
      {@const von = bogen(st, teile.slice(0, i).reduce((x, y) => x + y, 0), ziel)}
      {@const bis = von + bogen(st, t, ziel)}
      {@const mitte = punktBei(st, (von + bis) / 2)}
      {@const r = ((mitte.winkel - 90) * Math.PI) / 180}
      {@const seite = i % 2 ? -1 : 1}
      {@const fehlt = i === teile.length - 1}
      <path d={stueckPfad(st, von, bis)} fill="none" stroke={fehlt ? (zustand === 'richtig' ? '#3fae6a' : '#9aa0b8') : '#87521f'} stroke-width="9" stroke-dasharray={fehlt && zustand !== 'richtig' ? '10 8' : 'none'} />
      <text x={mitte.x + Math.cos(r) * 20 * seite} y={mitte.y + Math.sin(r) * 20 * seite + 5} text-anchor="middle" font-size="14" font-weight="900" fill={fehlt && zustand === 'richtig' ? '#2f7d47' : '#1f2a6b'} class="rand">{fehlt && zustand !== 'richtig' ? '?' : laenge(t)}</text>
    {/each}
  </svg>
{/if}
