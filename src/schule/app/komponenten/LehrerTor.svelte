<script lang="ts">
  import { onDestroy } from 'svelte';
  import { keineSperre, nachFehlversuch, pinFehler, PIN_MAX, PIN_MIN, rettungscodeNormal } from '../../domain/pin';
  import { bereinigeText, MAX_GERAETENAME } from '../../domain/schuldaten';
  import { hashe, neuerRettungscode, pruefeGeheimnis } from '../../dienste/schulkrypto';
  import { app } from '../../../app/zustand.svelte';

  /**
   * Tor zum Lehrerbereich (Schulversion): beim ersten Mal PIN festlegen, sonst PIN eingeben.
   * Vergessene PIN: mit dem Wiederherstellungscode eine neue festlegen. Nach 5 Fehlversuchen wächst die Wartezeit;
   * sie steht im Speicher und gilt auch nach einem Neustart.
   */
  let { onoffen, onabbrechen }: { onoffen: (pin: string) => void; onabbrechen: () => void } = $props();

  const schule = $derived(app.bestand.schule);
  type Modus = 'einrichten' | 'eingeben' | 'rettung' | 'neuePin' | 'code';
  let modus = $state<Modus>(app.bestand.schule?.pin ? 'eingeben' : 'einrichten');

  let pin = $state('');
  let pin2 = $state('');
  let code = $state('');
  let geraetName = $state(app.bestand.schule?.geraet.name ?? '');
  let fehler = $state<string | null>(null);
  let laeuft = $state(false);
  /** Nach dem Festlegen: neuer Wiederherstellungscode zum Notieren, danach geht der Bereich auf. */
  let neuerCode = $state('');
  let notiert = $state(false);
  let fertigPin = '';

  let jetzt = $state(Date.now());
  const uhr = setInterval(() => (jetzt = Date.now()), 1000);
  onDestroy(() => clearInterval(uhr));
  const warten = $derived(Math.max(0, Math.ceil(((schule?.sperre.bis ?? 0) - jetzt) / 1000)));
  const wartenText = $derived(warten >= 120 ? `${Math.ceil(warten / 60)} Minuten` : `${warten} Sekunden`);

  async function festlegen(e: SubmitEvent) {
    e.preventDefault();
    fehler = pinFehler(pin);
    if (!fehler && pin !== pin2) fehler = 'Die beiden PINs stimmen nicht überein.';
    if (fehler) return;
    laeuft = true;
    try {
      const h = await hashe(pin);
      const r = await neuerRettungscode();
      const name = bereinigeText(geraetName, MAX_GERAETENAME);
      app.aendereSchule((s) => ({ ...s, pin: h, rettung: r.geheimnis, sperre: keineSperre(), geraet: modus === 'einrichten' ? { ...s.geraet, name } : s.geraet }));
      await app.speichereSofort();
      fertigPin = pin;
      neuerCode = r.code;
      pin = pin2 = code = '';
      modus = 'code';
    } catch {
      fehler = 'Die PIN ließ sich nicht speichern. Bitte noch einmal versuchen.';
    } finally {
      laeuft = false;
    }
  }

  async function pruefen(e: SubmitEvent) {
    e.preventDefault();
    if (!schule?.pin || warten > 0 || laeuft) return;
    laeuft = true;
    fehler = null;
    try {
      const ok = await pruefeGeheimnis(pin, schule.pin);
      if (ok) {
        app.aendereSchule((s) => ({ ...s, sperre: keineSperre() }));
        onoffen(pin);
      } else {
        app.aendereSchule((s) => ({ ...s, sperre: nachFehlversuch(s.sperre, Date.now()) }));
        jetzt = Date.now();
        fehler = 'Die PIN stimmt nicht.';
        pin = '';
      }
    } finally {
      laeuft = false;
    }
  }

  async function rettungPruefen(e: SubmitEvent) {
    e.preventDefault();
    if (!schule?.rettung || warten > 0 || laeuft) return;
    laeuft = true;
    fehler = null;
    try {
      const ok = await pruefeGeheimnis(rettungscodeNormal(code), schule.rettung);
      if (ok) {
        app.aendereSchule((s) => ({ ...s, sperre: keineSperre() }));
        code = '';
        modus = 'neuePin';
      } else {
        app.aendereSchule((s) => ({ ...s, sperre: nachFehlversuch(s.sperre, Date.now()) }));
        jetzt = Date.now();
        fehler = 'Der Wiederherstellungscode stimmt nicht.';
      }
    } finally {
      laeuft = false;
    }
  }

  function wechsle(m: Modus) {
    modus = m;
    fehler = null;
    pin = pin2 = code = '';
  }
</script>

