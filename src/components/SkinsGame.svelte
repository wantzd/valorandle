<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    SKINS_I18N, compareSkins, patchToAct,
    getDailySkinTarget, getFreeSkinTarget, skinSearch,
  } from '../lib/skins-data.js';
  import { getDailyDateKey, msUntilNextDaily, formatCountdown, loadModeStats, recordModeCompletion } from '../lib/game-utils.js';
  import { playSound, loadSoundPref, saveSoundPref, scheduleFlipSounds } from '../lib/sounds.js';
  import '../styles/arena.css';

  const MODE_ID = 'skins';
  const MAX_GUESSES = 6;
  const DAILY_KEY   = () => `valorandle_skins_daily_${getDailyDateKey()}`;
  // 4 attribute columns after the name cell (bundle, weapon, edition, act)
  const ATTR_COLS   = 4;

  // Pre-generated waveform bar heights — deterministic sine pattern
  const WAVE_BARS = Array.from({ length: 36 }, (_, i) => ({
    i,
    h: Math.max(12, Math.round(Math.abs(Math.sin(i * 0.72) * 36 + Math.sin(i * 0.31) * 20) + 14)),
  }));

  // ── Lang ──────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let t    = $derived(SKINS_I18N[lang] || SKINS_I18N['pt-BR']);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  let mode       = $state(null);
  let showPicker = $state(false);
  let streak     = $state(0);

  // ── Data (loaded async) ───────────────────────────────────────────────────────
  let allSkins      = $state([]);
  let dailyPool     = $state([]);
  let patches       = $state({});
  let editionIcons  = $state({});
  let loading       = $state(true);
  let loadError     = $state('');

  // ── Game state ────────────────────────────────────────────────────────────────
  let targetUuid = $state(null);
  let guesses    = $state([]);   // [{ uuid, displayName, bundleName, weapon, feedback, isNew }]
  let finished   = $state(false);
  let won        = $state(false);

  // ── Animation / input lock ────────────────────────────────────────────────────
  let inputLocked = $state(false);

  // ── Sound ─────────────────────────────────────────────────────────────────────
  let soundOn = $state(true);

  // ── Audio player ──────────────────────────────────────────────────────────────
  let audioEl     = $state(null);
  let isPlaying   = $state(false);
  let progress    = $state(0);
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
  let guessedUuids  = $derived(new Set(guesses.map(g => g.uuid)));
  let target        = $derived(allSkins.find(s => s.uuid === targetUuid) ?? null);
  let attemptsLabel = $derived(t.attempts(guesses.length, MAX_GUESSES));
  let guessLabel    = $derived(
    guesses.length === 0 ? '' :
    lang === 'en'
      ? `${guesses.length} guess${guesses.length !== 1 ? 'es' : ''}`
      : `${guesses.length} palpite${guesses.length !== 1 ? 's' : ''}`
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Mount
  // ─────────────────────────────────────────────────────────────────────────────
  onMount(async () => {
    lang    = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    soundOn = loadSoundPref();
    streak  = loadModeStats(MODE_ID).streak || 0;

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
      dailyPool    = allSkins.filter(s => patchesData[s.bundleName] != null);
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
    guesses     = [];
    finished    = false;
    won         = false;
    inputVal    = '';
    inputError  = '';
    acResults   = [];
    inputLocked = false;
    resetAudio();

    const pool = dailyPool;
    const skin = mode === 'daily' ? getDailySkinTarget(pool) : getFreeSkinTarget(pool);
    targetUuid = skin?.uuid ?? null;

    if (mode === 'daily') {
      const saved = loadDailyState();
      // Only restore if the saved target matches today's target
      if (saved && saved.targetUuid === targetUuid) {
        guesses  = (saved.guesses || []).map(g => ({ ...g, isNew: false }));
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
    const rect  = e.currentTarget.getBoundingClientRect();
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
  // Sound toggle
  // ─────────────────────────────────────────────────────────────────────────────
  function toggleSound() {
    soundOn = !soundOn;
    saveSoundPref(soundOn);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Input / autocomplete
  // ─────────────────────────────────────────────────────────────────────────────
  function onInput() {
    inputError  = '';
    acHighlight = -1;
    acResults   = skinSearch(dailyPool, inputVal, guessedUuids, lang);
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
      if (acHighlight >= 0) selectSkin(acResults[acHighlight]);
      else submitByName();
    } else if (e.key === 'Escape') {
      acResults = []; acHighlight = -1;
    }
  }

  // Returns the localised display name / bundle name for a skin
  function skinName(skin)   { return lang !== 'en' ? (skin.displayNamePT ?? skin.displayName) : skin.displayName; }
  function skinBundle(skin) { return lang !== 'en' ? (skin.bundleNamePT  ?? skin.bundleName)  : skin.bundleName; }

  function selectSkin(skin) {
    inputVal    = skinName(skin);
    acResults   = [];
    acHighlight = -1;
    tick().then(() => inputEl?.focus());
  }

  function submitByName() {
    if (inputLocked) return;
    const q = inputVal.trim().toLowerCase();
    // match against localised name OR english name
    const match = dailyPool.find(s =>
      skinName(s).toLowerCase() === q || s.displayName.toLowerCase() === q
    );
    if (match) submitGuess(match);
    else inputError = t.notFound;
  }

  function submitGuess(skin) {
    if (finished || inputLocked) return;
    if (guessedUuids.has(skin.uuid)) { inputError = t.alreadyGuessed; return; }

    const feedback = compareSkins(skin, target, patches, lang);
    const newGuess = {
      uuid: skin.uuid,
      displayName: skin.displayName, displayNamePT: skin.displayNamePT,
      bundleName: skin.bundleName, bundleNamePT: skin.bundleNamePT,
      weapon: skin.weapon,
      feedback, isNew: true,
    };

    guesses    = [...guesses, newGuess];
    const isWin = feedback.every(f => f.status === 'correct');
    const isDone = isWin || guesses.length >= MAX_GUESSES;
    won      = isWin;
    finished = isDone;
    inputVal  = '';
    acResults = [];
    inputError = '';

    // Lock input while flip animation plays + schedule sounds
    inputLocked = true;
    const soundResult = isWin ? 'correct' : 'wrong';
    const totalMs = scheduleFlipSounds(ATTR_COLS, 115, soundResult, soundOn);
    const capturedUuid = skin.uuid;

    setTimeout(() => {
      // Strip isNew once animation completes
      guesses = guesses.map(g => g.uuid === capturedUuid ? { ...g, isNew: false } : g);
      inputLocked = false;
      if (mode === 'daily') {
        saveDailyState({ targetUuid, guesses: guesses.map(g => ({ ...g, isNew: false })), finished: isDone, won: isWin });
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

<header class="ticker">
  <a class="wordmark" href={lang === 'pt-BR' ? '/' : '/en'} title="Lobby">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    VALOR<b>ANDLE</b>
  </a>
  <div class="meta">
    <a class="t-btn" href={lang === 'pt-BR' ? '/en/skins' : '/skins'}
       title={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}
       aria-label={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{lang === 'pt-BR' ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

<main class="arena" style="--accent:var(--col-all)">

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
  {:else}

    <div class="statusbar" aria-label={lang === 'en' ? 'Match status' : 'Estado da partida'}>
      <div class="sb-mode">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12h13l5-3v6l-5-3 M6 12v5h3v-5"/></svg>
        <b>SKINS{mode === 'free' ? ' · ' + t.modeFree : ''}</b>
      </div>
      <div class="sb-item">
        <span class="lab">{lang === 'en' ? 'Attempts' : 'Tentativas'}</span>
        <span class="val hot">{guesses.length}<small>/{MAX_GUESSES}</small>
          <span class="ammo" aria-hidden="true">{#each Array(MAX_GUESSES) as _, i}<i class:used={i < guesses.length}></i>{/each}</span>
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

    {#if loading}
      <div class="msg">{lang === 'en' ? 'Loading…' : 'Carregando…'}</div>
    {:else if loadError}
      <div class="msg err">{loadError}</div>
    {:else if target}

      <!-- svelte-ignore a11y-media-has-caption -->
      <audio bind:this={audioEl} src={target.audioUrl} onloadedmetadata={onAudioMetadata} ontimeupdate={onAudioTimeUpdate} onended={onAudioEnded} preload="metadata"></audio>

      <section class="stage" class:playing={isPlaying}>
        <button class="play" onclick={togglePlay} disabled={!audioReady}
          title={isPlaying ? (lang === 'en' ? 'Pause' : 'Pausar') : (lang === 'en' ? 'Play' : 'Ouvir')}
          aria-label={isPlaying ? (lang === 'en' ? 'Pause' : 'Pausar') : (lang === 'en' ? 'Play' : 'Ouvir')}>
          {#if isPlaying}
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6,3 20,12 6,21"/></svg>
          {/if}
        </button>
        <div class="wave" aria-hidden="true">
          {#each WAVE_BARS as bar}<i style="--p:{Math.max(0.16, bar.h / 70).toFixed(2)}; --d:{(0.6 + (bar.i % 6) * 0.13).toFixed(2)}s; --dly:{(((bar.i * 37) % 11) * 0.05).toFixed(2)}s"></i>{/each}
        </div>
        <div class="stage-progress">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="pbar" onclick={seekAudio}>
            <div class="pfill" style:width="{progress * 100}%"></div>
          </div>
          <span class="ptime">{formatTime(currentSec)} / {formatTime(durationSec)}</span>
          <button class="preplay" onclick={replayAudio} title={lang === 'en' ? 'Restart' : 'Reiniciar'}>{t.replayBtn}</button>
        </div>
        {#if finished}
          <div class="stage-reveal">
            <span class="sr-name">{skinName(target)}</span>
            <span class="sr-sub">{skinBundle(target)} · {target.weapon} · {target.edition}</span>
          </div>
        {/if}
      </section>

      {#if !finished}
        <div class="gi-wrap" class:locked={inputLocked}>
          <div class="gi">
            <svg class="gi-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input bind:this={inputEl} bind:value={inputVal} oninput={onInput} onkeydown={onKeydown}
              type="text" placeholder={t.placeholder} autocomplete="off" spellcheck="false"
              aria-label={t.placeholder} disabled={finished || inputLocked} />
            <button class="go" onclick={submitByName} disabled={!inputVal.trim() || finished || inputLocked}>{t.confirmBtn}</button>
          </div>
          {#if acResults.length > 0}
            <ul class="ac" bind:this={acEl}>
              {#each acResults as skin, i}
                <li>
                  <button class="ac-item" class:highlighted={i === acHighlight}
                    onclick={() => selectSkin(skin)} ondblclick={() => submitGuess(skin)}>
                    <span class="ac-meta"><span class="ac-name">{skinName(skin)}</span><span class="ac-sub2">{skinBundle(skin)} · {skin.weapon}</span></span>
                    {#if editionIcons[skin.edition]}<img class="ac-edicon" src={editionIcons[skin.edition]} alt={skin.edition} title={skin.edition} />{:else}<span class="ac-sub">{skin.edition}</span>{/if}
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
            <span>{t.headers.skin}</span><span>{t.headers.bundle}</span><span>{t.headers.weapon}</span><span>{t.headers.edition}</span><span>{t.headers.act}</span>
          </div>
          {#each guesses as g (g.uuid)}
            <div class="board-row" class:fresh={g.isNew}>
              <div class="cell name" style="--ci:0">
                <span class="skin-cell">
                  <span class="skin-nm">{lang !== 'en' ? (g.displayNamePT ?? g.displayName) : g.displayName}</span>
                  <span class="skin-bd">{lang !== 'en' ? (g.bundleNamePT ?? g.bundleName) : g.bundleName}</span>
                </span>
              </div>
              {#each g.feedback as cell, ci}
                <div class="cell {cell.status}" style="--ci:{ci + 1}">
                  <em>{[t.headers.bundle, t.headers.weapon, t.headers.edition, t.headers.act][ci]}</em>
                  {#if cell.attr === 'edition' && editionIcons[cell.value]}
                    <img class="edicon" src={editionIcons[cell.value]} alt={cell.value} title={cell.value} />
                  {:else}
                    <span class="cell-value">{cell.value}</span>
                  {/if}
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
          <span class="k-no"><i></i>{lang === 'en' ? 'no match' : 'sem relação'}</span>
        </div>
      {/if}

      {#if finished}
        <div class="result" class:won class:lost={!won}>
          <div class="result-status">{won ? t.win : t.lose(skinName(target))}</div>
          <div class="result-body">
            <div class="result-sub-text">{won ? t.winSub(guesses.length) : t.loseSub}</div>
            {#if mode === 'daily'}
              <div class="result-countdown"><span class="cd-label">{t.nextDaily}</span><span class="cd-timer">{countdown}</span></div>
              <div class="result-actions">
                <button class="result-btn primary" onclick={share}>{t.shareBtn}</button>
                <a class="result-btn ghost" href={lang === 'pt-BR' ? '/skins?mode=free' : '/en/skins?mode=free'}>{t.playFree}</a>
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
  {/if}
</main>

{#if toastVisible}<div class="toast">{t.copiedToast}</div>{/if}

<style>
  .board-head, .board-row { grid-template-columns:1.5fr repeat(4, 1fr); }
  .gi-wrap.locked { pointer-events:none; }
  .gi-wrap.locked .gi { opacity:0.5; }
  .msg { padding:40px 0; text-align:center; color:var(--text-dim); font-size:0.9rem; }
  .msg.err { color:var(--red); }

  /* palco de áudio */
  .stage {
    display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; align-items:center;
    column-gap:22px; row-gap:14px; background:var(--surface); border:1px solid var(--border2); padding:24px 26px;
  }
  .play {
    grid-row:1; width:60px; height:60px; border:none; background:var(--accent); color:#0a0a0c;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    transition:filter var(--t-fast) var(--ease-out), scale var(--t-fast) var(--ease-out);
  }
  .play:hover:not(:disabled) { filter:brightness(1.1); scale:1.04; }
  .play:disabled { opacity:0.5; cursor:wait; }
  .play svg { width:22px; height:22px; }
  .wave {
    display:flex; align-items:center; justify-content:center; gap:2px; height:54px;
    -webkit-mask:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
            mask:linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
  }
  .wave i {
    flex:1 1 0; max-width:4px; height:100%; border-radius:3px;
    background:linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent));
    transform:scaleY(calc(var(--p, 0.5) * 0.6)); transform-origin:center;
    transition:transform 0.4s var(--ease-out);
  }
  .stage.playing .wave i {
    animation-name:eq;
    animation-duration:var(--d, 0.9s);
    animation-timing-function:var(--ease-out);
    animation-iteration-count:infinite;
    animation-direction:alternate;
    animation-delay:var(--dly, 0s);
  }
  @keyframes eq {
    from { transform:scaleY(calc(var(--p, 0.5) * 0.3)); }
    to   { transform:scaleY(var(--p, 0.5)); }
  }
  @media (prefers-reduced-motion: reduce) {
    .stage.playing .wave i { animation:none; transform:scaleY(calc(var(--p,0.5) * 0.7)); }
  }
  .stage-progress { grid-column:1 / -1; display:flex; align-items:center; gap:12px; }
  .pbar { flex:1; height:6px; background:var(--surface2); border:1px solid var(--border2); cursor:pointer; position:relative; }
  .pfill { position:absolute; inset:0 auto 0 0; background:var(--accent); }
  .ptime { font-size:0.68rem; color:var(--text-dim); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .preplay { font-size:0.62rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--text-mid); background:none; border:1px solid var(--border2); padding:6px 10px; cursor:pointer; }
  .preplay:hover { color:var(--accent); border-color:var(--accent); }
  .stage-reveal { grid-column:1 / -1; display:flex; flex-direction:column; gap:2px; border-top:1px solid var(--border); padding-top:12px; }
  .sr-name { font-family:var(--font-display); font-size:1.05rem; }
  .sr-sub { font-size:0.74rem; color:var(--text-mid); }

  .skin-cell { display:flex; flex-direction:column; gap:2px; }
  .skin-nm { font-weight:700; }
  .skin-bd { font-size:0.66rem; color:var(--text-dim); }
  .edicon { width:26px; height:26px; object-fit:contain; }
  .ac-meta { display:flex; flex-direction:column; gap:1px; }
  .ac-sub2 { font-size:0.68rem; color:var(--text-dim); }
  .ac-edicon { width:24px; height:24px; object-fit:contain; margin-left:auto; }

  @media (max-width: 720px) {
    .board-head { display:none; }
    .board-row { grid-template-columns:repeat(2, 1fr); background:var(--surface); border:1px solid var(--border); padding:10px; }
    .board-row .cell.name { grid-column:1 / -1; background:none; border:none; padding:2px 4px 8px; }
    .board-row .cell { border-bottom:none; }
    .board-row .cell:not(.name) { border:1px solid var(--border2); }
    .board-row .cell em { display:block; }
    .stage { padding:18px; column-gap:16px; }
    .play { width:52px; height:52px; }
  }
</style>
