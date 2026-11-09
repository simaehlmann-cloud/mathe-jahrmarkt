<script lang="ts">
  import {
    AUFTRAG_FELD,
    AUFTRAGSFOLGE,
    BLOCKARTEN,
    MAX_HOEHE,
    WELT,
    baueAuftrag,
    istGeloest,
    nimmBlock,
    setzeBlock,
    verbaut,
    type Bauauftrag,
  } from '../../domain/bau';
  import { createRng } from '../../domain/rng';
  import Icon from '../components/Icon.svelte';
  import Kopfzeile from '../components/Kopfzeile.svelte';
  import IsoBau from '../grafik/IsoBau.svelte';
  import { app } from '../zustand.svelte';

  /**
   * Bauplatz: frei bauen mit verdienten Blöcken oder Bauaufträge lösen.
   * Gebaut wird im Bauplan (Draufsicht mit Zahlen = Anzahl der Würfel übereinander), oben erscheint das Gebäude.
   */
  let p = $derived(app.profil);
  let ansicht = $state<'frei' | 'auftrag'>('frei');
  let modus = $state<'bauen' | 'abbauen'>('bauen');
  let art = $state(2);
  let drehung = $state(0);

  /* ---------- Freies Bauen ---------- */
  function feldFrei(x: number, y: number) {
    const q = app.profil;
    if (!q) return;
    if (modus === 'bauen') {
      if (q.bau.bloecke <= 0) {
        app.melde('Keine Blöcke mehr. Spiel eine Runde, dann bekommst du neue!');
        return;
      }
      if ((q.bau.welt[y * WELT + x]?.length ?? 0) >= MAX_HOEHE) {
        app.melde(`Höher als ${MAX_HOEHE} geht nicht.`);
        return;
      }
      app.aendereProfil((r) => ({ ...r, bau: setzeBlock(r.bau, x, y, art) }));
      app.spieleKlang('tipp');
    } else {
      app.aendereProfil((r) => ({ ...r, bau: nimmBlock(r.bau, x, y) }));
    }
  }

  /* ---------- Bauaufträge ---------- */
  const auftragFuer = (nummer: number, id: string): Bauauftrag => {
    let h = 7;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return baueAuftrag(AUFTRAGSFOLGE[nummer % AUFTRAGSFOLGE.length] ?? 'bauplan', createRng(h + nummer * 977), nummer);
  };
  let nummer = $derived(p?.bau.erledigt.length ?? 0);
  let auftrag = $state<Bauauftrag | null>(null);
  let hoehen = $state<number[]>([]);
  let geprueft = $state<'' | 'falsch' | 'frage' | 'fertig'>('');
  let versuche = $state(0);
  let falscheFelder = $state<Set<number>>(new Set());
  let frageOptionen = $state<number[]>([]);
  let gewaehlt = $state<number | null>(null);

  /** Nächsten Auftrag holen und die Arbeitsfläche leeren. */
  function naechster() {
    const q = app.profil;
    if (!q) return;
    const a = auftragFuer(q.bau.erledigt.length, q.id);
    auftrag = a;
    hoehen = a.fest ? [...a.fest] : Array<number>(AUFTRAG_FELD * AUFTRAG_FELD).fill(0);
    geprueft = '';
    versuche = 0;
    falscheFelder = new Set();
    gewaehlt = null;
  }
  naechster();

  function feldAuftrag(i: number) {
    if (!auftrag || geprueft === 'frage' || geprueft === 'fertig') return;
    const minimum = auftrag.fest?.[i] ?? 0;
    const h = hoehen[i] ?? 0;
    const neu = modus === 'bauen' ? Math.min(6, h + 1) : Math.max(minimum, h - 1);
    if (neu === h) return;
    hoehen[i] = neu;
    geprueft = '';
    falscheFelder = new Set();
    app.spieleKlang('tipp');
  }

  function pruefen() {
    if (!auftrag) return;
    if (istGeloest(auftrag, hoehen)) {
      app.spieleKlang('richtig');
      const w = auftrag.wuerfel;
      const rng = createRng(w * 13 + nummer);
      const kandidaten = [w, w + 1, w - 1, w + 2, w - 2, auftrag.masse ? auftrag.masse[0] * auftrag.masse[1] + auftrag.masse[2] : w + 3].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
      frageOptionen = rng.shuffle([w, ...rng.shuffle(kandidaten.filter((v) => v !== w)).slice(0, 3)]);
      geprueft = 'frage';
      return;
    }
    app.spieleKlang('fehler');
    versuche++;
    geprueft = 'falsch';
    // Ab dem zweiten Versuch zeigen, welche Felder noch nicht stimmen (nicht beim Quader: dort gibt es viele Lösungen)
    if (versuche >= 2 && auftrag.art !== 'quader') falscheFelder = new Set(auftrag.ziel.map((v, i) => (v !== (hoehen[i] ?? 0) ? i : -1)).filter((i) => i >= 0));
  }

  function antworte(w: number) {
    if (!auftrag || geprueft !== 'frage') return;
    gewaehlt = w;
    if (w !== auftrag.wuerfel) {
      app.spieleKlang('fehler');
      return;
    }
    app.spieleKlang('jubel');
    geprueft = 'fertig';
    const a = auftrag;
    app.aendereProfil((r) => (r.bau.erledigt.includes(a.id) ? r : { ...r, bau: { ...r.bau, bloecke: r.bau.bloecke + a.belohnung, erledigt: [...r.bau.erledigt, a.id] } }));
  }

  const stapelAus = (h: readonly number[], farbe: number): number[][] => h.map((v) => Array<number>(v).fill(farbe));
  const auge = (r: number): string => ['rechts unten', 'rechts oben', 'links oben', 'links unten'][((r % 4) + 4) % 4] ?? '';
  const augeKlasse = (r: number): string => ['ru', 'ro', 'lo', 'lu'][((r % 4) + 4) % 4] ?? 'ru';
