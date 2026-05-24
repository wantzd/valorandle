<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    ABILITIES_I18N,
    compareAbilityGuess,
    getDailyAbilityTarget,
    getFreeAbilityTarget,
    abilitySearch,
    GRID_COLS, GRID_ROWS, GRID_TOTAL,
    buildRevealOrder,
    generateAbilityShareText,
  } from '../lib/abilities-data.js';
  import {
    getDailyDateKey, msUntilNextDaily, formatCountdown, saveLang, seededRandom,
  } from '../lib/game-utils.js';
  import { loadSoundPref, saveSoundPref, scheduleFlipSounds } from '../lib/sounds.js';

  // ── Constants ─────────────────────────────────────────────────────────────────
  const MAX_GUESSES_IMAGE = 8;
  const MAX_GUESSES_DESC  = 9999; // effectively unlimited
  const ATTR_COLS         = 4;
  const DAILY_KEY         = (s) => `valorandle_abilities_${s}_daily_${getDailyDateKey()}`;

  // ── Lang ─────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(ABILITIES_I18N[lang] || ABILITIES_I18N['pt-BR']);
  let isPT = $derived(lang === 'pt-BR');

  // ── View: 'select' | 'game' ───────────────────────────────────────────────────
  let view = $state('select');

  // ── Sub-mode selection (select view) ─────────────────────────────────────────
  let cardsReady   = $state(false);
  let pendingSub   = $state(null);   // 'image' | 'desc'
  let showMpicker  = $state(false);  // daily/free modal
  let imageStatus  = $state(null);   // null | 'done' | 'progress'
  let descStatus   = $state(null);

  // ── Data ─────────────────────────────────────────────────────────────────────
  let abilities = $state([]);
  let loading   = $state(true);
  let loadError = $state('');

  // ── Game params ───────────────────────────────────────────────────────────────
  let mode = $state(null);   // 'daily' | 'free'
  let sub  = $state(null);   // 'desc' | 'image'

  // ── Game state ────────────────────────────────────────────────────────────────
  let target      = $state(null);
  let guesses     = $state([]);
  let finished    = $state(false);
  let won         = $state(false);
  let inputLocked = $state(false);
  let soundOn     = $state(true);

  // ── Image mode ────────────────────────────────────────────────────────────────
  let revealOrder   = $state([]);
  let revealedCount = $state(1);

  // ── Desc mode word-reveal ─────────────────────────────────────────────────────
  let descTokens      = $state([]);
  let wordRevealOrder = $state([]);
  let wordsRevealed   = $state(1);

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
  let usedIds       = $derived(new Set(guesses.map(g => g.id)));
  let maxGuesses    = $derived(sub === 'desc' ? MAX_GUESSES_DESC : MAX_GUESSES_IMAGE);
  let attemptsLabel = $derived(
    sub === 'desc'
      ? `${guesses.length} ${isPT ? 'palpites' : 'guesses'}`
      : t.attempts(guesses.length, MAX_GUESSES_IMAGE)
  );
  let revealedCells   = $derived(new Set(revealOrder.slice(0, revealedCount)));
  let revealedWordSet = $derived(new Set(wordRevealOrder.slice(0, wordsRevealed)));

  // ─────────────────────────────────────────────────────────────────────────────
  // Mount
  // ─────────────────────────────────────────────────────────────────────────────
  onMount(async () => {
    lang    = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    soundOn = loadSoundPref();
    saveLang(lang);

    // Load abilities data
    try {
      const res = await fetch('/data/abilities-db.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const db  = await res.json();
      abilities = db.abilities ?? [];
    } catch {
      loadError = t.loadError;
      loading   = false;
      return;
    }
    loading = false;

    const P = new URLSearchParams(location.search);
    const m = P.get('mode');
    const s = P.get('sub');

    mode = m === 'free' ? 'free' : m === 'daily' ? 'daily' : null;
    sub  = s === 'desc' ? 'desc' : s === 'image' ? 'image' : null;

    if (sub && mode) {
      // Both params present → go straight to game
      view = 'game';
      startGame();
    } else {
      // Show sub-mode selector
      view = 'select';
      loadDailyStatuses();
      setTimeout(() => { cardsReady = true; }, 40);
    }
  });

  onDestroy(() => {
    if (cdInterval) clearInterval(cdInterval);
    if (toastTimer) clearTimeout(toastTimer);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Select view helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function loadDailyStatuses() {
    for (const s of ['image', 'desc']) {
      try {
        const saved = JSON.parse(localStorage.getItem(DAILY_KEY(s)) || 'null');
        const status = saved?.finished ? 'done' : (saved?.guesses?.length > 0 ? 'progress' : null);
        if (s === 'image') imageStatus = status;
        else               descStatus  = status;
      } catch {}
    }
  }

  function selectSub(s) {
    pendingSub  = s;
    showMpicker = true;
  }

  function pickMode(m) {
    const base = lang === 'en' ? '/en/abilities' : '/abilities';
    location.href = `${base}?sub=${pendingSub}&mode=${m}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Game init
  // ─────────────────────────────────────────────────────────────────────────────
  function startGame() {
    guesses     = [];
    finished    = false;
    won         = false;
    inputVal    = '';
    inputError  = '';
    acResults   = [];
    inputLocked = false;

    target = mode === 'daily'
      ? getDailyAbilityTarget(abilities, sub)
      : getFreeAbilityTarget(abilities);

    revealedCount = 1;
    wordsRevealed = 1;
    if (target) revealOrder = buildRevealOrder(target.id);

    if (target && sub === 'desc') {
      const rawDesc  = lang === 'en' ? target.descEN : target.descPT;
      const abilName = lang === 'en' ? target.nameEN : target.namePT;
      descTokens      = parseDescTokens(rawDesc, target.agentNameEN, abilName);
      wordRevealOrder = buildWordRevealOrder(descTokens, target.id);
    }

    if (mode === 'daily') {
      const saved = loadDailyState();
      if (saved && saved.targetId === target.id) {
        guesses  = (saved.guesses || []).map(g => ({ ...g, isNew: false }));
        finished = saved.finished || false;
        won      = saved.won      || false;
        const wc = guesses.filter(g => !g.feedback.every(f => f.status === 'correct')).length;
        revealedCount = saved.revealedCount ?? Math.min(1 + wc, GRID_TOTAL);
        wordsRevealed = saved.wordsRevealed  ?? Math.min(1 + wc, wordRevealOrder.length);
      }
    }

    if (finished) {
      revealedCount = GRID_TOTAL;
      wordsRevealed = wordRevealOrder.length;
    }
    if (finished && mode === 'daily') startCountdown();

    tick().then(() => inputEl?.focus());
  }

  function switchToSub(s) {
    sub = s;
    const url = new URL(location.href);
    url.searchParams.set('sub', s);
    history.replaceState(null, '', url);
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    startGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Input
  // ─────────────────────────────────────────────────────────────────────────────
  function onInput() {
    inputError  = '';
    acHighlight = -1;
    acResults   = abilitySearch(abilities, inputVal, lang, usedIds);
  }

  function onKeydown(e) {
    if (inputLocked) return;
    if (acResults.length === 0) { if (e.key === 'Enter') submitByName(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault(); acHighlight = Math.min(acHighlight + 1, acResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); acHighlight = Math.max(acHighlight - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (acHighlight >= 0) selectAbility(acResults[acHighlight]); else submitByName();
    } else if (e.key === 'Escape') {
      acResults = []; acHighlight = -1;
    }
  }

  function selectAbility(ability) {
    inputVal    = abilityLabel(ability);
    acResults   = [];
    acHighlight = -1;
    tick().then(() => inputEl?.focus());
  }

  function submitByName() {
    if (inputLocked) return;
    const q = inputVal.trim().toLowerCase();
    const match = abilities.find(a => abilityLabel(a).toLowerCase() === q);
    if (match) submitGuess(match); else inputError = t.notFound;
  }

  function submitGuess(ability) {
    if (finished || inputLocked) return;
    if (usedIds.has(ability.id)) { inputError = t.alreadyUsed; return; }
    if (!target) return;

    const feedback = compareAbilityGuess(ability, target);
    const isWin    = ability.id === target.id;
    // Desc mode: only wins end the game (no max guesses)
    const isDone   = isWin || (sub === 'image' && guesses.length + 1 >= MAX_GUESSES_IMAGE);

    guesses    = [...guesses, { id: ability.id, ability, feedback, isNew: true }];
    won        = isWin;
    finished   = isDone;
    inputVal   = '';
    acResults  = [];
    inputError = '';

    if (sub === 'image') {
      revealedCount = isDone ? GRID_TOTAL : Math.min(revealedCount + (!isWin ? 1 : 0), GRID_TOTAL);
    }
    if (sub === 'desc') {
      wordsRevealed = isDone
        ? wordRevealOrder.length
        : Math.min(wordsRevealed + 1, wordRevealOrder.length);
    }

    inputLocked = true;
    const totalMs = scheduleFlipSounds(ATTR_COLS, 115, isWin ? 'correct' : 'wrong', soundOn);

    setTimeout(() => {
      guesses = guesses.map(g => g.id === ability.id ? { ...g, isNew: false } : g);
      inputLocked = false;
      if (mode === 'daily') saveDailyState();
      if (isDone && mode === 'daily') startCountdown();
      tick().then(() => {
        if (!isDone) inputEl?.focus();
        feedbackGridEl?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }, totalMs + 60);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  function loadDailyState() {
    try { return JSON.parse(localStorage.getItem(DAILY_KEY(sub)) || 'null'); } catch { return null; }
  }
  function saveDailyState() {
    try {
      localStorage.setItem(DAILY_KEY(sub), JSON.stringify({
        targetId: target?.id,
        guesses: guesses.map(g => ({ ...g, isNew: false })),
        finished, won, revealedCount, wordsRevealed,
      }));
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Countdown / share / toast
  // ─────────────────────────────────────────────────────────────────────────────
  function startCountdown() {
    if (cdInterval) return;
    countdown  = formatCountdown(msUntilNextDaily());
    cdInterval = setInterval(() => { countdown = formatCountdown(msUntilNextDaily()); }, 1000);
  }

  function share() {
    const text = generateAbilityShareText(getDailyDateKey(), sub, guesses, won, lang);
    const url  = window.location.origin + (lang === 'en' ? '/en' : '') + '/abilities';
    navigator.clipboard.writeText(text + '\n' + url).then(showToast);
  }

  function showToast() {
    toastVisible = true;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastVisible = false; }, 2000);
  }

  function newFreeRound() {
    if (cdInterval) { clearInterval(cdInterval); cdInterval = null; }
    startGame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────
  function abilityLabel(a) {
    const name = lang === 'en' ? a.nameEN : a.namePT;
    return `${a.agentNameEN} · ${name} (${a.key})`;
  }

  function cellValue(cell) {
    if (cell.attr === 'role') return t.roles[cell.value] || cell.value;
    if (cell.attr === 'ult')  return cell.value ? t.yes : t.no;
    return cell.value;
  }

  function roleColor(role) {
    const base = (role || '').replace(' (Flex)', '').split('/').pop();
    return { Duelist:'#FF4655', Initiator:'#34d47e', Controller:'#7b8fff', Sentinel:'#f0b429' }[base] || 'var(--text-dim)';
  }

  function closeAC(e) {
    if (!acEl?.contains(e.target) && e.target !== inputEl) {
      acResults = []; acHighlight = -1;
    }
  }

  function toggleSound() { soundOn = !soundOn; saveSoundPref(soundOn); }

  // ── Desc mode helpers ─────────────────────────────────────────────────────────
  function parseDescTokens(text, agentName, abilityName) {
    const nameSet = new Set(
      [agentName, abilityName]
        .flatMap(n => n.split(/[\s/\-]+/))
        .filter(w => w.length >= 3)
        .map(w => w.toLowerCase())
    );
    const tokens = [];
    const re = /([A-Za-zÀ-ÿĀ-ɏ]+)|([^A-Za-zÀ-ÿĀ-ɏ]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) tokens.push({ type: 'word', text: m[1], isName: nameSet.has(m[1].toLowerCase()) });
      else       tokens.push({ type: 'sep',  text: m[2] });
    }
    return tokens;
  }

  function buildWordRevealOrder(tokens, seed) {
    const regular = [], names = [];
    tokens.forEach((tok, i) => {
      if (tok.type !== 'word') return;
      (tok.isName ? names : regular).push(i);
    });
    // Fisher-Yates shuffle using seeded RNG so daily is deterministic
    const rng = seededRandom(`desc-words-${seed}`);
    for (let i = regular.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [regular[i], regular[j]] = [regular[j], regular[i]];
    }
    return [...regular, ...names];
  }

  function hiddenWord(word) {
    return Array.from(word).map(c => /[A-Za-zÀ-ÿĀ-ɏ]/.test(c) ? '_' : c).join('');
  }
</script>

<svelte:window onclick={closeAC} />

<!-- ════════════════════════════════════════════════════════════════════════════ -->
<!-- SELECT VIEW — sub-mode selector (like LeagueSelect)                        -->
<!-- ════════════════════════════════════════════════════════════════════════════ -->
{#if view === 'select'}

  <!-- Daily/Free modal -->
  {#if showMpicker}
    <div class="overlay-full" onclick={(e) => { if (e.target === e.currentTarget) { showMpicker = false; pendingSub = null; } }}>
      <div class="mpo-card">
        <div class="mpo-eyebrow">Valorandle · {t.title}</div>
        <div class="mpo-title">
          <span class="mpo-wordmark">VALOR<span>ANDLE</span></span>
        </div>
        <div class="mpo-sub">
          {#if pendingSub === 'image'}
            <!-- image icon -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          {:else}
            <!-- desc icon -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
              <line x1="4" y1="7" x2="20" y2="7"/>
              <line x1="4" y1="12" x2="16" y2="12"/>
              <line x1="4" y1="17" x2="12" y2="17"/>
            </svg>
          {/if}
          {pendingSub === 'image' ? t.image : t.desc}
        </div>
        <div class="mpo-options">
          <button class="mpo-option" onclick={() => pickMode('daily')}>
            <!-- calendar icon -->
            <svg class="mpo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
            <div class="mpo-label">
              <span class="mpo-name">{t.daily}</span>
              <span class="mpo-desc">{t.modeDesc}</span>
            </div>
            <span class="mpo-arrow">→</span>
          </button>
          <button class="mpo-option" onclick={() => pickMode('free')}>
            <!-- shuffle icon -->
            <svg class="mpo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <div class="mpo-label">
              <span class="mpo-name">{t.free}</span>
              <span class="mpo-desc">{isPT ? 'Habilidade aleatória, sem limites' : 'Random ability, unlimited plays'}</span>
            </div>
            <span class="mpo-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Full-page selector -->
  <div class="sel-page">
    <header class="sel-header">
      <a class="back-btn" href={lang === 'en' ? '/en' : '/'}>
        <!-- arrow-left -->
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        {isPT ? 'Lobby' : 'Lobby'}
      </a>
      <div class="sel-logo">VALOR<span>ANDLE</span></div>
      <div class="sel-mode-pill">{t.title}</div>
    </header>

    <div class="sel-hero">
      <p class="sel-eyebrow">{isPT ? 'Habilidades' : 'Abilities'}</p>
      <h1 class="sel-title">{isPT ? 'Qual modo?' : 'Which mode?'}</h1>
      <p class="sel-sub">{isPT ? 'Escolha como quer adivinhar a habilidade' : 'Choose how you want to guess the ability'}</p>
    </div>

    {#if loading}
      <div class="sel-loading"><div class="spinner"></div></div>
    {:else if loadError}
      <p class="sel-error">{loadError}</p>
    {:else}
      <div class="sel-grid">

        <!-- Image card -->
        <button
          class="sel-card"
          style="--lc:#7b8fff; opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:80ms"
          onclick={() => selectSub('image')}
        >
          <div class="sel-icon-wrap">
            <!-- Custom icon: image with grid overlay -->
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="44" height="44" rx="5" stroke="currentColor" stroke-width="1.4"/>
              <!-- grid lines -->
              <line x1="6" y1="21.3" x2="50" y2="21.3" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>
              <line x1="6" y1="34.7" x2="50" y2="34.7" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>
              <line x1="21.3" y1="6" x2="21.3" y2="50" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>
              <line x1="34.7" y1="6" x2="34.7" y2="50" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>
              <!-- covered cells (filled) -->
              <rect x="7" y="7" width="13.3" height="13.3" rx="2" fill="currentColor" opacity="0.65"/>
              <rect x="35.7" y="7" width="13.3" height="13.3" rx="2" fill="currentColor" opacity="0.65"/>
              <rect x="7" y="22.3" width="13.3" height="11.4" rx="2" fill="currentColor" opacity="0.65"/>
              <rect x="22.3" y="35.7" width="11.4" height="13.3" rx="2" fill="currentColor" opacity="0.65"/>
              <rect x="35.7" y="22.3" width="13.3" height="11.4" rx="2" fill="currentColor" opacity="0.32"/>
              <!-- uncovered cell hint: small circle -->
              <circle cx="28" cy="14" r="2.5" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
            </svg>
          </div>
          <div class="sel-card-name">{t.image}</div>
          <div class="sel-card-desc">{t.subImgHint}</div>
          <div class="sel-card-meta">
            {isPT ? `${MAX_GUESSES_IMAGE} tentativas` : `${MAX_GUESSES_IMAGE} attempts`}
          </div>
          {#if imageStatus === 'done'}
            <div class="sel-badge sel-done">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {isPT ? 'Completo' : 'Done'}
            </div>
          {:else if imageStatus === 'progress'}
            <div class="sel-badge sel-prog">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {isPT ? 'Em progresso' : 'In progress'}
            </div>
          {/if}
        </button>

        <!-- Description card -->
        <button
          class="sel-card"
          style="--lc:#f0b429; opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:160ms"
          onclick={() => selectSub('desc')}
        >
          <div class="sel-icon-wrap">
            <!-- Custom icon: document with censored lines -->
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="4" width="38" height="48" rx="4" stroke="currentColor" stroke-width="1.4"/>
              <!-- line 1: partially filled -->
              <rect x="16" y="14" width="9" height="3" rx="1.5" fill="currentColor" opacity="0.65"/>
              <rect x="27" y="14" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.28"/>
              <!-- line 2: mostly filled -->
              <rect x="16" y="22" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.65"/>
              <!-- line 3: partially revealed -->
              <rect x="16" y="30" width="6" height="3" rx="1.5" fill="currentColor" opacity="0.28"/>
              <rect x="24" y="30" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.65"/>
              <!-- line 4: short -->
              <rect x="16" y="38" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.28"/>
            </svg>
          </div>
          <div class="sel-card-name">{t.desc}</div>
          <div class="sel-card-desc">{t.subDescHint}</div>
          <div class="sel-card-meta">
            {isPT ? 'Palpites ilimitados' : 'Unlimited guesses'}
          </div>
          {#if descStatus === 'done'}
            <div class="sel-badge sel-done">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {isPT ? 'Completo' : 'Done'}
            </div>
          {:else if descStatus === 'progress'}
            <div class="sel-badge sel-prog">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {isPT ? 'Em progresso' : 'In progress'}
            </div>
          {/if}
        </button>

      </div>
    {/if}

  </div>

<!-- ════════════════════════════════════════════════════════════════════════════ -->
<!-- GAME VIEW                                                                  -->
<!-- ════════════════════════════════════════════════════════════════════════════ -->
{:else}

  {#if loading}
    <div class="loading-screen"><div class="spinner"></div></div>
  {:else if loadError}
    <div class="loading-screen"><span class="error-msg">{loadError}</span></div>
  {:else}
  <div class="page">

    <!-- Header -->
    <header class="game-header">
      <div class="header-left">
        <a href={lang === 'pt-BR' ? '/abilities' : '/en/abilities'} class="back-btn-sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          {isPT ? 'Modos' : 'Modes'}
        </a>
        <span class="mode-tag">
          {t.title}
          {#if sub === 'image'}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          {:else}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle">
              <line x1="4" y1="7" x2="20" y2="7"/>
              <line x1="4" y1="12" x2="16" y2="12"/>
              <line x1="4" y1="17" x2="12" y2="17"/>
            </svg>
          {/if}
          {mode === 'free' ? ' · ' + t.free : ''}
        </span>
      </div>
      <div class="header-center">
        <span class="wordmark">VALOR<span>ANDLE</span></span>
      </div>
      <div class="header-right">
        <span class="attempts-chip">{attemptsLabel}</span>
        <button class="sound-btn" class:sound-off={!soundOn} onclick={toggleSound}>
          {#if soundOn}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          {/if}
        </button>
      </div>
    </header>

    <!-- Ability display -->
    {#if target}
      <div class="ability-display">

        <!-- Description sub-mode -->
        {#if sub === 'desc'}
          <div class="desc-card">
            <div class="desc-eyebrow">
              <span>{isPT ? 'Descrição da habilidade' : 'Ability description'}</span>
              <span class="desc-progress">
                {wordsRevealed}/{wordRevealOrder.length}
                {isPT ? 'palavras' : 'words'}
              </span>
            </div>
            <p class="desc-tokens">
              {#each descTokens as tok, i}
                {#if tok.type === 'sep'}<span class="tok-sep">{tok.text}</span>{:else if revealedWordSet.has(i)}<span class="tok-word visible" class:tok-name={tok.isName}>{tok.text}</span>{:else}<span class="tok-word hidden">{hiddenWord(tok.text)}</span>{/if}
              {/each}
            </p>
          </div>

        <!-- Image sub-mode -->
        {:else}
          <div class="img-card">
            <div class="img-reveal-wrap">
              {#if target.iconUrl}
                <img src={target.iconUrl} alt="ability icon" class="ability-icon" />
              {:else}
                <div class="ability-icon-placeholder"></div>
              {/if}
              <div class="reveal-grid">
                {#each Array.from({ length: GRID_TOTAL }, (_, i) => i) as cellIdx}
                  <div class="reveal-cell" class:uncovered={revealedCells.has(cellIdx)}></div>
                {/each}
              </div>
            </div>
            <div class="img-hint">
              {revealedCells.size}/{GRID_TOTAL}
              {isPT ? 'revelados' : 'revealed'}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Input -->
    {#if !finished && target}
      <div class="input-section" class:locked={inputLocked}>
        <div class="guess-input-wrap">
          <input
            bind:this={inputEl}
            bind:value={inputVal}
            oninput={onInput}
            onkeydown={onKeydown}
            type="text"
            class="guess-input"
            placeholder={t.searchPh}
            autocomplete="off"
            spellcheck="false"
            disabled={finished || inputLocked}
          />
          <button
            class="guess-btn"
            onclick={submitByName}
            disabled={!inputVal.trim() || finished || inputLocked}
          >{isPT ? 'Tentar' : 'Guess'}</button>
        </div>

        {#if acResults.length > 0}
          <div class="autocomplete-list" bind:this={acEl}>
            {#each acResults as ability, i}
              <button
                class="ac-item"
                class:highlighted={i === acHighlight}
                onclick={() => submitGuess(ability)}
              >
                <div class="ac-icon">
                  {#if ability.iconUrl}
                    <img src={ability.iconUrl} alt={ability.nameEN} loading="lazy" />
                  {/if}
                </div>
                <span class="ac-agent" style:color={roleColor(ability.agentRole)}>{ability.agentNameEN}</span>
                <span class="ac-name">{lang === 'en' ? ability.nameEN : ability.namePT}</span>
                <span class="ac-key">{ability.key}</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if inputError}
          <div class="input-error">{inputError}</div>
        {/if}
      </div>
    {/if}

    <!-- Feedback grid -->
    {#if guesses.length > 0}
      <div class="grid-wrapper">
        <div class="grid-headers">
          <div class="col-header col-agent">{t.headers.agent}</div>
          <div class="col-header">{t.headers.role}</div>
          <div class="col-header">{t.headers.key}</div>
          <div class="col-header">{t.headers.ult}</div>
        </div>
        <div class="guess-grid" bind:this={feedbackGridEl}>
          {#each guesses as g (g.id)}
            {@const a = g.ability}
            <div class="guess-row">
              <div class="guess-cell cell-agent" style="--ci:0" class:flip-new={g.isNew}
                class:correct={g.feedback[0]?.status === 'correct'}
                class:wrong={g.feedback[0]?.status === 'wrong'}
              >
                <div class="ac-icon-sm">
                  {#if a.iconUrl}<img src={a.iconUrl} alt={a.nameEN} loading="lazy" />{/if}
                </div>
                <div class="cell-agent-info">
                  <span class="cell-agent-name">{a.agentNameEN}</span>
                  <span class="cell-agent-ability">{lang === 'en' ? a.nameEN : a.namePT}</span>
                </div>
              </div>
              {#each g.feedback.slice(1) as cell, ci}
                <div
                  class="guess-cell"
                  style="--ci:{ci + 1}"
                  class:flip-new={g.isNew}
                  class:correct={cell.status === 'correct'}
                  class:close={cell.status === 'close'}
                  class:wrong={cell.status === 'wrong'}
                >
                  <span class="cell-value">{cellValue(cell)}</span>
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
          {won ? t.win(target.agentNameEN, target.key) : t.lose(target.agentNameEN, target.key)}
        </div>
        <div class="result-body">
          <div class="result-ability">
            {#if target.iconUrl}
              <div class="result-icon-wrap">
                <img class="result-icon" src={target.iconUrl} alt={target.nameEN} />
              </div>
            {/if}
            <div class="result-info">
              <span class="result-name">{lang === 'en' ? target.nameEN : target.namePT}</span>
              <span class="result-sub">{target.agentNameEN} · {target.key} · {t.roles[target.agentRole] || target.agentRole}</span>
            </div>
          </div>
          {#if mode === 'daily'}
            <div class="result-countdown">
              <span class="cd-label">{t.nextIn}</span>
              <span class="cd-timer">{countdown}</span>
            </div>
          {/if}
          <div class="result-actions">
            {#if mode === 'daily'}
              <button class="result-btn primary" onclick={share}>{t.share}</button>
            {/if}
            {#if sub === 'image'}
              <button class="result-btn accent" onclick={() => switchToSub('desc')}>
                <!-- text icon -->
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7"/>
                  <line x1="4" y1="12" x2="16" y2="12"/>
                  <line x1="4" y1="17" x2="12" y2="17"/>
                </svg>
                {isPT ? 'Jogar Descrição' : 'Play Description'}
              </button>
            {:else}
              <button class="result-btn accent" onclick={() => switchToSub('image')}>
                <!-- image icon -->
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                {isPT ? 'Jogar Imagem' : 'Play Image'}
              </button>
            {/if}
            {#if mode === 'free'}
              <button class="result-btn ghost" onclick={newFreeRound}>{t.playAgain}</button>
            {:else}
              <a class="result-btn ghost"
                href={lang === 'pt-BR' ? `/abilities?sub=${sub}&mode=free` : `/en/abilities?sub=${sub}&mode=free`}
              >{t.free}</a>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  </div>
  {/if}

{/if}

<!-- Toast -->
{#if toastVisible}
  <div class="toast">{t.copied}</div>
{/if}

<style>
  /* ── Tokens ─────────────────────────────────────────────────────────────── */
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620;
    --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32);
    --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8;
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

  /* ── Loading / error ─────────────────────────────────────────────────────── */
  .loading-screen {
    position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:10;
  }
  .spinner {
    width:32px; height:32px; border:2px solid var(--border2);
    border-top-color:var(--red); border-radius:50%; animation:spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  .error-msg { color:var(--red); font-size:0.9rem; font-family:var(--font-mono); }

  /* ════════════════════════════════════════════════════════════════════════ */
  /* SELECT VIEW                                                              */
  /* ════════════════════════════════════════════════════════════════════════ */
  .sel-page {
    position:relative; z-index:1; min-height:100vh;
    display:flex; flex-direction:column; align-items:center;
    padding:1.5rem 1.5rem 4rem;
    animation:fadeUp 0.38s ease both;
  }
  .sel-header {
    width:100%; max-width:700px; display:flex; align-items:center; gap:1rem;
    padding-bottom:1.5rem; border-bottom:1px solid var(--border); margin-bottom:2.5rem;
  }
  .back-btn {
    background:transparent; border:1px solid var(--border2); color:var(--text-dim);
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.03em;
    padding:0.4rem 0.85rem; cursor:pointer; border-radius:3px;
    transition:all 0.2s; text-decoration:none;
    display:flex; align-items:center; gap:0.4rem;
  }
  .back-btn:hover { border-color:var(--red); color:var(--red); }
  .sel-logo {
    font-family:var(--font-display); font-size:1.3rem; color:var(--text); text-transform:uppercase;
  }
  .sel-logo span { color:var(--red); }
  .sel-mode-pill {
    margin-left:auto; font-family:var(--font-mono); font-size:0.6rem; font-weight:700;
    letter-spacing:0.05em; text-transform:uppercase;
    background:var(--surface2); border:1px solid var(--border2); color:var(--text-dim);
    padding:0.3rem 0.7rem; border-radius:2px;
  }

  .sel-hero { text-align:center; margin-bottom:2.5rem; }
  .sel-eyebrow {
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.02em;
    text-transform:uppercase; color:var(--red); margin-bottom:0.75rem; opacity:0.85;
  }
  .sel-title {
    font-family:var(--font-display); font-size:clamp(2rem,6vw,3.2rem);
    text-transform:uppercase; color:var(--text); line-height:1;
  }
  .sel-sub { margin-top:0.7rem; font-size:0.8rem; color:var(--text-dim); }

  .sel-loading { padding:3rem; }

  .sel-grid {
    width:100%; max-width:560px;
    display:grid; grid-template-columns:repeat(2,1fr); gap:12px;
    animation:fadeUp 0.38s 0.07s ease both;
  }

  /* Cards — same pattern as LeagueSelect */
  .sel-card {
    background:var(--surface); border:1px solid var(--border); border-radius:6px;
    padding:2rem 1rem 1.5rem; cursor:pointer; color:inherit;
    display:flex; flex-direction:column; align-items:center; gap:0.75rem;
    position:relative; overflow:hidden;
    transition:transform 0.2s, border-color 0.2s, box-shadow 0.2s, opacity 0.35s ease;
    text-align:center;
  }
  .sel-card::after {
    content:''; position:absolute; bottom:0; left:0; right:0; height:3px;
    background:var(--lc,#fff); transform:scaleX(0); transform-origin:center;
    transition:transform 0.25s ease;
  }
  .sel-card:hover {
    transform:translateY(-4px); border-color:var(--lc,#fff);
    box-shadow:0 12px 36px rgba(0,0,0,0.4), 0 0 0 1px var(--lc,#fff);
  }
  .sel-card:hover::after { transform:scaleX(1); }
  .sel-card:hover .sel-card-name { color:var(--lc); }
  .sel-card:hover .sel-icon-wrap { transform:scale(1.1); filter:drop-shadow(0 0 10px var(--lc)); }

  .sel-icon-wrap {
    width:72px; height:72px; display:flex; align-items:center; justify-content:center;
    color:var(--lc, var(--text-mid)); transition:transform 0.3s, filter 0.3s;
  }
  .sel-icon-wrap svg { width:100%; height:100%; }
  .sel-card-name {
    font-family:var(--font-display); font-size:0.95rem; text-transform:uppercase;
    color:var(--text); transition:color 0.2s; line-height:1.2;
  }
  .sel-card-desc {
    font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0.02em;
    color:var(--text-dim); line-height:1.5;
  }
  .sel-card-meta {
    font-family:var(--font-mono); font-size:0.62rem; color:var(--lc,var(--text-dim));
    border:1px solid var(--lc,var(--border)); background:var(--surface2);
    padding:0.18rem 0.65rem; border-radius:2px; margin-top:auto; opacity:0.7;
    transition:color 0.2s, border-color 0.2s;
  }
  .sel-card:hover .sel-card-meta { opacity:1; }

  .sel-badge {
    font-family:var(--font-mono); font-size:0.58rem; margin-top:-4px;
    display:flex; align-items:center; gap:0.3rem;
  }
  .sel-done { color:var(--green); }
  .sel-prog { color:var(--text-dim); }

  .sel-error { color:var(--red); font-family:var(--font-mono); font-size:0.85rem; }

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
  .mpo-sub {
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-mid);
    letter-spacing:0.02em; display:flex; align-items:center; gap:0.3rem;
  }
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

  /* ════════════════════════════════════════════════════════════════════════ */
  /* GAME VIEW                                                                */
  /* ════════════════════════════════════════════════════════════════════════ */
  .page {
    position:relative; z-index:1; max-width:760px; margin:0 auto;
    padding:0 1rem 5rem; min-height:100vh;
    display:flex; flex-direction:column; gap:1rem;
  }

  .game-header {
    display:grid; grid-template-columns:1fr auto 1fr;
    align-items:center; padding:0.85rem 0;
    border-bottom:1px solid var(--border); margin-bottom:0.2rem;
  }
  .header-left  { display:flex; align-items:center; gap:0.6rem; }
  .header-center { text-align:center; }
  .header-right { display:flex; justify-content:flex-end; align-items:center; gap:0.6rem; }

  .back-btn-sm {
    background:transparent; border:1px solid var(--border2); color:var(--text-dim);
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.03em;
    padding:0.35rem 0.65rem; cursor:pointer; border-radius:3px;
    transition:all 0.2s; text-decoration:none;
    display:flex; align-items:center; gap:0.35rem;
  }
  .back-btn-sm:hover { border-color:var(--red); color:var(--red); }

  .mode-tag {
    font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.02em;
    text-transform:uppercase; color:var(--red);
    border:1px solid var(--red-bd); padding:0.18rem 0.5rem; border-radius:3px;
    display:flex; align-items:center; gap:0.3rem;
  }
  .wordmark { font-family:var(--font-display); font-size:1.1rem; text-transform:uppercase; }
  .wordmark span { color:var(--red); }
  .attempts-chip {
    font-family:var(--font-mono); font-size:0.72rem; color:var(--text-dim); letter-spacing:0.02em;
  }
  .sound-btn {
    width:30px; height:30px; border-radius:50%; background:none; border:1px solid var(--border2);
    color:var(--text-dim); cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:all 0.15s;
  }
  .sound-btn svg { width:14px; height:14px; }
  .sound-btn:hover { border-color:var(--red); color:var(--red); }
  .sound-btn.sound-off { opacity:0.5; }

  /* ── Ability display ─────────────────────────────────────────────────────── */
  .ability-display { display:flex; justify-content:center; }

  /* Description */
  .desc-card {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:8px; padding:1.4rem; max-width:580px; width:100%;
  }
  .desc-eyebrow {
    font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0.1em;
    text-transform:uppercase; color:var(--text-dim); margin-bottom:0.85rem;
    display:flex; justify-content:space-between; align-items:center;
  }
  .desc-progress { color:var(--red); font-size:0.58rem; white-space:nowrap; }
  .desc-tokens {
    font-family:var(--font-ui); font-size:1rem; line-height:1.9; color:var(--text);
  }
  .tok-sep { white-space:pre-wrap; }
  .tok-word.visible { color:var(--text); }
  .tok-word.tok-name { color:var(--red); font-weight:600; }
  .tok-word.hidden {
    font-family:var(--font-mono); letter-spacing:0.18em; color:var(--text-dim);
  }

  /* Image */
  .img-card { display:flex; flex-direction:column; align-items:center; gap:0.55rem; }
  .img-reveal-wrap {
    position:relative; width:200px; height:200px;
    border-radius:8px; overflow:hidden;
    border:1px solid var(--border2); background:var(--surface2);
  }
  .ability-icon { width:100%; height:100%; object-fit:contain; display:block; }
  .ability-icon-placeholder { width:100%; height:100%; background:var(--surface2); }
  .reveal-grid {
    position:absolute; inset:0; display:grid;
    grid-template-columns:repeat(5, 1fr); grid-template-rows:repeat(4, 1fr);
  }
  .reveal-cell {
    background:var(--red); outline:1px solid rgba(0,0,0,0.55);
    transition:background 0.35s ease;
  }
  .reveal-cell.uncovered { background:transparent; outline:none; }
  .img-hint {
    font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); letter-spacing:0.04em;
  }

  /* ── Input ───────────────────────────────────────────────────────────────── */
  .input-section { position:relative; }
  .input-section.locked { pointer-events:none; }
  .input-section.locked .guess-input,
  .input-section.locked .guess-btn { opacity:0.45; cursor:not-allowed; }
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
    padding:0.8rem 1.4rem; border-radius:4px; cursor:pointer; transition:opacity 0.15s; flex-shrink:0;
  }
  .guess-btn:hover:not(:disabled) { opacity:0.88; }
  .guess-btn:disabled { background:var(--surface2); color:var(--text-dim); cursor:not-allowed; }

  /* ── Autocomplete ────────────────────────────────────────────────────────── */
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
  .ac-icon {
    width:28px; height:28px; border-radius:4px; overflow:hidden;
    background:var(--border); flex-shrink:0; border:1px solid rgba(255,255,255,0.08);
    display:flex; align-items:center; justify-content:center;
  }
  .ac-icon img { width:100%; height:100%; object-fit:contain; display:block; }
  .ac-agent { font-family:var(--font-mono); font-size:0.7rem; font-weight:700; letter-spacing:0.03em; flex-shrink:0; }
  .ac-name  { font-family:var(--font-ui); font-size:0.88rem; font-weight:600; flex:1; }
  .ac-key   {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    background:var(--surface); border:1px solid var(--border2);
    border-radius:3px; padding:0.1rem 0.35rem; color:var(--text-mid); flex-shrink:0;
  }
  .input-error {
    font-family:var(--font-mono); font-size:0.7rem; color:var(--red);
    margin-top:0.45rem; padding-left:0.25rem;
  }

  /* ── Grid ────────────────────────────────────────────────────────────────── */
  .grid-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .grid-headers, .guess-row { display:grid; grid-template-columns:200px 1fr 0.7fr 0.7fr; gap:3px; }
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

  .guess-cell {
    background:var(--surface2); border:1px solid var(--border); border-radius:3px;
    padding:0.5rem 0.4rem; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px; text-align:center; min-height:56px;
  }
  .guess-cell.correct { background:var(--green-bg); border-color:var(--green-bd); }
  .guess-cell.close   { background:var(--yellow-bg); border-color:var(--yellow-bd); }
  .guess-cell.wrong   { background:var(--red-dim);   border-color:var(--red-bd); }
  .guess-cell.flip-new {
    animation:flipReveal 340ms cubic-bezier(0.4,0,0.2,1) both;
    animation-delay:calc(var(--ci, 0) * 115ms); transform-origin:center;
  }
  @keyframes flipReveal {
    0%   { transform:scaleY(1);    background:var(--surface2); border-color:var(--border); }
    42%  { transform:scaleY(0.02); background:var(--surface2); border-color:var(--border); }
    58%  { transform:scaleY(0.02); }
    100% { transform:scaleY(1); }
  }
  .cell-agent {
    align-items:flex-start; text-align:left; padding-left:0.6rem; flex-direction:row; gap:0.55rem;
  }
  .ac-icon-sm {
    width:32px; height:32px; flex-shrink:0; border-radius:4px; overflow:hidden;
    background:var(--surface2); border:1px solid rgba(255,255,255,0.06);
    display:flex; align-items:center; justify-content:center;
  }
  .ac-icon-sm img { width:100%; height:100%; object-fit:contain; display:block; }
  .cell-agent-info { display:flex; flex-direction:column; gap:0.1rem; overflow:hidden; align-self:center; }
  .cell-agent-name {
    font-family:var(--font-ui); font-size:0.88rem; font-weight:600; color:var(--text);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .cell-agent-ability {
    font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .cell-value {
    font-family:var(--font-ui); font-size:0.9rem; font-weight:600; color:var(--text); line-height:1.3;
  }

  /* ── Result panel ────────────────────────────────────────────────────────── */
  .result-panel {
    background:var(--surface); border:1px solid var(--border2);
    border-radius:8px; overflow:hidden; animation:panelUp 0.38s ease both;
  }
  @keyframes panelUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .result-status {
    padding:0.7rem 1.25rem;
    font-family:var(--font-display); font-size:0.95rem; text-transform:uppercase;
    border-bottom:1px solid var(--border);
  }
  .result-panel.won  .result-status { color:var(--green); background:var(--green-bg); }
  .result-panel.lost .result-status { color:var(--red);   background:var(--red-dim); }
  .result-body { padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.85rem; }
  .result-ability {
    display:flex; align-items:center; gap:0.85rem; padding:0.7rem 1rem;
    background:var(--surface2); border:1px solid var(--border); border-radius:4px;
  }
  .result-icon-wrap {
    width:48px; height:48px; border-radius:6px; overflow:hidden;
    background:var(--surface); flex-shrink:0; border:1px solid var(--border2);
    display:flex; align-items:center; justify-content:center;
  }
  .result-icon { width:100%; height:100%; object-fit:contain; display:block; }
  .result-info { display:flex; flex-direction:column; gap:0.2rem; }
  .result-name { font-family:var(--font-display); font-size:1.15rem; text-transform:uppercase; }
  .result-sub  { font-family:var(--font-mono); font-size:0.7rem; color:var(--text-mid); }
  .result-countdown { display:flex; flex-direction:column; align-items:flex-start; gap:0.15rem; }
  .cd-label { font-family:var(--font-mono); font-size:0.58rem; font-weight:700; text-transform:uppercase; color:var(--text-dim); }
  .cd-timer { font-family:var(--font-mono); font-size:1.3rem; font-weight:700; color:var(--text-dim); letter-spacing:0.02em; }
  .result-actions { display:flex; gap:0.6rem; flex-wrap:wrap; }
  .result-btn {
    font-family:var(--font-mono); font-size:0.75rem; font-weight:700; letter-spacing:0.03em;
    padding:0.5rem 1.1rem; border-radius:5px; cursor:pointer; border:none;
    text-decoration:none; transition:opacity 0.15s; display:inline-flex; align-items:center; gap:0.4rem;
  }
  .result-btn.primary { background:var(--red); color:#fff; }
  .result-btn.accent  { background:var(--surface2); color:var(--text); border:1px solid var(--border2); }
  .result-btn.ghost   { background:transparent; color:var(--text-mid); border:1px solid var(--border2); }
  .result-btn:hover   { opacity:0.85; }

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
    .grid-headers, .guess-row { grid-template-columns:140px 1fr 0.65fr 0.65fr; }
    .sel-grid { grid-template-columns:1fr 1fr; }
    .mpo-card { padding:1.6rem 1.2rem; }
    .cell-value { font-size:0.78rem; }
    .cell-agent-name { font-size:0.78rem; }
  }
  @media (max-width:380px) {
    .grid-headers, .guess-row { grid-template-columns:110px 1fr 0.6fr 0.6fr; }
    .sel-grid { max-width:320px; }
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
</style>
