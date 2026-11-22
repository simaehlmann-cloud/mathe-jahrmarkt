<script lang="ts">
  import { KOMPETENZEN_SCHULE, klassenbericht, klassenuebersicht, schuelerbericht, zusammenfuehren, type AnalyseKind } from '../../domain/analyse';
  import { KOMPETENZEN } from '../../../domain/kompetenzen/modell';
  import { BUDEN } from '../../../domain/buden';
  import type { AuftragVorlage } from './LehrerAuftraege.svelte';
  import BausteinAnsicht from './BausteinAnsicht.svelte';
  import { app } from '../../../app/zustand.svelte';

  /**
   * Auswertung für die Lehrkraft (Schulversion): Klassenübersicht und Einzelbericht, auf dem Bildschirm und als PDF.
   * Grundlage sind die Kinder dieses iPads und die eingesammelten Ergebnisse anderer iPads.
   */
  let { startKind = null, onauftrag }: { startKind?: string | null; onauftrag: (v: AuftragVorlage) => void } = $props();

  const jetzt = Date.now();
  const schule = $derived(app.bestand.schule);
  const kinder = $derived(zusammenfuehren(app.bestand.profile, schule?.klassen ?? [], schule?.gesammelt ?? [], schule?.geraet.name || 'dieses iPad'));
  const quellen = $derived.by(() => {
    const n = schule?.gesammelt.length ?? 0;
    return n === 0 ? 'Daten von diesem iPad' : `Daten von diesem iPad und ${n === 1 ? '1 weiteren iPad' : `${n} weiteren iPads`}`;
  });

  /** Gruppen nach Klasse (Kennung oder, bei fremden Klassen, Name). */
  const gruppen = $derived.by(() => {
    const karte = new Map<string, { schluessel: string; name: string; kinder: AnalyseKind[] }>();
    for (const k of kinder) {
      const schluessel = k.klasse ?? `name:${k.klassenName}`;
      const g = karte.get(schluessel) ?? { schluessel, name: k.klassenName || 'Ohne Klasse', kinder: [] };
      g.kinder.push(k);
      karte.set(schluessel, g);
    }
    const reihenfolge = (schule?.klassen ?? []).map((k) => k.id);
    return [...karte.values()].sort((a, b) => {
      const ia = reihenfolge.indexOf(a.schluessel);
      const ib = reihenfolge.indexOf(b.schluessel);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.name.localeCompare(b.name, 'de');
    });
  });

  // Aus „Klassen → Einzelbericht“: gleich die Klasse und das Kind zeigen
  const start = (() => {
    const p = startKind ? app.bestand.profile.find((q) => q.id === startKind) : undefined;
    return { kind: p?.id ?? '', klasse: p ? (p.klasse ?? 'name:') : '' };
  })();
  let ansicht = $state<'klasse' | 'kind'>(start.kind ? 'kind' : 'klasse');
  let klasse = $state<string>(start.klasse);
  const gruppe = $derived(gruppen.find((g) => g.schluessel === klasse) ?? gruppen[0]);
  let kindId = $state<string>(start.kind);
  const kind = $derived(gruppe?.kinder.find((k) => k.id === kindId) ?? gruppe?.kinder[0]);

  const uebersicht = $derived(gruppe ? klassenuebersicht(gruppe.kinder, jetzt) : null);
  const klassenBausteine = $derived(gruppe && uebersicht ? klassenbericht(gruppe.name, uebersicht, jetzt, quellen) : []);
  const kindBausteine = $derived(kind ? schuelerbericht(kind, jetzt) : []);

  /** „Üben lohnt sich“ mit Knopf: Auftrag für genau diese Kinder (nur für Klassen dieses iPads). */
  const uebenListe = $derived.by(() => {
    if (!uebersicht || !gruppe || !(schule?.klassen ?? []).some((k) => k.id === gruppe.schluessel)) return [];
    return KOMPETENZEN_SCHULE.map((k) => ({
      kompetenz: k,
      kinder: uebersicht.zeilen.filter((z) => z.kompetenzen[k] === 'weiterUeben').map((z) => z.kind),
      bude: BUDEN.find((b) => b.spielbar && b.gasse !== 'abendmarkt' && b.kompetenzen.some((x) => x.kompetenz === k))?.id ?? null,
    })).filter((x) => x.kinder.length > 0);
  });

  let pdfLaeuft = $state(false);
  async function alsPdf() {
    pdfLaeuft = true;
    try {
      const { berichtPdf, pdfWeitergeben } = await import('../../../services/pdf');
      const sauber = (s: string) => s.replace(/[^\p{L}\p{N} _-]/gu, '').trim();
      if (ansicht === 'klasse' && gruppe) {
        const bytes = await berichtPdf(klassenBausteine, { quer: true, titel: `Mathe-Jahrmarkt – Klasse ${gruppe.name}` });
        await pdfWeitergeben(bytes, `Klassenuebersicht ${sauber(gruppe.name)}.pdf`, 'Klassenübersicht');
      } else if (kind) {
        const bytes = await berichtPdf(kindBausteine, { titel: `Mathe-Jahrmarkt – ${kind.name}` });
        await pdfWeitergeben(bytes, `Bericht ${sauber(kind.name)}.pdf`, 'Einzelbericht');
      }
    } catch {
      app.melde('Das PDF ließ sich gerade nicht erstellen.');
    } finally {
      pdfLaeuft = false;
    }
  }
