<script lang="ts">
  import { BUDEN, STUFEN_NAME, type Stufe } from '../../domain/buden';
  import { ATTRAKTIONEN, BUDEN_ORTE, HUEGEL, PLAETZE, TOR, WEGE, WELT_BREITE, WELT_HOEHE, type Punkt } from '../../domain/karte';

  /**
   * Lageplan (seit 0.15): der ganze Jahrmarkt von oben – Plätze, Wege, alle Buden mit Medaille und Auftragsfähnchen,
   * die Figur als roter Punkt. Ein Tipp auf eine Bude schickt die Figur dorthin.
   */
  let {
    medaillen,
    auftraege,
    figur,
    sternOffen,
    onbude,
    onzu,
  }: {
    medaillen: Readonly<Record<string, Stufe | undefined>>;
    auftraege: ReadonlySet<string>;
    figur: Punkt;
    sternOffen: boolean;
    onbude: (id: string) => void;
    onzu: () => void;
  } = $props();
  const FARBE: Record<string, string> = { bronze: '#d08a4a', silber: '#c9ccd6', gold: '#ffd54a' };
  const linie = (pts: readonly Punkt[]): string => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x} ${q.y}`).join(' ');
  const name = (id: string): string => BUDEN.find((b) => b.id === id)?.name ?? id;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="schleier" onclick={(e) => e.target === e.currentTarget && onzu()}>
  <div class="karte" role="dialog" aria-modal="true" aria-labelledby="plan-titel">
    <div class="kopf">
      <h2 id="plan-titel">Lageplan</h2>
      <button class="zu" onclick={onzu} aria-label="Lageplan schließen">✕</button>
    </div>
    <p>Tippe auf eine Bude, dann läufst du hin. Der rote Punkt bist du.</p>
    <svg viewBox="0 0 {WELT_BREITE} {WELT_HOEHE}" role="group" aria-label="Lageplan des Jahrmarkts">
      <rect width={WELT_BREITE} height={WELT_HOEHE} fill="#9fd88f" rx="40" />
      <ellipse cx={HUEGEL.c.x} cy={HUEGEL.c.y} rx={HUEGEL.rx} ry={HUEGEL.ry} fill={sternOffen ? '#5b5f97' : '#7f84ad'} />
      {#each WEGE as w, i (i)}<path d={linie(w.punkte)} fill="none" stroke="#e6c995" stroke-width="70" stroke-linecap="round" stroke-linejoin="round" />{/each}
      {#each PLAETZE as pl (pl.id)}
        <ellipse cx={pl.c.x} cy={pl.c.y} rx={pl.rx} ry={pl.ry} fill="#ecd6aa" stroke={pl.farbe} stroke-width="14" />
      {/each}
      {#if !sternOffen}<rect x={TOR.x - 70} y={TOR.y - 20} width="140" height="40" rx="8" fill="#87521f" />{/if}
      {#each ATTRAKTIONEN as a (a.id)}<circle cx={a.x} cy={a.y - 40} r={a.preis ? 26 : 40} fill={a.preis ? '#f6a6c9' : '#f4a7c4'} stroke="#72243e" stroke-width="6" opacity="0.9" />{/each}
      {#each PLAETZE as pl (pl.id)}
        {#if pl.id !== 'festplatz'}<text x={pl.c.x} y={pl.c.y + pl.ry * 0.55} text-anchor="middle" font-size="64" font-weight="900" fill="#1f2a6b" paint-order="stroke" stroke="#fffdf7" stroke-width="12">{pl.name}</text>{/if}
      {/each}
      {#each BUDEN_ORTE as o (o.id)}
        {@const m = medaillen[o.id]}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <g class="bude" role="button" tabindex="0" aria-label="{name(o.id)}{m ? `, ${STUFEN_NAME[m]}` : ''}{auftraege.has(o.id) ? ', Auftrag' : ''}" onclick={() => onbude(o.id)} onkeydown={(e) => e.key === 'Enter' && onbude(o.id)}>
          <rect x={o.x - 70} y={o.boden - 110} width="140" height="110" rx="18" fill="#fffdf7" stroke="#1f2a6b" stroke-width="8" />
          <circle cx={o.x} cy={o.boden - 55} r="34" fill={m ? FARBE[m] : '#e6e8f0'} stroke="#1f2a6b" stroke-width="6" />
          {#if auftraege.has(o.id)}<path d="M{o.x + 40} {o.boden - 150} V{o.boden - 70} M{o.x + 40} {o.boden - 150} L{o.x + 100} {o.boden - 132} L{o.x + 40} {o.boden - 114} Z" fill="#e23a4e" stroke="#1f2a6b" stroke-width="6" />{/if}
        </g>
      {/each}
      <circle cx={figur.x} cy={figur.y} r="44" fill="#e23a4e" stroke="#1f2a6b" stroke-width="10" />
    </svg>
    <div class="legende" aria-hidden="true">
      <span><i style="background:#d08a4a"></i>Bronze</span><span><i style="background:#c9ccd6"></i>Silber</span><span><i style="background:#ffd54a"></i>Gold</span><span><i class="fahne"></i>Auftrag</span><span><i style="background:#f4a7c4; border-radius:50%"></i>Karussell, Essen</span>
    </div>
  </div>
</div>

<style>
  .schleier {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    background: rgb(31 42 107 / 0.45);
  }
  .karte {
    display: grid;
    gap: 8px;
    max-height: 100%;
    width: min(100%, 30rem);
    padding: 12px 16px 14px;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 18px;
    box-shadow: 0 6px 0 var(--tinte);
    overflow: auto;
  }
  .kopf {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2,
  p {
    margin: 0;
  }
  p {
    font-weight: 700;
    font-size: 0.95rem;
  }
  .zu {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--tinte);
    background: #fff;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  svg {
    width: 100%;
    max-height: 64vh;
    border: 2px solid var(--tinte);
    border-radius: 12px;
    background: #9fd88f;
  }
  .bude {
    cursor: pointer;
  }
  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .legende span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .legende i {
    width: 14px;
    height: 14px;
    border: 2px solid var(--tinte);
    border-radius: 4px;
    display: inline-block;
  }
  .legende i.fahne {
    background: #e23a4e;
    clip-path: polygon(0 0, 100% 40%, 0 80%);
    border: none;
  }
</style>
