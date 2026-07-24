<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { msUntilNextDaily, formatCountdown, saveLang, getDailyDateKey, loadModeStats } from '../lib/game-utils.js';

  // ── Lang ─────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let isPT = $derived(lang === 'pt-BR');

  // ── Per-mode streaks + Players daily state ───────────────────────────────────
  let streaks       = $state({ players: 0, agents: 0, maps: 0, skins: 0, abilities: 0 });
  let playersState  = $state('new'); // 'new' | 'progress' | 'done'
  let playersWins   = $state(0);

  // ── Feedback ─────────────────────────────────────────────────────────────────
  let feedbackOpen    = $state(false);
  let feedbackMessage = $state('');
  let feedbackWebsite = $state('');
  let feedbackStatus  = $state('idle');
  let feedbackError   = $state('');
  let turnstileContainer = $state(null);
  let turnstileToken     = $state('');
  let turnstileWidgetId  = null;

  const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

  // ── Countdown ────────────────────────────────────────────────────────────────
  let countdown  = $state('--:--:--');
  let cdInterval = null;

  // ── Aviso de atualização (pós-redesign) ──────────────────────────────────────
  let showUpdate = $state(false);
  const NOTICE_KEY = 'valorandle_redesign_notice_v1';

  onMount(() => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);
    renderStreaks();
    renderPlayersState();
    startCountdown();
    if (shouldShowUpdate()) showUpdate = true;
  });

  // Só mostra o aviso para quem já jogou antes do redesign, uma única vez.
  function shouldShowUpdate() {
    try {
      if (localStorage.getItem(NOTICE_KEY)) return false;
      if (localStorage.getItem('valorandle_stats')) return true;
      if (localStorage.getItem('valorandle_maps_tutorial_seen')) return true;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('valorandle_') && k.includes('daily')) return true;
      }
    } catch {}
    return false;
  }
  function dismissUpdate() {
    try { localStorage.setItem(NOTICE_KEY, '1'); } catch {}
    showUpdate = false;
  }

  onDestroy(() => {
    if (cdInterval) clearInterval(cdInterval);
    destroyTurnstile();
  });

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (window.__valorandleTurnstilePromise) return window.__valorandleTurnstilePromise;

    window.__valorandleTurnstilePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-valorandle-turnstile]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.turnstile), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.valorandleTurnstile = '';
      script.onload = () => resolve(window.turnstile);
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return window.__valorandleTurnstilePromise;
  }

  function destroyTurnstile() {
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId); } catch {}
    }
    turnstileWidgetId = null;
    turnstileToken = '';
  }

  function resetTurnstile() {
    turnstileToken = '';
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.reset(turnstileWidgetId); } catch {}
    }
  }

  async function setupTurnstile() {
    if (!TURNSTILE_SITE_KEY) {
      feedbackError = isPT
        ? 'A verificação de segurança está temporariamente indisponível.'
        : 'Security verification is temporarily unavailable.';
      return;
    }

    try {
      const turnstile = await loadTurnstile();
      if (!turnstile || !turnstileContainer || turnstileWidgetId !== null) return;
      turnstileWidgetId = turnstile.render(turnstileContainer, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'feedback',
        theme: 'dark',
        size: 'flexible',
        appearance: 'interaction-only',
        language: isPT ? 'pt-br' : 'en',
        'response-field': false,
        callback: (token) => {
          turnstileToken = token;
          if (feedbackError.includes('verificação') || feedbackError.includes('verification')) {
            feedbackError = '';
          }
        },
        'expired-callback': () => {
          turnstileToken = '';
          feedbackError = isPT
            ? 'A verificação expirou. Confirme novamente.'
            : 'Verification expired. Please confirm again.';
        },
        'error-callback': () => {
          turnstileToken = '';
          feedbackError = isPT
            ? 'Não foi possível concluir a verificação de segurança.'
            : 'Could not complete security verification.';
          return true;
        },
      });
    } catch {
      feedbackError = isPT
        ? 'Não foi possível carregar a verificação de segurança.'
        : 'Could not load security verification.';
    }
  }

  async function toggleFeedback() {
    if (feedbackOpen) {
      destroyTurnstile();
      feedbackOpen = false;
      feedbackError = '';
      return;
    }

    feedbackOpen = true;
    feedbackError = '';
    await tick();
    if (feedbackStatus !== 'sent') await setupTurnstile();
  }

  function renderStreaks() {
    streaks = {
      players:   loadModeStats('players').streak   || 0,
      agents:    loadModeStats('agents').streak    || 0,
      maps:      loadModeStats('maps').streak      || 0,
      skins:     loadModeStats('skins').streak     || 0,
      abilities: loadModeStats('abilities').streak || 0,
    };
  }

  function renderPlayersState() {
    const key   = 'valorandle_daily_americas_' + getDailyDateKey();
    let   saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const results = saved?.roundResults || [];
    if (saved?.dailyDone) {
      playersState = 'done';
      playersWins  = results.filter(r => r.won).length;
    } else if (results.length > 0 || saved?.guesses?.length) {
      playersState = 'progress';
    } else {
      playersState = 'new';
    }
  }

  function startCountdown() {
    countdown  = formatCountdown(msUntilNextDaily());
    cdInterval = setInterval(() => {
      countdown = formatCountdown(msUntilNextDaily());
    }, 1000);
  }

  async function submitFeedback(event) {
    event.preventDefault();
    const message = feedbackMessage.trim();
    if (message.length < 3 || message.length > 1000) {
      feedbackError = isPT ? 'Escreva entre 3 e 1000 caracteres.' : 'Write between 3 and 1000 characters.';
      return;
    }

    const lastSent = Number(localStorage.getItem('valorandle_feedback_sent_at') || 0);
    if (Date.now() - lastSent < 60_000) {
      feedbackError = isPT ? 'Aguarde um minuto antes de enviar novamente.' : 'Wait one minute before sending again.';
      return;
    }

    feedbackStatus = 'sending';
    feedbackError = '';
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          lang,
          page: window.location.pathname,
          website: feedbackWebsite,
          turnstileToken,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        feedbackStatus = 'error';
        if (response.status === 429) {
          feedbackError = isPT
            ? 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.'
            : 'Too many attempts. Wait a minute before trying again.';
        } else if (result.error === 'verification_failed' || result.error === 'verification_required') {
          feedbackError = isPT
            ? 'A verificação expirou ou não foi aceita. Confirme novamente.'
            : 'Verification expired or was not accepted. Please confirm again.';
        } else {
          feedbackError = isPT
            ? 'Nao foi possivel enviar agora. Tente novamente.'
            : 'Could not send it right now. Please try again.';
        }
        resetTurnstile();
        return;
      }
      localStorage.setItem('valorandle_feedback_sent_at', String(Date.now()));
      feedbackMessage = '';
      feedbackStatus = 'sent';
      destroyTurnstile();
    } catch {
      feedbackStatus = 'error';
      feedbackError = isPT
        ? 'Não foi possível enviar agora. Tente novamente.'
        : 'Could not send it right now. Please try again.';
      resetTurnstile();
    }
  }

  // ── Modes ────────────────────────────────────────────────────────────────────
  const pfx = $derived(isPT ? '' : '/en');

  const modes = $derived([
    {
      id: 'players', color: 'var(--red)', href: `${pfx}/league-select`,
      icon: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M12 3v3 M12 18v3 M3 12h3 M18 12h3',
      name: isPT ? 'Pro Players' : 'Pro Players',
      desc: isPT ? 'Cinco alvos escondidos nas quatro ligas do VCT' : 'Five hidden targets across the four VCT leagues',
      streak: streaks.players,
      state: playersState, wins: playersWins,
    },
    {
      id: 'agents', color: 'var(--col-pacific)', href: `${pfx}/agents`,
      icon: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5',
      name: isPT ? 'Agentes' : 'Agents',
      desc: isPT ? 'Gênero, função, origem, lançamento e ult' : 'Gender, role, origin, release and ult',
      streak: streaks.agents,
    },
    {
      id: 'maps', color: 'var(--col-americas)', href: `${pfx}/maps`,
      icon: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14',
      name: isPT ? 'Mapas' : 'Maps',
      desc: isPT ? 'Reconheça o mapa pela imagem com zoom' : 'Name the map from the zoomed image',
      streak: streaks.maps,
    },
    {
      id: 'skins', color: 'var(--col-all)', href: `${pfx}/skins`,
      icon: 'M2 12h13l5-3v6l-5-3 M6 12v5h3v-5',
      name: 'Skins',
      desc: isPT ? 'Ouça o som e descubra bundle, arma e edição' : 'Hear the sound; guess bundle, weapon and edition',
      streak: streaks.skins,
    },
    {
      id: 'abilities', color: 'var(--col-emea)', href: `${pfx}/abilities`,
      icon: 'M13 2 4 14h6l-1 8 9-12h-6z',
      name: isPT ? 'Habilidades' : 'Abilities',
      desc: isPT ? 'Descrição revelada palavra por palavra' : 'Description revealed word by word',
      streak: streaks.abilities,
    },
  ]);

  function stateLabel(m) {
    if (m.id !== 'players') return '';
    if (m.state === 'done')     return isPT ? `✓ ${m.wins}/5` : `✓ ${m.wins}/5`;
    if (m.state === 'progress') return isPT ? 'em progresso' : 'in progress';
    return '';
  }