</script>

<section>
  {#if kinder.length === 0}
    <p>Noch keine Kinder. Legen Sie unter „Klassen“ eine Klasse an oder sammeln Sie unter „Daten austauschen“ Ergebnisse ein.</p>
  {:else}
    <div class="umschalter" role="group" aria-label="Ansicht">
      <button class:aktiv={ansicht === 'klasse'} aria-pressed={ansicht === 'klasse'} onclick={() => (ansicht = 'klasse')}>Klassenübersicht</button>
      <button class:aktiv={ansicht === 'kind'} aria-pressed={ansicht === 'kind'} onclick={() => (ansicht = 'kind')}>Einzelbericht</button>
    </div>

    <div class="wahl-zeile">
      {#if gruppen.length > 1}
        <label class="wahl">
          Klasse
          <select bind:value={klasse}>
            {#each gruppen as g (g.schluessel)}<option value={g.schluessel}>{g.name} ({g.kinder.length})</option>{/each}
          </select>
        </label>
      {/if}
      {#if ansicht === 'kind' && gruppe}
        <label class="wahl">
          Kind
          <select bind:value={kindId}>
            {#each gruppe.kinder as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
          </select>
        </label>
      {/if}
      <button class="ticket" disabled={pdfLaeuft} onclick={alsPdf}>{pdfLaeuft ? 'Wird erstellt …' : 'Als PDF'}</button>
    </div>
    <p class="hinweis">{quellen}. Ergebnisse anderer iPads sammeln Sie unter „Daten austauschen“ ein.</p>

    {#if ansicht === 'klasse'}
      {#if uebenListe.length && gruppe}
        {@const g = gruppe}
        <div class="ueben">
          <h3>Gezielt üben lassen</h3>
          <ul>
            {#each uebenListe as u (u.kompetenz)}
              <li>
                <span><strong>{KOMPETENZEN[u.kompetenz].name}:</strong> {u.kinder.map((k) => k.name).join(', ')}</span>
                <button class="ticket hell klein" onclick={() => onauftrag({ klasse: g.schluessel, kinder: u.kinder.map((k) => k.id), bude: u.bude })}>Auftrag geben</button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <BausteinAnsicht bausteine={klassenBausteine} />
    {:else if kind}
      <BausteinAnsicht bausteine={kindBausteine} />
    {/if}
  {/if}
</section>

<style>
  section {
    display: grid;
    gap: 12px;
    min-width: 0;
  }
  .umschalter {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .umschalter button {
    border: 3px solid var(--tinte);
    border-radius: 999px;
    background: #fff;
    font-weight: 900;
    padding: 6px 14px;
    min-height: 44px;
  }
  .umschalter button.aktiv {
    background: var(--senf);
  }
  .wahl-zeile {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: end;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
    min-width: 12rem;
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
  .ticket {
    font-size: 1rem;
    min-height: 46px;
    padding: 0.5em 1.2em;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.95rem;
  }
  .ueben {
    padding: 10px 14px;
    border: 2px solid #8fb8f5;
    border-radius: 12px;
    background: #f1f6ff;
  }
  .ueben h3 {
    font-size: 1.05rem;
    margin-bottom: 6px;
  }
  .ueben ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .ueben li {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    align-items: center;
    justify-content: space-between;
  }
  .ticket.klein {
    min-height: 40px;
    font-size: 0.9rem;
    padding: 0.3em 1em;
  }
</style>
