<script lang="ts">
  import { passwortText } from '../../domain/bildpasswort';
  import { MAX_KLASSENNAME } from '../../domain/schuldaten';
  import {
    VerwaltungsFehler,
    klasseAnlegen,
    klasseLoeschen,
    klasseOhnePasswort,
    klasseUmbenennen,
    klassenMitKindern,
    namenAusText,
    passwoerterNeu,
    profilAendern,
    profileLoeschen,
    profileZuruecksetzen,
    schuelerAnlegen,
  } from '../../domain/verwaltung';
  import { MAX_NAME, MAX_PROFILE_SCHULE } from '../../../domain/profil';
  import { createRng, randomSeed } from '../../../domain/rng';
  import { neueKennung } from '../../../services/datenbestand';
  import BildSymbol from '../grafik/BildSymbol.svelte';
  import Figur from '../../../app/grafik/Figur.svelte';
  import { app } from '../../../app/zustand.svelte';

  /** Klassen und Kinder verwalten, Bildpasswörter zeigen und als Klassensatz drucken (Schulversion). */
  let { onbericht }: { onbericht: (id: string) => void } = $props();

  const rng = createRng(randomSeed());
  const gruppen = $derived(klassenMitKindern(app.bestand));
  const klassen = $derived(app.bestand.schule?.klassen ?? []);
  let gewaehlt = $state<string>(app.bestand.schule?.klassen[0]?.id ?? '');
  const gruppe = $derived(gruppen.find((g) => (g.klasse?.id ?? '') === gewaehlt) ?? gruppen[0]);
  const belegt = $derived(app.bestand.profile.length);

  let neueKlasse = $state('');
  let klasseNeuOffen = $state(app.bestand.schule?.klassen.length === 0);
  let namenText = $state('');
  let ergebnis = $state<string | null>(null);
  let zeigen = $state(false);
  let bearbeiten = $state<string | null>(null);
  let editName = $state('');
  let editKlasse = $state('');
  let frage = $state<null | { art: 'loeschen' | 'zuruecksetzen' | 'klasseLoeschen' | 'alleNeu'; id: string }>(null);
  let umbenennen = $state(false);
  let klassenName = $state('');
  let pdfLaeuft = $state(false);

  const vorschau = $derived(namenAusText(namenText, gruppe?.profile.map((p) => p.name) ?? []));

  function versuche(fn: () => void): boolean {
    try {
      fn();
      return true;
    } catch (e) {
      app.melde(e instanceof VerwaltungsFehler || e instanceof Error ? e.message : 'Das hat nicht geklappt.');
      return false;
    }
  }

  function klasseNeu(e: SubmitEvent) {
    e.preventDefault();
    const id = neueKennung('k');
    if (versuche(() => app.aendere((b) => klasseAnlegen(b, id, neueKlasse)))) {
      gewaehlt = id;
      neueKlasse = '';
      klasseNeuOffen = false;
      app.melde('Klasse angelegt. Jetzt die Namen der Kinder eintragen.');
    }
  }

  function kinderAnlegen(e: SubmitEvent) {
    e.preventDefault();
    const k = gruppe?.klasse;
    if (!k) return;
    const v = vorschau;
    let angelegt = 0;
    let uebersprungen: string[] = [];
    versuche(() =>
      app.aendere((b) => {
        const r = schuelerAnlegen(b, k.id, v.namen, () => neueKennung('p'), rng, Date.now());
        angelegt = r.angelegt.length;
        uebersprungen = r.uebersprungen;
        return r.bestand;
      }),
    );
    const teile = [`${angelegt} ${angelegt === 1 ? 'Kind' : 'Kinder'} angelegt`];
    if (v.doppelt.length) teile.push(`schon vorhanden: ${v.doppelt.join(', ')}`);
    if (v.gekuerzt.length) teile.push(`auf ${MAX_NAME} Zeichen gekürzt: ${v.gekuerzt.join(', ')}`);
    if (uebersprungen.length) teile.push(`kein Platz mehr (höchstens ${MAX_PROFILE_SCHULE} je iPad): ${uebersprungen.join(', ')}`);
    const satz = teile.join('; ');
    ergebnis = satz.endsWith('.') ? satz : `${satz}.`;
    namenText = '';
  }

  function oeffneBearbeiten(id: string) {
    const p = app.bestand.profile.find((q) => q.id === id);
    if (!p) return;
    bearbeiten = bearbeiten === id ? null : id;
    editName = p.name;
    editKlasse = p.klasse ?? '';
    frage = null;
  }

  function speichern(id: string) {
    if (versuche(() => app.aendere((b) => profilAendern(b, id, { name: editName, klasse: editKlasse || null })))) {
      bearbeiten = null;
      app.melde('Gespeichert.');
    }
  }

  function passwortNeu(ids: string[]) {
    app.aendere((b) => passwoerterNeu(b, ids, rng));
    zeigen = true;
    frage = null;
    app.melde(ids.length === 1 ? 'Neues Bildpasswort vergeben.' : 'Neue Bildpasswörter vergeben. Bitte neue Kärtchen drucken.');
  }

  function bestaetigt() {
    const f = frage;
    if (!f) return;
    frage = null;
    if (f.art === 'loeschen') {
      app.aendere((b) => profileLoeschen(b, [f.id]));
      bearbeiten = null;
      app.melde('Profil gelöscht.');
    } else if (f.art === 'zuruecksetzen') {
      app.aendere((b) => profileZuruecksetzen(b, [f.id]));
      app.melde('Fortschritt zurückgesetzt. Name, Figur und Bildpasswort bleiben.');
    } else if (f.art === 'klasseLoeschen') {
      app.aendere((b) => klasseLoeschen(b, f.id, true));
      gewaehlt = app.bestand.schule?.klassen[0]?.id ?? '';
      app.melde('Klasse gelöscht.');
    } else if (f.art === 'alleNeu') {
      passwortNeu(gruppe?.profile.map((p) => p.id) ?? []);
    }
  }

  function klasseUmbenennenSpeichern(e: SubmitEvent) {
    e.preventDefault();
    const k = gruppe?.klasse;
    if (k && versuche(() => app.aendere((b) => klasseUmbenennen(b, k.id, klassenName)))) umbenennen = false;
  }

  async function klassensatz() {
    const g = gruppe;
    if (!g) return;
    pdfLaeuft = true;
    try {
      const { klassensatzPdf } = await import('../../dienste/kaertchen');
      const { pdfWeitergeben } = await import('../../../services/pdf');
      const karten = g.profile.filter((p) => p.passwort).map((p) => ({ name: p.name, klasse: g.klasse?.name ?? '', passwort: p.passwort as string[] }));
      const bytes = await klassensatzPdf(karten);
      await pdfWeitergeben(bytes, `Bildpasswoerter ${(g.klasse?.name ?? 'ohne Klasse').replace(/[^\p{L}\p{N} _-]/gu, '')}.pdf`, 'Bildpasswörter');
    } catch {
      app.melde('Die Kärtchen ließen sich gerade nicht erstellen.');
    } finally {
      pdfLaeuft = false;
    }
  }
