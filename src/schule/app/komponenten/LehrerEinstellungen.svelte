<script lang="ts">
  import { keineSperre, pinFehler, PIN_MAX, PIN_MIN } from '../../domain/pin';
  import { bereinigeText, INSEL_REGELN, MAX_GERAETENAME, type InselRegel } from '../../domain/schuldaten';
  import { INSEL_REGEL_TEXT } from '../../domain/insel';
  import { geraetLeeren } from '../../domain/verwaltung';
  import { hashe, neuerRettungscode } from '../../dienste/schulkrypto';
  import EinstellungenFormular from '../../../app/components/EinstellungenFormular.svelte';
  import { app } from '../../../app/zustand.svelte';

  /** Einstellungen der Schulversion: iPad-Name, Bestenliste, Lehrer-PIN, Schuljahreswechsel und die allgemeinen Einstellungen. */
  const schule = $derived(app.bestand.schule);
  let name = $state(app.bestand.schule?.geraet.name ?? '');
  let pin = $state('');
  let pin2 = $state('');
  let pinMeldung = $state<string | null>(null);
  let laeuft = $state(false);
  let code = $state('');
  let leerenOffen = $state(false);
  let leerenText = $state('');

  function nameSpeichern(e: SubmitEvent) {
    e.preventDefault();
    const n = bereinigeText(name, MAX_GERAETENAME);
    app.aendereSchule((s) => ({ ...s, geraet: { ...s.geraet, name: n } }));
    name = n;
    app.melde('Name gespeichert.');
  }

  async function pinAendern(e: SubmitEvent) {
    e.preventDefault();
    pinMeldung = pinFehler(pin) ?? (pin !== pin2 ? 'Die beiden PINs stimmen nicht überein.' : null);
    if (pinMeldung) return;
    laeuft = true;
    try {
      const h = await hashe(pin);
      app.aendereSchule((s) => ({ ...s, pin: h, sperre: keineSperre() }));
      app.lehrerPin = pin;
      pin = pin2 = '';
      pinMeldung = 'Die neue PIN gilt ab sofort. Dateien, die Sie ab jetzt weitergeben, sind mit der neuen PIN verschlüsselt.';
    } finally {
      laeuft = false;
    }
  }

  async function codeNeu() {
    laeuft = true;
    try {
      const r = await neuerRettungscode();
      app.aendereSchule((s) => ({ ...s, rettung: r.geheimnis }));
      code = r.code;
    } finally {
      laeuft = false;
    }
  }

  function leeren() {
    app.aendere((b) => geraetLeeren(b));
    leerenOffen = false;
    leerenText = '';
    app.melde('Alle Klassen, Kinder und eingesammelten Ergebnisse auf diesem iPad sind gelöscht.');
  }
</script>

<section>
  <form class="block" onsubmit={nameSpeichern}>
    <h2>Dieses iPad</h2>
    <label class="wahl">
      Name (steht in Dateien und bei eingesammelten Ergebnissen)
      <input bind:value={name} maxlength={MAX_GERAETENAME} placeholder="z. B. iPad 7" autocomplete="off" />
    </label>
    <button class="ticket" type="submit">Speichern</button>
  </form>

  <fieldset class="block">
    <legend><h2>Bauinsel und Bauplatz</h2></legend>
    {#each INSEL_REGELN as r (r)}
      <label class="schalter">
        <input type="radio" name="bauinsel" value={r} checked={(schule?.bauinsel ?? 'nachRunde') === r} onchange={() => app.aendereSchule((s) => ({ ...s, bauinsel: r as InselRegel }))} />
        {INSEL_REGEL_TEXT[r]}
      </label>
    {/each}
    <p class="hinweis">Gilt für alle Kinder auf diesem iPad und wird mit der Klassenliste weitergegeben. Ist die Bauzeit um, geht es zurück auf den Jahrmarkt; gebaute Sachen bleiben erhalten.</p>
  </fieldset>

  <div class="block">
    <h2>Bestenliste</h2>
    <label class="schalter">
      <input type="checkbox" checked={schule?.bestenliste ?? false} onchange={(e) => app.aendereSchule((s) => ({ ...s, bestenliste: (e.target as HTMLInputElement).checked }))} />
      An den Buden die Bestenliste der eigenen Klasse zeigen
    </label>
    <p class="hinweis">Ausgeschaltet sieht jedes Kind nur seine eigenen Rekorde und Runden (empfohlen, wenn Vergleiche in der Klasse nicht gewünscht sind).</p>
  </div>

  <form class="block" onsubmit={pinAendern}>
    <h2>Lehrer-PIN ändern</h2>
    <label class="wahl">
      Neue PIN ({PIN_MIN} bis {PIN_MAX} Ziffern)
      <input type="password" bind:value={pin} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="new-password" />
    </label>
    <label class="wahl">
      Neue PIN wiederholen
      <input type="password" bind:value={pin2} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="new-password" />
    </label>
    {#if pinMeldung}<p class="meldung" role="status">{pinMeldung}</p>{/if}
    <button class="ticket" type="submit" disabled={laeuft || !pin || !pin2}>PIN ändern</button>
  </form>

  <div class="block">
    <h2>Wiederherstellungscode</h2>
    <p>Mit dem Code lässt sich eine vergessene PIN ersetzen. Ein neuer Code macht den alten ungültig.</p>
    {#if code}
      <p class="code">{code}</p>
      <p class="hinweis">Bitte notieren. Der Code wird nur jetzt angezeigt.</p>
    {:else}
      <button class="ticket hell" disabled={laeuft} onclick={codeNeu}>Neuen Code erzeugen</button>
    {/if}
  </div>

  <div class="block">
    <h2>Neues Schuljahr</h2>
    <p>Löscht alle Klassen, Kinder mit ihrem Fortschritt und die eingesammelten Ergebnisse auf diesem iPad. PIN, Name des iPads und Einstellungen bleiben.</p>
    {#if !leerenOffen}
      <button class="ticket hell" onclick={() => (leerenOffen = true)}>iPad leeren …</button>
    {:else}
      <label class="wahl">
        Zum Bestätigen LÖSCHEN eingeben
        <input bind:value={leerenText} autocomplete="off" autocapitalize="characters" />
      </label>
      <div class="zeile">
        <button class="ticket rot" disabled={leerenText.trim().toUpperCase() !== 'LÖSCHEN'} onclick={leeren}>Alles löschen</button>
        <button class="ticket hell" onclick={() => { leerenOffen = false; leerenText = ''; }}>Abbrechen</button>
      </div>
    {/if}
  </div>

  <EinstellungenFormular heuteListe={false} />
</section>

<style>
  section {
    display: grid;
    gap: 16px;
  }
  h2 {
    font-size: 1.2rem;
  }
  fieldset.block {
    margin: 0;
  }
  legend {
    float: left;
    width: 100%;
    padding: 0;
  }
  .block {
    display: grid;
    gap: 8px;
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
    width: 100%;
    max-width: 28rem;
  }
  input:not([type='checkbox']) {
    font: inherit;
    font-weight: 700;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
    user-select: text;
    -webkit-user-select: text;
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
    flex: none;
    accent-color: var(--markise);
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.92rem;
  }
  .meldung {
    font-weight: 800;
  }
  .code {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    padding: 8px 12px;
    border: 3px dashed var(--tinte);
    border-radius: 10px;
    user-select: text;
    -webkit-user-select: text;
  }
  .ticket {
    font-size: 1rem;
    min-height: 46px;
    padding: 0.5em 1.2em;
  }
  .zeile {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
</style>
