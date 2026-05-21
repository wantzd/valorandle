<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    SKINS_I18N, compareSkins,
    getDailySkinTarget, getFreeSkinTarget, skinSearch,
  } from '../lib/skins-data.js';
  import { getDailyDateKey, msUntilNextDaily, formatCountdown } from '../lib/game-utils.js';

  const MAX_GUESSES = 6;
  const DAILY_KEY   = () => `valorandle_skins_daily_${getDailyDateKey()}`;

  // ── Lang ──────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(SKINS_I18N[lang] || SKINS_I18N['pt-BR']);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  let mode       = $state(null);
  let showPicker = $state(false);

  // ── Data (loaded async) ───────────────────────────────────────────────────────
  let allSkins      = $state([]);   // full list from skins-db.json
  let dailyPool     = $state([]);   // subset with patch data
  let patches       = $state({});   // bundleName → patch string
  let editionIcons  = $state({});   // edition label → icon URL
  let loading     = $state(true);
  let loadError   = $state('');

  // ── Game state ────────────────────────────────────────────────────────────────
  let targetUuid  = $state(null);
  let guesses     = $state([]);   // [{ uuid, displayName, bundleName, weapon, feedback }]
  let finished    = $state(false);
  let won         = $state(false);

  // ── Audio ─────────────────────────────────────────────────────────────────────
  let audioEl     = $state(null);
  let isPlaying   = $state(false);
  let progress    = $state(0);     // 0–1
  let currentSec  = $state(0);
  let durationSec = $state(0);
  let audioReady  = $state(false);

  // ── Input / autocomplete ──────────────────────────────────────────────────────
  let inputVal    = $state('');
  let inputError  = $state('');
  let acResults   = $state([]);
  let acHighlight = $state(-1);
  let inputEl     = $state(null);
  let acEl        = $state(null);
  let feedbackGridEl = $state(null);

  // ── Countdown / toast ─────────────────────────────────────────────────────────
  let countdown    = $state('');
  let cdInterval   = null;
  let toastVisible = $state(false);
  let toastTimer   = null;

  // ── Derived ───────────────────────────────────────────────────────────────────
  let guessedUuids = $derived(new Set(guesses.map(g => g.uuid)));
  let target       = $derived(allSkins.find(s => s.uuid === targetUuid) ?? null);
  let attemptsLabel = $derived(t.attempts(guesses.length, MAX_GUESSES));
  let poolSize     = $derived(dailyPool.length);

  // ─────────────────────────────────────────────────────────────────────────────
  // Mount
  // ─────────────────────────────────────────────────────────────────────────────
  onMount(async () => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';

    // Load data
    try {
      const [skinsRes, patchesRes] = await Promise.all([
        fetch('/data/skins-db.json'),
        fetch('/data/bundle-patches.json'),
      ]);
      if (!skinsRes.ok || !patchesRes.ok) throw new Error('fetch failed');
      const skinsData   = await skinsRes.json();
      const patchesData = await patchesRes.json();

      allSkins     = skinsData.skins ?? [];
      editionIcons = skinsData.editionIcons ?? {};
      patches      = patchesData;
      // daily pool = skins whose bundle has a known patch
      dailyPool = allSkins.filter(s => patchesData[s.bundleName] != null);
    } catch {
      loadError = t.loadError;
      loading   = false;
      return;
    }
    loading = false;

    const P = new URLSearchParams(location.search);
    const m = P.get('mode');
    mode = m === 'free' ? 'free' : m === 'daily' ? 'daily' : null;
    if (!mode) { showPicker = true; return; }
    startGame();
  });

  onDestroy(() => {
    if (cdInterval) clearInterval(cdInterval);
    if (toastTimer) clearTimeout(toastTimer);
    stopAudio();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Mode picker
  // ─────────────────────────────────────────────────────────────────────────────
  function pickMode(m) {
    mode = m;
    showPicker = false;
    const url = new URL(location.href);
    url.searchParams.set('mode', m);
    history.replaceState(null, '', url);
    startGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Game init
  // ─────────────────────────────────────────────────────────────────────────────
  function startGame() {
    guesses    = [];
    finished   = false;
    won        = false;
    inputVal   = '';
    inputError = '';
    acResults  = [];
    resetAudio();

    // Both modes use dailyPool (skins with known patch) so the Patch column is
    // always resolvable and a win can actually be detected.
    const pool = dailyPool;
    const skin = mode === 'daily' ? getDailySkinTarget(pool) : getFreeSkinTarget(pool);
    targetUuid = skin?.uuid ?? null;

    if (mode === 'daily') {
      const saved = loadDailyState();
      if (saved) {
        guesses  = saved.guesses  || [];
        finished = saved.finished || false;
        won      = saved.won      || false;
      }
    }

    if (finished && mode === 'daily') startCountdown();
    tick().then(() => inputEl?.focus());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Audio
  // ─────────────────────────────────────────────────────────────────────────────
  function resetAudio() {
    isPlaying   = false;
    progress    = 0;
    currentSec  = 0;
    durationSec = 0;
    audioReady  = false;
  }

  function stopAudio() {
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
    isPlaying = false;
  }

  function onAudioMetadata() {
    durationSec = audioEl?.duration ?? 0;
    audioReady  = true;
  }

  function onAudioTimeUpdate() {
    currentSec = audioEl?.currentTime ?? 0;
    progress   = durationSec > 0 ? currentSec / durationSec : 0;
  }

  function onAudioEnded() {
    isPlaying = false;
    progress  = 1;
  }

  function togglePlay() {
    if (!audioEl || !target) return;
    if (isPlaying) {
      audioEl.pause();
      isPlaying = false;
    } else {
      audioEl.play().then(() => { isPlaying = true; }).catch(() => {});
    }
  }

  function replayAudio() {
    if (!audioEl) return;
    audioEl.currentTime = 0;
    audioEl.play().then(() => { isPlaying = true; }).catch(() => {});
  }

  function seekAudio(e) {
    if (!audioEl || !durationSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = ratio * durationSec;
    if (!isPlaying) {
      audioEl.play().then(() => { isPlaying = true; }).catch(() => {});
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Input / autocomplete
  // ─────────────────────────────────────────────────────────────────────────────
  function onInput() {
    inputError  = '';
    acHighlight = -1;
    acResults   = skinSearch(dailyPool, inputVal, guessedUuids);
  }

  function onKeydown(e) {
    if (acResults.length === 0) {
      if (e.key === 'Enter') submitByName();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acHighlight = Math.min(acHighlight + 1, acResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acHighlight = Math.max(acHighlight - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (acHighlight >= 0) selectSkin(acResults[acHighlight]);
      else submitByName();
    } else if (e.key === 'Escape') {
      acResults = []; acHighlight = -1;
    }
  }

  function selectSkin(skin) {
    inputVal    = skin.displayName;
    acResults   = [];
    acHighlight = -1;
    tick().then(() => inputEl?.focus());
  }

  function submitByName() {
    const q = inputVal.trim().toLowerCase();
    const match = dailyPool.find(s => s.displayName.toLowerCase() === q);
    if (match) submitGuess(match);
    else inputError = t.notFound;
  }

  function submitGuess(skin) {
    if (finished) return;
    if (guessedUuids.has(skin.uuid)) { inputError = t.alreadyGuessed; return; }

    const feedback = compareSkins(skin, target, patches);
    guesses    = [...guesses, { uuid: skin.uuid, displayName: skin.displayName,
                                bundleName: skin.bundleName, weapon: skin.weapon, feedback }];
    won        = feedback.every(f => f.status === 'correct');
    finished   = won || guesses.length >= MAX_GUESSES;
    inputVal   = '';
    acResults  = [];
    inputError = '';

    if (mode === 'daily') saveDailyState({ guesses, finished, won });
    if (finished && mode === 'daily') startCountdown();

    tick().then(() => {
      feedbackGridEl?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  function loadDailyState() {
    try { return JSON.parse(localStorage.getItem(DAILY_KEY()) || 'null'); } catch { return null; }
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
    cdInterval = setInterval(() => { countdown = formatCountdown(msUntilNextDaily()); }, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Share
  // ─────────────────────────────────────────────────────────────────────────────
  function share() {
    const rows = guesses.map(g =>
      g.feedback.map(f => f.status === 'correct' ? '🟩' : '🟥').join('')
    ).join('\n');
    const text = won
      ? `${t.shareHeader}\n${t.shareWin(guesses.length)}\n\n${rows}`
      : `${t.shareHeader}\n${t.shareLose}\n\n${rows}`;
    const url = window.location.origin + (lang === 'en' ? '/en' : '') + '/skins';
    navigator.clipboard.writeText(text + '\n\n' + url).then(showToast);
  }

  function showToast() {
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastVisible = false; }, 2000);
  }

  function newFreeRound() {
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    stopAudio();
    startGame();
  }

  function closeAC(e) {
    if (!acEl?.contains(e.target) && e.target !== inputEl) {
      acResults = []; acHighlight = -1;
    }
  }
</script>

<svelte:window onclick={closeAC} />

<!-- ── Mode picker overlay ──────────────────────────────────────────────────── -->
{#if showPicker}
<div class="overlay-full">
  <div class="mpo-card">
    <div class="mpo-eyebrow">Valorandle</div>
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
          <span class="mpo-name">{t.modeFree}</span>
          <span class="mpo-desc">{t.modeFreeDesc}</span>
        </div>
        <span class="mpo-arrow">→</span>
      </button>
    </div>
  </div>
</div>
{/if}

<!-- ── Main game ─────────────────────────────────────────────────────────────── -->
{#if !showPicker}
<div class="page">

  <!-- Header -->
  <header class="game-header">
    <div class="header-left">
      <a href={lang === 'pt-BR' ? '/' : '/en'} class="back-btn">{t.back}</a>
      <span class="mode-tag">{t.modeTag}{mode === 'free' ? ' · ' + t.modeFree : ''}</span>
    </div>
    <div class="header-center">
      <span class="wordmark">VALOR<span>ANDLE</span></span>
    </div>
    <div class="header-right">
      <span class="attempts-chip">{attemptsLabel}</span>
    </div>
  </header>

  <!-- Loading / error -->
  {#if loading}
    <div class="loading-msg">Carregando…</div>
  {:else if loadError}
    <div class="load-error">{loadError}</div>
  {:else if target}

    <!-- ── Audio player ──────────────────────────────────────────────────── -->
    <div class="audio-section">
      <!-- Hidden audio element -->
      <!-- svelte-ignore a11y-media-has-caption -->
      <audio
        bind:this={audioEl}
        src={target.audioUrl}
        onloadedmetadata={onAudioMetadata}
        ontimeupdate={onAudioTimeUpdate}
        onended={onAudioEnded}
        preload="metadata"
      ></audio>

      <div class="audio-card">
        <div class="audio-label">
          {#if !finished}
            <svg class="audio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <span>Qual skin é essa?</span>
          {:else if won}
            <span class="audio-reveal-name">{target.displayName}</span>
          {:else}
            <span class="audio-reveal-name">{target.displayName}</span>
          {/if}
        </div>

        <div class="player-row">
          <button class="play-btn" onclick={togglePlay} disabled={!audioReady && !target}>
            {#if isPlaying}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            {/if}
          </button>

          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="progress-bar-wrap" onclick={seekAudio}>
            <div class="progress-bar-bg"></div>
            <div class="progress-bar-fill" style:width="{progress * 100}%"></div>
            <div class="progress-thumb" style:left="{progress * 100}%"></div>
          </div>

          <span class="time-label">
            {formatTime(currentSec)} / {formatTime(durationSec)}
          </span>

          <button class="replay-btn" onclick={replayAudio} title="Reiniciar">
            {t.replayBtn}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Input section ─────────────────────────────────────────────────── -->
    {#if !finished}
      <div class="input-section">
        <div class="guess-input-wrap">
          <input
            bind:this={inputEl}
            bind:value={inputVal}
            oninput={onInput}
            onkeydown={onKeydown}
            type="text"
            class="guess-input"
            placeholder={t.placeholder}
            autocomplete="off"
            spellcheck="false"
            disabled={finished}
          />
          <button
            class="guess-btn"
            onclick={submitByName}
            disabled={!inputVal.trim() || finished}
          >{t.confirmBtn}</button>
        </div>

        {#if acResults.length > 0}
          <div class="autocomplete-list" bind:this={acEl}>
            {#each acResults as skin, i}
              <button
                class="ac-item"
                class:highlighted={i === acHighlight}
                onclick={() => selectSkin(skin)}
                ondblclick={() => submitGuess(skin)}
              >
                <div class="ac-meta">
                  <span class="ac-name">{skin.displayName}</span>
                  <span class="ac-bundle">{skin.bundleName}</span>
                </div>
                <span class="ac-weapon">{skin.weapon}</span>
                <span class="ac-edition">{skin.edition}</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if inputError}
          <div class="input-error">{inputError}</div>
        {/if}
      </div>
    {/if}

    <!-- ── Feedback grid ──────────────────────────────────────────────────── -->
    {#if guesses.length > 0}
      <div class="grid-wrapper">
        <div class="grid-headers">
          <div class="col-header col-skin">{t.headers.skin}</div>
          <div class="col-header">{t.headers.bundle}</div>
          <div class="col-header">{t.headers.weapon}</div>
          <div class="col-header">{t.headers.edition}</div>
          <div class="col-header">{t.headers.patch}</div>
        </div>

        <div class="guess-grid" bind:this={feedbackGridEl}>
          {#each guesses as g (g.uuid)}
            <div class="guess-row">
              <!-- Skin name cell -->
              <div class="guess-cell cell-skin">
                <span class="skin-name">{g.displayName}</span>
                <span class="skin-bundle-sub">{g.bundleName}</span>
              </div>
              <!-- Feedback cells -->
              {#each g.feedback as cell}
                <div
                  class="guess-cell"
                  class:correct={cell.status === 'correct'}
                  class:wrong={cell.status === 'wrong'}
                >
                  {#if cell.attr === 'edition' && editionIcons[cell.value]}
                    <img
                      class="edition-icon"
                      src={editionIcons[cell.value]}
                      alt={cell.value}
                      title={cell.value}
                    />
                  {:else}
                    <span class="cell-value">{cell.value}</span>
                  {/if}
                  {#if cell.hint}
                    <span class="cell-hint">{cell.hint}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ── Result panel ───────────────────────────────────────────────────── -->
    {#if finished}
      <div class="result-panel" class:won class:lost={!won}>
        <div class="result-status">
          {won ? t.win : t.lose(target.displayName)}
        </div>
        <div class="result-body">
          <div class="result-skin-info">
            <div class="result-name">{target.displayName}</div>
            <div class="result-sub">{target.bundleName} · {target.weapon} · {target.edition}</div>
            {#if patches[target.bundleName]}
              <div class="result-patch">Patch {patches[target.bundleName]}</div>
            {/if}
          </div>
          <div class="result-sub-text">{won ? t.winSub(guesses.length) : t.loseSub}</div>

          {#if mode === 'daily'}
            <div class="result-countdown">
              <span class="cd-label">{t.nextDaily}</span>
              <span class="cd-timer">{countdown}</span>
            </div>
            <div class="result-actions">
              <button class="result-btn primary" onclick={share}>{t.shareBtn}</button>
              <a class="result-btn ghost"
                href={lang === 'pt-BR' ? '/skins?mode=free' : '/en/skins?mode=free'}>{t.playFree}</a>
            </div>
          {:else}
            <div class="result-actions">
              <button class="result-btn primary" onclick={newFreeRound}>{t.newRound}</button>
              <button class="result-btn ghost" onclick={share}>{t.shareBtn}</button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

  {/if}<!-- end target -->

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
    --yellow:#f0b429; --yellow-bg:rgba(240,180,41,0.10); --yellow-bd:rgba(240,180,41,0.42);
    --font-display:'Russo One',sans-serif; --font-ui:'Epilogue',sans-serif; --font-mono:'Epilogue',sans-serif;
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
    max-width:980px; margin:0 auto;
    padding:0 1rem 5rem; min-height:100vh;
    display:flex; flex-direction:column; gap:1rem;
  }

  .loading-msg, .load-error {
    text-align:center; padding:3rem; font-family:var(--font-mono);
    font-size:0.9rem; color:var(--text-dim);
  }
  .load-error { color:var(--red); }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .game-header {
    display:grid; grid-template-columns:1fr auto 1fr;
    align-items:center; padding:0.85rem 0;
    border-bottom:1px solid var(--border); margin-bottom:0.2rem;
  }
  .header-left  { display:flex; align-items:center; gap:0.6rem; }
  .header-center { text-align:center; }
  .header-right { display:flex; justify-content:flex-end; align-items:center; }
  .back-btn {
    background:transparent; border:1px solid var(--border2); color:var(--text-dim);
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.03em;
    padding:0.35rem 0.75rem; cursor:pointer; border-radius:3px;
    transition:all 0.2s; text-decoration:none;
  }
  .back-btn:hover { border-color:var(--red); color:var(--red); }
  .mode-tag {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.02em;
    text-transform:uppercase; color:var(--red);
    border:1px solid var(--red-bd); padding:0.18rem 0.5rem; border-radius:3px;
  }
  .wordmark { font-family:var(--font-display); font-size:1.1rem; text-transform:uppercase; }
  .wordmark span { color:var(--red); }
  .attempts-chip { font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim); }

  /* ── Audio player ────────────────────────────────────────────────────────── */
  .audio-section { display:flex; flex-direction:column; gap:0.5rem; }

  .audio-card {
    background:var(--surface); border:1px solid var(--border2); border-radius:8px;
    padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:0.85rem;
  }

  .audio-label {
    display:flex; align-items:center; gap:0.55rem;
    font-family:var(--font-mono); font-size:0.78rem; font-weight:700;
    letter-spacing:0.03em; color:var(--text-dim); text-transform:uppercase;
  }
  .audio-icon { width:16px; height:16px; flex-shrink:0; }
  .audio-reveal-name {
    font-family:var(--font-ui); font-size:1.05rem; font-weight:700;
    color:var(--text); letter-spacing:0; text-transform:none;
  }

  .player-row {
    display:flex; align-items:center; gap:0.85rem;
  }

  .play-btn {
    width:44px; height:44px; border-radius:50%; flex-shrink:0;
    background:var(--red); border:none; color:#fff; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.15s;
  }
  .play-btn:hover:not(:disabled) { background:#e03040; transform:scale(1.05); }
  .play-btn:disabled { background:var(--surface2); color:var(--text-dim); cursor:not-allowed; }
  .play-btn svg { width:18px; height:18px; }

  .progress-bar-wrap {
    flex:1; height:28px; position:relative; cursor:pointer;
    display:flex; align-items:center;
  }
  .progress-bar-bg {
    position:absolute; inset-block:0; left:0; right:0;
    height:4px; top:50%; transform:translateY(-50%);
    background:var(--border2); border-radius:2px;
  }
  .progress-bar-fill {
    position:absolute; left:0; height:4px; top:50%; transform:translateY(-50%);
    background:var(--red); border-radius:2px; transition:width 0.05s linear;
    pointer-events:none;
  }
  .progress-thumb {
    position:absolute; top:50%; transform:translate(-50%, -50%);
    width:12px; height:12px; background:var(--red); border-radius:50%;
    pointer-events:none; transition:left 0.05s linear;
  }
  .progress-bar-wrap:hover .progress-thumb { transform:translate(-50%,-50%) scale(1.2); }

  .time-label {
    font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);
    white-space:nowrap; min-width:70px; text-align:right;
  }

  .replay-btn {
    background:none; border:1px solid var(--border2); color:var(--text-dim);
    font-family:var(--font-mono); font-size:1rem; font-weight:700;
    width:34px; height:34px; border-radius:50%; cursor:pointer; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    transition:all 0.15s;
  }
  .replay-btn:hover { border-color:var(--red); color:var(--red); }

  /* ── Input ──────────────────────────────────────────────────────────────── */
  .input-section { position:relative; }
  .guess-input-wrap { display:flex; gap:6px; }
  .guess-input {
    flex:1; background:var(--surface); border:1px solid var(--border2);
    border-radius:4px; color:var(--text); font-family:var(--font-ui);
    font-size:0.95rem; padding:0.8rem 1.1rem; outline:none; transition:border-color 0.2s;
  }
  .guess-input:focus { border-color:var(--red); }
  .guess-input::placeholder { color:var(--text-dim); }
  .guess-input:disabled { opacity:0.4; cursor:not-allowed; }
  .guess-btn {
    background:var(--red); border:none; color:#fff;
    font-family:var(--font-mono); font-size:0.8rem; font-weight:700; letter-spacing:0.02em;
    padding:0.8rem 1.4rem; border-radius:4px; cursor:pointer; transition:all 0.2s; flex-shrink:0;
  }
  .guess-btn:hover:not(:disabled) { background:#e03040; }
  .guess-btn:disabled { background:var(--surface2); color:var(--text-dim); cursor:not-allowed; }

  /* ── Autocomplete ───────────────────────────────────────────────────────── */
  .autocomplete-list {
    position:absolute; top:calc(100% + 4px); left:0; right:0;
    background:var(--surface2); border:1px solid var(--border2); border-radius:4px;
    z-index:100; overflow:hidden; box-shadow:0 12px 32px rgba(0,0,0,.5);
  }
  .ac-item {
    display:flex; align-items:center; gap:0.75rem;
    width:100%; padding:0.55rem 0.9rem;
    background:none; border:none; border-bottom:1px solid var(--border);
    color:var(--text); cursor:pointer; text-align:left; transition:background 0.1s;
  }
  .ac-item:last-child { border-bottom:none; }
  .ac-item:hover, .ac-item.highlighted { background:var(--surface); }
  .ac-meta { display:flex; flex-direction:column; flex:1; min-width:0; }
  .ac-name { font-size:0.88rem; font-weight:600; }
  .ac-bundle { font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); margin-top:1px; }
  .ac-weapon {
    font-family:var(--font-mono); font-size:0.65rem; font-weight:700; color:var(--text-mid);
    letter-spacing:0.02em; white-space:nowrap;
  }
  .ac-edition {
    font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim);
    white-space:nowrap; margin-left:0.5rem;
  }

  .input-error {
    font-family:var(--font-mono); font-size:0.7rem; color:var(--red);
    margin-top:0.45rem; padding-left:0.25rem;
  }

  /* ── Grid ───────────────────────────────────────────────────────────────── */
  .grid-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .grid-headers, .guess-row {
    display:grid;
    grid-template-columns:200px repeat(4, 1fr);
    gap:3px; min-width:520px;
  }
  .grid-headers { margin-bottom:3px; }
  .col-header {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    letter-spacing:0.05em; text-transform:uppercase; color:var(--text-dim);
    text-align:center; padding:0.45rem 0.25rem;
    background:var(--surface); border:1px solid var(--border); border-radius:3px;
  }
  .col-header.col-skin { text-align:left; padding-left:0.75rem; }
  .guess-grid { display:flex; flex-direction:column; gap:3px; }
  .guess-row { animation:rowReveal 0.28s ease both; }
  @keyframes rowReveal { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }

  /* ── Cells ──────────────────────────────────────────────────────────────── */
  .guess-cell {
    background:var(--surface); border:1px solid var(--border); border-radius:3px;
    padding:0.5rem 0.4rem; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px;
    text-align:center; min-height:56px;
  }
  .guess-cell.correct { background:var(--green-bg); border-color:var(--green-bd); }
  .guess-cell.wrong   { background:var(--red-dim);  border-color:var(--red-bd); }

  .cell-skin {
    align-items:flex-start; text-align:left;
    padding-left:0.75rem; flex-direction:column; gap:2px;
  }
  .skin-name {
    font-family:var(--font-ui); font-size:0.85rem; font-weight:600; color:var(--text); line-height:1.3;
  }
  .skin-bundle-sub {
    font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim);
  }

  .cell-value {
    font-family:var(--font-ui); font-size:0.9rem; font-weight:600; color:var(--text); line-height:1.3;
  }
  .edition-icon { width:32px; height:32px; object-fit:contain; display:block; }
  .cell-hint {
    font-family:var(--font-mono); font-size:0.9rem; font-weight:700; line-height:1;
  }
  .correct .cell-hint { color:var(--green); }
  .wrong   .cell-hint { color:var(--red); }

  /* ── Result panel ────────────────────────────────────────────────────────── */
  .result-panel {
    background:var(--surface); border:1px solid var(--border2); border-radius:8px;
    overflow:hidden; animation:panelUp 0.38s ease both;
  }
  @keyframes panelUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .result-status {
    padding:0.7rem 1.25rem;
    font-family:var(--font-display); font-size:1rem; letter-spacing:0.05em;
    text-transform:uppercase;
  }
  .won  .result-status { background:var(--green-bg); color:var(--green); }
  .lost .result-status { background:var(--red-dim);  color:var(--red); }
  .result-body {
    padding:1.25rem; display:flex; flex-direction:column; gap:1rem;
  }
  .result-skin-info { display:flex; flex-direction:column; gap:0.25rem; }
  .result-name {
    font-family:var(--font-ui); font-size:1.15rem; font-weight:700; color:var(--text);
  }
  .result-sub {
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-mid); letter-spacing:0.02em;
  }
  .result-patch {
    font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);
  }
  .result-sub-text {
    font-family:var(--font-mono); font-size:0.78rem; color:var(--text-dim);
  }
  .result-countdown {
    display:flex; flex-direction:column; gap:0.2rem;
  }
  .cd-label {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    letter-spacing:0.04em; text-transform:uppercase; color:var(--text-dim);
  }
  .cd-timer {
    font-family:var(--font-mono); font-size:1.4rem; font-weight:700;
    color:var(--text-dim); letter-spacing:0.02em;
  }
  .result-actions { display:flex; gap:0.75rem; flex-wrap:wrap; }
  .result-btn {
    padding:0.7rem 1.35rem; border-radius:4px; cursor:pointer; font-family:var(--font-mono);
    font-size:0.8rem; font-weight:700; letter-spacing:0.02em; text-decoration:none;
    display:inline-flex; align-items:center; justify-content:center; transition:all 0.2s;
  }
  .result-btn.primary { background:var(--red); border:none; color:#fff; }
  .result-btn.primary:hover { background:#e03040; }
  .result-btn.ghost { background:transparent; border:1px solid var(--border2); color:var(--text-dim); }
  .result-btn.ghost:hover { border-color:var(--red); color:var(--red); }

  /* ── Mode picker overlay ─────────────────────────────────────────────────── */
  .overlay-full {
    position:fixed; inset:0; z-index:200;
    background:rgba(8,9,13,0.92); backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center; padding:1rem;
  }
  .mpo-card {
    background:var(--surface); border:1px solid var(--border2); border-radius:12px;
    padding:2rem 2rem 1.75rem; max-width:440px; width:100%;
    display:flex; flex-direction:column; gap:1.1rem;
  }
  .mpo-eyebrow {
    font-family:var(--font-mono); font-size:0.65rem; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase; color:var(--text-dim);
  }
  .mpo-title { display:flex; align-items:center; gap:0.75rem; }
  .mpo-wordmark { font-family:var(--font-display); font-size:1.6rem; }
  .mpo-wordmark span { color:var(--red); }
  .mpo-mode-tag {
    font-family:var(--font-mono); font-size:0.65rem; font-weight:700; letter-spacing:0.04em;
    text-transform:uppercase; color:var(--red); border:1px solid var(--red-bd);
    padding:0.2rem 0.55rem; border-radius:3px;
  }
  .mpo-sub { font-family:var(--font-ui); font-size:0.88rem; color:var(--text-mid); }
  .mpo-options { display:flex; flex-direction:column; gap:0.55rem; }
  .mpo-option {
    display:flex; align-items:center; gap:0.9rem; width:100%;
    background:var(--surface2); border:1px solid var(--border); border-radius:8px;
    padding:0.85rem 1rem; cursor:pointer; text-align:left; transition:all 0.2s;
  }
  .mpo-option:hover { border-color:var(--red); }
  .mpo-icon { width:28px; height:28px; color:var(--text-dim); flex-shrink:0; }
  .mpo-option:hover .mpo-icon { color:var(--red); }
  .mpo-label { display:flex; flex-direction:column; gap:0.15rem; flex:1; }
  .mpo-name { font-family:var(--font-ui); font-size:0.92rem; font-weight:600; color:var(--text); }
  .mpo-desc { font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); }
  .mpo-arrow { font-family:var(--font-mono); color:var(--text-dim); transition:color 0.2s; }
  .mpo-option:hover .mpo-arrow { color:var(--red); }

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast {
    position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
    background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); font-family:var(--font-mono); font-size:0.8rem;
    padding:0.6rem 1.25rem; border-radius:4px; z-index:300;
    animation:toastIn 0.22s ease both;
  }
  @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(6px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width:500px) {
    .player-row { flex-wrap:wrap; }
    .time-label { min-width:auto; }
    .grid-headers, .guess-row { grid-template-columns:140px repeat(4, 1fr); }
  }
</style>