</script>

{#if p}
  <Kopfzeile titel="Bauplatz" zurueck={() => app.zeige({ name: 'jahrmarkt' })} />
  <div class="bauplatz">
    <div class="reiter" role="tablist">
      <button role="tab" aria-selected={ansicht === 'frei'} class:an={ansicht === 'frei'} onclick={() => (ansicht = 'frei')}>Frei bauen</button>
      <button role="tab" aria-selected={ansicht === 'auftrag'} class:an={ansicht === 'auftrag'} onclick={() => (ansicht = 'auftrag')}>Bauaufträge</button>
      <button class="insel-knopf" onclick={() => app.zeige({ name: 'insel' })}>Zur Bauinsel</button>
    </div>

    {#if ansicht === 'frei'}
      <div class="flaeche">
        <div class="buehne">
          <IsoBau n={WELT} stapel={p.bau.welt} {drehung} beschriftung="Dein Bau" />
          <button class="drehen rund" onclick={() => (drehung = (drehung + 1) % 4)} aria-label="Bau drehen">↻</button>
          <span class="lager"><Icon name="block" groesse={22} /> {p.bau.bloecke} {p.bau.bloecke === 1 ? 'Block' : 'Blöcke'} · {verbaut(p.bau.welt)} verbaut</span>
        </div>
        <div class="werkzeug">
          <div class="modus" role="group" aria-label="Werkzeug">
            <button class:an={modus === 'bauen'} aria-pressed={modus === 'bauen'} onclick={() => (modus = 'bauen')}>Bauen</button>
            <button class:an={modus === 'abbauen'} aria-pressed={modus === 'abbauen'} onclick={() => (modus = 'abbauen')}>Abbauen</button>
          </div>
          <div class="palette" role="radiogroup" aria-label="Blockart">
            {#each BLOCKARTEN as b (b.id)}
              <button role="radio" aria-checked={art === b.id} aria-label={b.name} class:an={art === b.id} style="--o: {b.oben}; --l: {b.links}" onclick={() => { art = b.id; modus = 'bauen'; }}></button>
            {/each}
          </div>
          <div class="plan gross {augeKlasse(drehung)}" style="--n: {WELT}" aria-label="Bauplan, Blick von {auge(drehung)}">
            {#each p.bau.welt as st, i (i)}
              {@const top = st[st.length - 1]}
              <button
                class="feld"
                style={top !== undefined ? `--o: ${BLOCKARTEN[top]?.oben}` : ''}
                class:belegt={st.length > 0}
                aria-label="Feld Spalte {(i % WELT) + 1}, Reihe {Math.floor(i / WELT) + 1}, {st.length} Würfel"
                onclick={() => feldFrei(i % WELT, Math.floor(i / WELT))}
              >{st.length || ''}</button>
            {/each}
          </div>
        </div>
      </div>
    {:else if auftrag}
      {@const a = auftrag}
      <div class="flaeche">
        <div class="auftrag-kopf">
          <strong>Auftrag {(p.bau.erledigt.includes(a.id) ? nummer : nummer + 1)}: {a.titel}</strong>
          <span>{a.text}</span>
          <small><Icon name="block" groesse={18} /> Belohnung: {a.belohnung} Blöcke</small>
        </div>
        <div class="vergleich">
          {#if a.art === 'nachbauen'}
            <figure><figcaption>So soll es aussehen</figcaption><div class="iso-klein"><IsoBau n={AUFTRAG_FELD} stapel={stapelAus(a.ziel, 3)} {drehung} max={5} beschriftung="Vorlage" /></div></figure>
          {:else if a.art === 'bauplan'}
            <figure>
              <figcaption>Bauplan</figcaption>
              <div class="plan vorlage" style="--n: {AUFTRAG_FELD}" role="img" aria-label="Bauplan: {a.ziel.join(', ')}">
                {#each a.ziel as v, i (i)}<span class="feld" class:belegt={v > 0}>{v || ''}</span>{/each}
              </div>
            </figure>
          {:else if a.art === 'quader' && a.masse}
            <figure>
              <figcaption>Quader</figcaption>
              <p class="masse"><span>{a.masse[0]} lang</span><span>{a.masse[1]} breit</span><span>{a.masse[2]} hoch</span></p>
            </figure>
          {/if}
          <figure>
            <figcaption>Dein Bau</figcaption>
            <div class="iso-klein">
              <IsoBau n={AUFTRAG_FELD} stapel={stapelAus(hoehen, 2)} fest={[]} {drehung} achse={a.art === 'symmetrie'} max={5} beschriftung="Dein Bau" />
            </div>
          </figure>
        </div>
        <div class="werkzeug">
          <div class="modus" role="group" aria-label="Werkzeug">
            <button class:an={modus === 'bauen'} aria-pressed={modus === 'bauen'} onclick={() => (modus = 'bauen')}>+ Würfel</button>
            <button class:an={modus === 'abbauen'} aria-pressed={modus === 'abbauen'} onclick={() => (modus = 'abbauen')}>− Würfel</button>
            <button class="drehen-text" onclick={() => (drehung = (drehung + 1) % 4)} aria-label="Ansicht drehen">↻</button>
          </div>
          <div class="plan {augeKlasse(drehung)}" class:symmetrie={a.art === 'symmetrie'} style="--n: {AUFTRAG_FELD}" aria-label="Dein Bauplan">
            {#each hoehen as v, i (i)}
              <button
                class="feld"
                class:belegt={v > 0}
                class:fest={(a.fest?.[i] ?? 0) > 0}
                class:falsch={falscheFelder.has(i)}
                aria-label="Feld Spalte {(i % AUFTRAG_FELD) + 1}, Reihe {Math.floor(i / AUFTRAG_FELD) + 1}, {v} Würfel{(a.fest?.[i] ?? 0) > 0 ? ', vorgegeben' : ''}"
                onclick={() => feldAuftrag(i)}
              >{v || ''}</button>
            {/each}
          </div>
          {#if geprueft === 'frage' || geprueft === 'fertig'}
            <div class="frage">
              <p><strong>Passt!</strong> Wie viele Würfel hast du verbaut?</p>
              <div class="optionen">
                {#each frageOptionen as w (w)}
                  <button class="ticket hell" class:richtig={geprueft === 'fertig' && w === a.wuerfel} class:daneben={gewaehlt === w && w !== a.wuerfel} disabled={geprueft === 'fertig'} onclick={() => antworte(w)}>{w}</button>
                {/each}
              </div>
              {#if gewaehlt !== null && gewaehlt !== a.wuerfel}<p class="tipp">Zähle Feld für Feld: Die Zahlen im Bauplan zusammen.</p>{/if}
              {#if geprueft === 'fertig'}
                <p class="gut"><Icon name="block" groesse={20} /> +{a.belohnung} Blöcke!</p>
                <button class="ticket rot" onclick={naechster}>Nächster Auftrag</button>
              {/if}
            </div>
          {:else}
            {#if geprueft === 'falsch'}<p class="tipp" role="status">{falscheFelder.size ? `${falscheFelder.size} ${falscheFelder.size === 1 ? 'Feld stimmt' : 'Felder stimmen'} noch nicht (rot markiert).` : 'Noch nicht ganz. Vergleiche genau!'}</p>{/if}
            <button class="ticket rot" onclick={pruefen}>Prüfen</button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .bauplatz {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--rand-r) var(--unten) var(--rand);
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .reiter {
    display: flex;
    gap: 6px;
    justify-content: center;
  }
  .reiter button,
  .modus button {
    min-height: 44px;
    padding: 6px 16px;
    border: 3px solid var(--tinte);
    border-radius: 22px;
    background: var(--papier);
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
  }
  .reiter .insel-knopf {
    background: #e6f4ff;
    border-style: dashed;
  }
  .reiter button.an,
  .modus button.an {
    background: var(--tinte);
    color: #fff;
  }
  .flaeche {
    display: grid;
    gap: 10px;
    justify-items: center;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 16px;
    padding: 10px;
  }
  @media (orientation: landscape) and (min-width: 700px) {
    .flaeche {
      grid-template-columns: 1.2fr 1fr;
      align-items: start;
    }
    .auftrag-kopf {
      grid-column: 1 / -1;
    }
  }
  .buehne {
    position: relative;
    width: 100%;
    max-width: 30rem;
    aspect-ratio: 1.15;
    background: linear-gradient(#bfe6fb, #e8f6ff);
    border-radius: 12px;
  }
  .drehen {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 1.4rem;
  }
  .lager {
    position: absolute;
    left: 8px;
    top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 900;
    background: var(--papier);
    border: 3px solid var(--tinte);
    border-radius: 16px;
    padding: 2px 10px 2px 6px;
  }
  .werkzeug {
    display: grid;
    gap: 10px;
    justify-items: center;
    width: 100%;
  }
  .modus {
    display: flex;
    gap: 6px;
  }
  .drehen-text {
    font-size: 1.3rem !important;
    padding: 4px 14px !important;
  }
  .palette {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }
  .palette button {
    width: 40px;
    height: 40px;
    border: 3px solid var(--tinte);
    border-radius: 8px;
    background: linear-gradient(var(--o) 55%, var(--l) 55%);
  }
  .palette button.an {
    outline: 4px solid var(--senf);
    outline-offset: 2px;
  }
  .plan {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    gap: 3px;
    width: min(100%, 17rem);
    padding: 6px;
    background: #e9dcc0;
    border: 3px solid var(--tinte);
    border-radius: 10px;
  }
  .plan.gross {
    width: min(100%, 24rem);
  }
  /* Auge: von welcher Ecke aus man auf das Gebäude schaut */
  .plan::after {
    content: '👁';
    position: absolute;
    font-size: 1.2rem;
  }
  .plan.ru::after {
    right: -14px;
    bottom: -18px;
  }
  .plan.ro::after {
    right: -14px;
    top: -18px;
  }
  .plan.lo::after {
    left: -14px;
    top: -18px;
  }
  .plan.lu::after {
    left: -14px;
    bottom: -18px;
  }
  .plan.vorlage::after {
    content: none;
  }
  .plan.symmetrie {
    background: linear-gradient(90deg, transparent calc(50% - 2px), #e23a4e calc(50% - 2px), #e23a4e calc(50% + 2px), transparent calc(50% + 2px)), #e9dcc0;
  }
  .feld {
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 2px solid #b9a77f;
    border-radius: 6px;
    background: #f6efdd;
    color: var(--tinte);
    font: inherit;
    font-weight: 900;
    font-size: 1.15rem;
    padding: 0;
    min-width: 0;
  }
  .plan.gross .feld {
    font-size: 0.95rem;
  }
  .feld.belegt {
    background: var(--o, #ffd98a);
    border-color: var(--tinte);
  }
  .feld.fest {
    background: #d6d9e3;
  }
  .feld.falsch {
    outline: 3px solid #e23a4e;
    outline-offset: -3px;
  }
  .auftrag-kopf {
    display: grid;
    gap: 4px;
    text-align: center;
  }
  .auftrag-kopf strong {
    font-size: 1.2rem;
  }
  .auftrag-kopf small {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: var(--tinte-weich);
  }
  .vergleich {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }
  figure {
    margin: 0;
    display: grid;
    justify-items: center;
    gap: 4px;
  }
  figcaption {
    font-weight: 900;
  }
  .iso-klein {
    width: min(40vw, 13rem);
    aspect-ratio: 1.15;
    background: linear-gradient(#bfe6fb, #e8f6ff);
    border-radius: 10px;
  }
  .vorlage {
    width: min(38vw, 11rem);
  }
  .vorlage .feld {
    border-color: var(--tinte);
  }
  .masse {
    display: grid;
    gap: 6px;
    margin: 0;
    font-weight: 900;
    font-size: 1.2rem;
  }
  .masse span {
    background: #fff4c2;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    padding: 4px 12px;
  }
  .frage {
    display: grid;
    gap: 8px;
    justify-items: center;
    text-align: center;
  }
  .frage p {
    margin: 0;
  }
  .optionen {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .optionen .ticket {
    padding-inline: 0.6em;
    min-width: 60px;
  }
  .ticket.richtig {
    --farbe: var(--wiese);
    color: #fff;
  }
  .ticket.daneben {
    --farbe: #f6c3c9;
  }
  .tipp {
    margin: 0;
    font-weight: 800;
    color: var(--markise-dunkel);
  }
  .gut {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-weight: 900;
    color: var(--wiese-dunkel);
  }
</style>
