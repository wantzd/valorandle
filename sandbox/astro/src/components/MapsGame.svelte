<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    MAPS_I18N, MAPS_HINTS, MAPS_DB, MAPS_CALLOUTS,
    loadMapsFromAPI, getCalloutImgPath,
    getDailyMapTarget, getFreeMapTarget, compareMapGuess,
  } from '../lib/maps-data.js';
  import {
    getDailyDateKey, msUntilNextDaily, formatCountdown,
    loadLang, saveLang,
  } from '../lib/game-utils.js';

  const MAX_GUESSES = 6;
  const MAX_HINTS   = 4;
  const DAILY_KEY   = () => `valorandle_maps_daily_${getDailyDateKey()}`;

  // ── Lang ─────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(MAPS_I18N[lang] || MAPS_I18N['pt-BR']);

  // ── Boot ─────────────────────────────────────────────────────────────────────
  let loaded      = $state(false);
  let apiError    = $state(false);
  let offlineWarn = $state(false);

  // ── Mode ─────────────────────────────────────────────────────────────────────
  let mode         = $state(null);   // 'daily' | 'free' | null
  let showPicker   = $state(false);
  let showTutorial = $state(false);

  // ── Game state ───────────────────────────────────────────────────────────────
  let target    = $state(null);
  let guesses   = $state([]);
  let hintsUsed = $state(0);
  let finished  = $state(false);
  let won       = $state(false);

  // ── UI ───────────────────────────────────────────────────────────────────────
  let view              = $state('screenshot');  // 'screenshot' | 'map'
  let selectedMapId     = $state('');
  let selectedCallout   = $state(null);   // { id, name }

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  let mounted    = $state(false);  // true after first render → enables transitions
  let revealed   = $state(false);  // true when game is won → scale 1
  let wrongCount = $derived(
    guesses.filter(g => !g.feedback.every(f => f.status === 'correct')).length
  );
  let mapScale = $derived(
    revealed    ? 1 :
    wrongCount >= 4 ? 2.0 :
    wrongCount >= 2 ? 3.5 : 5.5
  );

  // ── Minimap canvas ───────────────────────────────────────────────────────────
  let canvasEl         = $state(null);
  let minimapWrapperEl = $state(null);
  let canvasReady      = $state(false);
  let canvasOffset     = $state(null); // { ox, oy, rw, rh, cw, ch }

  // ── Screenshot ───────────────────────────────────────────────────────────────
  let screenshotSrc   = $state(null);
  let screenshotReady = $state(false);

  // ── Countdown ────────────────────────────────────────────────────────────────
  let countdown  = $state('');
  let cdInterval = null;

  // ── Toast ────────────────────────────────────────────────────────────────────
  let toastVisible = $state(false);
  let toastTimer   = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Mount
  // ─────────────────────────────────────────────────────────────────────────────
  onMount(async () => {
    lang = loadLang();

    const P      = new URLSearchParams(location.search);
    const mParam = P.get('mode');
    mode = mParam === 'free' ? 'free' : mParam === 'daily' ? 'daily' : null;

    const ok = await loadMapsFromAPI();
    if (!ok) offlineWarn = true;

    if (!Object.keys(MAPS_DB).length) {
      apiError = true;
      loaded   = true;
      return;
    }

    loaded = true;

    if (!mode) {
      showPicker = true;
      return;
    }

    if (!localStorage.getItem('valorandle_maps_tutorial_seen')) {
      showTutorial = true;
    } else {
      startGame();
    }
  });

  onDestroy(() => {
    if (cdInterval)  clearInterval(cdInterval);
    if (toastTimer)  clearTimeout(toastTimer);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Lang
  // ─────────────────────────────────────────────────────────────────────────────
  function setLang(l) {
    lang = l;
    saveLang(l);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode picker
  // ─────────────────────────────────────────────────────────────────────────────
  function pickMode(m) {
    mode = m;
    showPicker = false;
    const url = new URL(location.href);
    url.searchParams.set('mode', m);
    history.replaceState(null, '', url);

    if (!localStorage.getItem('valorandle_maps_tutorial_seen')) {
      showTutorial = true;
    } else {
      startGame();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tutorial
  // ─────────────────────────────────────────────────────────────────────────────
  function dismissTutorial() {
    localStorage.setItem('valorandle_maps_tutorial_seen', '1');
    showTutorial = false;
    startGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Game init
  // ─────────────────────────────────────────────────────────────────────────────
  function startGame() {
    guesses         = [];
    hintsUsed       = 0;
    finished        = false;
    won             = false;
    revealed        = false;
    view            = 'screenshot';
    selectedMapId   = '';
    selectedCallout = null;
    screenshotSrc   = null;
    screenshotReady = false;
    canvasReady     = false;
    mounted         = false;

    target = mode === 'daily' ? getDailyMapTarget() : getFreeMapTarget();
    if (!target) { apiError = true; return; }

    if (mode === 'daily') {
      const saved = loadDailyState();
      if (saved) {
        guesses   = saved.guesses   || [];
        hintsUsed = saved.hintsUsed || 0;
        finished  = saved.finished  || false;
        won       = saved.won       || false;
        if (won) revealed = true;
      }
    }

    // Derive screenshot path
    const path = getCalloutImgPath(target.mapId, target.calloutId);
    if (path) screenshotSrc = path;

    if (finished && mode === 'daily') startCountdown();

    // Enable transitions after first render tick
    tick().then(() => { mounted = true; });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas minimap
  // ─────────────────────────────────────────────────────────────────────────────
  $effect(() => {
    if (!selectedMapId || !canvasEl || !minimapWrapperEl) return;
    const map = MAPS_DB[selectedMapId];

    canvasReady  = false;
    canvasOffset = null;
    if (!map?.displayIcon) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;

      // Rotate canvas content via 2D context (matches callout-editor coordinate space)
      const rot     = map.rotation ?? 270;
      const swapped = rot === 90 || rot === 270;
      const cw_c    = swapped ? img.naturalHeight : img.naturalWidth;
      const ch_c    = swapped ? img.naturalWidth  : img.naturalHeight;

      canvasEl.width  = cw_c;
      canvasEl.height = ch_c;
      const ctx = canvasEl.getContext('2d');
      ctx.save();
      ctx.translate(cw_c / 2, ch_c / 2);
      ctx.rotate(rot * Math.PI / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // Letterbox-fit rotated canvas into the wrapper
      const fw    = minimapWrapperEl.clientWidth  || 400;
      const fh    = minimapWrapperEl.clientHeight || 400;
      const scale = Math.min(fw / cw_c, fh / ch_c);
      const rw    = cw_c * scale;
      const rh    = ch_c * scale;
      const ox    = (fw - rw) / 2;
      const oy    = (fh - rh) / 2;

      canvasOffset = { ox, oy, rw, rh, cw: fw, ch: fh };
      canvasReady  = true;
    };
    img.onerror = () => { if (!cancelled) canvasReady = false; };
    img.src = map.displayIcon;
    return () => { cancelled = true; };
  });

  let callouts = $derived(
    selectedMapId ? (MAPS_CALLOUTS[selectedMapId] || []) : []
  );

  function calloutLabel(c) {
    return c.names?.[lang] || c.names?.['en'] || c.id;
  }

  function btnStyle(c) {
    if (!canvasOffset) return `left:${c.x}%;top:${c.y}%`;
    const { ox, oy, rw, rh, cw, ch } = canvasOffset;
    const px = ox + (c.x / 100) * rw;
    const py = oy + (c.y / 100) * rh;
    return `left:${(px / cw * 100).toFixed(3)}%;top:${(py / ch * 100).toFixed(3)}%`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Guess submission
  // ─────────────────────────────────────────────────────────────────────────────
  function submitGuess() {
    if (!selectedMapId || !selectedCallout || finished) return;

    const fb  = compareMapGuess(selectedMapId, selectedCallout.id, target, lang);
    guesses   = [...guesses, { mapId: selectedMapId, calloutId: selectedCallout.id, feedback: fb }];
    won       = fb.every(f => f.status === 'correct');
    finished  = won || guesses.length >= MAX_GUESSES;

    if (won) revealed = true;
    if (mode === 'daily') saveDailyState({ guesses, hintsUsed, finished, won });
    if (finished && mode === 'daily') startCountdown();

    selectedMapId   = '';
    selectedCallout = null;
    view            = 'screenshot';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Hints
  // ─────────────────────────────────────────────────────────────────────────────
  let hintsAvailable = $derived(MAPS_HINTS[target?.mapId] || []);
  let revealedHints  = $derived(hintsAvailable.slice(0, hintsUsed));
  let canHint = $derived(
    !finished && hintsUsed < hintsAvailable.length && hintsUsed < MAX_HINTS
  );

  function revealHint() {
    if (!canHint) return;
    hintsUsed++;
    if (mode === 'daily') saveDailyState({ guesses, hintsUsed, finished, won });
  }

  function hintText(h) {
    return lang === 'en' ? h.en : h.pt;
  }

  function hintCountLabel() {
    const left = Math.min(MAX_HINTS, hintsAvailable.length) - hintsUsed;
    if (left <= 0) return t.noHints;
    return `${t.hintBtn} · ${t.hintLeft(left)}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  function loadDailyState() {
    try {
      const raw = localStorage.getItem(DAILY_KEY());
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveDailyState(s) {
    try { localStorage.setItem(DAILY_KEY(), JSON.stringify(s)); } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Countdown
  // ─────────────────────────────────────────────────────────────────────────────
  function startCountdown() {
    if (cdInterval) return;
    countdown  = formatCountdown(msUntilNextDaily());
    cdInterval = setInterval(() => {
      countdown = formatCountdown(msUntilNextDaily());
    }, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Share
  // ─────────────────────────────────────────────────────────────────────────────
  function share() {
    const rows  = guesses.map(g =>
      g.feedback.map(f => f.status === 'correct' ? '🟩' : '🟥').join('')
    ).join('\n');
    const text  = won
      ? `${t.shareHeader}\n${t.shareWin(guesses.length)}\n\n${rows}`
      : `${t.shareHeader}\n${t.shareLose}\n\n${rows}`;
    navigator.clipboard.writeText(text + '\n\nhttps://valorandle.com/maps').then(showToast);
  }

  function showToast() {
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastVisible = false; }, 2000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Free mode new round
  // ─────────────────────────────────────────────────────────────────────────────
  function newFreeRound() {
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    startGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function areaLabel(area) { return t.areas[area] || area; }

  let mapList = $derived(
    Object.entries(MAPS_DB).map(([id, m]) => ({ id, name: m.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  let attemptsLabel = $derived(
    target ? t.attempts(guesses.length, MAX_GUESSES) : ''
  );

</script>

<!-- ── Mode picker overlay ──────────────────────────────────────────────────── -->
{#if showPicker}
<div class="overlay-full">
  <div class="mpo-card">
    <div class="mpo-eyebrow">{lang === 'pt-BR' ? 'Valorandle' : 'Valorandle'}</div>
    <div class="mpo-title">
      <span class="mpo-wordmark">VALOR<span>ANDLE</span></span>
      <span class="mpo-mode-tag">{t.modeTag}</span>
    </div>
    <div class="mpo-sub">{t.modePicker}</div>
    <div class="mpo-options">
      <button class="mpo-option" onclick={() => pickMode('daily')}>
        <svg class="mpo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
        <div class="mpo-label">
          <span class="mpo-name">Daily</span>
          <span class="mpo-desc">{t.modeDailyDesc}</span>
        </div>
        <span class="mpo-arrow">→</span>
      </button>
      <button class="mpo-option" onclick={() => pickMode('free')}>
        <svg class="mpo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        <div class="mpo-label">
          <span class="mpo-name">{lang === 'pt-BR' ? 'Livre' : 'Free'}</span>
          <span class="mpo-desc">{t.modeFreeDesc}</span>
        </div>
        <span class="mpo-arrow">→</span>
      </button>
    </div>
  </div>
</div>
{/if}

<!-- ── Tutorial overlay ─────────────────────────────────────────────────────── -->
{#if showTutorial}
<div class="overlay-full">
  <div class="tut-card">
    <div class="tut-eyebrow">{t.modeTag}</div>
    <div class="tut-title">
      {#if lang === 'pt-BR'}Como <span>Jogar</span>{:else}How to <span>Play</span>{/if}
    </div>
    <div class="tut-steps">
      {#each t.tutSteps as step, i}
        <div class="tut-step">
          <div class="tut-num">{i + 1}</div>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <div class="tut-text">{@html step}</div>
        </div>
      {/each}
    </div>
    <button class="tut-btn" onclick={dismissTutorial}>{t.tutDismiss}</button>
  </div>
</div>
{/if}

<!-- ── Loading ──────────────────────────────────────────────────────────────── -->
{#if !loaded && !showPicker && !showTutorial}
<div class="loading-screen">
  <div class="lo-logo">VALOR<span>ANDLE</span></div>
  <div class="lo-spinner"></div>
</div>
{/if}

<!-- ── Main game ────────────────────────────────────────────────────────────── -->
{#if loaded && !showPicker && !showTutorial}
<div class="page">

  <!-- Header -->
  <header class="game-header">
    <div class="header-left">
      <a href="/" class="back-btn">{t.back}</a>
      <span class="mode-tag">{t.modeTag}{mode === 'free' ? ' · Free' : ''}</span>
    </div>
    <div class="header-center">
      <span class="wordmark">VALOR<span>ANDLE</span></span>
    </div>
    <div class="header-right">
      <button class="lang-btn" class:active={lang==='pt-BR'} onclick={() => setLang('pt-BR')}>🇧🇷 PT</button>
      <button class="lang-btn" class:active={lang==='en'}    onclick={() => setLang('en')}>EN</button>
    </div>
  </header>

  {#if apiError}
    <div class="api-error">{t.apiError}</div>
  {:else}

  <!-- Offline banner -->
  {#if offlineWarn}
    <div class="offline-banner">{t.offlineWarn}</div>
  {/if}

  <!-- Screenshot zone -->
  <div class="screenshot-zone">
    <!-- ss-wrapper: position:relative anchor for the map overlay -->
    <div class="ss-wrapper">
      <div class="screenshot-frame">
        <div
          class="screenshot-inner"
          style:transform="scale({mapScale})"
          style:filter={view === 'map' ? 'blur(5px) brightness(0.35)' : 'none'}
          style:transition={mounted ? 'transform 0.9s ease, filter 0.2s ease' : 'none'}
        >
          {#if screenshotSrc}
            <img
              src={screenshotSrc}
              alt="map location"
              class="screenshot-img"
              class:ready={screenshotReady}
              onload={() => { screenshotReady = true; }}
            />
            {#if !screenshotReady}
              <div class="screenshot-ph"><span>{t.imgPlaceholder}</span></div>
            {/if}
          {:else}
            <div class="screenshot-ph"><span>{t.imgPlaceholder}</span></div>
          {/if}
        </div>
      </div>

      <!-- Map overlay — absolutely positioned over the screenshot frame -->
      {#if view === 'map' && !finished}
        <div class="map-overlay" bind:this={minimapWrapperEl}>
          <canvas
            bind:this={canvasEl}
            class="minimap-canvas"
            class:ready={canvasReady}
            style:left="{canvasOffset?.ox ?? 0}px"
            style:top="{canvasOffset?.oy ?? 0}px"
            style:width="{canvasOffset?.rw ?? 0}px"
            style:height="{canvasOffset?.rh ?? 0}px"
          ></canvas>
          {#if !selectedMapId}
            <div class="minimap-ph">{t.selectMapHint}</div>
          {:else if !canvasReady}
            <div class="minimap-ph">{t.mapPlaceholder}</div>
          {/if}
          {#if canvasOffset}
            {#each callouts as c (c.id)}
              <button
                class="callout-btn"
                class:selected={selectedCallout?.id === c.id}
                style={btnStyle(c)}
                onclick={() => { selectedCallout = { id: c.id, name: calloutLabel(c) }; }}
                title={calloutLabel(c)}
              >{calloutLabel(c)}</button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <!-- Map controls: single toggle + map chips + confirm -->
    {#if !finished}
      <div class="map-controls">
        <button
          class="toggle-map-btn"
          class:active={view === 'map'}
          onclick={() => { view = view === 'map' ? 'screenshot' : 'map'; }}
        >{view === 'map' ? t.hideMap : t.showMap}</button>

        <div class="map-chips">
          {#each mapList as m}
            <button
              class="map-chip"
              class:active={selectedMapId === m.id}
              onclick={() => { selectedMapId = m.id; selectedCallout = null; view = 'map'; }}
            >{m.name}</button>
          {/each}
        </div>

        {#if selectedCallout}
          <div class="confirm-row">
            <span class="confirm-label">{selectedCallout.name}</span>
            <button class="confirm-btn" onclick={submitGuess}>{t.confirmGuess}</button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Attempts + Hint -->
  {#if !finished}
    <div class="guess-meta">
      <span class="attempts-label">{attemptsLabel}</span>
      <button class="hint-btn" disabled={!canHint} onclick={revealHint}>
        {hintCountLabel()}
      </button>
    </div>
  {/if}

  <!-- Hint chips -->
  {#if revealedHints.length > 0}
    <div class="hints-row">
      {#each revealedHints as h}
        <span class="hint-chip">{hintText(h)}</span>
      {/each}
    </div>
  {/if}

  <!-- Feedback grid -->
  {#if guesses.length > 0}
    <div class="feedback-grid">
      <div class="fb-headers">
        <span>{t.headers.map}</span>
        <span>{t.headers.callout}</span>
        <span>{t.headers.area}</span>
      </div>
      {#each guesses as g}
        <div class="fb-row">
          {#each g.feedback as cell}
            <div
              class="fb-cell"
              class:correct={cell.status === 'correct'}
              class:wrong={cell.status === 'wrong'}
              title={cell.attr === 'area' ? areaLabel(cell.value) : cell.value}
            >
              {cell.attr === 'area' ? areaLabel(cell.value) : cell.value}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Result panel -->
  {#if finished}
    <div class="result-panel">
      <div class="result-status" class:won class:lost={!won}>
        {won ? t.win : t.lose(MAPS_DB[target.mapId]?.name || target.mapId, '')}
      </div>
      <div class="result-sub">
        {won ? t.winSub(guesses.length) : t.loseSub}
      </div>

      {#if mode === 'daily'}
        <div class="result-countdown">
          <span class="cd-label">{t.nextDaily}</span>
          <span class="cd-timer">{countdown}</span>
        </div>
        <div class="result-actions">
          <button class="result-btn primary" onclick={share}>{t.shareBtn}</button>
          <a class="result-btn ghost" href="/maps">{t.playFree}</a>
        </div>
      {:else}
        <div class="result-actions">
          <button class="result-btn primary" onclick={newFreeRound}>{t.newRound}</button>
          <button class="result-btn ghost" onclick={share}>{t.shareBtn}</button>
        </div>
      {/if}
    </div>
  {/if}

  {/if} <!-- end apiError -->
</div>
{/if}

<!-- ── Toast ─────────────────────────────────────────────────────────────────── -->
{#if toastVisible}
  <div class="toast">{t.copiedToast}</div>
{/if}

<style>
  /* ── CSS tokens ─────────────────────────────────────────────────────────── */
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620;
    --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32);
    --text:#eeeef5; --text-dim:#50536a; --text-mid:#8a8da8;
    --green:#34d47e; --green-bg:rgba(52,212,126,0.10); --green-bd:rgba(52,212,126,0.45);
    --font-display:'Russo One',sans-serif; --font-ui:'Space Grotesk',sans-serif;
    --font-mono:'Space Mono',monospace;
  }
  :global(*, *::before, *::after) { box-sizing:border-box; margin:0; padding:0; }
  :global(html,body) { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-ui); }
  :global(body::before) {
    content:''; position:fixed; inset:0; z-index:0;
    background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px);
    background-size:28px 28px; pointer-events:none; opacity:.5;
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .page {
    position:relative; z-index:1;
    max-width:1100px; margin:0 auto;
    padding:0 1rem 5rem; min-height:100vh;
    display:flex; flex-direction:column; gap:1.2rem;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .game-header {
    display:grid; grid-template-columns:1fr auto 1fr;
    align-items:center; padding:0.85rem 0;
    border-bottom:1px solid var(--border); margin-bottom:0.4rem;
  }
  .header-left  { display:flex; align-items:center; gap:0.6rem; }
  .header-right { display:flex; align-items:center; gap:0.5rem; justify-content:flex-end; }
  .back-btn {
    font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);
    text-decoration:none; letter-spacing:0.06em;
    transition:color 0.15s;
  }
  .back-btn:hover { color:var(--text); }
  .mode-tag {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.18em;
    text-transform:uppercase; color:var(--red); border:1px solid var(--red-bd);
    padding:0.18rem 0.5rem; border-radius:3px;
  }
  .wordmark { font-family:var(--font-display); font-size:1.1rem; text-transform:uppercase; color:var(--text); }
  .wordmark span { color:var(--red); }
  .lang-btn {
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.06em;
    background:none; border:1px solid var(--border2); color:var(--text-dim);
    padding:0.22rem 0.5rem; border-radius:4px; cursor:pointer; transition:all 0.15s;
  }
  .lang-btn.active { color:var(--text); border-color:var(--border2); background:var(--surface2); }
  .lang-btn:hover  { color:var(--text); }

  /* ── Screenshot zone ─────────────────────────────────────────────────────── */
  .screenshot-zone { display:flex; flex-direction:column; gap:0.75rem; }
  .ss-wrapper { position:relative; width:100%; }
  .screenshot-frame {
    width:100%; aspect-ratio:16/9;
    background:var(--surface); border:1px solid var(--border);
    border-radius:8px; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
  }
  /* Map overlay — sits on top of the blurred screenshot */
  .map-overlay {
    position:absolute; inset:0; z-index:5;
    border-radius:8px; overflow:hidden;
  }
  .screenshot-inner {
    width:100%; height:100%;
    display:flex; align-items:center; justify-content:center;
    transform-origin:center center;
    will-change:transform;
  }
  .screenshot-img {
    width:100%; height:100%; object-fit:cover;
    opacity:0; transition:opacity 0.3s;
  }
  .screenshot-img.ready { opacity:1; }
  .screenshot-ph {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim);
    letter-spacing:0.08em;
  }
  /* ── Map controls (toggle + chips + confirm) ─────────────────────────────── */
  .map-controls { display:flex; flex-direction:column; gap:0.6rem; }
  .toggle-map-btn {
    font-family:var(--font-mono); font-size:0.72rem; letter-spacing:0.1em;
    background:var(--surface); border:1px solid var(--border2);
    color:var(--text-dim); padding:0.45rem 1.2rem; border-radius:5px;
    cursor:pointer; transition:all 0.15s; align-self:center;
  }
  .toggle-map-btn.active { color:var(--text); border-color:var(--red-bd); background:var(--red-dim); }
  .toggle-map-btn:hover  { color:var(--text); border-color:var(--border2); }
  .map-chips {
    display:flex; flex-wrap:wrap; gap:0.4rem; justify-content:center;
  }
  .map-chip {
    font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.1em;
    text-transform:uppercase;
    background:var(--surface); border:1px solid var(--border2);
    color:var(--text-dim); padding:0.32rem 0.7rem; border-radius:4px;
    cursor:pointer; transition:all 0.12s;
  }
  .map-chip:hover  { color:var(--text); border-color:var(--red-bd); }
  .map-chip.active { color:var(--red); border-color:var(--red-bd); background:var(--red-dim); }

  /* ── Minimap (inside overlay) ────────────────────────────────────────────── */
  .minimap-canvas {
    position:absolute;
    opacity:0; transition:opacity 0.3s;
  }
  .minimap-canvas.ready { opacity:1; }
  .minimap-ph {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim);
    text-align:center; padding:1rem;
  }
  .callout-btn {
    position:absolute;
    transform:translate(-50%, -50%);
    background:rgba(8,9,13,0.78); border:1px solid var(--border2);
    color:var(--text-mid); font-family:var(--font-mono); font-size:0.58rem;
    letter-spacing:0.04em; padding:0.22rem 0.4rem; border-radius:3px;
    cursor:pointer; white-space:nowrap;
    transition:all 0.12s; z-index:2;
  }
  .callout-btn:hover   { background:var(--surface2); color:var(--text); border-color:var(--red-bd); }
  .callout-btn.selected { background:var(--red); color:#fff; border-color:var(--red); }

  /* ── Confirm row ─────────────────────────────────────────────────────────── */
  .confirm-row {
    display:flex; align-items:center; justify-content:space-between;
    gap:0.75rem; background:var(--surface); border:1px solid var(--border2);
    border-radius:6px; padding:0.55rem 0.85rem;
  }
  .confirm-label { font-size:0.82rem; color:var(--text-mid); font-family:var(--font-mono); }
  .confirm-btn {
    background:var(--red); color:#fff; border:none;
    font-family:var(--font-mono); font-size:0.72rem; letter-spacing:0.1em;
    font-weight:700; padding:0.4rem 1rem; border-radius:5px;
    cursor:pointer; transition:opacity 0.15s;
  }
  .confirm-btn:hover { opacity:0.88; }

  /* ── Guess meta ──────────────────────────────────────────────────────────── */
  .guess-meta {
    display:flex; align-items:center; justify-content:space-between;
    gap:0.75rem;
  }
  .attempts-label {
    font-family:var(--font-mono); font-size:0.72rem;
    color:var(--text-dim); letter-spacing:0.06em;
  }
  .hint-btn {
    font-family:var(--font-mono); font-size:0.72rem; letter-spacing:0.06em;
    background:var(--surface); border:1px solid var(--border2);
    color:var(--text-mid); padding:0.35rem 0.8rem; border-radius:5px;
    cursor:pointer; transition:all 0.15s;
  }
  .hint-btn:hover:not(:disabled) { border-color:var(--red-bd); color:var(--text); }
  .hint-btn:disabled { opacity:0.4; cursor:default; }

  /* ── Hint chips ──────────────────────────────────────────────────────────── */
  .hints-row { display:flex; flex-wrap:wrap; gap:0.5rem; }
  .hint-chip {
    font-family:var(--font-mono); font-size:0.68rem; letter-spacing:0.04em;
    color:var(--text-mid); background:var(--surface);
    border:1px solid var(--border2); border-radius:4px;
    padding:0.28rem 0.65rem;
  }

  /* ── Feedback grid ───────────────────────────────────────────────────────── */
  .feedback-grid { display:flex; flex-direction:column; gap:0.4rem; }
  .fb-headers {
    display:grid; grid-template-columns:repeat(3,1fr); gap:0.4rem;
    text-align:center;
  }
  .fb-headers span {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.14em;
    text-transform:uppercase; color:var(--text-dim);
  }
  .fb-row { display:grid; grid-template-columns:repeat(3,1fr); gap:0.4rem; }
  .fb-cell {
    padding:0.5rem 0.4rem; border-radius:5px; text-align:center;
    font-family:var(--font-ui); font-size:0.78rem; font-weight:600;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    border:1px solid transparent;
  }
  .fb-cell.correct { background:var(--green-bg); border-color:var(--green-bd); color:var(--green); }
  .fb-cell.wrong   { background:rgba(255,70,85,0.08); border-color:rgba(255,70,85,0.25); color:#FF6670; }

  /* ── Result panel ────────────────────────────────────────────────────────── */
  .result-panel {
    display:flex; flex-direction:column; align-items:center; gap:1rem;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:10px; padding:1.6rem 1.2rem; text-align:center;
  }
  .result-status {
    font-family:var(--font-display); font-size:1.3rem; text-transform:uppercase;
  }
  .result-status.won  { color:var(--green); }
  .result-status.lost { color:var(--red); }
  .result-sub { font-size:0.8rem; color:var(--text-mid); }
  .result-countdown { display:flex; flex-direction:column; align-items:center; gap:0.2rem; }
  .cd-label { font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-dim); }
  .cd-timer { font-family:var(--font-mono); font-size:1.4rem; color:var(--text); letter-spacing:0.08em; }
  .result-actions { display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center; }
  .result-btn {
    font-family:var(--font-mono); font-size:0.78rem; letter-spacing:0.1em; font-weight:700;
    padding:0.55rem 1.2rem; border-radius:6px; cursor:pointer; border:none;
    text-decoration:none; transition:opacity 0.15s;
  }
  .result-btn.primary { background:var(--red); color:#fff; }
  .result-btn.ghost   { background:transparent; color:var(--text-mid); border:1px solid var(--border2); }
  .result-btn:hover { opacity:0.85; }

  /* ── Mode picker overlay ─────────────────────────────────────────────────── */
  .overlay-full {
    position:fixed; inset:0; z-index:160;
    background:rgba(8,9,13,0.94); backdrop-filter:blur(4px);
    display:flex; align-items:center; justify-content:center; padding:1.5rem;
  }
  .mpo-card {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:12px; padding:2.2rem 2rem;
    display:flex; flex-direction:column; align-items:center; gap:1.4rem;
    width:100%; max-width:420px;
  }
  .mpo-eyebrow {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.22em;
    text-transform:uppercase; color:var(--text-dim);
  }
  .mpo-title {
    font-family:var(--font-display); font-size:1.6rem; text-transform:uppercase;
    color:var(--text); display:flex; align-items:center; gap:0.6rem;
  }
  .mpo-wordmark { color:var(--text); }
  .mpo-wordmark span { color:var(--red); }
  .mpo-mode-tag {
    font-size:0.65rem; font-family:var(--font-mono); letter-spacing:0.14em;
    text-transform:uppercase; color:var(--red);
    border:1px solid var(--red-bd); padding:0.2rem 0.5rem; border-radius:3px;
    align-self:center; font-display:block;
  }
  .mpo-sub { font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim); letter-spacing:0.08em; }
  .mpo-options { display:flex; flex-direction:column; gap:0.6rem; width:100%; }
  .mpo-option {
    display:flex; align-items:center; gap:1rem;
    background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); border-radius:8px; padding:0.9rem 1rem;
    cursor:pointer; text-align:left; transition:all 0.15s; width:100%;
  }
  .mpo-option:hover { border-color:var(--red-bd); background:var(--red-dim); }
  .mpo-icon { width:36px; height:36px; color:var(--text-mid); flex-shrink:0; transition:color 0.15s; }
  .mpo-option:hover .mpo-icon { color:var(--red); }
  .mpo-label { display:flex; flex-direction:column; gap:0.15rem; flex:1; }
  .mpo-name  { font-family:var(--font-display); font-size:0.95rem; text-transform:uppercase; }
  .mpo-desc  { font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); letter-spacing:0.06em; }
  .mpo-arrow { font-size:1.1rem; color:var(--text-dim); }

  /* ── Tutorial overlay ────────────────────────────────────────────────────── */
  .tut-card {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:12px; padding:2.2rem 2rem;
    display:flex; flex-direction:column; align-items:center; gap:1.6rem;
    width:100%; max-width:480px;
  }
  .tut-eyebrow {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.22em;
    text-transform:uppercase; color:var(--text-dim);
  }
  .tut-title {
    font-family:var(--font-display); font-size:1.5rem; text-transform:uppercase; color:var(--text);
  }
  .tut-title span { color:var(--red); }
  .tut-steps { display:flex; flex-direction:column; gap:1rem; width:100%; }
  .tut-step  { display:flex; align-items:flex-start; gap:0.9rem; }
  .tut-num {
    font-family:var(--font-display); font-size:1rem; color:var(--red);
    flex-shrink:0; width:1.4rem; text-align:center; margin-top:0.05rem;
  }
  .tut-text { font-size:0.82rem; color:var(--text-mid); line-height:1.6; }
  :global(.tut-text b) { color:var(--text); font-weight:600; }
  .tut-btn {
    background:var(--red); color:#fff; border:none;
    font-family:var(--font-mono); font-size:0.78rem; font-weight:700; letter-spacing:0.12em;
    padding:0.6rem 1.8rem; border-radius:6px; cursor:pointer; transition:opacity 0.18s;
  }
  .tut-btn:hover { opacity:0.88; }

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  .loading-screen {
    position:fixed; inset:0; z-index:200; background:var(--bg);
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.4rem;
  }
  .lo-logo { font-family:var(--font-display); font-size:1.8rem; color:var(--text); text-transform:uppercase; }
  .lo-logo span { color:var(--red); }
  .lo-spinner {
    width:22px; height:22px; border:2px solid var(--border2);
    border-top-color:var(--red); border-radius:50%;
    animation:spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }

  /* ── Banners / errors ────────────────────────────────────────────────────── */
  .api-error, .offline-banner {
    font-family:var(--font-mono); font-size:0.72rem; letter-spacing:0.06em;
    padding:0.6rem 1rem; border-radius:6px; text-align:center;
  }
  .api-error    { color:#FF6670; background:rgba(255,70,85,0.08); border:1px solid rgba(255,70,85,0.25); }
  .offline-banner { color:var(--text-dim); background:var(--surface); border:1px solid var(--border2); }

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast {
    position:fixed; bottom:1.8rem; left:50%; transform:translateX(-50%);
    background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); font-family:var(--font-mono); font-size:0.75rem;
    letter-spacing:0.08em; padding:0.5rem 1.2rem; border-radius:6px;
    z-index:300; pointer-events:none;
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width:600px) {
    .game-header { grid-template-columns:1fr 1fr; }
    .header-center { display:none; }
    .mpo-card, .tut-card { padding:1.6rem 1.2rem; }
  }
</style>
