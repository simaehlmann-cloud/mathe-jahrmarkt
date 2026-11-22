<script lang="ts">
  import {
    TYP_ERGEBNISSE,
    TYP_KLASSENLISTE,
    ergebnisseEinsammeln,
    ergebnisseErstellen,
    klassenlisteErstellen,
    klassenlisteUebernehmen,
    pruefeKlassenliste,
    sammlungEntfernen,
    type Klassenliste,
  } from '../../domain/austausch';
  import { PIN_MAX, PIN_MIN } from '../../domain/pin';
  import { keineAenderung } from '../../../services/aenderung';
  import { austauschWeitergeben, dateiAlsText, dateiname } from '../../dienste/schuldateien';
  import { FalschePin, entschluesseln, leseUmschlag, type Umschlag } from '../../dienste/schulkrypto';
  import { app } from '../../../app/zustand.svelte';
  import { offeneDateien } from '../offeneDateien.svelte';

  // Mit der App geöffnete Dateien (AirDrop, „Öffnen mit …“): gleich übernehmen
  $effect(() => {
    const liste = offeneDateien.liste;
    if (!liste.length || laeuft) return;
    offeneDateien.liste = [];
    void verarbeiteDateien(liste.map((d) => ({ name: d.name, text: async () => d.text })));
  });

  /**
   * Austausch zwischen den iPads einer Klasse ohne Server (Schulversion):
   * Klassenliste verteilen, Ergebnisse weitergeben und auf dem Lehrer-iPad einsammeln.
   * Die Dateien sind mit der Lehrer-PIN verschlüsselt.
   */
  const schule = $derived(app.bestand.schule);
  const geraetName = $derived(schule?.geraet.name || 'dieses iPad');
  let auswahl = $state<string[]>(app.bestand.schule?.klassen.map((k) => k.id) ?? []);
  let laeuft = $state(false);
  let meldung = $state<string | null>(null);

  /** Dateien, die sich mit der eigenen PIN nicht öffnen ließen und auf eine andere PIN warten. */
  let wartend = $state<{ name: string; u: Umschlag }[]>([]);
  let fremdePin = $state('');
  /** Geprüfte Klassenliste, die auf das Bestätigen wartet. */
  let liste = $state<{ liste: Klassenliste; von: string } | null>(null);
  let ueberschreiben = $state(false);

  const pin = (): string => {
    if (!app.lehrerPin) throw new Error('Bitte den Lehrerbereich neu öffnen.');
    return app.lehrerPin;
  };

  async function teilen(art: 'liste' | 'ergebnisse') {
    laeuft = true;
    meldung = null;
    try {
      if (art === 'liste') {
        const inhalt = klassenlisteErstellen(app.bestand, auswahl);
        const namen = (schule?.klassen ?? []).filter((k) => auswahl.includes(k.id)).map((k) => k.name);
        await austauschWeitergeben(inhalt, TYP_KLASSENLISTE, geraetName, pin(), dateiname(['Klassenliste', ...namen], Date.now()), 'Klassenliste');
      } else {
        const inhalt = ergebnisseErstellen(app.bestand, Date.now());
        await austauschWeitergeben(inhalt, TYP_ERGEBNISSE, geraetName, pin(), dateiname(['Ergebnisse', geraetName], Date.now()), 'Ergebnisse');
      }
    } catch (e) {
      meldung = e instanceof Error ? e.message : 'Die Datei ließ sich nicht erstellen.';
    } finally {
      laeuft = false;
    }
  }

  async function verarbeite(name: string, u: Umschlag, mit: string): Promise<string> {
    const inhalt = await entschluesseln(u, mit);
    if (u.typ === TYP_KLASSENLISTE) {
      liste = { liste: pruefeKlassenliste(inhalt), von: u.von };
      return `${name}: Klassenliste geprüft – bitte unten bestätigen.`;
    }
    if (u.typ === TYP_ERGEBNISSE) {
      let r: ReturnType<typeof ergebnisseEinsammeln> | undefined;
      app.aendere((b) => {
        r = ergebnisseEinsammeln(b, inhalt, Date.now());
        return r.bestand;
      }, { ...keineAenderung(), kopf: true, sammlung: true });
      return `${name}: Ergebnisse von ${u.von || 'einem iPad'} eingesammelt (${r?.kinder ?? 0} Kinder${r?.ersetzt ? ', ältere ersetzt' : ''}).`;
    }
    throw new Error(`${name}: Diese Datei kennt die App nicht.`);
  }

  async function dateienGewaehlt(e: Event) {
    const feld = e.target as HTMLInputElement;
    const dateien = [...(feld.files ?? [])];
    feld.value = '';
    if (dateien.length === 0) return;
    await verarbeiteDateien(dateien.map((d) => ({ name: d.name, text: () => dateiAlsText(d) })));
  }

  async function verarbeiteDateien(dateien: { name: string; text: () => Promise<string> }[]) {
    laeuft = true;
    const zeilen: string[] = [];
    const neuWartend: { name: string; u: Umschlag }[] = [];
    for (const d of dateien) {
      try {
        const u = leseUmschlag(await d.text());
        try {
          zeilen.push(await verarbeite(d.name, u, pin()));
        } catch (err) {
          if (err instanceof FalschePin) neuWartend.push({ name: d.name, u });
          else throw err;
        }
      } catch (err) {
        zeilen.push(`${d.name}: ${err instanceof Error ? err.message : 'nicht lesbar'}`);
      }
    }
    if (neuWartend.length) zeilen.push(`${neuWartend.length === 1 ? 'Eine Datei wurde' : `${neuWartend.length} Dateien wurden`} mit einer anderen PIN verschlüsselt.`);
    wartend = neuWartend;
    meldung = zeilen.join('\n');
    laeuft = false;
  }

  async function mitFremderPin(e: SubmitEvent) {
    e.preventDefault();
    laeuft = true;
    const zeilen: string[] = [];
    const rest: { name: string; u: Umschlag }[] = [];
    for (const w of wartend) {
      try {
        zeilen.push(await verarbeite(w.name, w.u, fremdePin));
      } catch (err) {
        if (err instanceof FalschePin) rest.push(w);
        else zeilen.push(`${w.name}: ${err instanceof Error ? err.message : 'nicht lesbar'}`);
      }
    }
    if (rest.length) zeilen.push('Mit dieser PIN ließen sich nicht alle Dateien öffnen.');
    wartend = rest;
    fremdePin = '';
    meldung = zeilen.join('\n');
    laeuft = false;
  }

  function listeUebernehmen() {
    const l = liste;
    if (!l) return;
    let text = '';
    try {
      app.aendere((b) => {
        const r = klassenlisteUebernehmen(b, l.liste, Date.now());
        const teile = [`${r.neu} neu`, `${r.aktualisiert} aktualisiert`];
        if (r.klassenNeu) teile.push(`${r.klassenNeu} ${r.klassenNeu === 1 ? 'Klasse' : 'Klassen'} neu`);
        if (r.uebersprungen.length) teile.push(`nicht übernommen (kein Platz): ${r.uebersprungen.join(', ')}`);
        text = `Klassenliste übernommen: ${teile.join(', ')}.`;
        return r.bestand;
      });
      meldung = text;
    } catch (e) {
      meldung = e instanceof Error ? e.message : 'Die Klassenliste ließ sich nicht übernehmen.';
    }
    liste = null;
    ueberschreiben = false;
  }

  function entfernen(id: string) {
    app.aendere((b) => sammlungEntfernen(b, id), { ...keineAenderung(), kopf: true, sammlung: true });
  }

  const datum = (t: number): string => new Date(t).toLocaleString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
