<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    AGENTS_DB, AGENTS_I18N,
    compareAgentGuess, getDailyAgentTarget, getFreeAgentTarget, agentSearch,
  } from '../lib/agents-data.js';
  import {
    getDailyDateKey, msUntilNextDaily, formatCountdown,
    loadLang, saveLang,
  } from '../lib/game-utils.js';

  const MAX_GUESSES = 8;
  const DAILY_KEY   = () => `valorandle_agents_daily_${getDailyDateKey()}`;

  // ── Lang ──────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(AGENTS_I18N[lang] || AGENTS_I18N['pt-BR']);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  let mode       = $state(null);
  let showPicker = $state(false);

  // ── Game state ────────────────────────────────────────────────────────────────
  let targetId  = $state(null);
  let guesses   = $state([]);    // [{ agentId, feedback }]
  let finished  = $state(false);
  let won       = $state(false);

  // ── Input / autocomplete ──────────────────────────────────────────────────────
  let inputVal      = $state('');
  let inputError    = $state('');
  let acResults     = $state([]);
  let acHighlight   = $state(-1);
  let inputEl       = $state(null);
  let acEl          = $state(null);
  let feedbackGridEl = $state(null);

  // ── Countdown / toast ─────────────────────────────────────────────────────────
  let countdown    = $state('');
  let cdInterval   = null;
  let toastVisible = $state(false);
  let toastTimer   = null;

  // ── Derived ───────────────────────────────────────────────────────────────────
  let guessedIds = $derived(new Set(guesses.map(g => g.agentId)));
  let target     = $derived(targetId ? AGENTS_DB[targetId] : null);
  let attemptsLabel = $derived(target ? t.attempts(guesses.length, MAX_GUESSES) : '');

  // ─────────────────────────────────────────────────────────────────────────────
  // Mount
  // ─────────────────────────────────────────────────────────────────────────────
  onMount(() => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);

    const P = new URLSearchParams(location.search);
    const m = P.get('mode');
    mode = m === 'free' ? 'free' : m === 'daily' ? 'daily' : null;

    if (!mode) { showPicker = true; return; }
    startGame();
  });

  onDestroy(() => {
    if (cdInterval) clearInterval(cdInterval);
    if (toastTimer) clearTimeout(toastTimer);
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

    targetId = mode === 'daily' ? getDailyAgentTarget() : getFreeAgentTarget();

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
  // Input / autocomplete
  // ─────────────────────────────────────────────────────────────────────────────
  function onInput() {
    inputError  = '';
    acHighlight = -1;
    acResults   = agentSearch(inputVal).filter(id => !guessedIds.has(id));
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
      if (acHighlight >= 0) selectAgent(acResults[acHighlight]);
      else submitByName();
    } else if (e.key === 'Escape') {
      acResults = []; acHighlight = -1;
    }
  }

  function selectAgent(id) {
    const a = AGENTS_DB[id];
    if (!a) return;
    inputVal   = a.name;
    acResults  = [];
    acHighlight = -1;
    tick().then(() => inputEl?.focus());
  }

  function submitByName() {
    const q = inputVal.trim().toLowerCase();
    const match = Object.keys(AGENTS_DB).find(id =>
      AGENTS_DB[id].name.toLowerCase() === q
    );
    if (match) submitGuess(match);
    else inputError = t.notFound;
  }

  function submitGuess(agentId) {
    if (finished) return;
    if (guessedIds.has(agentId)) { inputError = t.alreadyGuessed; return; }
    if (!AGENTS_DB[agentId])     { inputError = t.notFound; return; }

    const feedback = compareAgentGuess(agentId, targetId, lang);
    guesses    = [...guesses, { agentId, feedback }];
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
      g.feedback.map(f =>
        f.status === 'correct' ? '🟩' : f.status === 'close' ? '🟨' : '🟥'
      ).join('')
    ).join('\n');
    const text = won
      ? `${t.shareHeader}\n${t.shareWin(guesses.length)}\n\n${rows}`
      : `${t.shareHeader}\n${t.shareLose}\n\n${rows}`;
    const url = window.location.origin + (lang === 'en' ? '/en' : '') + '/agents';
    navigator.clipboard.writeText(text + '\n\n' + url).then(showToast);
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
  function roleLabel(role) { return t.roles[role] || role; }
  function genderLabel(g)  { return t.genders[g]  || g; }

  function roleColor(role) {
    return {
      Duelist:    '#FF4655',
      Initiator:  '#34d47e',
      Controller: '#7b8fff',
      Sentinel:   '#f0b429',
    }[role] || 'var(--text-dim)';
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

  <!-- Input section -->
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
          {#each acResults as id, i}
            {@const a = AGENTS_DB[id]}
            <button
              class="ac-item"
              class:highlighted={i === acHighlight}
              onclick={() => submitGuess(id)}
            >
              <div class="ac-icon">
                <img src={a.icon} alt={a.name} loading="lazy" />
              </div>
              <span class="ac-name">{a.name}</span>
              <span class="ac-role" style:color={roleColor(a.role)}>{roleLabel(a.role)}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if inputError}
        <div class="input-error">{inputError}</div>
      {/if}
    </div>
  {/if}

  <!-- Grid headers -->
  {#if guesses.length > 0}
    <div class="grid-wrapper">
      <div class="grid-headers">
        <div class="col-header col-agent">{t.headers.agent}</div>
        <div class="col-header">{t.headers.gender}</div>
        <div class="col-header">{t.headers.role}</div>
        <div class="col-header">{t.headers.origin}</div>
        <div class="col-header">{t.headers.year}</div>
      </div>

      <div class="guess-grid" bind:this={feedbackGridEl}>
        {#each guesses as g (g.agentId)}
          {@const a = AGENTS_DB[g.agentId]}
          <div class="guess-row">
            <!-- Agent cell -->
            <div class="guess-cell cell-agent">
              <div class="agent-avatar" style:--role-color={roleColor(a.role)}>
                <img src={a.icon} alt={a.name} loading="lazy" />
              </div>
              <span class="agent-name">{a.name}</span>
            </div>
            <!-- Feedback cells -->
            {#each g.feedback as cell}
              <div
                class="guess-cell"
                class:correct={cell.status === 'correct'}
                class:close={cell.status === 'close'}
                class:wrong={cell.status === 'wrong'}
              >
                {#if cell.attr === 'origin' && cell.flag}
                  <span class="cell-flag">
                    <span class="fi fi-{cell.flag}"></span>
                  </span>
                {/if}
                <span class="cell-value">{cell.value}</span>
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

  <!-- Result panel -->
  {#if finished && target}
    <div class="result-panel" class:won class:lost={!won}>
      <div class="result-status">
        {won ? t.win : t.lose(target.name)}
      </div>
      <div class="result-body">
        <div class="result-agent">
          <div class="result-avatar" style:--role-color={roleColor(target.role)}>
            <img src={target.icon} alt={target.name} />
          </div>
          <div class="result-info">
            <span class="result-name">{target.name}</span>
            <span class="result-sub">{roleLabel(target.role)} · {target.year}</span>
          </div>
        </div>
        <div class="result-sub-text">{won ? t.winSub(guesses.length) : t.loseSub}</div>

        {#if mode === 'daily'}
          <div class="result-countdown">
            <span class="cd-label">{t.nextDaily}</span>
            <span class="cd-timer">{countdown}</span>
          </div>
          <div class="result-actions">
            <button class="result-btn primary" onclick={share}>{t.shareBtn}</button>
            <a class="result-btn ghost" href={lang === 'pt-BR' ? '/agents?mode=free' : '/en/agents?mode=free'}>{t.playFree}</a>
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
    --font-display:'Russo One',sans-serif; --font-ui:'Outfit',sans-serif; --font-mono:'Outfit',sans-serif;
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
  .attempts-chip {
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim); letter-spacing:0.02em;
  }

  /* ── Input ──────────────────────────────────────────────────────────────── */
  .input-section { position:relative; }
  .guess-input-wrap { display:flex; }
  .guess-input {
    flex:1; background:var(--surface); border:1px solid var(--border2);
    border-right:none; border-radius:4px 0 0 4px;
    color:var(--text); font-family:var(--font-ui); font-size:0.95rem;
    padding:0.8rem 1.1rem; outline:none; transition:border-color 0.2s;
  }
  .guess-input:focus { border-color:var(--red); }
  .guess-input::placeholder { color:var(--text-dim); }
  .guess-input:disabled { opacity:0.4; cursor:not-allowed; }
  .guess-btn {
    background:var(--red); border:none; color:#fff;
    font-family:var(--font-mono); font-size:0.8rem; font-weight:700; letter-spacing:0.02em;
    padding:0.8rem 1.4rem; border-radius:0 4px 4px 0; cursor:pointer; transition:all 0.2s;
  }
  .guess-btn:hover:not(:disabled) { background:#e03040; }
  .guess-btn:disabled { background:var(--surface2); color:var(--text-dim); cursor:not-allowed; }

  /* ── Autocomplete ───────────────────────────────────────────────────────── */
  .autocomplete-list {
    position:absolute; top:calc(100% + 4px); left:0; right:0;
    background:var(--surface2); border:1px solid var(--border2); border-radius:4px;
    z-index:100; overflow:hidden;
    box-shadow:0 12px 32px rgba(0,0,0,.5);
  }
  .ac-item {
    display:flex; align-items:center; gap:0.75rem;
    width:100%; padding:0.55rem 0.9rem;
    background:none; border:none; border-bottom:1px solid var(--border);
    color:var(--text); cursor:pointer; text-align:left; transition:background 0.1s;
  }
  .ac-item:last-child { border-bottom:none; }
  .ac-item:hover, .ac-item.highlighted { background:var(--surface); }
  .ac-icon {
    width:28px; height:28px; border-radius:50%; overflow:hidden;
    background:var(--border); flex-shrink:0;
    border:1px solid rgba(255,255,255,0.08);
  }
  .ac-icon img { width:100%; height:100%; object-fit:cover; display:block; }
  .ac-name { font-size:0.88rem; font-weight:600; flex:1; }
  .ac-role { font-family:var(--font-mono); font-size:0.65rem; font-weight:700; letter-spacing:0.03em; margin-left:auto; }

  .input-error {
    font-family:var(--font-mono); font-size:0.7rem; color:var(--red);
    margin-top:0.45rem; padding-left:0.25rem;
  }

  /* ── Grid ───────────────────────────────────────────────────────────────── */
  .grid-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .grid-headers, .guess-row {
    display:grid;
    grid-template-columns:180px repeat(4, 1fr);
    gap:3px;
  }
  .grid-headers { margin-bottom:3px; }
  .col-header {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    letter-spacing:0.05em; text-transform:uppercase; color:var(--text-dim);
    text-align:center; padding:0.45rem 0.25rem;
    background:var(--surface); border:1px solid var(--border); border-radius:3px;
  }
  .col-header.col-agent { text-align:left; padding-left:0.75rem; }
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
  .guess-cell.close   { background:var(--yellow-bg); border-color:var(--yellow-bd); }
  .guess-cell.wrong   { background:var(--red-dim);   border-color:var(--red-bd); }

  .cell-agent {
    align-items:flex-start; text-align:left;
    padding-left:0.6rem; flex-direction:row; gap:0.55rem;
  }
  .agent-avatar {
    width:34px; height:34px; flex-shrink:0;
    border-radius:50%; overflow:hidden;
    border:2px solid var(--role-color, var(--border2));
    background:var(--surface2);
  }
  .agent-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
  .agent-name {
    font-family:var(--font-ui); font-size:0.9rem; font-weight:600;
    color:var(--text); line-height:1.3; align-self:center;
  }

  .cell-value {
    font-family:var(--font-ui); font-size:0.9rem; font-weight:600;
    color:var(--text); line-height:1.3;
  }
  .cell-flag { font-size:0.95rem; line-height:1; }
  .cell-flag .fi { border-radius:2px; }
  .cell-hint {
    font-family:var(--font-mono); font-size:0.85rem; font-weight:700; line-height:1;
  }
  .correct .cell-hint { color:var(--green); }
  .close   .cell-hint { color:var(--yellow); }
  .wrong   .cell-hint { color:var(--red); }

  /* ── Result panel ────────────────────────────────────────────────────────── */
  .result-panel {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:8px; overflow:hidden;
    animation:panelUp 0.38s ease both;
  }
  @keyframes panelUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .result-status {
    padding:0.7rem 1.25rem;
    font-family:var(--font-display); font-size:0.95rem; letter-spacing:0; text-transform:uppercase;
    border-bottom:1px solid var(--border);
  }
  .result-panel.won  .result-status { color:var(--green); background:var(--green-bg); }
  .result-panel.lost .result-status { color:var(--red);   background:var(--red-dim); }
  .result-body {
    padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.85rem;
  }
  .result-agent {
    display:flex; align-items:center; gap:0.85rem;
    padding:0.7rem 1rem; background:var(--surface2);
    border:1px solid var(--border); border-radius:4px;
  }
  .result-avatar {
    width:48px; height:48px; border-radius:50%; overflow:hidden;
    border:2px solid var(--role-color, var(--border2));
    background:var(--surface); flex-shrink:0;
  }
  .result-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
  .result-info { display:flex; flex-direction:column; gap:0.2rem; }
  .result-name { font-family:var(--font-display); font-size:1.15rem; text-transform:uppercase; }
  .result-sub  { font-family:var(--font-mono); font-size:0.7rem; color:var(--text-mid); }
  .result-sub-text { font-size:0.82rem; color:var(--text-mid); }
  .result-countdown { display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem; }
  .cd-label { font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0; text-transform:uppercase; color:var(--text-dim); }
  .cd-timer { font-family:var(--font-mono); font-size:1.3rem; color:var(--text); letter-spacing:0.02em; }
  .result-actions { display:flex; gap:0.6rem; flex-wrap:wrap; }
  .result-btn {
    font-family:var(--font-mono); font-size:0.75rem; font-weight:700; letter-spacing:0.03em;
    padding:0.5rem 1.1rem; border-radius:5px; cursor:pointer; border:none;
    text-decoration:none; transition:opacity 0.15s; display:inline-block;
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
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.07em;
    text-transform:uppercase; color:var(--text-dim);
  }
  .mpo-title {
    font-family:var(--font-display); font-size:1.6rem; text-transform:uppercase;
    color:var(--text); display:flex; align-items:center; gap:0.6rem;
  }
  .mpo-wordmark span { color:var(--red); }
  .mpo-mode-tag {
    font-size:0.65rem; font-family:var(--font-mono); letter-spacing:0;
    text-transform:uppercase; color:var(--red);
    border:1px solid var(--red-bd); padding:0.2rem 0.5rem; border-radius:3px;
    align-self:center;
  }
  .mpo-sub { font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim); letter-spacing:0.02em; }
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
  .mpo-desc  { font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); letter-spacing:0.02em; }
  .mpo-arrow { font-size:1.1rem; color:var(--text-dim); }

  /* ── Toast ───────────────────────────────────────────────────────────────── */
  .toast {
    position:fixed; bottom:1.8rem; left:50%; transform:translateX(-50%);
    background:var(--surface2); border:1px solid var(--border2);
    color:var(--text); font-family:var(--font-mono); font-size:0.75rem;
    letter-spacing:0.02em; padding:0.5rem 1.2rem; border-radius:6px;
    z-index:300; pointer-events:none;
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width:600px) {
    .game-header { grid-template-columns:1fr 1fr; }
    .header-center { display:none; }
    .grid-headers, .guess-row { grid-template-columns:120px repeat(4,1fr); }
    .agent-name { font-size:0.78rem; }
    .cell-value { font-size:0.78rem; }
    .mpo-card { padding:1.6rem 1.2rem; }
  }
  @media (max-width:420px) {
    .grid-headers, .guess-row { grid-template-columns:90px repeat(4,1fr); }
  }
</style>
