<script lang="ts">
  import { tagKennung } from '../../domain/auftraege';
  import { minutenHeute, SPIELZEIT_OPTIONEN } from '../../domain/spielzeit';
  import { SUBTRAKTION_NAMEN, type Schrift, type Subtraktionsverfahren } from '../../services/datenbestand';
  import { standardStimme, stimmenKennung, type Stimme } from '../../services/sprache';
  import { app } from '../zustand.svelte';

  /**
   * Einstellungen für Eltern (Elternbereich) und Lehrkräfte (Lehrerbereich der Schulversion):
   * Spielzeit, Musik und Klänge, Vorlesen, Darstellung, Verfahren der schriftlichen Subtraktion.
   * `heuteListe`: die heutigen Minuten jedes Kindes zeigen (in der Schulversion mit 32 Kindern zu lang).
   */
  let { heuteListe = true }: { heuteListe?: boolean } = $props();

  const heute = tagKennung(new Date());
  let stimmen = $state<Stimme[]>([]);
  $effect(() => {
    void app.sprache.stimmen().then((l) => (stimmen = l));
  });
</script>

  <section class="einstellungen">
    <h2>Spielzeit</h2>
    <label class="wahl">
      Pause vorschlagen nach
      <select value={String(app.einstellungen.spielzeitMin)} onchange={(e) => app.aendereEinstellungen({ spielzeitMin: Number((e.target as HTMLSelectElement).value) })}>
        {#each SPIELZEIT_OPTIONEN as m (m)}<option value={String(m)}>{m === 0 ? 'nie (aus)' : `${m} Minuten am Tag`}</option>{/each}
      </select>
    </label>
    <p class="hinweis">Flinka schlägt nach der eingestellten Zeit freundlich eine Pause vor – nie mitten in einer Runde. Rechnen, Bauen und Insel zählen zusammen, für jedes Kind getrennt.</p>
    {#if heuteListe && app.bestand.profile.length}
      <ul class="heute">
        {#each app.bestand.profile as kind (kind.id)}<li>{kind.name}: heute {minutenHeute(kind.spielzeit, heute)} Minuten</li>{/each}
      </ul>
    {/if}

    <h2>Musik und Klänge</h2>
    {#each [['lautMusik', 'Musik'], ['lautEffekte', 'Klänge']] as [schluessel, name] (schluessel)}
      {@const s = schluessel as 'lautMusik' | 'lautEffekte'}
      <label class="regler">
        <span>{name}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={app.einstellungen[s]}
          oninput={(e) => app.aendereEinstellungen({ [s]: Number((e.target as HTMLInputElement).value) })}
        />
      </label>
    {/each}
    <label class="schalter">
      <input type="checkbox" checked={app.einstellungen.musikImSpiel} onchange={(e) => app.aendereEinstellungen({ musikImSpiel: (e.target as HTMLInputElement).checked })} />
      Musik auch beim Rechnen
    </label>
    <p class="hinweis">„Flinkas Walzer“ ist eine eigene Komposition für diese App und wird im Gerät erzeugt.</p>

    <h2>Vorlesen</h2>
    <label class="regler">
      <span>Lautstärke</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={app.einstellungen.lautSprache}
        oninput={(e) => app.aendereEinstellungen({ lautSprache: Number((e.target as HTMLInputElement).value) })}
      />
    </label>
    <label class="regler">
      <span>Tempo</span>
      <input
        type="range"
        min="0.8"
        max="1.5"
        step="0.05"
        value={app.einstellungen.sprechtempo}
        oninput={(e) => app.aendereEinstellungen({ sprechtempo: Number((e.target as HTMLInputElement).value) })}
      />
    </label>
    <label class="wahl">
      Stimme
      <select value={app.einstellungen.stimme} onchange={(e) => app.aendereEinstellungen({ stimme: (e.target as HTMLSelectElement).value })}>
        <option value="">Standard{stimmen.some((x) => x.name === 'Frau 2') ? ' (Frau 2)' : ''}</option>
        {#each stimmen as st (st.uri)}<option value={st.uri}>{st.name}</option>{/each}
      </select>
    </label>
    <button class="ticket hell" onclick={() => app.sprich('Hallo! Ich bin Flinka. Was ist sieben mal acht?', true)}>Probehören</button>
    {#if stimmen.length}
      {@const aktiv = stimmen.find((x) => x.uri === app.einstellungen.stimme) ?? standardStimme(stimmen)}
      <!-- Kennung der Stimme auf dem Gerät: Hilft, falsch erkannte Frauen- und Männerstimmen zu melden -->
      {#if aktiv}<p class="kennung">Gerätekennung: {stimmenKennung({ name: aktiv.uri, voiceURI: aktiv.uri })} ({aktiv.uri})</p>{/if}
    {/if}
    {#if stimmen.length === 0}
      <p class="hinweis">Auf diesem Gerät wurde keine deutsche Stimme ohne Internet gefunden. {__PLATTFORM__ === 'ios' ? 'In den iPhone- bzw. iPad-Einstellungen unter „Bedienungshilfen → Gesprochene Inhalte → Stimmen“ lässt sich eine deutsche Stimme laden.' : 'In den Android-Einstellungen unter „Sprachausgabe“ lässt sich eine deutsche Stimme herunterladen.'}</p>
    {:else}
      <p class="hinweis">Es werden nur Stimmen angeboten, die ohne Internet sprechen. So verlassen keine Texte das Gerät.</p>
    {/if}
    <label class="schalter">
      <input type="checkbox" checked={app.einstellungen.automatischVorlesen} onchange={(e) => app.aendereEinstellungen({ automatischVorlesen: (e.target as HTMLInputElement).checked })} />
      Aufgaben automatisch vorlesen
    </label>
    <h2>Darstellung</h2>
    <label class="schalter">
      <input type="checkbox" checked={app.einstellungen.animationenReduziert} onchange={(e) => app.aendereEinstellungen({ animationenReduziert: (e.target as HTMLInputElement).checked })} />
      Animationen und Bewegung reduzieren
    </label>
    <label class="schalter">
      <input type="checkbox" checked={app.einstellungen.stimmung} onchange={(e) => app.aendereEinstellungen({ stimmung: (e.target as HTMLInputElement).checked })} />
      Tageszeit und Jahreszeit auf dem Jahrmarkt zeigen (Abendlichter, Laub, Schnee, Blüten)
    </label>
    <fieldset>
      <legend>Schriftgröße</legend>
      {#each [['normal', 'Normal'], ['gross', 'Groß'], ['sehrGross', 'Sehr groß']] as [wert, name] (wert)}
        <label class="schalter">
          <input type="radio" name="schrift" checked={app.einstellungen.schrift === wert} onchange={() => app.aendereEinstellungen({ schrift: wert as Schrift })} />
          {name}
        </label>
      {/each}
    </fieldset>
    <h2>Wie in der Schule</h2>
    <label class="wahl">
      Verfahren der schriftlichen Subtraktion
      <select value={app.einstellungen.subtraktion} onchange={(e) => app.aendereEinstellungen({ subtraktion: (e.target as HTMLSelectElement).value as Subtraktionsverfahren })}>
        {#each Object.entries(SUBTRAKTION_NAMEN) as [wert, name] (wert)}<option value={wert}>{name}</option>{/each}
      </select>
    </label>
    <p class="hinweis">Welches Verfahren die Schule nutzt, legt dort die Fachkonferenz fest. Es wird in der Rechen-Werkstatt verwendet.</p>
  </section>

<style>
  section {
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  h2 {
    font-size: 1.3rem;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.95rem;
  }
  .kennung {
    font-size: 0.8rem;
    color: var(--tinte-weich, #5a628c);
    word-break: break-all;
    margin: 4px 0 0;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
    width: 100%;
    max-width: 28rem;
  }
  select {
    font: inherit;
    font-weight: 600;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
    width: 100%;
  }
  .regler {
    display: grid;
    grid-template-columns: 7em 1fr;
    align-items: center;
    gap: 10px;
    width: 100%;
    max-width: 28rem;
  }
  .regler input {
    accent-color: var(--markise);
    min-height: 36px;
  }
  .schalter {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
  }
  .schalter input {
    width: 24px;
    height: 24px;
    accent-color: var(--markise);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    font-weight: 800;
  }
  .heute {
    margin: 4px 0 8px 1.2em;
    padding: 0;
    font-weight: 700;
    display: grid;
    gap: 4px;
  }
</style>
