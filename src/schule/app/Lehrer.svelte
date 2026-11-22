<script lang="ts">
  import { onDestroy } from 'svelte';
  import Icon from '../../app/components/Icon.svelte';
  import Ueber from '../../app/components/Ueber.svelte';
  import LehrerAnalyse from './komponenten/LehrerAnalyse.svelte';
  import LehrerAuftraege, { type AuftragVorlage } from './komponenten/LehrerAuftraege.svelte';
  import LehrerHilfe from './komponenten/LehrerHilfe.svelte';
  import { offeneDateien } from './offeneDateien.svelte';
  import LehrerAustausch from './komponenten/LehrerAustausch.svelte';
  import LehrerEinstellungen from './komponenten/LehrerEinstellungen.svelte';
  import LehrerKlassen from './komponenten/LehrerKlassen.svelte';
  import LehrerTor from './komponenten/LehrerTor.svelte';
  import { app } from '../../app/zustand.svelte';

  /**
   * Lehrerbereich der Schulversion (statt Elternbereich), hinter der Lehrer-PIN.
   * Schließt sich nach 5 Minuten ohne Eingabe von selbst, damit kein Kind einen offen gelassenen Bereich erwischt.
   */
  const AUTO_ZU_MS = 5 * 60_000;

  type Reiter = 'klassen' | 'analyse' | 'auftraege' | 'austausch' | 'einstellungen' | 'hilfe' | 'ueber';
  const REITER: { id: Reiter; name: string }[] = [
    { id: 'klassen', name: 'Klassen' },
    { id: 'analyse', name: 'Auswertung' },
    { id: 'auftraege', name: 'Aufträge' },
    { id: 'austausch', name: 'Daten austauschen' },
    { id: 'einstellungen', name: 'Einstellungen' },
    { id: 'hilfe', name: 'Hilfe' },
    { id: 'ueber', name: 'Über die App' },
  ];
  /** Aus der Auswertung: Auftrag für bestimmte Kinder vorbereiten. */
  let vorlage = $state<AuftragVorlage | null>(null);

  let offen = $state(false);
  let reiter = $state<Reiter>('klassen');
  /** Aus „Klassen → Einzelbericht“: dieses Kind in der Auswertung zeigen. */
  let berichtFuer = $state<string | null>(null);

  let letzteEingabe = Date.now();
  const merken = () => (letzteEingabe = Date.now());
  const uhr = setInterval(() => {
    if (offen && Date.now() - letzteEingabe > AUTO_ZU_MS) verlassen();
  }, 15_000);
  document.addEventListener('pointerdown', merken, true);
  document.addEventListener('keydown', merken, true);
  onDestroy(() => {
    clearInterval(uhr);
    document.removeEventListener('pointerdown', merken, true);
    document.removeEventListener('keydown', merken, true);
    app.lehrerPin = null;
  });

  // Kommt bei offenem Lehrerbereich eine Datei an (AirDrop), gleich zum Austausch wechseln
  $effect(() => {
    if (offen && offeneDateien.liste.length) reiter = 'austausch';
  });

  function geoeffnet(pin: string) {
    app.lehrerPin = pin;
    offen = true;
    letzteEingabe = Date.now();
    // Mit der App geöffnete Dateien gleich übernehmen, sonst bei den Klassen beginnen
    reiter = offeneDateien.liste.length ? 'austausch' : 'klassen';
  }

  function verlassen() {
    app.lehrerPin = null;
    offen = false;
    app.meldung = null;
    app.zeige({ name: 'start' });
  }

  function zeigeBericht(id: string) {
    berichtFuer = id;
    reiter = 'analyse';
  }
</script>

{#if !offen}
  <LehrerTor onoffen={geoeffnet} onabbrechen={verlassen} />
{:else}
  <div class="lehrer">
    <header>
      <button class="rund" onclick={verlassen} aria-label="Lehrerbereich schließen"><Icon name="zurueck" /></button>
      <h1>Lehrerbereich</h1>
      {#if app.bestand.schule?.geraet.name}<span class="geraet">{app.bestand.schule.geraet.name}</span>{/if}
    </header>
    <nav class="reiter" aria-label="Bereiche">
      {#each REITER as r (r.id)}
        <button class:aktiv={reiter === r.id} aria-current={reiter === r.id ? 'page' : undefined} onclick={() => { reiter = r.id; berichtFuer = null; vorlage = null; }}>{r.name}</button>
      {/each}
    </nav>
    <div class="inhalt">
      {#if reiter === 'klassen'}
        <LehrerKlassen onbericht={zeigeBericht} />
      {:else if reiter === 'analyse'}
        {#key berichtFuer}<LehrerAnalyse startKind={berichtFuer} onauftrag={(v) => { vorlage = v; reiter = 'auftraege'; }} />{/key}
      {:else if reiter === 'auftraege'}
        {#key vorlage}<LehrerAuftraege {vorlage} />{/key}
      {:else if reiter === 'austausch'}
        <LehrerAustausch />
      {:else if reiter === 'einstellungen'}
        <LehrerEinstellungen />
      {:else if reiter === 'hilfe'}
        <LehrerHilfe />
      {:else}
        <Ueber />
      {/if}
    </div>
  </div>
{/if}

<style>
  .lehrer {
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
  .geraet {
    margin-left: auto;
    font-weight: 800;
    color: var(--tinte-weich);
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
    align-content: start;
    max-width: 64rem;
    width: 100%;
    margin: 0 auto;
    user-select: text;
    -webkit-user-select: text;
  }
</style>
