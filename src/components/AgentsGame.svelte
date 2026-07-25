<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    AGENTS_DB, AGENTS_I18N,
    compareAgentGuess, getDailyAgentTarget, getFreeAgentTarget, agentSearch,
  } from '../lib/agents-data.js';
  import {
    getDailyDateKey, msUntilNextDaily, formatCountdown,
    saveLang, loadModeStats, recordModeCompletion,
  } from '../lib/game-utils.js';
  import { loadSoundPref, saveSoundPref, scheduleFlipSounds } from '../lib/sounds.js';
  import '../styles/arena.css';

  const MODE_ID = 'agents';

  const MAX_GUESSES = 8;
  const DAILY_KEY   = () => `valorandle_agents_daily_${getDailyDateKey()}`;
  // 5 attribute columns after the agent cell (gender, role, origin, year, ult)
  const ATTR_COLS   = 5;

  // ── Lang ──────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(AGENTS_I18N[lang] || AGENTS_I18N['pt-BR']);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  let mode         = $state(null);
  let showPicker   = $state(false);
  let showTutorial = $state(false);
  let streak       = $state(0);

  const TUT_KEY = 'valorandle_agents_tutorial_seen_v1';
  const tutSteps = $derived(lang === 'en' ? [
    'A <b>VALORANT agent</b> is hidden. Type agent names to guess who it is.',
    'Each guess compares <b>role</b>, <b>gender</b>, <b>origin</b>, <b>release year</b> and <b>ult cost</b>.',
    '🟩 exact, 🟨 close, 🟥 no match. Arrows <b>↑ / ↓</b> tell you if the year is higher or lower.',
    'You have <b>8 attempts</b>. The confirmed clues stack up as you narrow it down.',
  ] : [
    'Um <b>agente de VALORANT</b> está escondido. Digite nomes de agentes para chutar.',
    'Cada palpite compara <b>função</b>, <b>gênero</b>, <b>origem</b>, <b>ano de lançamento</b> e <b>custo da ult</b>.',
    '🟩 exato, 🟨 perto, 🟥 sem relação. As setas <b>↑ / ↓</b> mostram se o ano é maior ou menor.',
    'Você tem <b>8 tentativas</b>. As pistas confirmadas se acumulam conforme você fecha o cerco.',
  ]);

  function maybeTutorialThenStart() {
    if (!localStorage.getItem(TUT_KEY)) showTutorial = true;
    else startGame();
  }
  function dismissTutorial() {
    try { localStorage.setItem(TUT_KEY, '1'); } catch {}
    showTutorial = false;
    startGame();
  }

  // ── Game state ────────────────────────────────────────────────────────────────
  let targetId    = $state(null);
  let guesses     = $state([]);    // [{ agentId, feedback, isNew }]
  let finished    = $state(false);
  let won         = $state(false);

  // ── Animation / input lock ────────────────────────────────────────────────────
  let inputLocked = $state(false);

  // ── Sound ─────────────────────────────────────────────────────────────────────
  let soundOn     = $state(true);

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
    lang    = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    soundOn = loadSoundPref();
    saveLang(lang);
    streak  = loadModeStats(MODE_ID).streak || 0;

    const P = new URLSearchParams(location.search);
    const m = P.get('mode');
    mode = m === 'free' ? 'free' : m === 'daily' ? 'daily' : null;

    if (!mode) { showPicker = true; return; }
    maybeTutorialThenStart();
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
    maybeTutorialThenStart();
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

    targetId = mode === 'daily' ? getDailyAgentTarget() : getFreeAgentTarget();

    if (mode === 'daily') {
      const saved = loadDailyState();
      if (saved && saved.targetId === targetId) {
        guesses  = (saved.guesses || []).map(g => ({ ...g, isNew: false }));
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Sound toggle
  // ─────────────────────────────────────────────────────────────────────────────
  function toggleSound() {
    soundOn = !soundOn;
    saveSoundPref(soundOn);
  }

  function onKeydown(e) {
    if (inputLocked) return;
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
    if (inputLocked) return;
    const q = inputVal.trim().toLowerCase();
    const match = Object.keys(AGENTS_DB).find(id =>
      AGENTS_DB[id].name.toLowerCase() === q
    );
    if (match) submitGuess(match);
    else inputError = t.notFound;
  }

  function submitGuess(agentId) {
    if (finished || inputLocked) return;
    if (guessedIds.has(agentId)) { inputError = t.alreadyGuessed; return; }
    if (!AGENTS_DB[agentId])     { inputError = t.notFound; return; }

    const feedback = compareAgentGuess(agentId, targetId, lang);
    const isWin  = feedback.every(f => f.status === 'correct');
    const isDone = isWin || guesses.length + 1 >= MAX_GUESSES;
    guesses    = [...guesses, { agentId, feedback, isNew: true }];
    won        = isWin;
    finished   = isDone;
    inputVal   = '';
    acResults  = [];
    inputError = '';

    // Lock input and schedule flip sounds
    inputLocked = true;
    const soundResult = isWin ? 'correct' : 'wrong';
    const totalMs = scheduleFlipSounds(ATTR_COLS, 115, soundResult, soundOn);

    setTimeout(() => {
      guesses = guesses.map(g => g.agentId === agentId ? { ...g, isNew: false } : g);
      inputLocked = false;
      if (mode === 'daily') {
        saveDailyState({ targetId, guesses: guesses.map(g => ({ ...g, isNew: false })), finished: isDone, won: isWin });
      }
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

<header class="ticker">
  <a class="wordmark" href={lang === 'pt-BR' ? '/' : '/en'} title="Lobby">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    VALOR<b>ANDLE</b>
  </a>
  <div class="meta">
    <a class="t-btn" href={lang === 'pt-BR' ? '/en/agents' : '/agents'}
       title={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}
       aria-label={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{lang === 'pt-BR' ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

<main class="arena">

  {#if showPicker}
    <div class="gate">
      <p class="g-ask">{lang === 'en' ? 'How do you want to play?' : 'Como quer jogar?'}</p>
      <div class="g-options">
        <button class="g-opt seq" type="button" onclick={() => pickMode('daily')}>
          <span class="g-tag">{lang === 'en' ? 'Daily challenge' : 'Desafio do dia'}</span>
          <span class="g-name">{lang === 'en' ? 'STREAK' : 'SEQUÊNCIA'}</span>
          <span class="g-desc">
            {lang === 'en' ? 'One challenge per day. ' : 'Um desafio por dia. '}
            {#if streak > 0}{lang === 'en' ? 'Keeps your ' : 'Mantém sua sequência de '}<b>{streak} {lang === 'en' ? 'day streak' : 'dias'}</b>{lang === 'en' ? ' in this mode.' : ' neste modo.'}{:else}{lang === 'en' ? 'Starts your streak in this mode.' : 'Começa sua sequência neste modo.'}{/if}
          </span>
        </button>
        <button class="g-opt" type="button" onclick={() => pickMode('free')}>
          <span class="g-tag">{lang === 'en' ? 'Practice' : 'Treino'}</span>
          <span class="g-name">{lang === 'en' ? 'FREE' : 'LIVRE'}</span>
          <span class="g-desc">{lang === 'en' ? 'As many rounds as you want. Does not count toward the streak.' : 'Quantas partidas quiser. Não conta para a sequência.'}</span>
        </button>
      </div>
    </div>
  {:else if !showTutorial}

    <div class="statusbar" aria-label={lang === 'en' ? 'Match status' : 'Estado da partida'}>
      <div class="sb-mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>
        </svg>
        <b>{t.modeTag}{mode === 'free' ? ' · ' + t.modeFree : ''}</b>
      </div>
      <div class="sb-item">
        <span class="lab">{lang === 'en' ? 'Attempts' : 'Tentativas'}</span>
        <span class="val hot">{guesses.length}<small>/{MAX_GUESSES}</small>
          <span class="ammo" aria-hidden="true">
            {#each Array(MAX_GUESSES) as _, i}<i class:used={i < guesses.length}></i>{/each}
          </span>
        </span>
      </div>
      <div class="sb-item">
        <span class="lab">{lang === 'en' ? 'Streak' : 'Sequência'}</span>
        <span class="val">{streak}<small>{lang === 'en' ? 'days' : 'dias'}</small></span>
      </div>
      <div class="sb-tail">
        <button class="sb-btn" class:off={!soundOn} onclick={toggleSound}
          title={soundOn ? (lang === 'en' ? 'Mute sounds' : 'Silenciar sons') : (lang === 'en' ? 'Enable sounds' : 'Ligar sons')}
          aria-label={soundOn ? (lang === 'en' ? 'Mute sounds' : 'Silenciar sons') : (lang === 'en' ? 'Enable sounds' : 'Ligar sons')}>
          {#if soundOn}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          {/if}
        </button>
      </div>
    </div>

    {#if !finished}
      <div class="gi-wrap" class:locked={inputLocked}>
        <div class="gi">
          <svg class="gi-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            bind:this={inputEl}
            bind:value={inputVal}
            oninput={onInput}
            onkeydown={onKeydown}
            type="text"
            placeholder={t.placeholder}
            autocomplete="off"
            spellcheck="false"
            aria-label={t.placeholder}
            disabled={finished || inputLocked}
          />
          <button class="go" onclick={submitByName} disabled={!inputVal.trim() || finished || inputLocked}>{t.confirmBtn}</button>
        </div>

        {#if acResults.length > 0}
          <ul class="ac" bind:this={acEl}>
            {#each acResults as id, i}
              {@const a = AGENTS_DB[id]}
              <li>
                <button class="ac-item" class:highlighted={i === acHighlight} onclick={() => submitGuess(id)}>
                  <span class="ac-avatar"><img src={a.icon} alt={a.name} loading="lazy" /></span>
                  <span class="ac-name">{a.name}</span>
                  <span class="ac-role" style:color={roleColor(a.role)}>{roleLabel(a.role)}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        {#if inputError}<div class="gi-error">{inputError}</div>{/if}
      </div>
    {/if}

    {#if guesses.length > 0 || !finished}
      <div class="board" bind:this={feedbackGridEl}>
        <div class="board-head">
          <span>{t.headers.agent}</span><span>{t.headers.gender}</span><span>{t.headers.role}</span>
          <span>{t.headers.origin}</span><span>{t.headers.year}</span><span>{t.headers.ult}</span>
        </div>

        {#each guesses as g (g.agentId)}
          {@const a = AGENTS_DB[g.agentId]}
          <div class="board-row" class:fresh={g.isNew}>
            <div class="cell name" style="--ci:0">
              <span class="agent-avatar" style:--role-color={roleColor(a.role)}><img src={a.icon} alt={a.name} loading="lazy" /></span>
              {a.name}
            </div>
            {#each g.feedback as cell, ci}
              <div class="cell {cell.status}" style="--ci:{ci + 1}">
                <em>{[t.headers.gender, t.headers.role, t.headers.origin, t.headers.year, t.headers.ult][ci]}</em>
                <span class="cell-value">{cell.value}</span>
                {#if cell.hint}<span class="cell-hint">{cell.hint}</span>{/if}
              </div>
            {/each}
          </div>
        {/each}

        {#if !finished}
          {#each Array(Math.max(0, MAX_GUESSES - guesses.length)) as _, i}
            <div class="board-row ghost" aria-hidden="true">
              <div class="cell name">{guesses.length + i + 1}º</div>
              {#each Array(ATTR_COLS) as _}<div class="cell"></div>{/each}
            </div>
          {/each}
        {/if}
      </div>

      <div class="key">
        <span class="k-ok"><i></i>{lang === 'en' ? 'exact' : 'exato'}</span>
        <span class="k-near"><i></i>{lang === 'en' ? 'close' : 'perto'}</span>
        <span class="k-no"><i></i>{lang === 'en' ? 'no match' : 'sem relação'}</span>
      </div>
    {/if}

    {#if finished && target}
      <div class="result" class:won class:lost={!won}>
        <div class="result-status">{won ? t.win : t.lose(target.name)}</div>
        <div class="result-body">
          <div class="result-agent">
            <span class="result-avatar" style:--role-color={roleColor(target.role)}><img src={target.icon} alt={target.name} /></span>
            <div class="result-info">
              <span class="result-name">{target.name}</span>
              <span class="result-sub">{roleLabel(target.role)} · {target.year}</span>
            </div>
          </div>
          <div class="result-sub-text">{won ? t.winSub(guesses.length) : t.loseSub}</div>
          {#if mode === 'daily'}
            <div class="result-countdown"><span class="cd-label">{t.nextDaily}</span><span class="cd-timer">{countdown}</span></div>
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

  {/if}
</main>

{#if showTutorial}
  <div class="gate-overlay">
    <div class="tut-modal" style="--accent:var(--col-pacific)">
      <div class="tut-eyebrow">{t.modeTag}</div>
      <div class="tut-title">{lang === 'en' ? 'HOW TO' : 'COMO'} <em>{lang === 'en' ? 'PLAY' : 'JOGAR'}</em></div>
      <div class="tut-steps">
        {#each tutSteps as step, i}
          <div class="tut-step"><div class="tut-num">{i + 1}</div><div class="tut-text">{@html step}</div></div>
        {/each}
      </div>
      <button class="result-btn primary" onclick={dismissTutorial}>{lang === 'en' ? 'Got it →' : 'Entendido →'}</button>
    </div>
  </div>
{/if}

{#if toastVisible}<div class="toast">{t.copiedToast}</div>{/if}

<style>
  .board-head, .board-row { grid-template-columns:1.4fr repeat(5, 1fr); }
  .gi-wrap.locked { pointer-events:none; }
  .gi-wrap.locked .gi { opacity:0.5; }

  .agent-avatar {
    width:30px; height:30px; flex:none; overflow:hidden;
    border:2px solid var(--role-color, var(--border2)); background:var(--surface2);
  }
  .agent-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
  .ac-avatar { width:26px; height:26px; flex:none; overflow:hidden; border-radius:50%; background:var(--border); }
  .ac-avatar img { width:100%; height:100%; object-fit:cover; display:block; }

  .result-agent { display:flex; align-items:center; gap:12px; background:var(--surface2); border:1px solid var(--border); padding:12px 14px; }
  .result-avatar { width:46px; height:46px; flex:none; overflow:hidden; border:2px solid var(--role-color, var(--border2)); background:var(--surface); }
  .result-avatar img { width:100%; height:100%; object-fit:cover; display:block; }
  .result-info { display:flex; flex-direction:column; gap:2px; }
  .result-name { font-family:var(--font-display); font-size:1.1rem; }
  .result-sub { font-size:0.72rem; color:var(--text-mid); }

  @media (max-width: 720px) {
    .board-head { display:none; }
    .board-row { grid-template-columns:repeat(3, 1fr); background:var(--surface); border:1px solid var(--border); padding:10px; }
    .board-row .cell.name { grid-column:1 / -1; background:none; border:none; padding:2px 4px 8px; }
    .board-row .cell { border-bottom:none; }
    .board-row .cell:not(.name) { border:1px solid var(--border2); }
    .board-row .cell em { display:block; }
  }
</style>
