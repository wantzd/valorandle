<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    MAPS_I18N, MAPS_HINTS, MAPS_DB, MAPS_CALLOUTS,
    loadMapsFromAPI, getCalloutImgPath,
    getDailyMapTarget, getFreeMapTarget, compareMapGuess,
  } from '../lib/maps-data.js';
  import {
    getDailyDateKey, msUntilNextDaily, formatCountdown,
    saveLang, loadModeStats, recordModeCompletion,
  } from '../lib/game-utils.js';
  import { loadSoundPref, saveSoundPref, scheduleFlipSounds } from '../lib/sounds.js';
  import '../styles/arena.css';

  const MODE_ID = 'maps';
  const MAX_GUESSES = 6;
  const MAX_HINTS   = 4;
  const DAILY_KEY   = () => `valorandle_maps_daily_${getDailyDateKey()}`;
  // 3 feedback columns (map, callout, area)
  const ATTR_COLS   = 3;

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

  // ── Animation / input lock ────────────────────────────────────────────────────
  let inputLocked = $state(false);

  // ── Sound ─────────────────────────────────────────────────────────────────────
  let soundOn     = $state(true);
  let streak      = $state(0);

  // ── UI ───────────────────────────────────────────────────────────────────────
  let view              = $state('screenshot');  // 'screenshot' | 'map'
  let selectedMapId     = $state('');
  let selectedCallout   = $state(null);   // { id, name }

  // ── Zoom ─────────────────────────────────────────────────────────────────────
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
  let feedbackGridEl   = $state(null);
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
    lang    = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    soundOn = loadSoundPref();
    saveLang(lang);
    streak  = loadModeStats(MODE_ID).streak || 0;

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
    inputLocked     = false;

    target = mode === 'daily' ? getDailyMapTarget() : getFreeMapTarget();
    if (!target) { apiError = true; return; }

    if (mode === 'daily') {
      const saved = loadDailyState();
      if (saved && saved.targetId === target.id) {
        guesses   = (saved.guesses || []).map(g => ({ ...g, isNew: false }));
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
    const cx = Math.max(0, Math.min(100, c.x));
    const cy = Math.max(0, Math.min(100, c.y));
    if (!canvasOffset) return `left:${cx}%;top:${cy}%`;
    const { ox, oy, rw, rh, cw, ch } = canvasOffset;
    const px = ox + (cx / 100) * rw;
    const py = oy + (cy / 100) * rh;
    return `left:${(px / cw * 100).toFixed(3)}%;top:${(py / ch * 100).toFixed(3)}%`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sound toggle
  // ─────────────────────────────────────────────────────────────────────────────
  function toggleSound() {
    soundOn = !soundOn;
    saveSoundPref(soundOn);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Guess submission
  // ─────────────────────────────────────────────────────────────────────────────
  function submitGuess() {
    if (!selectedMapId || !selectedCallout || finished || inputLocked) return;

    const fb   = compareMapGuess(selectedMapId, selectedCallout.id, target, lang);
    const isWin  = fb.every(f => f.status === 'correct');
    const isDone = isWin || guesses.length + 1 >= MAX_GUESSES;
    guesses   = [...guesses, {
      mapId: selectedMapId, calloutId: selectedCallout.id,
      feedback: fb, isNew: true,
    }];
    won      = isWin;
    finished = isDone;

    if (isWin) revealed = true;
    selectedCallout = null;

    // Lock confirm button and schedule flip sounds
    inputLocked = true;
    const soundResult = isWin ? 'correct' : 'wrong';
    const totalMs = scheduleFlipSounds(ATTR_COLS, 115, soundResult, soundOn);

    setTimeout(() => {
      // Clear isNew on all guesses (inputLocked ensures at most one isNew at a time)
      guesses = guesses.map(g => g.isNew ? { ...g, isNew: false } : g);
      inputLocked = false;
      if (mode === 'daily') {
        saveDailyState({ targetId: target.id, guesses: guesses.map(g => ({ ...g, isNew: false })), hintsUsed, finished: isDone, won: isWin });
      }
      if (isDone && mode === 'daily') {
        streak = recordModeCompletion(MODE_ID, getDailyDateKey(), isWin).streak || 0;
        startCountdown();
      }
      tick().then(() => {
        feedbackGridEl?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }, totalMs + 60);
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
    if (mode === 'daily') saveDailyState({ targetId: target.id, guesses, hintsUsed, finished, won });
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
    const url = window.location.origin + (lang === 'en' ? '/en' : '') + '/maps';
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
  function areaLabel(area) { return t.areas[area] || area; }

  let mapList = $derived(
    Object.entries(MAPS_DB).map(([id, m]) => ({ id, name: m.name, listIcon: m.listViewIcon || m.displayIcon }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  let attemptsLabel = $derived(
    target ? t.attempts(guesses.length, MAX_GUESSES) : ''
  );

</script>

<header class="ticker">
  <a class="wordmark" href={lang === 'pt-BR' ? '/' : '/en'} title="Lobby">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    VALOR<b>ANDLE</b>
  </a>
  <div class="meta">
    <a class="t-btn" href={lang === 'pt-BR' ? '/en/maps' : '/maps'}
       title={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}
       aria-label={lang === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{lang === 'pt-BR' ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

{#if showPicker}
  <main class="arena" style="--accent:var(--col-americas)">
    <div class="gate">
      <p class="g-ask">{lang === 'en' ? 'How do you want to play?' : 'Como quer jogar?'}</p>
      <div class="g-options">
        <button class="g-opt seq" type="button" onclick={() => pickMode('daily')}>
          <span class="g-tag">{lang === 'en' ? 'Daily challenge' : 'Desafio do dia'}</span>
          <span class="g-name">{lang === 'en' ? 'STREAK' : 'SEQUÊNCIA'}</span>
          <span class="g-desc">{lang === 'en' ? 'One challenge per day. ' : 'Um desafio por dia. '}{#if streak > 0}{lang === 'en' ? 'Keeps your ' : 'Mantém sua sequência de '}<b>{streak} {lang === 'en' ? 'day streak' : 'dias'}</b>.{:else}{lang === 'en' ? 'Starts your streak.' : 'Começa sua sequência.'}{/if}</span>
        </button>
        <button class="g-opt" type="button" onclick={() => pickMode('free')}>
          <span class="g-tag">{lang === 'en' ? 'Practice' : 'Treino'}</span>
          <span class="g-name">{lang === 'en' ? 'FREE' : 'LIVRE'}</span>
          <span class="g-desc">{lang === 'en' ? 'As many rounds as you want. Does not count toward the streak.' : 'Quantas partidas quiser. Não conta para a sequência.'}</span>
        </button>
      </div>
    </div>
  </main>
{/if}

{#if showTutorial}
  <div class="gate-overlay">
    <div class="tut-modal">
      <div class="tut-eyebrow">{t.modeTag}</div>
      <div class="tut-title">{#if lang === 'pt-BR'}COMO <em>JOGAR</em>{:else}HOW TO <em>PLAY</em>{/if}</div>
      <div class="tut-steps">
        {#each t.tutSteps as step, i}
          <div class="tut-step"><div class="tut-num">{i + 1}</div><div class="tut-text">{@html step}</div></div>
        {/each}
      </div>
      <button class="result-btn primary" onclick={dismissTutorial}>{t.tutDismiss}</button>
    </div>
  </div>
{/if}

{#if !loaded && !showPicker && !showTutorial}
  <main class="arena" style="--accent:var(--col-americas)"><div class="msg">VALOR<b style="color:var(--red)">ANDLE</b></div></main>
{/if}

{#if loaded && !showPicker && !showTutorial}
<main class="arena" style="--accent:var(--col-americas)">

  <div class="statusbar" aria-label={lang === 'en' ? 'Match status' : 'Estado da partida'}>
    <div class="sb-mode">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14"/></svg>
      <b>{t.modeTag}{mode === 'free' ? ' · ' + t.modeFree : ''}</b>
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
        aria-label={soundOn ? (lang === 'en' ? 'Mute sounds' : 'Silenciar sons') : (lang === 'en' ? 'Enable sounds' : 'Ligar sons')}
        title={soundOn ? (lang === 'en' ? 'Mute sounds' : 'Silenciar sons') : (lang === 'en' ? 'Enable sounds' : 'Ligar sons')}>
        {#if soundOn}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        {:else}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>{/if}
      </button>
    </div>
  </div>

  {#if apiError}
    <div class="msg err">
      <span>{t.apiError}</span>
      <button class="result-btn ghost" onclick={async () => { apiError = false; const ok = await loadMapsFromAPI(); if (!ok || !Object.keys(MAPS_DB).length) { apiError = true; return; } startGame(); }}>{lang === 'en' ? 'Retry' : 'Tentar novamente'}</button>
    </div>
  {:else}

    {#if offlineWarn}<div class="offline">{t.offlineWarn}</div>{/if}

    {#if !finished}
      <div class="map-grid">
        {#each mapList as m}
          <button class="map-card" class:active={selectedMapId === m.id}
            onclick={() => { selectedMapId = m.id; selectedCallout = null; view = 'map'; }}>
            <span class="map-img">{#if m.listIcon}<img src={m.listIcon} alt={m.name} loading="lazy" />{/if}</span>
            <span class="map-nm">{m.name}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="recon">
      <div class="ss-wrapper">
        <div class="ss-frame">
          <div class="ss-inner"
            style:transform="scale({mapScale})"
            style:filter={view === 'map' ? 'blur(5px) brightness(0.35)' : 'none'}
            style:transition={wrongCount > 0 || revealed ? 'transform 0.9s ease, filter 0.2s ease' : 'none'}>
            {#if screenshotSrc}
              <img src={screenshotSrc} alt="map location" class="ss-img" class:ready={screenshotReady} onload={() => { screenshotReady = true; }} />
              {#if !screenshotReady}<div class="ss-ph" role="status"><span>{t.imgPlaceholder}</span></div>{/if}
            {:else}
              <div class="ss-ph" role="status"><span>{t.imgPlaceholder}</span></div>
            {/if}
          </div>
        </div>

        {#if view === 'map' && !finished}
          <div class="map-overlay" bind:this={minimapWrapperEl}>
            <canvas bind:this={canvasEl} class="minimap" class:ready={canvasReady}
              style:left="{canvasOffset?.ox ?? 0}px" style:top="{canvasOffset?.oy ?? 0}px"
              style:width="{canvasOffset?.rw ?? 0}px" style:height="{canvasOffset?.rh ?? 0}px"></canvas>
            {#if !selectedMapId}<div class="minimap-ph">{t.selectMapHint}</div>
            {:else if !canvasReady}<div class="minimap-ph">{t.mapPlaceholder}</div>{/if}
            {#if canvasOffset}
              {#each callouts as c (c.id)}
                <button class="callout-btn" class:selected={selectedCallout?.id === c.id} style={btnStyle(c)}
                  onclick={() => { selectedCallout = { id: c.id, name: calloutLabel(c) }; }} title={calloutLabel(c)}>{calloutLabel(c)}</button>
              {/each}
            {/if}
          </div>
        {/if}

        {#if !finished}
          <div class="ss-corner">
            <button class="ss-icon" class:active={view === 'map'} onclick={() => { view = view === 'map' ? 'screenshot' : 'map'; }} title={view === 'map' ? t.hideMap : t.showMap}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            </button>
            <button class="ss-icon" class:active={hintsUsed > 0} disabled={!canHint} onclick={revealHint} title={hintCountLabel()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.7-1.5 5.1-3.5 6.4V17H8.5v-1.6C6.5 14.1 5 11.7 5 9a7 7 0 0 1 7-7z"/></svg>
              {#if canHint}<span class="hint-badge">{Math.min(4, hintsAvailable.length) - hintsUsed}</span>{/if}
            </button>
          </div>
        {/if}
      </div>

      {#if selectedCallout && !finished}
        <div class="confirm-row">
          <span class="confirm-label">{selectedCallout.name}</span>
          <button class="go" onclick={submitGuess}>{t.confirmGuess}</button>
        </div>
      {/if}
    </div>

    {#if revealedHints.length > 0}
      <div class="hint-chips">
        <span class="hint-lab">{lang === 'en' ? 'hints' : 'dicas'}</span>
        {#each revealedHints as h}<span class="hint-chip used">✓ {hintText(h)}</span>{/each}
      </div>
    {/if}

    {#if guesses.length > 0 || !finished}
      <div class="board" bind:this={feedbackGridEl}>
        <div class="board-head"><span>{t.headers.map}</span><span>{t.headers.callout}</span><span>{t.headers.area}</span></div>
        {#each guesses as g}
          <div class="board-row" class:fresh={g.isNew}>
            {#each g.feedback as cell, ci}
              <div class="cell {cell.status}" style="--ci:{ci}" title={cell.attr === 'area' ? areaLabel(cell.value) : cell.value}>
                <em>{[t.headers.map, t.headers.callout, t.headers.area][ci]}</em>
                <span class="cell-value">{cell.attr === 'area' ? areaLabel(cell.value) : cell.value}</span>
              </div>
            {/each}
          </div>
        {/each}
        {#if !finished}
          {#each Array(Math.max(0, MAX_GUESSES - guesses.length)) as _, i}
            <div class="board-row ghost" aria-hidden="true">
              <div class="cell name">{guesses.length + i + 1}º</div>
              <div class="cell"></div><div class="cell"></div>
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
        <div class="result-status">{won ? t.win : t.lose(MAPS_DB[target.mapId]?.name || target.mapId, '')}</div>
        <div class="result-body">
          <div class="result-sub-text">{won ? t.winSub(guesses.length) : t.loseSub}</div>
          {#if mode === 'daily'}
            <div class="result-countdown"><span class="cd-label">{t.nextDaily}</span><span class="cd-timer">{countdown}</span></div>
            <div class="result-actions">
              <button class="result-btn primary" onclick={share}>{t.shareBtn}</button>
              <a class="result-btn ghost" href={lang === 'pt-BR' ? '/maps?mode=free' : '/en/maps?mode=free'}>{t.playFree}</a>
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
{/if}

{#if toastVisible}<div class="toast">{t.copiedToast}</div>{/if}

<style>
  .board-head, .board-row { grid-template-columns:1.3fr 1fr 1fr; }
  .msg { padding:40px 0; text-align:center; color:var(--text-dim); font-family:var(--font-display); }
  .msg.err { color:var(--red); display:flex; flex-direction:column; align-items:center; gap:14px; }
  .offline { padding:10px 14px; background:var(--surface); border:1px solid var(--border2); color:var(--yellow); font-size:0.76rem; }

  /* grid de mapas */
  .map-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(96px, 1fr)); gap:6px; }
  .map-card {
    display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px 4px;
    background:var(--surface); border:1px solid var(--border2); color:var(--text-mid); cursor:pointer;
    transition:border-color var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
  }
  .map-card:hover { border-color:color-mix(in srgb,var(--accent) 45%,transparent); color:var(--text); }
  .map-card.active { border-color:var(--accent); color:var(--text); background:color-mix(in srgb,var(--accent) 8%,transparent); }
  .map-img { width:100%; aspect-ratio:16/9; overflow:hidden; background:var(--surface2); }
  .map-img img { width:100%; height:100%; object-fit:cover; display:block; }
  .map-nm { font-size:0.64rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; }

  /* visor de reconhecimento */
  .recon { display:flex; flex-direction:column; gap:10px; }
  .ss-wrapper { position:relative; aspect-ratio:16/10; border:1px solid var(--border2); overflow:hidden; background:#0b0d16; }
  .ss-frame { position:absolute; inset:0; overflow:hidden; }
  .ss-inner { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; transform-origin:center; }
  .ss-img { width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity 0.3s; }
  .ss-img.ready { opacity:1; }
  .ss-ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-dim); font-size:0.78rem; }
  .map-overlay { position:absolute; inset:0; background:rgba(8,9,13,0.4); }
  .minimap { position:absolute; opacity:0; transition:opacity 0.3s; }
  .minimap.ready { opacity:1; }
  .minimap-ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-mid); font-size:0.8rem; }
  .callout-btn {
    position:absolute; transform:translate(-50%,-50%); white-space:nowrap;
    font-size:0.6rem; font-weight:700; letter-spacing:0.02em; color:var(--text);
    background:rgba(8,9,13,0.82); border:1px solid var(--border2); padding:4px 8px; cursor:pointer;
    transition:border-color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out);
  }
  .callout-btn:hover { border-color:var(--accent); }
  .callout-btn.selected { background:var(--accent); color:#0a0a0c; border-color:var(--accent); }
  .ss-corner { position:absolute; right:10px; bottom:10px; display:flex; gap:8px; }
  .ss-icon {
    position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;
    background:rgba(8,9,13,0.82); border:1px solid var(--border2); color:var(--text-mid); cursor:pointer;
    transition:border-color var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
  }
  .ss-icon:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
  .ss-icon.active { border-color:var(--accent); color:var(--accent); }
  .ss-icon:disabled { opacity:0.4; cursor:not-allowed; }
  .ss-icon svg { width:16px; height:16px; }
  .hint-badge { position:absolute; top:-6px; right:-6px; min-width:16px; height:16px; padding:0 4px; display:flex; align-items:center; justify-content:center; background:var(--accent); color:#0a0a0c; font-size:0.6rem; font-weight:700; }

  .confirm-row { display:flex; align-items:center; gap:12px; background:var(--surface); border:1px solid var(--border2); padding:10px 12px; }
  .confirm-label { flex:1; font-weight:700; font-size:0.9rem; }

  .hint-chips { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .hint-lab { font-size:0.6rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--text-dim); font-weight:700; }
  .hint-chip { font-size:0.72rem; color:var(--text-mid); background:var(--surface); border:1px solid var(--border2); padding:6px 12px; }
  .hint-chip.used { color:var(--accent); border-color:color-mix(in srgb,var(--accent) 40%,transparent); background:color-mix(in srgb,var(--accent) 7%,transparent); }

  /* tutorial */
  .tut-modal { width:100%; max-width:460px; background:var(--surface); border:1px solid var(--border2); padding:28px; }
  .tut-eyebrow { font-size:0.6rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--accent); font-weight:700; }
  .tut-title { font-family:var(--font-display); font-size:1.6rem; margin:6px 0 18px; }
  .tut-title em { font-style:normal; color:var(--accent); }
  .tut-steps { display:flex; flex-direction:column; gap:12px; margin-bottom:22px; }
  .tut-step { display:flex; gap:12px; align-items:flex-start; }
  .tut-num { width:24px; height:24px; flex:none; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb,var(--accent) 10%,transparent); border:1px solid color-mix(in srgb,var(--accent) 35%,transparent); color:var(--accent); font-family:var(--font-display); font-size:0.8rem; }
  .tut-text { font-size:0.85rem; color:var(--text-mid); line-height:1.5; }

  @media (max-width: 720px) {
    .board-head { display:none; }
    .board-row { grid-template-columns:repeat(3, 1fr); background:var(--surface); border:1px solid var(--border); padding:10px; }
    .board-row .cell.name { grid-column:1 / -1; background:none; border:none; padding:2px 4px 8px; }
    .board-row .cell { border-bottom:none; }
    .board-row .cell:not(.name) { border:1px solid var(--border2); }
    .board-row .cell em { display:block; }
  }
</style>
