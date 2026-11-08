<script lang="ts">
  import { BUDEN, STUFEN, STUFEN_NAME } from '../../domain/buden';
  import { istGeschafft } from '../../domain/fortschritt/fortschritt';
  import { ausfuehrlicheElternansicht } from '../../domain/fortschritt/kaufgrenze';
  import { KOMPETENZEN, KOMPETENZ_REIHENFOLGE, type KompetenzId } from '../../domain/kompetenzen/modell';
  import { wochenbericht } from '../../domain/lernprofil/bericht';
  import { STATUS_TEXT, einschaetzen, elternSaetze } from '../../domain/lernprofil/lernprofil';
  import { SUBTRAKTION_NAMEN, type Schrift, type Subtraktionsverfahren } from '../../services/datenbestand';
  import { PREIS_ANZEIGE } from '../../services/kauf';
  import { sicherungEinspielen, sicherungErstellen } from '../../services/sicherung';
  import Elternsperre from '../components/Elternsperre.svelte';
  import Icon from '../components/Icon.svelte';
  import { app } from '../zustand.svelte';

  type Reiter = 'bericht' | 'lernprofil' | 'paket' | 'einstellungen' | 'profile';
  const REITER: { id: Reiter; name: string }[] = [
    { id: 'bericht', name: 'Wochenbericht' },
    { id: 'lernprofil', name: 'Lernprofil' },
    { id: 'paket', name: 'Zusatzpaket' },
    { id: 'einstellungen', name: 'Einstellungen' },
    { id: 'profile', name: 'Profile und Sicherung' },
  ];

  let offen = $state(false);
  let reiter = $state<Reiter>('bericht');
  let profilId = $state(app.bestand.aktiv ?? app.bestand.profile[0]?.id);
  let kind = $derived(app.bestand.profile.find((p) => p.id === profilId));
  let ausfuehrlich = $derived(ausfuehrlicheElternansicht(app.paket));
  let bericht = $derived(kind ? wochenbericht(kind, Date.now()) : undefined);
  const sichtbar = KOMPETENZ_REIHENFOLGE.filter((k) => BUDEN.some((b) => b.spielbar && b.kompetenzen.some((x) => x.kompetenz === k)));
  const VIER_WOCHEN = 28 * 24 * 3600 * 1000;

  let preis = $state(PREIS_ANZEIGE);
  let kaufLaeuft = $state(false);
  let sicherungText = $state('');
  let einspielText = $state('');
  let loeschenBestaetigen = $state<string | null>(null);

  $effect(() => {
    if (offen) void app.kauf.preis().then((p) => (preis = p));
  });

  function vorher(k: KompetenzId) {
    if (!kind) return undefined;
    const grenze = Date.now() - VIER_WOCHEN;
    const alt = einschaetzen(kind.ereignisse.filter((e) => e.t < grenze), k);
    return alt.status === 'kennenlernen' ? undefined : alt.status;
  }

  async function kaufen() {
    kaufLaeuft = true;
    try {
      const e = await app.kauf.kaufen();
      if (e === 'gekauft') {
        app.aendere((b) => ({ ...b, paket: { gekauft: true, seit: Date.now() } }));
        app.melde('Danke! Das Zusatzpaket ist freigeschaltet.');
      } else if (e === 'nichtVerfuegbar') {
        app.melde('Der Kauf ist in dieser Version noch nicht verfügbar.');
      } else if (e === 'fehler') {
        app.melde('Der Kauf hat nicht geklappt. Bitte später erneut versuchen.');
      }
    } finally {
      kaufLaeuft = false;
    }
  }

  async function wiederherstellen() {
    const ja = await app.kauf.wiederherstellen();
    if (ja) app.aendere((b) => ({ ...b, paket: { gekauft: true, seit: b.paket.seit ?? Date.now() } }));
    app.melde(ja ? 'Das Zusatzpaket ist wiederhergestellt.' : 'Es wurde kein früherer Kauf gefunden.');
  }

  function sicherungZeigen() {
    sicherungText = sicherungErstellen(app.bestand, Date.now());
  }

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(sicherungText);
      app.melde('Sicherung kopiert. Legen Sie sie z. B. in einer Notiz ab.');
    } catch {
      app.melde('Kopieren ging nicht. Bitte den Text markieren und kopieren.');
    }
  }

  function einspielen() {
    try {
      const e = sicherungEinspielen(app.bestand, einspielText);
      app.aendere(() => e.bestand);
      einspielText = '';
      const teile = [`${e.uebernommen} neu`, `${e.ersetzt} ersetzt`];
      if (e.uebersprungen) teile.push(`${e.uebersprungen} übersprungen, weil schon ${4} Profile da sind`);
      app.melde(`Sicherung eingespielt: ${teile.join(', ')}.`);
    } catch (err) {
      app.melde(err instanceof Error ? err.message : 'Die Sicherung ließ sich nicht einspielen.');
    }
  }

  function loeschen(id: string) {
    app.profilLoeschen(id);
    loeschenBestaetigen = null;
    if (profilId === id) profilId = app.bestand.profile[0]?.id;
  }

  function verlassen() {
    app.zeige(app.profil ? { name: 'jahrmarkt' } : { name: 'start' });
  }
