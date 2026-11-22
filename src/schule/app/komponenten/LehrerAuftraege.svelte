<script lang="ts" module>
  /** Vorlage aus der Auswertung („Üben lohnt sich“ → Auftrag geben). */
  export interface AuftragVorlage {
    klasse: string;
    kinder: string[];
    bude: string | null;
  }
</script>

<script lang="ts">
  import { BUDEN, GASSEN, STUFEN, STUFEN_NAME, type Stufe } from '../../../domain/buden';
  import { neueKennung } from '../../../services/datenbestand';
  import { keineAenderung } from '../../../services/aenderung';
  import { zusammenfuehren } from '../../domain/analyse';
  import { AuftragsFehler, auftragAnlegen, auftragEntfernen, auftragStand, auftragText } from '../../domain/auftraege';
  import { app } from '../../../app/zustand.svelte';

  /**
   * Aufträge der Lehrkraft (Schulversion): an die ganze Klasse oder einzelne Kinder, für eine Bude (mit oder ohne Stufe)
   * oder den Jahrmarkt-Check. Die Kinder sehen ein blaues Fähnchen an der Bude und eine Ansage von Flinka.
   */
  let { vorlage = null }: { vorlage?: AuftragVorlage | null } = $props();

  const schule = $derived(app.bestand.schule);
  const klassen = $derived(schule?.klassen ?? []);
  const start = (() => ({ ...(vorlage ?? { klasse: app.bestand.schule?.klassen[0]?.id ?? '', kinder: [], bude: null }) }))();
  let klasse = $state(start.klasse);
  let ziel = $state<string>(start.bude ?? 'dartbude');
  let stufe = $state<'' | Stufe>('');
  let alle = $state(start.kinder.length === 0);
  let auswahl = $state<string[]>(start.kinder);
  // Mit Vorlage (aus der Auswertung) oder ohne bisherige Aufträge: Formular gleich offen
  let offen = $state(start.kinder.length > 0 || start.bude !== null || (app.bestand.schule?.auftraege.length ?? 0) === 0);

  const kinderDerKlasse = $derived(app.bestand.profile.filter((p) => p.klasse === klasse).sort((a, b) => a.name.localeCompare(b.name, 'de')));
  const analyse = $derived(zusammenfuehren(app.bestand.profile, klassen, schule?.gesammelt ?? [], schule?.geraet.name || 'dieses iPad'));
  const auftraege = $derived([...(schule?.auftraege ?? [])].filter((a) => a.klasse === klasse).sort((a, b) => b.erstellt - a.erstellt));
  const buden = BUDEN.filter((b) => b.spielbar);

  function anlegen(e: SubmitEvent) {
    e.preventDefault();
    try {
      app.aendereSchule((s) =>
        auftragAnlegen(
          s,
          { id: neueKennung('a'), klasse, fuer: alle ? null : auswahl, bude: ziel === 'check' ? null : ziel, stufe: ziel === 'check' || stufe === '' ? null : stufe },
          Date.now(),
        ),
      );
      app.melde('Auftrag erteilt. Auf anderen iPads gilt er, sobald Sie dort die Klassenliste übernehmen.');
      offen = false;
    } catch (err) {
      app.melde(err instanceof AuftragsFehler ? err.message : 'Der Auftrag ließ sich nicht anlegen.');
    }
  }

  function entfernen(id: string) {
    app.aendere((b) => (b.schule ? { ...b, schule: auftragEntfernen(b.schule, id) } : b), { ...keineAenderung(), kopf: true });
  }

  const datum = (t: number): string => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });
  const namenVon = (ids: string[] | null): string =>
    ids === null ? 'ganze Klasse' : ids.map((id) => analyse.find((k) => k.id === id)?.name ?? '?').join(', ');
</script>

