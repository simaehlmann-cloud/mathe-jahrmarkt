<script lang="ts">
  import { EXTRAS, FELL, FELL_NAMEN, TUECHER, extraVerfuegbar, type Aussehen } from '../../domain/aussehen';
  import { FIGUREN, type FigurId } from '../../domain/profil';
  import Figur from '../grafik/Figur.svelte';

  /** Figuren-Baukasten: Tier, Fellfarbe, Halstuch, Extra. Ohne Fotos, alles bleibt auf dem Gerät. */
  let {
    figur = $bindable(),
    aussehen = $bindable(),
    deko = [],
  }: { figur: FigurId; aussehen: Aussehen; deko?: readonly string[] } = $props();

  function setze(teil: Partial<Aussehen>) {
    aussehen = { ...aussehen, ...teil };
  }
  function tier(id: FigurId) {
    figur = id;
  }
</script>

<div class="baukasten">
  <div class="vorschau" aria-hidden="true"><Figur {figur} {aussehen} groesse={120} /></div>

  <div class="gruppen">
    <fieldset>
      <legend>Tier</legend>
      <div class="reihe">
        {#each FIGUREN as f (f.id)}
          <label class="wahl" class:gewaehlt={figur === f.id}>
            <input type="radio" name="tier" class="nur-leser" checked={figur === f.id} onchange={() => tier(f.id)} />
            <Figur figur={f.id} groesse={40} aussehen={{ ...aussehen, fell: 0, tuch: 'keins', extra: 'keins' }} />
            <span>{f.name}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Fellfarbe</legend>
      <div class="reihe">
        {#each FELL[figur] as [haupt, zweit], i (i)}
          <label class="farbe" class:gewaehlt={aussehen.fell === i} title={FELL_NAMEN[figur][i]}>
            <input type="radio" name="fell" class="nur-leser" checked={aussehen.fell === i} onchange={() => setze({ fell: i })} />
            <span class="klecks" style="background: linear-gradient(135deg, {haupt} 60%, {zweit} 60%)"></span>
            <span class="name">{FELL_NAMEN[figur][i]}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Halstuch</legend>
      <div class="reihe">
        <label class="farbe" class:gewaehlt={aussehen.tuch === 'keins'}>
          <input type="radio" name="tuch" class="nur-leser" checked={aussehen.tuch === 'keins'} onchange={() => setze({ tuch: 'keins' })} />
          <span class="klecks leer"></span>
          <span class="name">Ohne</span>
        </label>
        {#each TUECHER as t (t.id)}
          <label class="farbe" class:gewaehlt={aussehen.tuch === t.id}>
            <input type="radio" name="tuch" class="nur-leser" checked={aussehen.tuch === t.id} onchange={() => setze({ tuch: t.id })} />
            <span class="klecks" style="background: {t.farbe}"></span>
            <span class="name">{t.name}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Extra</legend>
      <div class="reihe">
        {#each EXTRAS as e (e.id)}
          {@const frei = extraVerfuegbar(e.id, deko)}
          <label class="wahl klein" class:gewaehlt={aussehen.extra === e.id} class:gesperrt={!frei}>
            <input
              type="radio"
              name="extra"
              class="nur-leser"
              disabled={!frei}
              checked={aussehen.extra === e.id}
              onchange={() => setze({ extra: e.id })}
            />
            <Figur {figur} aussehen={{ ...aussehen, extra: e.id }} groesse={36} />
            <span>{e.name}</span>
            {#if !frei}<span class="hinweis">im Andenkenstand</span>{/if}
          </label>
        {/each}
      </div>
    </fieldset>
  </div>
</div>

<style>
  .baukasten {
    display: grid;
    gap: 12px;
  }
  @media (min-width: 640px) {
    .baukasten {
      grid-template-columns: auto 1fr;
      align-items: start;
    }
  }
  .vorschau {
    justify-self: center;
    background: radial-gradient(circle, #fff4cc 0 60%, transparent 61%);
    padding: 10px;
  }
  .gruppen {
    display: grid;
    gap: 10px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    font-weight: 900;
    margin-bottom: 6px;
  }
  .reihe {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .wahl {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    min-width: 68px;
    border: 3px solid transparent;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    font-size: 0.9rem;
  }
  .wahl.klein {
    min-width: 62px;
  }
  .farbe {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    font-size: 0.8rem;
    min-width: 54px;
    padding: 4px;
    border: 3px solid transparent;
    border-radius: 12px;
  }
  .klecks {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--tinte);
  }
  .klecks.leer {
    background: repeating-linear-gradient(45deg, #fff 0 5px, #e3e5ee 5px 10px);
  }
  .gewaehlt {
    border-color: var(--tinte);
    background: #fff4cc;
  }
  .gesperrt {
    opacity: 0.55;
    cursor: default;
  }
  .hinweis {
    font-size: 0.7rem;
  }
  .wahl:has(input:focus-visible),
  .farbe:has(input:focus-visible) {
    outline: 3px dashed var(--tinte);
    outline-offset: 2px;
  }
</style>
