<script lang="ts">
  import { DATENSCHUTZ, IMPRESSUM, STAND, type Abschnitt } from '../rechtliches';

  /** „Über Mathe-Jahrmarkt“ im Elternbereich: Version, Impressum, Datenschutz, Lizenzen. Alles offline. */
  interface Lizenz {
    name: string;
    version: string;
    lizenz: string;
    autor: string;
    text: string;
  }
  let lizenzen = $state<Lizenz[] | null>(null);
  let lizenzFehler = $state(false);
  let offen = $state<'impressum' | 'datenschutz' | 'lizenzen' | null>(null);

  async function ladeLizenzen() {
    if (lizenzen || lizenzFehler) return;
    try {
      // Liegt beim Bauen neben der App (scripts/lizenzen-plugin.ts), keine Internetverbindung
      const r = await fetch('./lizenzen.json');
      lizenzen = r.ok ? ((await r.json()) as Lizenz[]) : [];
    } catch {
      lizenzFehler = true;
    }
  }
  function umschalten(was: 'impressum' | 'datenschutz' | 'lizenzen') {
    offen = offen === was ? null : was;
    if (offen === 'lizenzen') void ladeLizenzen();
  }
</script>

{#snippet abschnitte(liste: Abschnitt[])}
  {#each liste as a (a.titel)}
    <h3>{a.titel}</h3>
    {#each a.absaetze as p, i (i)}<p class="vor">{p}</p>{/each}
    {#if a.liste}<ul>{#each a.liste as l (l)}<li>{l}</li>{/each}</ul>{/if}
  {/each}
{/snippet}

<section>
  <h2>Mathe-Jahrmarkt – Fit für Klasse 5</h2>
  <p>Version {__APP_VERSION__}</p>
  <p>
    Eine Lern-App für den Übergang von der Grundschule zur weiterführenden Schule, ausgerichtet am Kerncurriculum Mathematik für die Grundschule in
    Niedersachsen. Ohne Werbung, ohne Konto, alle Daten bleiben auf diesem Gerät.
  </p>
  <p>Entwickelt von Wisdompeak Apps, Simon Mählmann, Fachseminarleiter für Mathematik.</p>
</section>

<section>
  <button class="ticket hell aufklapp" aria-expanded={offen === 'impressum'} onclick={() => umschalten('impressum')}>Impressum</button>
  {#if offen === 'impressum'}
    <div class="text">
      <p class="stand">Stand: {STAND}</p>
      {@render abschnitte(IMPRESSUM)}
    </div>
  {/if}
  <button class="ticket hell aufklapp" aria-expanded={offen === 'datenschutz'} onclick={() => umschalten('datenschutz')}>Datenschutzerklärung</button>
  {#if offen === 'datenschutz'}
    <div class="text">
      <p class="stand">Stand: {STAND}</p>
      {@render abschnitte(DATENSCHUTZ)}
    </div>
  {/if}
  <button class="ticket hell aufklapp" aria-expanded={offen === 'lizenzen'} onclick={() => umschalten('lizenzen')}>Lizenzen der Open-Source-Bausteine</button>
  {#if offen === 'lizenzen'}
    <div class="text">
      <p>Mathe-Jahrmarkt nutzt diese Bausteine. Wir danken allen, die sie entwickeln.</p>
      {#if lizenzFehler}
        <p>Die Liste konnte nicht geladen werden.</p>
      {:else if !lizenzen}
        <p>Lade …</p>
      {:else if lizenzen.length === 0}
        <p>Die Liste entsteht beim Bauen der App.</p>
      {:else}
        {#each lizenzen as l (l.name)}
          <details>
            <summary><strong>{l.name}</strong> {l.version} · {l.lizenz}{l.autor ? ` · ${l.autor}` : ''}</summary>
            {#if l.text}<pre>{l.text}</pre>{:else}<p>Lizenz: {l.lizenz}</p>{/if}
          </details>
        {/each}
      {/if}
    </div>
  {/if}
</section>

<style>
  .aufklapp {
    display: block;
    width: 100%;
    margin: 8px 0;
    text-align: left;
  }
  .text {
    background: #fff;
    border: 2px solid var(--linie, #e3daca);
    border-radius: 16px;
    padding: 12px 16px;
    margin-bottom: 8px;
  }
  .vor {
    white-space: pre-line;
  }
  .stand {
    color: var(--tinte-weich, #5a628c);
    font-size: 0.9rem;
  }
  h3 {
    font-size: 1.05rem;
    margin: 16px 0 4px;
  }
  details {
    border-top: 1px solid #eee;
    padding: 6px 0;
  }
  summary {
    cursor: pointer;
  }
  pre {
    white-space: pre-wrap;
    font-size: 0.75rem;
    max-height: 16rem;
    overflow: auto;
    background: #f7f5f0;
    padding: 8px;
    border-radius: 8px;
  }
</style>