</script>

<section>
  <div class="erklaerung">
    <h2>So funktioniert es</h2>
    <ol>
      <li>Auf einem iPad die Klasse anlegen und hier die <strong>Klassenliste weitergeben</strong> – per AirDrop, in die Schulcloud oder auf einen Stick.</li>
      <li>Auf den anderen iPads die Datei unter <strong>Klassenliste übernehmen</strong> wählen. Danach gelten überall dieselben Namen und Bildpasswörter.</li>
      <li>Zur Auswertung auf jedem iPad <strong>Ergebnisse weitergeben</strong> und auf dem Lehrer-iPad unter <strong>Ergebnisse einsammeln</strong> wählen.</li>
    </ol>
    <p class="hinweis">Die Dateien sind mit der Lehrer-PIN verschlüsselt. Nutzen Sie am besten auf allen iPads dieselbe PIN. Die App sendet nichts von sich aus.</p>
    {#if !schule?.geraet.name}<p class="warn">Tipp: Vergeben Sie unter „Einstellungen“ einen Namen für dieses iPad (z. B. „iPad 7“). Er hilft beim Einsammeln.</p>{/if}
  </div>

  <div class="block">
    <h2>Klassenliste weitergeben</h2>
    {#if (schule?.klassen.length ?? 0) === 0}
      <p>Noch keine Klasse angelegt.</p>
    {:else}
      <fieldset>
        <legend>Welche Klassen?</legend>
        {#each schule?.klassen ?? [] as k (k.id)}
          <label class="schalter"><input type="checkbox" value={k.id} bind:group={auswahl} /> {k.name} ({app.bestand.profile.filter((p) => p.klasse === k.id).length} Kinder)</label>
        {/each}
      </fieldset>
      <button class="ticket" disabled={laeuft || auswahl.length === 0} onclick={() => teilen('liste')}>Klassenliste weitergeben</button>
      <p class="hinweis">Enthält Klassen, Namen, Figuren, Bildpasswörter und Aufträge, dazu Subtraktionsverfahren, Spielzeit-Erinnerung, Bestenliste und Bauinsel-Regel. Kein Fortschritt.</p>
    {/if}
  </div>

  <div class="block">
    <h2>Ergebnisse weitergeben</h2>
    <p>Ergebnisse aller {app.bestand.profile.length} Kinder auf {geraetName} für die Auswertung auf dem Lehrer-iPad.</p>
    <button class="ticket" disabled={laeuft || app.bestand.profile.length === 0} onclick={() => teilen('ergebnisse')}>Ergebnisse weitergeben</button>
  </div>

  <div class="block">
    <h2>Datei übernehmen</h2>
    <p>Klassenliste oder Ergebnisse von einem anderen iPad wählen (auch mehrere Dateien auf einmal).</p>
    <label class="ticket datei" class:aus={laeuft}>
      Datei wählen
      <input type="file" multiple onchange={dateienGewaehlt} disabled={laeuft} />
    </label>
  </div>

  {#if laeuft}<p class="status" role="status">Einen Moment …</p>{/if}
  {#if meldung}<p class="status" role="status">{meldung}</p>{/if}

  {#if wartend.length}
    <form class="block" onsubmit={mitFremderPin}>
      <label class="wahl">
        PIN des anderen iPads
        <input type="password" bind:value={fremdePin} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="off" />
      </label>
      <div class="zeile">
        <button class="ticket" type="submit" disabled={laeuft || fremdePin.length < PIN_MIN}>Öffnen</button>
        <button class="ticket hell" type="button" onclick={() => (wartend = [])}>Abbrechen</button>
      </div>
    </form>
  {/if}

  {#if liste}
    {@const l = liste}
    <div class="block bestaetigen" role="alertdialog" aria-label="Klassenliste übernehmen">
      <h2>Klassenliste {l.von ? `von ${l.von}` : ''} übernehmen?</h2>
      <p>{l.liste.klassen.map((k) => `${k.name} (${l.liste.profile.filter((p) => p.klasse === k.id).length} Kinder)`).join(', ')}</p>
      <p class="hinweis">Fortschritt auf diesem iPad bleibt erhalten. Kinder mit gleichem Namen in derselben Klasse werden zusammengeführt. Namen und Bildpasswörter kommen aus der Liste.</p>
      {#if app.bestand.profile.some((p) => p.passwort)}
        <label class="schalter"><input type="checkbox" bind:checked={ueberschreiben} /> Ja, Bildpasswörter auf diesem iPad dürfen ersetzt werden.</label>
      {/if}
      <div class="zeile">
        <button class="ticket" disabled={app.bestand.profile.some((p) => p.passwort) && !ueberschreiben} onclick={listeUebernehmen}>Übernehmen</button>
        <button class="ticket hell" onclick={() => (liste = null)}>Abbrechen</button>
      </div>
    </div>
  {/if}

  <div class="block">
    <h2>Eingesammelte Ergebnisse</h2>
    {#if (schule?.gesammelt.length ?? 0) === 0}
      <p>Noch keine. Die Auswertung zeigt bisher nur die Kinder auf diesem iPad.</p>
    {:else}
      <ul class="liste">
        {#each schule?.gesammelt ?? [] as g (g.geraetId)}
          <li>
            <span><strong>{g.geraetName || 'iPad ohne Namen'}</strong> · {g.profile.length} Kinder · erstellt {datum(g.erstellt)}</span>
            <button class="ticket hell klein" onclick={() => entfernen(g.geraetId)}>Entfernen</button>
          </li>
        {/each}
      </ul>
      <p class="hinweis">Neue Ergebnisse desselben iPads ersetzen die alten. Eingesammelte Ergebnisse dienen nur der Auswertung; die Kinder spielen auf ihrem iPad weiter.</p>
    {/if}
  </div>
</section>

<style>
  section {
    display: grid;
    gap: 16px;
  }
  h2 {
    font-size: 1.2rem;
  }
  .erklaerung,
  .block {
    display: grid;
    gap: 8px;
    justify-items: start;
    padding: 12px 14px;
    border: 2px solid #e1e4ef;
    border-radius: 12px;
    background: #fff;
  }
  ol {
    margin: 0;
    padding-left: 1.3em;
    display: grid;
    gap: 4px;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.92rem;
  }
  .warn {
    font-weight: 800;
    color: var(--markise-dunkel);
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
  .ticket {
    font-size: 1rem;
    min-height: 46px;
    padding: 0.5em 1.2em;
  }
  .ticket.klein {
    min-height: 40px;
    font-size: 0.9rem;
    padding: 0.3em 1em;
  }
  .datei {
    position: relative;
    cursor: pointer;
  }
  .datei input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .datei.aus {
    --farbe: #d7dae6;
    color: #6b7191;
  }
  .status {
    white-space: pre-line;
    font-weight: 800;
    padding: 10px 12px;
    border-radius: 10px;
    background: #eef6ff;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
  }
  input[type='password'] {
    font: inherit;
    font-size: 1.2rem;
    font-weight: 800;
    padding: 8px 12px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
  }
  .zeile {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .bestaetigen {
    border-color: var(--senf-dunkel);
    background: #fffbea;
  }
  .liste {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
    width: 100%;
  }
  .liste li {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
</style>