<div class="huelle">
  <div class="tafel">
    <div class="markise"></div>
    <div class="inhalt">
      {#if modus === 'einrichten' || modus === 'neuePin'}
        <form onsubmit={festlegen}>
          <h2>{modus === 'einrichten' ? 'Lehrerbereich einrichten' : 'Neue PIN festlegen'}</h2>
          {#if modus === 'einrichten'}
            <p>Legen Sie eine Lehrer-PIN fest. Sie schützt den Lehrerbereich und die Dateien, die Sie an andere iPads weitergeben. Am besten nutzen Sie auf allen iPads der Klasse dieselbe PIN.</p>
            <label class="wahl">
              Name dieses iPads (für Kärtchen und Auswertung, z. B. „iPad 7“)
              <input bind:value={geraetName} maxlength={MAX_GERAETENAME} autocomplete="off" placeholder="iPad 7" />
            </label>
          {/if}
          <label class="wahl">
            PIN ({PIN_MIN} bis {PIN_MAX} Ziffern)
            <input type="password" bind:value={pin} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="new-password" />
          </label>
          <label class="wahl">
            PIN wiederholen
            <input type="password" bind:value={pin2} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="new-password" />
          </label>
          {#if fehler}<p class="fehler" role="alert">{fehler}</p>{/if}
          <div class="knoepfe">
            <button type="button" class="ticket hell" onclick={onabbrechen}>Abbrechen</button>
            <button type="submit" class="ticket" disabled={laeuft || !pin || !pin2}>{laeuft ? 'Einen Moment …' : 'PIN festlegen'}</button>
          </div>
        </form>
      {:else if modus === 'code'}
        <h2>Wiederherstellungscode</h2>
        <p>Falls Sie die PIN vergessen, legen Sie mit diesem Code eine neue fest. Bitte notieren Sie ihn und bewahren Sie ihn sicher auf. Er wird nur jetzt angezeigt.</p>
        <p class="code" aria-label="Wiederherstellungscode {neuerCode.split('').join(' ')}">{neuerCode}</p>
        <label class="schalter">
          <input type="checkbox" bind:checked={notiert} />
          Ich habe den Code notiert.
        </label>
        <div class="knoepfe">
          <button class="ticket" disabled={!notiert} onclick={() => onoffen(fertigPin)}>Weiter zum Lehrerbereich</button>
        </div>
      {:else if modus === 'rettung'}
        <form onsubmit={rettungPruefen}>
          <h2>PIN vergessen</h2>
          <p>Geben Sie den Wiederherstellungscode ein, den die App beim Festlegen der PIN angezeigt hat.</p>
          <label class="wahl">
            Wiederherstellungscode
            <input bind:value={code} autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" maxlength="20" />
          </label>
          {#if warten > 0}
            <p class="fehler" role="status">Zu viele Fehlversuche. Bitte {wartenText} warten.</p>
          {:else if fehler}
            <p class="fehler" role="alert">{fehler}</p>
          {/if}
          <p class="hinweis">Ohne Code hilft nur, die App neu zu installieren (über die Geräteverwaltung der Schule). Dabei gehen die Spielstände auf diesem iPad verloren.</p>
          <div class="knoepfe">
            <button type="button" class="ticket hell" onclick={() => wechsle('eingeben')}>Zurück</button>
            <button type="submit" class="ticket" disabled={laeuft || warten > 0 || rettungscodeNormal(code).length < 12}>{laeuft ? 'Einen Moment …' : 'Weiter'}</button>
          </div>
        </form>
      {:else}
        <form onsubmit={pruefen}>
          <h2>Lehrerbereich</h2>
          <label class="wahl">
            Lehrer-PIN
            <input type="password" bind:value={pin} inputmode="numeric" pattern="[0-9]*" maxlength={PIN_MAX} autocomplete="current-password" />
          </label>
          {#if warten > 0}
            <p class="fehler" role="status">Zu viele Fehlversuche. Bitte {wartenText} warten.</p>
          {:else if fehler}
            <p class="fehler" role="alert">{fehler}</p>
          {/if}
          <div class="knoepfe">
            <button type="button" class="ticket hell" onclick={onabbrechen}>Abbrechen</button>
            <button type="submit" class="ticket" disabled={laeuft || warten > 0 || pin.length < PIN_MIN}>{laeuft ? 'Einen Moment …' : 'Öffnen'}</button>
          </div>
          <button type="button" class="link" onclick={() => wechsle('rettung')}>PIN vergessen?</button>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .huelle {
    flex: 1;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: var(--oben) var(--rand-r) var(--unten) var(--rand);
    overflow: auto;
    position: relative;
    z-index: 2;
  }
  .tafel {
    width: min(100%, 30rem);
    box-shadow: 0 6px 0 var(--tinte);
  }
  .inhalt,
  form {
    display: grid;
    gap: 12px;
  }
  .inhalt {
    padding: 16px 20px 20px;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
  }
  input:not([type='checkbox']) {
    font: inherit;
    font-size: 1.3rem;
    font-weight: 800;
    padding: 10px 14px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    color: var(--tinte);
    background: #fff;
    user-select: text;
    -webkit-user-select: text;
  }
  .code {
    font-family: ui-monospace, Menlo, monospace;
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-align: center;
    padding: 12px;
    border: 3px dashed var(--tinte);
    border-radius: 12px;
    background: #fff;
    user-select: text;
    -webkit-user-select: text;
  }
  .schalter {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    font-weight: 800;
  }
  .schalter input {
    width: 24px;
    height: 24px;
    accent-color: var(--markise);
  }
  .fehler {
    color: var(--markise-dunkel);
    font-weight: 800;
  }
  .hinweis {
    color: var(--tinte-weich);
    font-size: 0.95rem;
  }
  .knoepfe {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  .link {
    justify-self: start;
    border: 0;
    background: none;
    font-weight: 800;
    text-decoration: underline;
    padding: 8px 0;
    min-height: 44px;
  }
</style>
