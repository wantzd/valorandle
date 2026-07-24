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
    loadModeStats, recordModeCompletion,
  } from '../lib/game-utils.js';
  import { loadSoundPref, saveSoundPref, scheduleFlipSounds } from '../lib/sounds.js';
  import '../styles/arena.css';

  const MODE_ID = 'abilities';

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
  let streak      = $state(0);

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
    streak  = loadModeStats(MODE_ID).streak || 0;

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
      if (isDone && mode === 'daily') {
        streak = recordModeCompletion(MODE_ID, getDailyDateKey(), isWin).streak || 0;
        startCountdown();
      }
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

<header class="ticker">
  <a class="wordmark" href={view === 'game' ? (lang === 'pt-BR' ? '/abilities' : '/en/abilities') : (lang === 'pt-BR' ? '/' : '/en')} title="Lobby">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    VALOR<b>ANDLE</b>
  </a>
  <div class="meta">
    <a class="t-btn" href={lang === 'pt-BR' ? '/en/abilities' : '/abilities'}
       title={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}
       aria-label={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{lang === 'pt-BR' ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

{#if view === 'select'}

  <main class="arena" style="--accent:var(--col-emea)">
    <header class="sel-head">
      <h1>{isPT ? 'ESCOLHA O' : 'PICK THE'} <em>{isPT ? 'MODO' : 'MODE'}</em></h1>
      <p>{isPT ? 'Como quer adivinhar a habilidade?' : 'How do you want to guess the ability?'}</p>
    </header>

    {#if loading}
      <div class="msg">{isPT ? 'Carregando…' : 'Loading…'}</div>
    {:else if loadError}
      <div class="msg err">{loadError}</div>
    {:else}
      <div class="sub-grid">
        <button class="sub-card" type="button" onclick={() => selectSub('image')}>
          <span class="sub-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/><polyline points="21 15 16 10 5 21"/></svg></span>
          <span class="sub-name">{t.image}</span>
          <span class="sub-desc">{t.subImgHint}</span>
          <span class="sub-meta">{isPT ? `${MAX_GUESSES_IMAGE} tentativas` : `${MAX_GUESSES_IMAGE} attempts`}{#if imageStatus === 'done'} · <b class="ok">✓ {isPT ? 'completo' : 'done'}</b>{:else if imageStatus === 'progress'} · <b class="prog">{isPT ? 'em progresso' : 'in progress'}</b>{/if}</span>
        </button>
        <button class="sub-card" type="button" onclick={() => selectSub('desc')}>
          <span class="sub-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="12" y2="17"/></svg></span>
          <span class="sub-name">{t.desc}</span>
          <span class="sub-desc">{t.subDescHint}</span>
          <span class="sub-meta">{isPT ? 'Palpites ilimitados' : 'Unlimited guesses'}{#if descStatus === 'done'} · <b class="ok">✓ {isPT ? 'completo' : 'done'}</b>{:else if descStatus === 'progress'} · <b class="prog">{isPT ? 'em progresso' : 'in progress'}</b>{/if}</span>
        </button>
      </div>
    {/if}
  </main>

  {#if showMpicker}
    <div class="gate-overlay" onclick={(e) => { if (e.target === e.currentTarget) { showMpicker = false; pendingSub = null; } }}>
      <div class="gate-modal">
        <p class="g-ask">{pendingSub === 'image' ? t.image : t.desc} — {isPT ? 'como quer jogar?' : 'how do you want to play?'}</p>
        <div class="g-options">
          <button class="g-opt seq" type="button" onclick={() => pickMode('daily')}>
            <span class="g-tag">{isPT ? 'Desafio do dia' : 'Daily challenge'}</span>
            <span class="g-name">{isPT ? 'SEQUÊNCIA' : 'STREAK'}</span>
            <span class="g-desc">{isPT ? 'Um desafio por dia. ' : 'One challenge per day. '}{#if streak > 0}{isPT ? 'Mantém sua sequência de ' : 'Keeps your '}<b>{streak} {isPT ? 'dias' : 'day streak'}</b>{isPT ? '.' : '.'}{:else}{isPT ? 'Começa sua sequência.' : 'Starts your streak.'}{/if}</span>
          </button>
          <button class="g-opt" type="button" onclick={() => pickMode('free')}>
            <span class="g-tag">{isPT ? 'Treino' : 'Practice'}</span>
            <span class="g-name">{isPT ? 'LIVRE' : 'FREE'}</span>
            <span class="g-desc">{isPT ? 'Habilidade aleatória, sem limites.' : 'Random ability, unlimited plays.'}</span>
          </button>
        </div>
      </div>
    </div>
  {/if}

{:else}

  <main class="arena" style="--accent:var(--col-emea)">

    {#if loading}
      <div class="msg">{isPT ? 'Carregando…' : 'Loading…'}</div>
    {:else if loadError}
      <div class="msg err">{loadError}</div>
    {:else}

      <div class="statusbar" aria-label={isPT ? 'Estado da partida' : 'Match status'}>
        <div class="sb-mode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>
          <b>{t.title}{mode === 'free' ? ' · ' + t.free : ''}</b>
        </div>
        {#if sub === 'image'}
          <div class="sb-item">
            <span class="lab">{isPT ? 'Tentativas' : 'Attempts'}</span>
            <span class="val hot">{guesses.length}<small>/{MAX_GUESSES_IMAGE}</small>
              <span class="ammo" aria-hidden="true">{#each Array(MAX_GUESSES_IMAGE) as _, i}<i class:used={i < guesses.length}></i>{/each}</span>
            </span>
          </div>
        {:else}
          <div class="sb-item">
            <span class="lab">{isPT ? 'Palpites' : 'Guesses'}</span>
            <span class="val hot">{guesses.length}</span>
          </div>
        {/if}
        <div class="sb-item">
          <span class="lab">{isPT ? 'Sequência' : 'Streak'}</span>
          <span class="val">{streak}<small>{isPT ? 'dias' : 'days'}</small></span>
        </div>
        <div class="sb-tail">
          <button class="sb-btn" class:off={!soundOn} onclick={toggleSound}
            aria-label={soundOn ? (isPT ? 'Silenciar sons' : 'Mute sounds') : (isPT ? 'Ligar sons' : 'Enable sounds')}
            title={soundOn ? (isPT ? 'Silenciar sons' : 'Mute sounds') : (isPT ? 'Ligar sons' : 'Enable sounds')}>
            {#if soundOn}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            {:else}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>{/if}
          </button>
        </div>
      </div>

      {#if target}
        {#if sub === 'desc'}
          <section class="dossier">
            <div class="dossier-top">
              <span>{isPT ? 'Descrição da habilidade' : 'Ability description'}</span>
              <span class="dossier-count">{wordsRevealed}/{wordRevealOrder.length} {isPT ? 'palavras' : 'words'}</span>
            </div>
            <p class="desc-tokens">
              {#each descTokens as tok, i}
                {#if tok.type === 'sep'}<span class="tok-sep">{tok.text}</span>{:else if revealedWordSet.has(i)}<span class="tok-word visible" class:tok-name={tok.isName}>{tok.text}</span>{:else}<span class="tok-word hidden">{hiddenWord(tok.text)}</span>{/if}
              {/each}
            </p>
          </section>
        {:else}
          <section class="imgcard">
            <div class="img-reveal">
              {#if target.iconUrl}<img src={target.iconUrl} alt="ability icon" class="ability-icon" />{:else}<div class="ability-icon ph"></div>{/if}
              <div class="reveal-grid" style="--gc:{GRID_COLS}; --gr:{GRID_ROWS}">
                {#each Array.from({ length: GRID_TOTAL }, (_, i) => i) as cellIdx}
                  <div class="reveal-cell" class:uncovered={revealedCells.has(cellIdx)}></div>
                {/each}
              </div>
            </div>
            <div class="img-hint">{revealedCells.size}/{GRID_TOTAL} {isPT ? 'revelados' : 'revealed'}</div>
          </section>
        {/if}
      {/if}

      {#if !finished && target}
        <div class="gi-wrap" class:locked={inputLocked}>
          <div class="gi">
            <svg class="gi-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input bind:this={inputEl} bind:value={inputVal} oninput={onInput} onkeydown={onKeydown}
              type="text" placeholder={t.searchPh} autocomplete="off" spellcheck="false"
              aria-label={t.searchPh} disabled={finished || inputLocked} />
            <button class="go" onclick={submitByName} disabled={!inputVal.trim() || finished || inputLocked}>{isPT ? 'Tentar' : 'Guess'}</button>
          </div>
          {#if acResults.length > 0}
            <ul class="ac" bind:this={acEl}>
              {#each acResults as ability, i}
                <li>
                  <button class="ac-item" class:highlighted={i === acHighlight} onclick={() => submitGuess(ability)}>
                    <span class="ac-avatar">{#if ability.iconUrl}<img src={ability.iconUrl} alt={ability.nameEN} loading="lazy" />{/if}</span>
                    <span class="ac-agent" style:color={roleColor(ability.agentRole)}>{ability.agentNameEN}</span>
                    <span class="ac-name">{lang === 'en' ? ability.nameEN : ability.namePT}</span>
                    <span class="ac-key">{ability.key}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
          {#if inputError}<div class="gi-error">{inputError}</div>{/if}
        </div>
      {/if}

      {#if guesses.length > 0}
        <div class="board" bind:this={feedbackGridEl}>
          <div class="board-head">
            <span>{t.headers.agent}</span><span>{t.headers.role}</span><span>{t.headers.key}</span><span>{t.headers.ult}</span>
          </div>
          {#each guesses as g (g.id)}
            {@const a = g.ability}
            <div class="board-row" class:fresh={g.isNew}>
              <div class="cell name {g.feedback[0]?.status === 'correct' ? 'correct' : 'wrong'}" style="--ci:0">
                <span class="ab-avatar">{#if a.iconUrl}<img src={a.iconUrl} alt={a.nameEN} loading="lazy" />{/if}</span>
                <span class="ab-id"><span class="ab-agent">{a.agentNameEN}</span><span class="ab-nm">{lang === 'en' ? a.nameEN : a.namePT}</span></span>
              </div>
              {#each g.feedback.slice(1) as cell, ci}
                <div class="cell {cell.status}" style="--ci:{ci + 1}">
                  <em>{[t.headers.role, t.headers.key, t.headers.ult][ci]}</em>
                  <span class="cell-value">{cellValue(cell)}</span>
                </div>
              {/each}
            </div>
          {/each}
        </div>

        <div class="key">
          <span class="k-ok"><i></i>{isPT ? 'exato' : 'exact'}</span>
          <span class="k-near"><i></i>{isPT ? 'perto' : 'close'}</span>
          <span class="k-no"><i></i>{isPT ? 'sem relação' : 'no match'}</span>
        </div>
      {/if}

      {#if finished && target}
        <div class="result" class:won class:lost={!won}>
          <div class="result-status">{won ? t.win(target.agentNameEN, target.key) : t.lose(target.agentNameEN, target.key)}</div>
          <div class="result-body">
            <div class="result-ability">
              {#if target.iconUrl}<span class="result-avatar"><img src={target.iconUrl} alt={target.nameEN} /></span>{/if}
              <div class="result-info">
                <span class="result-name">{lang === 'en' ? target.nameEN : target.namePT}</span>
                <span class="result-sub">{target.agentNameEN} · {target.key} · {t.roles[target.agentRole] || target.agentRole}</span>
              </div>
            </div>
            {#if mode === 'daily'}
              <div class="result-countdown"><span class="cd-label">{t.nextIn}</span><span class="cd-timer">{countdown}</span></div>
            {/if}
            <div class="result-actions">
              {#if mode === 'daily'}<button class="result-btn primary" onclick={share}>{t.share}</button>{/if}
              {#if sub === 'image'}
                <button class="result-btn ghost" onclick={() => switchToSub('desc')}>{isPT ? 'Jogar Descrição' : 'Play Description'}</button>
              {:else}
                <button class="result-btn ghost" onclick={() => switchToSub('image')}>{isPT ? 'Jogar Imagem' : 'Play Image'}</button>
              {/if}
              {#if mode === 'free'}
                <button class="result-btn ghost" onclick={newFreeRound}>{t.playAgain}</button>
              {:else}
                <a class="result-btn ghost" href={lang === 'pt-BR' ? `/abilities?sub=${sub}&mode=free` : `/en/abilities?sub=${sub}&mode=free`}>{t.free}</a>
              {/if}
            </div>
          </div>
        </div>
      {/if}

    {/if}
  </main>

{/if}

{#if toastVisible}<div class="toast">{t.copied}</div>{/if}

<style>
  .board-head, .board-row { grid-template-columns:1.6fr repeat(3, 1fr); }
  .gi-wrap.locked { pointer-events:none; } .gi-wrap.locked .gi { opacity:0.5; }
  .msg { padding:40px 0; text-align:center; color:var(--text-dim); }
  .msg.err { color:var(--red); }

  .sel-head { padding:12px 0 6px; }
  .sel-head h1 { font-family:var(--font-display); font-size:clamp(1.6rem,3vw,2.3rem); font-weight:400; }
  .sel-head h1 em { font-style:normal; color:var(--accent); }
  .sel-head p { color:var(--text-dim); font-size:0.82rem; margin-top:8px; }
  .sub-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .sub-card {
    display:flex; flex-direction:column; align-items:flex-start; gap:10px; text-align:left;
    padding:26px 28px; background:var(--surface); border:1px solid var(--border2); color:var(--text); cursor:pointer;
    transition:border-color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out), translate var(--t-fast) var(--ease-out);
  }
  .sub-card:hover { border-color:color-mix(in srgb, var(--accent) 55%, transparent); background:var(--surface2); translate:0 -2px; }
  .sub-icon { width:40px; height:40px; display:flex; align-items:center; justify-content:center; color:var(--accent); background:color-mix(in srgb,var(--accent) 8%,transparent); border:1px solid color-mix(in srgb,var(--accent) 28%,transparent); }
  .sub-icon svg { width:20px; height:20px; }
  .sub-name { font-family:var(--font-display); font-size:1.2rem; }
  .sub-desc { font-size:0.8rem; color:var(--text-mid); line-height:1.5; }
  .sub-meta { font-size:0.68rem; color:var(--text-dim); }
  .sub-meta b.ok { color:var(--green); } .sub-meta b.prog { color:var(--accent); }

  .gate-overlay { position:fixed; inset:0; z-index:160; background:rgba(8,9,13,0.9); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px; }
  .gate-modal { width:100%; max-width:640px; }
  .gate-modal .g-ask { margin-bottom:14px; color:var(--text-mid); font-size:0.85rem; }
  .gate-modal .g-options { display:grid; grid-template-columns:1fr 1fr; gap:14px; }

  .dossier { background:var(--surface); border:1px solid var(--border2); padding:24px 28px; }
  .dossier-top { display:flex; justify-content:space-between; gap:12px; margin-bottom:16px; font-size:0.78rem; color:var(--text-mid); font-weight:700; }
  .dossier-count { color:var(--text-dim); font-weight:600; font-variant-numeric:tabular-nums; }
  .desc-tokens { font-size:1.02rem; line-height:2.05; color:var(--text-mid); max-width:65ch; }
  .tok-sep { white-space:pre-wrap; }
  .tok-word { display:inline-block; padding:0 3px; }
  .tok-word.visible { color:var(--text); }
  .tok-word.tok-name { color:var(--accent); background:color-mix(in srgb,var(--accent) 10%,transparent); }
  .tok-word.hidden { color:var(--text-dim); letter-spacing:0.06em; background:linear-gradient(100deg,var(--surface2) 40%,var(--border) 50%,var(--surface2) 60%); background-size:220% 100%; animation:shimmer 2.4s linear infinite; border-radius:2px; }
  @keyframes shimmer { from { background-position:120% 0; } to { background-position:-120% 0; } }

  .imgcard { display:flex; flex-direction:column; align-items:center; gap:14px; padding:24px; background:var(--surface); border:1px solid var(--border2); }
  .img-reveal { position:relative; width:220px; height:220px; }
  .ability-icon { width:100%; height:100%; object-fit:contain; }
  .ability-icon.ph { background:var(--surface2); }
  .reveal-grid { position:absolute; inset:0; display:grid; grid-template-columns:repeat(var(--gc,5),1fr); grid-template-rows:repeat(var(--gr,5),1fr); }
  .reveal-cell { background:var(--surface); border:1px solid var(--bg); transition:opacity 0.4s var(--ease-out); }
  .reveal-cell.uncovered { opacity:0; }
  .img-hint { font-size:0.72rem; color:var(--text-dim); font-variant-numeric:tabular-nums; }

  .ab-avatar { width:30px; height:30px; flex:none; overflow:hidden; background:var(--surface); }
  .ab-avatar img { width:100%; height:100%; object-fit:contain; }
  .ab-id { display:flex; flex-direction:column; gap:1px; min-width:0; }
  .ab-agent { font-size:0.68rem; color:var(--text-dim); }
  .ab-nm { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ac-avatar { width:26px; height:26px; flex:none; overflow:hidden; background:var(--border); }
  .ac-avatar img { width:100%; height:100%; object-fit:contain; }
  .ac-agent { font-size:0.72rem; font-weight:700; }
  .ac-key { margin-left:auto; font-size:0.7rem; color:var(--text-dim); }

  .result-ability { display:flex; align-items:center; gap:12px; background:var(--surface2); border:1px solid var(--border); padding:12px 14px; }
  .result-avatar { width:46px; height:46px; flex:none; overflow:hidden; background:var(--surface); }
  .result-avatar img { width:100%; height:100%; object-fit:contain; }
  .result-info { display:flex; flex-direction:column; gap:2px; }
  .result-name { font-family:var(--font-display); font-size:1.1rem; }
  .result-sub { font-size:0.72rem; color:var(--text-mid); }

  @media (max-width: 720px) {
    .sub-grid { grid-template-columns:1fr; }
    .gate-modal .g-options { grid-template-columns:1fr; }
    .board-head { display:none; }
    .board-row { grid-template-columns:repeat(3, 1fr); background:var(--surface); border:1px solid var(--border); padding:10px; }
    .board-row .cell.name { grid-column:1 / -1; background:none; border:none; padding:2px 4px 8px; }
    .board-row .cell { border-bottom:none; }
    .board-row .cell:not(.name) { border:1px solid var(--border2); }
    .board-row .cell em { display:block; }
    .desc-tokens { font-size:0.92rem; }
    .img-reveal { width:180px; height:180px; }
  }
</style>