<section>
  {#if klassen.length === 0}
    <p>Legen Sie zuerst unter „Klassen“ eine Klasse an.</p>
  {:else}
    {#if klassen.length > 1}
      <label class="wahl">
        Klasse
        <select bind:value={klasse}>
          {#each klassen as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
        </select>
      </label>
    {/if}

    {#if !offen}
      <button class="ticket" onclick={() => (offen = true)}>+ Neuer Auftrag</button>
    {:else}
      <form class="block" onsubmit={anlegen}>
        <h2>Neuer Auftrag</h2>
        <label class="wahl">
          Was?
          <select bind:value={ziel}>
            <option value="check">Jahrmarkt-Check (ca. 10 Minuten)</option>
            {#each GASSEN as g (g.id)}
              {@const liste = buden.filter((b) => b.gasse === g.id)}
              {#if liste.length}
                <optgroup label={g.name}>
                  {#each liste as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
                </optgroup>
              {/if}
            {/each}
          </select>
        </label>
        {#if ziel !== 'check'}
          <label class="wahl">
            Stufe
            <select bind:value={stufe}>
              <option value="">beliebig</option>
              {#each STUFEN as s (s)}<option value={s}>{STUFEN_NAME[s]}</option>{/each}
            </select>
          </label>
        {/if}
        <fieldset>
          <legend>Für wen?</legend>
          <label class="schalter"><input type="radio" name="fuer" checked={alle} onchange={() => (alle = true)} /> Ganze Klasse</label>
          <label class="schalter"><input type="radio" name="fuer" checked={!alle} onchange={() => (alle = false)} /> Einzelne Kinder</label>
          {#if !alle}
            <div class="kinder">
              {#each kinderDerKlasse as k (k.id)}
                <label class="schalter klein"><input type="checkbox" value={k.id} bind:group={auswahl} /> {k.name}</label>
              {/each}
            </div>
          {/if}
        </fieldset>
        <p class="hinweis">Erledigt ist der Auftrag, sobald das Kind danach eine passende Runde gespielt hat{ziel === 'check' ? ' bzw. den Check gemacht hat' : ''}. Die Kinder sehen ein blaues Fähnchen an der Bude; Flinka sagt den Auftrag beim nächsten Anmelden an.</p>
        <div class="zeile">
          <button class="ticket" type="submit" disabled={!alle && auswahl.length === 0}>Auftrag erteilen</button>
          <button class="ticket hell" type="button" onclick={() => (offen = false)}>Abbrechen</button>
        </div>
      </form>
    {/if}

    <h2>Aufträge dieser Klasse</h2>
    {#if auftraege.length === 0}
      <p>Noch keine.</p>
    {:else}
      <ul class="liste">
        {#each auftraege as a (a.id)}
          {@const st = auftragStand(a, analyse)}
          <li>
            <div class="kopf">
              <strong>{auftragText(a)}</strong>
              <span class="hinweis">seit {datum(a.erstellt)} · {namenVon(a.fuer)}</span>
              <span class="stand">{st.erledigt} von {st.kinder.length} erledigt</span>
              <button class="ticket hell klein" onclick={() => entfernen(a.id)}>Entfernen</button>
            </div>
            {#if st.kinder.some((k) => !k.erledigt)}
              <p class="offen">Noch offen: {st.kinder.filter((k) => !k.erledigt).map((k) => k.name).join(', ')}</p>
            {/if}
          </li>
        {/each}
      </ul>
      <p class="hinweis">Der Stand berücksichtigt auch eingesammelte Ergebnisse anderer iPads.</p>
    {/if}
  {/if}
</section>

<style>
  section {
    display: grid;
    gap: 14px;
  }
  h2 {
    font-size: 1.2rem;
  }
  .block {
    display: grid;
    gap: 10px;
    justify-items: start;
    padding: 12px 14px;
    border: 2px solid #e1e4ef;
    border-radius: 12px;
    background: #fff;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
    min-width: 14rem;
  }
  select {
    font: inherit;
    font-weight: 700;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 2px;
  }
  legend {
    font-weight: 800;
  }
  .schalter {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    font-weight: 700;
  }
  .schalter input {
    width: 24px;
    height: 24px;
    accent-color: var(--markise);
  }
  .kinder {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0 12px;
    padding-left: 34px;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.92rem;
  }
  .ticket {
    font-size: 1rem;
    min-height: 46px;
    padding: 0.5em 1.2em;
  }
  .ticket.klein {
    min-height: 40px;
    font-size: 0.9rem;
    padding: 0.3em 1em;
    margin-left: auto;
  }
  .zeile {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .liste li {
    border: 2px solid #e1e4ef;
    border-radius: 12px;
    background: #fff;
    padding: 8px 12px;
  }
  .kopf {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: center;
  }
  .stand {
    font-weight: 800;
  }
  .offen {
    font-size: 0.92rem;
    margin-top: 4px;
  }
</style>