</script>

{#if showUpdate}
  <div class="update-overlay" role="dialog" aria-modal="true" aria-labelledby="update-title">
    <div class="update-card">
      <div class="update-eyebrow">{isPT ? 'Atualização' : "What's new"}</div>
      <h2 id="update-title">{isPT ? 'O Valorandle mudou de cara' : 'Valorandle got a redesign'}</h2>
      <p>{isPT
        ? 'Reconstruímos toda a interface — o lobby e os cinco modos. Aproveite para explorar o visual novo.'
        : 'We rebuilt the whole interface — the lobby and all five modes. Take a moment to explore the new look.'}</p>
      <p class="update-apology">{isPT
        ? 'Com a mudança, as sequências agora contam por modo. Pedimos desculpa: sua sequência anterior foi zerada e cada modo começa do zero hoje.'
        : "With the change, streaks now count per mode. We're sorry: your previous streak was reset, and every mode starts fresh today."}</p>
      <button class="update-btn" type="button" onclick={dismissUpdate}>{isPT ? 'Entendi' : 'Got it'}</button>
    </div>
  </div>
{/if}

<header class="ticker">
  <a class="wordmark" href={isPT ? '/' : '/en'} title={isPT ? 'Início' : 'Home'}>VALOR<b>ANDLE</b></a>
  <div class="meta">
    <span class="sub">{isPT ? 'reset em' : 'reset in'} <b>{countdown}</b></span>
    <a class="lang" href={isPT ? '/en' : '/'} title={isPT ? 'Switch to English' : 'Mudar para Português'}
       aria-label={isPT ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18" />
      </svg>
      <b>{isPT ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

<main class="front">

  <header class="head">
    <h1>{isPT ? 'ESCOLHA SEU' : 'PICK YOUR'} <em>{isPT ? 'MODO' : 'MODE'}</em></h1>
    <p>{isPT
      ? 'Um desafio novo por dia em cada modo. Cada um guarda a própria sequência.'
      : 'A fresh challenge per day in every mode. Each keeps its own streak.'}</p>
  </header>

  <section class="slate" aria-label={isPT ? 'Modos de jogo' : 'Game modes'}>
    {#each modes as m, i (m.id)}
      <a class="srow" href={m.href} style={`--mc:${m.color}; --d:${i * 55}ms`}>
        <span class="s-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d={m.icon} /></svg>
        </span>
        <span class="s-id">
          <span class="s-name">{m.name}</span>
          <span class="s-desc">{m.desc}</span>
        </span>
        <span class="s-streak">
          {#if m.streak > 0}🔥<b>{m.streak}</b>{/if}
        </span>
        <span class={m.state ? `s-state ${m.state}` : 's-state'}>{stateLabel(m)}</span>
        <span class="s-go" aria-hidden="true">→</span>
      </a>
    {/each}
  </section>

  <section class="feedback" class:open={feedbackOpen}>
    {#if !feedbackOpen}
      <p class="fb-link">
        {isPT ? 'Achou algo estranho?' : 'Spotted something off?'}
        <button type="button" onclick={toggleFeedback}>{isPT ? 'Mandar feedback' : 'Send feedback'}</button>
      </p>
    {:else}
      <div class="fb-panel" id="feedback-panel">
        <div class="fb-panel-head">
          <span>{isPT ? 'Enviar feedback' : 'Send feedback'}</span>
          <button type="button" class="fb-close" onclick={toggleFeedback} aria-label={isPT ? 'Fechar' : 'Close'}>✕</button>
        </div>
        {#if feedbackStatus === 'sent'}
          <div class="fb-success" role="status">
            <span>✓</span>
            <div>
              <strong>{isPT ? 'Feedback enviado' : 'Feedback sent'}</strong>
              <p>{isPT ? 'Obrigado por ajudar a melhorar o Valorandle.' : 'Thanks for helping improve Valorandle.'}</p>
            </div>
          </div>
        {:else}
          <form onsubmit={submitFeedback}>
            <label for="feedback-message">{isPT ? 'O que podemos melhorar?' : 'What could we improve?'}</label>
            <textarea
              id="feedback-message"
              bind:value={feedbackMessage}
              maxlength="1000"
              rows="4"
              placeholder={isPT ? 'Conte sobre um bug, ideia ou sugestão…' : 'Tell us about a bug, idea, or suggestion…'}
              disabled={feedbackStatus === 'sending'}
              required
            ></textarea>
            <div class="fb-honeypot" aria-hidden="true">
              <label for="feedback-website">Website</label>
              <input id="feedback-website" bind:value={feedbackWebsite} tabindex="-1" autocomplete="off" />
            </div>
            <div class="fb-turnstile" bind:this={turnstileContainer}
              aria-label={isPT ? 'Verificação de segurança' : 'Security verification'}></div>
            <div class="fb-actions">
              <span class="fb-note">{isPT ? 'Protegido pelo Cloudflare Turnstile.' : 'Protected by Cloudflare Turnstile.'}</span>
              <button class="fb-submit" type="submit" disabled={feedbackStatus === 'sending' || !turnstileToken}>
                {feedbackStatus === 'sending' ? (isPT ? 'Enviando…' : 'Sending…') : (isPT ? 'Enviar →' : 'Send →')}
              </button>
            </div>
            {#if feedbackError}<p class="fb-error" role="alert">{feedbackError}</p>{/if}
          </form>
        {/if}
      </div>
    {/if}
  </section>

  <footer class="foot">
    <span>Fan-made. {isPT ? 'Não afiliado à' : 'Not affiliated with'}
      <a href="https://playvalorant.com" target="_blank" rel="noopener">Riot Games</a>.</span>
    <span>{isPT ? 'Dados dos jogadores:' : 'Player data:'}
      <a href="https://liquipedia.net/valorant" target="_blank" rel="noopener">Liquipedia</a>
      (<a href="https://liquipedia.net/commons/Liquipedia:Copyrights" target="_blank" rel="noopener">CC BY-SA</a>)
    </span>
  </footer>

</main>

<style>
  :global(*, *::before, *::after) { box-sizing:border-box; margin:0; padding:0; }
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620; --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32); --red-glow:rgba(255,70,85,0.22);
    --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8; --green:#34d47e; --yellow:#E5C96A;
    --col-americas:#FF5400; --col-emea:#C4FF00; --col-pacific:#00DCFF; --col-china:#FF1675; --col-all:#E5C96A;
    --font-display:'Russo One',sans-serif;
    --ease-out:cubic-bezier(0.22,1,0.36,1); --t-fast:150ms;
  }
  :global(html,body) { min-height:100vh; background:var(--bg); color:var(--text); overflow-x:hidden; font-family:var(--font-ui,'Epilogue',sans-serif); }
  :global(body::before) { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px); background-size:28px 28px; pointer-events:none; opacity:.4; }
  :global(body::after)  { content:''; position:fixed; top:-200px; left:50%; z-index:0; transform:translateX(-50%); width:640px; height:440px; background:radial-gradient(ellipse,rgba(255,70,85,0.05) 0%,transparent 70%); pointer-events:none; }

  /* ── ticker ── */
  .ticker {
    position:sticky; top:0; z-index:30; display:flex; align-items:stretch; height:54px;
    background:var(--bg); border-bottom:1px solid var(--border);
  }
  .wordmark {
    display:flex; align-items:center; padding:0 26px; font-family:var(--font-display);
    font-size:1rem; letter-spacing:0.02em; color:var(--text); border-right:1px solid var(--border);
  }
  .wordmark b { color:var(--red); font-weight:400; }
  .meta { margin-left:auto; display:flex; align-items:stretch; border-left:1px solid var(--border); }
  .meta .sub {
    display:flex; align-items:center; padding:0 20px; font-size:0.72rem; color:var(--text-dim);
    font-variant-numeric:tabular-nums; border-right:1px solid var(--border);
  }
  .meta .sub b { color:var(--text); font-weight:700; margin-left:6px; }
  .lang {
    display:flex; align-items:center; gap:8px; padding:0 22px; color:var(--text-dim);
    font-size:0.72rem; font-weight:700; letter-spacing:0.1em;
    transition:color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out);
  }
  .lang svg { width:16px; height:16px; }
  .lang:hover { color:var(--text); background:var(--surface); }
  .lang b { font-weight:700; }

  /* ── layout ── */
  .front {
    position:relative; z-index:1; width:min(100% - 56px, 980px); margin:0 auto;
    display:flex; flex-direction:column; min-height:calc(100vh - 54px);
  }
  .head { padding:44px 0 26px; animation:rise 0.45s var(--ease-out) both; }
  .head h1 { font-family:var(--font-display); font-size:clamp(1.8rem, 3.2vw, 2.6rem); line-height:1.05; font-weight:400; }
  .head h1 em { font-style:normal; color:var(--red); }
  .head p { color:var(--text-dim); font-size:0.82rem; margin-top:8px; }

  /* ── slate ── */
  .slate { display:flex; flex-direction:column; border-top:1px solid var(--border); }
  .srow {
    display:grid; grid-template-columns:52px minmax(0,1fr) 90px 150px 40px;
    align-items:center; gap:20px; padding:20px 18px 20px 0;
    border-bottom:1px solid var(--border); color:inherit; text-decoration:none;
    animation:rise 0.45s var(--ease-out) both; animation-delay:var(--d);
    transition:background var(--t-fast) var(--ease-out), padding-left var(--t-fast) var(--ease-out);
  }
  .srow:hover { background:var(--surface); padding-left:14px; }
  .s-icon {
    display:flex; align-items:center; justify-content:center; width:44px; height:44px; color:var(--mc);
    background:color-mix(in srgb, var(--mc) 8%, transparent);
    border:1px solid color-mix(in srgb, var(--mc) 28%, transparent);
  }
  .s-icon svg { width:21px; height:21px; }
  .s-id { display:flex; flex-direction:column; gap:3px; min-width:0; }
  .s-name { font-family:var(--font-display); font-size:1.15rem; letter-spacing:0.02em; transition:color var(--t-fast) var(--ease-out); }
  .srow:hover .s-name { color:var(--mc); }
  .s-desc { font-size:0.82rem; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .s-streak { font-size:0.95rem; color:var(--text-dim); white-space:nowrap; }
  .s-streak b { font-family:var(--font-display); font-size:1.15rem; font-weight:400; color:var(--text); font-variant-numeric:tabular-nums; margin-left:5px; }
  .s-state { font-size:0.62rem; letter-spacing:0.14em; text-transform:uppercase; font-weight:700; color:var(--text-dim); font-variant-numeric:tabular-nums; }
  .s-state.done { color:var(--green); }
  .s-state.progress { color:var(--red); }
  .s-go {
    justify-self:end; color:var(--mc); font-weight:700; opacity:0.5;
    transition:opacity var(--t-fast) var(--ease-out), translate var(--t-fast) var(--ease-out);
  }
  .srow:hover .s-go { opacity:1; translate:3px 0; }

  /* ── feedback ── */
  .feedback { margin-top:auto; padding:26px 0 12px; }
  .fb-link { text-align:center; font-size:0.82rem; color:var(--text-mid); }
  .fb-link button {
    background:none; border:none; color:var(--red); font:inherit; cursor:pointer;
    border-bottom:1px dotted var(--red-bd); padding:0 1px;
  }
  .fb-panel { background:var(--surface); border:1px solid var(--border); max-width:520px; margin:0 auto; }
  .fb-panel-head {
    display:flex; align-items:center; justify-content:space-between; padding:12px 16px;
    border-bottom:1px solid var(--border); font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase;
    color:var(--text-mid); font-weight:700;
  }
  .fb-close { background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:0.85rem; }
  .fb-close:hover { color:var(--text); }
  .fb-panel form { padding:16px; }
  .fb-panel label { display:block; font-size:0.78rem; color:var(--text-mid); margin-bottom:8px; }
  .fb-panel textarea {
    width:100%; resize:vertical; min-height:92px; max-height:220px; padding:12px;
    background:var(--bg); border:1px solid var(--border2); color:var(--text); font:0.86rem/1.5 inherit;
    transition:border-color var(--t-fast) var(--ease-out);
  }
  .fb-panel textarea::placeholder { color:var(--text-dim); }
  .fb-panel textarea:focus { outline:none; border-color:var(--red-bd); }
  .fb-turnstile { min-height:4px; margin-top:12px; }
  .fb-turnstile:empty { display:none; }
  .fb-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:12px; }
  .fb-note { color:var(--text-dim); font-size:0.66rem; }
  .fb-submit {
    flex-shrink:0; border:none; padding:10px 18px; background:var(--red); color:#0a0a0c;
    font-family:var(--font-display); font-size:0.68rem; letter-spacing:0.08em; cursor:pointer;
    transition:filter var(--t-fast) var(--ease-out);
  }
  .fb-submit:hover:not(:disabled) { filter:brightness(1.12); }
  .fb-submit:disabled { opacity:0.5; cursor:not-allowed; }
  .fb-error { margin-top:10px; color:var(--red); font-size:0.74rem; }
  .fb-success { display:flex; align-items:center; gap:12px; padding:16px; color:var(--green); }
  .fb-success > span { width:30px; height:30px; display:grid; place-items:center; border:1px solid rgba(52,212,126,0.4); background:rgba(52,212,126,0.08); }
  .fb-success strong { display:block; font-size:0.82rem; }
  .fb-success p { margin-top:2px; color:var(--text-dim); font-size:0.72rem; }
  .fb-honeypot { position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden; }

  .foot {
    display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;
    padding:22px 0 26px; border-top:1px solid var(--border);
    font-size:0.72rem; color:var(--text-dim); line-height:1.8;
  }
  .foot a { color:var(--text-mid); }
  .foot a:hover { color:var(--red); }

  @keyframes rise { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

  /* ── tela de atualização (pós-redesign) ── */
  .update-overlay {
    position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center;
    padding:24px; background:rgba(8,9,13,0.9); backdrop-filter:blur(6px);
    animation:u-fade 0.25s var(--ease-out) both;
  }
  .update-card {
    width:100%; max-width:440px; background:var(--surface);
    border:1px solid var(--border2); border-bottom:2px solid var(--red);
    padding:30px 30px 26px; animation:u-pop 0.4s var(--ease-out) both;
  }
  .update-eyebrow { font-size:0.6rem; letter-spacing:0.22em; text-transform:uppercase; color:var(--red); font-weight:700; margin-bottom:12px; }
  .update-card h2 { font-family:var(--font-display); font-size:1.5rem; font-weight:400; line-height:1.1; }
  .update-card p { font-size:0.86rem; color:var(--text-mid); line-height:1.6; margin-top:14px; }
  .update-apology { color:var(--text-dim); }
  .update-btn {
    margin-top:22px; font-family:var(--font-display); font-size:0.75rem; letter-spacing:0.08em;
    background:var(--red); color:#0a0a0c; border:none; padding:13px 26px; cursor:pointer;
    transition:filter var(--t-fast) var(--ease-out);
  }
  .update-btn:hover { filter:brightness(1.12); }
  @keyframes u-fade { from { opacity:0; } to { opacity:1; } }
  @keyframes u-pop { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:none; } }

  /* ── tablet ── */
  @media (max-width: 860px) {
    .front { width:min(100% - 32px, 980px); }
    .srow { grid-template-columns:48px minmax(0,1fr) auto 40px; }
    .s-state { display:none; }
  }
  /* ── mobile ── */
  @media (max-width: 560px) {
    .wordmark { padding:0 16px; }
    .meta .sub { display:none; }
    .lang { padding:0 16px; }
    .head { padding:28px 0 18px; }
    .srow { grid-template-columns:44px minmax(0,1fr) auto; gap:14px; padding:16px 0; }
    .s-icon { width:40px; height:40px; }
    .s-go { display:none; }
    .foot { justify-content:center; text-align:center; }
  }
  @media (prefers-reduced-motion: reduce) {
    .head, .srow, .update-overlay, .update-card { animation:none; }
    *, *::before, *::after { transition-duration:0.01ms !important; }
  }
</style>