</script>

{#if !offen}
  <Elternsperre onoffen={() => (offen = true)} onabbrechen={verlassen} />
{:else}
  <div class="eltern">
    <header>
      <button class="rund" onclick={verlassen} aria-label="Elternbereich schließen"><Icon name="zurueck" /></button>
      <h1>Elternbereich</h1>
    </header>
    <nav class="reiter" aria-label="Bereiche">
      {#each REITER as r (r.id)}
        <button class:aktiv={reiter === r.id} aria-current={reiter === r.id ? 'page' : undefined} onclick={() => (reiter = r.id)}>{r.name}</button>
      {/each}
    </nav>

    <div class="inhalt">
      {#if (reiter === 'bericht' || reiter === 'lernprofil') && app.bestand.profile.length > 1}
        <label class="wahl">
          Kind
          <select bind:value={profilId}>
            {#each app.bestand.profile as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
          </select>
        </label>
      {/if}

      {#if reiter === 'bericht'}
        {#if !kind || !bericht}
          <p>Noch kein Profil angelegt.</p>
        {:else}
          <section>
            <h2>Die letzten 7 Tage von {kind.name}</h2>
            <p>
              {bericht.runden === 1 ? '1 Runde' : `${bericht.runden} Runden`}, zusammen
              {bericht.gesamtMinuten < 1 ? 'weniger als eine Minute' : bericht.gesamtMinuten === 1 ? 'etwa 1 Minute' : `etwa ${bericht.gesamtMinuten} Minuten`}.
            </p>
            <div class="tage" role="img" aria-label="Spielzeit pro Tag: {bericht.minutenProTag.map((t) => `${t.minuten} Minuten`).join(', ')}">
              {#each bericht.minutenProTag as t (t.tag)}
                {@const max = Math.max(10, ...bericht.minutenProTag.map((x) => x.minuten))}
                <div class="tag">
                  <div class="saeule" style="height: {(t.minuten / max) * 100}%"></div>
                  <span>{new Date(t.tag).toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                </div>
              {/each}
            </div>
            {#if bericht.buden.length}<p>Gespielt: {bericht.buden.join(', ')}.</p>{/if}
            {#if bericht.sicherer.length}<p class="gut">Sicherer geworden: {bericht.sicherer.map((k) => KOMPETENZEN[k].name).join(', ')}.</p>{/if}
            {#if bericht.ueben.length}<p>Üben lohnt sich bei: {bericht.ueben.map((k) => KOMPETENZEN[k].name).join(', ')}.</p>{/if}
          </section>
          <section>
            <h2>Fortschritt je Bude</h2>
            <ul class="buden">
              {#each BUDEN.filter((b) => b.spielbar) as b (b.id)}
                <li>
                  <strong>{b.name}</strong>
                  {#each STUFEN as s (s)}
                    <span class="marke" class:an={istGeschafft(kind, b.id, s)}>{STUFEN_NAME[s]}{istGeschafft(kind, b.id, s) ? ' geschafft' : ''}</span>
                  {/each}
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {:else if reiter === 'lernprofil'}
        {#if !kind}
          <p>Noch kein Profil angelegt.</p>
        {:else if !ausfuehrlich}
          <section>
            <h2>Lernprofil im Zusatzpaket</h2>
            <p>
              Das Lernprofil beschreibt in Sätzen, was {kind.name} sicher kann und wo Üben lohnt, mit Tipps für zu Hause und einem Vorher-Nachher-Vergleich.
            </p>
            <button class="ticket" onclick={() => (reiter = 'paket')}>Zum Zusatzpaket</button>
          </section>
        {:else}
          {#each sichtbar as k (k)}
            {@const e = einschaetzen(kind.ereignisse, k)}
            {@const alt = vorher(k)}
            <section>
              <h2>{KOMPETENZEN[k].name}</h2>
              {#each elternSaetze(kind.ereignisse, k, kind.name) as s, i (i)}<p>{s}</p>{/each}
              {#if e.status !== 'kennenlernen'}
                <ul class="dimensionen">
                  <li>Wissen: {e.dimensionen.wissen ? STATUS_TEXT[e.dimensionen.wissen] : 'noch zu wenig Aufgaben'}</li>
                  <li>Sicherheit: {e.dimensionen.sicherheit ? STATUS_TEXT[e.dimensionen.sicherheit] : 'noch zu wenig Aufgaben'}</li>
                  <li>Anwendung: {e.dimensionen.anwendung ? STATUS_TEXT[e.dimensionen.anwendung] : 'kommt mit weiteren Buden'}</li>
                </ul>
                {#if alt}<p>Vor vier Wochen: {STATUS_TEXT[alt]}. Heute: {STATUS_TEXT[e.status]}.</p>{/if}
              {/if}
              <h3>Tipps für zu Hause</h3>
              <ul>{#each KOMPETENZEN[k].tippsFuerZuHause as t, i (i)}<li>{t}</li>{/each}</ul>
            </section>
          {/each}
          <p class="hinweis">
            Das Lernprofil ist eine Einschätzung aus dem Spiel, keine Diagnose. Bei auffälligen Schwierigkeiten im Rechnen hilft ein Gespräch mit der Lehrkraft.
          </p>
        {/if}
      {:else if reiter === 'paket'}
        <section>
          <h2>Zusatzpaket</h2>
          {#if app.paket}
            <p class="gut"><Icon name="haken" groesse={20} /> Das Zusatzpaket ist freigeschaltet. Danke!</p>
          {:else}
            <p>Einmalkauf, kein Abo. Gilt für alle Profile auf diesem Gerät und über die Familienfreigabe.</p>
            <ul>
              <li>Silber- und Gold-Stufe an allen Buden</li>
              <li>Jahrmarkt-Check mit persönlichem Rundgang</li>
              <li>Lernprofil in Sätzen, Tipps für zu Hause, Vorher-Nachher</li>
              <li>Abendmarkt mit Bonusbuden für Klasse 5</li>
            </ul>
            <button class="ticket rot" disabled={kaufLaeuft} onclick={kaufen}>Für {preis} freischalten</button>
          {/if}
          <button class="ticket hell" onclick={wiederherstellen}>Käufe wiederherstellen</button>
          <p class="hinweis">Die App enthält keine Werbung und sendet keine Daten. Alles bleibt auf diesem Gerät.</p>
        </section>
      {:else if reiter === 'einstellungen'}
        <section class="einstellungen">
          <h2>Ton und Sprache</h2>
          {#each [['lautEffekte', 'Klänge'], ['lautSprache', 'Vorlesen']] as [schluessel, name] (schluessel)}
            {@const s = schluessel as 'lautEffekte' | 'lautSprache'}
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
            <input type="checkbox" checked={app.einstellungen.automatischVorlesen} onchange={(e) => app.aendereEinstellungen({ automatischVorlesen: (e.target as HTMLInputElement).checked })} />
            Aufgaben automatisch vorlesen
          </label>
          <h2>Darstellung</h2>
          <label class="schalter">
            <input type="checkbox" checked={app.einstellungen.animationenReduziert} onchange={(e) => app.aendereEinstellungen({ animationenReduziert: (e.target as HTMLInputElement).checked })} />
            Animationen und Bewegung reduzieren
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
      {:else}
        <section>
          <h2>Profile</h2>
          <ul class="profile">
            {#each app.bestand.profile as p (p.id)}
              <li>
                <span>{p.name}</span>
                {#if loeschenBestaetigen === p.id}
                  <span class="frage">Wirklich löschen? Der Fortschritt geht verloren.</span>
                  <button class="ticket rot" onclick={() => loeschen(p.id)}>Löschen</button>
                  <button class="ticket hell" onclick={() => (loeschenBestaetigen = null)}>Behalten</button>
                {:else}
                  <button class="ticket hell" onclick={() => (loeschenBestaetigen = p.id)}>Profil löschen</button>
                {/if}
              </li>
            {/each}
          </ul>
        </section>
        <section>
          <h2>Sicherung für ein neues Gerät</h2>
          <p>
            Fortschritte sind Teil der normalen Gerätesicherung (iCloud oder Android-Sicherung). Zusätzlich lässt sich hier eine Sicherung als Text kopieren und auf
            einem anderen Gerät einfügen.
          </p>
          <button class="ticket" onclick={sicherungZeigen}>Sicherung erstellen</button>
          {#if sicherungText}
            <textarea readonly rows="4" value={sicherungText} aria-label="Sicherung als Text"></textarea>
            <button class="ticket hell" onclick={kopieren}>Text kopieren</button>
          {/if}
          <label class="wahl">
            Sicherung einfügen
            <textarea rows="4" bind:value={einspielText} placeholder="Hier den kopierten Text einfügen"></textarea>
          </label>
          <button class="ticket" disabled={!einspielText.trim()} onclick={einspielen}>Sicherung einspielen</button>
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .eltern {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--papier);
    position: relative;
    z-index: 2;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--oben) var(--rand-r) 8px var(--rand);
  }
  h1 {
    font-size: 1.6rem;
  }
  .reiter {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 0 var(--rand-r) 8px var(--rand);
    border-bottom: 3px solid var(--tinte);
  }
  .reiter button {
    flex: none;
    border: 3px solid var(--tinte);
    background: #fff;
    border-radius: 22px;
    padding: 8px 14px;
    font-weight: 800;
    min-height: 44px;
  }
  .reiter button.aktiv {
    background: var(--senf);
  }
  .inhalt {
    flex: 1;
    overflow: auto;
    padding: 14px var(--rand-r) var(--unten) var(--rand);
    display: grid;
    gap: 18px;
    align-content: start;
    max-width: 46rem;
    width: 100%;
    margin: 0 auto;
    user-select: text;
    -webkit-user-select: text;
  }
  section {
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  h2 {
    font-size: 1.3rem;
  }
  h3 {
    font-size: 1.05rem;
    margin-top: 4px;
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
    display: grid;
    gap: 4px;
  }
  .gut {
    color: var(--wiese-dunkel);
    font-weight: 800;
    display: inline-flex;
    gap: 6px;
    align-items: center;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.95rem;
  }
  .tage {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    height: 110px;
    width: 100%;
    max-width: 24rem;
  }
  .tag {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
  }
  .saeule {
    width: 100%;
    background: var(--markise);
    border-radius: 6px 6px 0 0;
    min-height: 3px;
  }
  .buden li {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .marke {
    border: 2px solid #c9cde0;
    border-radius: 12px;
    padding: 0 8px;
    font-size: 0.9rem;
    color: #6b7191;
  }
  .marke.an {
    border-color: var(--wiese-dunkel);
    color: var(--wiese-dunkel);
    font-weight: 800;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
    width: 100%;
    max-width: 28rem;
  }
  select,
  textarea {
    font: inherit;
    font-weight: 600;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
    width: 100%;
  }
  textarea {
    font-size: 0.85rem;
    max-width: 28rem;
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
  .profile li {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    list-style: none;
  }
  .profile {
    padding: 0;
  }
  .profile li > span:first-child {
    font-weight: 900;
    min-width: 6em;
  }
  .frage {
    color: var(--markise-dunkel);
    font-weight: 800;
  }
</style>