</script>

<section>
  <p class="hinweis">{belegt} von {MAX_PROFILE_SCHULE} Plätzen auf diesem iPad belegt.</p>
  <div class="klassen" role="group" aria-label="Klasse wählen">
    {#each gruppen as g (g.klasse?.id ?? '')}
      {@const id = g.klasse?.id ?? ''}
      <button class:aktiv={gruppe === g} aria-pressed={gruppe === g} onclick={() => { gewaehlt = id; bearbeiten = null; frage = null; umbenennen = false; ergebnis = null; }}>
        {g.klasse ? g.klasse.name : 'Ohne Klasse'} <small>({g.profile.length})</small>
      </button>
    {/each}
    <button class="neu" onclick={() => (klasseNeuOffen = !klasseNeuOffen)} aria-expanded={klasseNeuOffen}>+ Neue Klasse</button>
  </div>

  {#if klasseNeuOffen}
    <form class="zeile" onsubmit={klasseNeu}>
      <label class="wahl">
        Name der Klasse
        <input bind:value={neueKlasse} maxlength={MAX_KLASSENNAME} placeholder="z. B. 4a" autocomplete="off" />
      </label>
      <button class="ticket" type="submit" disabled={!neueKlasse.trim()}>Anlegen</button>
    </form>
  {/if}

  {#if gruppe}
    <div class="kopf">
      {#if umbenennen && gruppe.klasse}
        <form class="zeile" onsubmit={klasseUmbenennenSpeichern}>
          <input bind:value={klassenName} maxlength={MAX_KLASSENNAME} aria-label="Neuer Name der Klasse" />
          <button class="ticket" type="submit">Speichern</button>
          <button class="ticket hell" type="button" onclick={() => (umbenennen = false)}>Abbrechen</button>
        </form>
      {:else}
        <h2>{gruppe.klasse ? `Klasse ${gruppe.klasse.name}` : 'Ohne Klasse'}</h2>
      {/if}
      <div class="aktionen">
        <button class="ticket" disabled={pdfLaeuft || !gruppe.profile.some((p) => p.passwort)} onclick={klassensatz}>{pdfLaeuft ? 'Wird erstellt …' : 'Kärtchen drucken (PDF)'}</button>
        <button class="ticket hell" onclick={() => (zeigen = !zeigen)} aria-pressed={zeigen}>{zeigen ? 'Passwörter verbergen' : 'Passwörter zeigen'}</button>
        {#if gruppe.profile.length}<button class="ticket hell" onclick={() => (frage = { art: 'alleNeu', id: '' })}>Alle Passwörter neu</button>{/if}
        {#if gruppe.klasse}
          {@const k = gruppe.klasse}
          <button class="ticket hell" onclick={() => { umbenennen = true; klassenName = k.name; }}>Umbenennen</button>
          <button class="ticket hell" onclick={() => (frage = { art: 'klasseLoeschen', id: k.id })}>Klasse löschen</button>
        {/if}
      </div>
    </div>

    {#if gruppe.klasse}
      {@const k = gruppe.klasse}
      <label class="schalter">
        <input type="checkbox" checked={k.ohnePasswort === true} onchange={(e) => app.aendere((b) => klasseOhnePasswort(b, k.id, (e.target as HTMLInputElement).checked))} />
        Anmelden ohne Bildpasswort (Karte antippen und bestätigen – z. B. für jüngere Kinder)
      </label>
    {/if}

    {#if frage && (frage.art === 'klasseLoeschen' || frage.art === 'alleNeu')}
      <div class="frage" role="alertdialog" aria-label="Bitte bestätigen">
        <p>
          {frage.art === 'klasseLoeschen'
            ? `Klasse ${gruppe.klasse?.name ?? ''} mit allen ${gruppe.profile.length} Kindern und ihrem Fortschritt auf diesem iPad löschen?`
            : 'Alle Kinder dieser Klasse bekommen ein neues Bildpasswort. Die alten Kärtchen gelten dann nicht mehr.'}
        </p>
        <button class="ticket rot" onclick={bestaetigt}>{frage.art === 'klasseLoeschen' ? 'Löschen' : 'Neu vergeben'}</button>
        <button class="ticket hell" onclick={() => (frage = null)}>Abbrechen</button>
      </div>
    {/if}

    {#if gruppe.klasse}
      <form class="anlegen" onsubmit={kinderAnlegen}>
        <label class="wahl">
          Kinder hinzufügen – eine Zeile pro Kind (Vorname und Anfangsbuchstabe genügen, z. B. „Mia S.“)
          <textarea bind:value={namenText} rows="4" placeholder={'Mia S.\nJonas K.\nAylin T.'}></textarea>
        </label>
        <div class="zeile">
          <button class="ticket" type="submit" disabled={vorschau.namen.length === 0}>
            {vorschau.namen.length === 0 ? 'Kinder anlegen' : vorschau.namen.length === 1 ? '1 Kind anlegen' : `${vorschau.namen.length} Kinder anlegen`}
          </button>
          {#if vorschau.doppelt.length}<span class="hinweis">Schon vorhanden: {vorschau.doppelt.join(', ')}</span>{/if}
        </div>
        <p class="hinweis">Jedes Kind bekommt ein Bildpasswort aus drei Bildern. Seine Figur gestaltet es beim ersten Anmelden selbst. Bitte keine vollständigen Namen eintragen.</p>
      </form>
      {#if ergebnis}<p class="ergebnis" role="status">{ergebnis}</p>{/if}
    {/if}

    {#if gruppe.profile.length === 0}
      <p>Noch keine Kinder in dieser Klasse.</p>
    {:else}
      <ul class="kinder">
        {#each gruppe.profile as p (p.id)}
          <li>
            <div class="kind">
              <Figur figur={p.figur} groesse={40} aussehen={p.aussehen} />
              <strong>{p.name}</strong>
              {#if p.figurGewaehlt === false}<span class="marke">noch nicht angemeldet</span>{/if}
              <span class="pw" aria-label={p.passwort ? (zeigen ? `Bildpasswort: ${passwortText(p.passwort)}` : 'Bildpasswort verborgen') : 'kein Bildpasswort'}>
                {#if !p.passwort}
                  <span class="marke warn">kein Passwort</span>
                {:else if zeigen}
                  {#each p.passwort as s, i (i)}<BildSymbol id={s} groesse={30} />{/each}
                {:else}
                  <span aria-hidden="true">● ● ●</span>
                {/if}
              </span>
              <button class="ticket hell klein" onclick={() => oeffneBearbeiten(p.id)} aria-expanded={bearbeiten === p.id}>Bearbeiten</button>
            </div>
            {#if bearbeiten === p.id}
              <div class="bearbeiten">
                <label class="wahl">
                  Name
                  <input bind:value={editName} maxlength={MAX_NAME} autocomplete="off" />
                </label>
                <label class="wahl">
                  Klasse
                  <select bind:value={editKlasse}>
                    <option value="">Ohne Klasse</option>
                    {#each klassen as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
                  </select>
                </label>
                <div class="zeile">
                  <button class="ticket" onclick={() => speichern(p.id)}>Speichern</button>
                  <button class="ticket hell" onclick={() => passwortNeu([p.id])}>Neues Bildpasswort</button>
                  <button class="ticket hell" onclick={() => onbericht(p.id)}>Einzelbericht</button>
                  <button class="ticket hell" onclick={() => (frage = { art: 'zuruecksetzen', id: p.id })}>Fortschritt zurücksetzen</button>
                  <button class="ticket hell" onclick={() => (frage = { art: 'loeschen', id: p.id })}>Löschen</button>
                </div>
                {#if frage && frage.id === p.id}
                  <div class="frage" role="alertdialog" aria-label="Bitte bestätigen">
                    <p>
                      {frage.art === 'loeschen'
                        ? `${p.name} mit allem Fortschritt auf diesem iPad löschen?`
                        : `Stufen, Rekorde, Taler, Bauten und Lernprofil von ${p.name} auf Anfang setzen? Name, Figur und Bildpasswort bleiben.`}
                    </p>
                    <button class="ticket rot" onclick={bestaetigt}>{frage.art === 'loeschen' ? 'Löschen' : 'Zurücksetzen'}</button>
                    <button class="ticket hell" onclick={() => (frage = null)}>Abbrechen</button>
                  </div>
                {/if}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {:else if !klasseNeuOffen}
    <p>Legen Sie zuerst eine Klasse an.</p>
  {/if}
</section>

<style>
  section {
    display: grid;
    gap: 14px;
  }
  h2 {
    font-size: 1.3rem;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.95rem;
  }
  .klassen {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .klassen button {
    border: 3px solid var(--tinte);
    border-radius: 999px;
    background: #fff;
    font-weight: 900;
    padding: 6px 14px;
    min-height: 44px;
  }
  .klassen button.aktiv {
    background: var(--senf);
  }
  .klassen button.neu {
    border-style: dashed;
  }
  .klassen small {
    font-weight: 700;
    color: var(--tinte-weich);
  }
  .kopf {
    display: grid;
    gap: 10px;
  }
  .aktionen,
  .zeile {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: end;
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
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
    flex: 1;
    min-width: 12rem;
  }
  input,
  select,
  textarea {
    font: inherit;
    font-weight: 700;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
    width: 100%;
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
  .anlegen {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 3px dashed #c9cde0;
    border-radius: 12px;
  }
  .ergebnis {
    font-weight: 800;
    color: var(--wiese-dunkel);
  }
  .kinder {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .kinder li {
    border: 2px solid #e1e4ef;
    border-radius: 12px;
    background: #fff;
    padding: 6px 10px;
  }
  .kind {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .pw {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    color: var(--tinte-weich);
  }
  .marke {
    font-size: 0.8rem;
    font-weight: 800;
    padding: 1px 8px;
    border-radius: 999px;
    background: #eef0f6;
    color: var(--tinte-weich);
  }
  .marke.warn {
    background: #facdd2;
    color: var(--markise-dunkel);
  }
  .bearbeiten {
    display: grid;
    gap: 10px;
    padding: 10px 0 4px;
  }
  .frage {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff1f2;
    border: 2px solid var(--markise);
  }
  .frage p {
    flex-basis: 100%;
    font-weight: 800;
  }
</style>
