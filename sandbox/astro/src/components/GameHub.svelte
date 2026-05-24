<script>
  import { onMount, onDestroy } from 'svelte';
  import { getDailyDateKey, msUntilNextDaily, formatCountdown, saveLang, loadStats } from '../lib/game-utils.js';

  // ── Lang ─────────────────────────────────────────────────────────────────────
  let lang = $state('pt-BR');
  let isPT = $derived(lang === 'pt-BR');

  // ── Hero state ───────────────────────────────────────────────────────────────
  let pips        = $state(['', '', '', '', '']);
  let heroMeta    = $state('');
  let statusClass = $state('new');
  let statusText  = $state('Novo');
  let btnText     = $state('Jogar →');

  // ── Stats ────────────────────────────────────────────────────────────────────
  let streak    = $state(0);
  let statToday = $state(0);
  let statWinrate = $state('—');

  // ── Countdown ────────────────────────────────────────────────────────────────
  let countdown  = $state('--:--:--');
  let cdInterval = null;

  onMount(() => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);
    renderHero();
    renderStats();
    startCountdown();
  });

  onDestroy(() => { if (cdInterval) clearInterval(cdInterval); });

  function setLang(l) {
    lang = l;
    saveLang(l);
    renderHero();
    renderStats();
  }

  function renderHero() {
    const key   = 'valorandle_daily_americas_' + getDailyDateKey();
    let   saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}

    const results  = saved?.roundResults || [];
    const current  = saved?.currentRound ?? 0;
    const done     = !!(saved?.dailyDone);
    const started  = results.length > 0 || !!(saved?.guesses?.length);

    pips = Array.from({ length: 5 }, (_, i) => {
      if (results[i])                          return 'done';
      if (i === current && started && !done)   return 'active';
      return '';
    });

    if (done) {
      const wins = results.filter(r => r.won).length;
      heroMeta    = isPT ? `Daily completo · ${wins}/5` : `Daily complete · ${wins}/5`;
      statusClass = 'done';
      statusText  = isPT ? '✓ Completo' : '✓ Complete';
      btnText     = isPT ? 'Ver resultado →' : 'View result →';
    } else if (started) {
      heroMeta    = isPT
        ? `Daily de hoje · Round ${current + 1} de 5`
        : `Today's Daily · Round ${current + 1} of 5`;
      statusClass = '';
      statusText  = isPT ? 'Em progresso' : 'In progress';
      btnText     = isPT ? 'Continuar →' : 'Continue →';
    } else {
      heroMeta    = isPT ? 'Daily de hoje' : "Today's Daily";
      statusClass = 'new';
      statusText  = isPT ? 'Novo' : 'New';
      btnText     = isPT ? 'Jogar →' : 'Play →';
    }
  }

  function renderStats() {
    const stats = loadStats();
    streak      = stats.streak || 0;
    statWinrate = stats.played > 0
      ? Math.round((stats.wins / stats.played) * 100) + '%'
      : '—';

    const today = getDailyDateKey();
    let count = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k?.startsWith('valorandle_daily_') || !k.endsWith('_' + today)) continue;
        const s = JSON.parse(localStorage.getItem(k) || 'null');
        if (s?.guesses?.length > 0 || s?.roundResults?.length > 0) count++;
      }
    } catch {}
    statToday = count;
  }

  function startCountdown() {
    countdown  = formatCountdown(msUntilNextDaily());
    cdInterval = setInterval(() => {
      countdown = formatCountdown(msUntilNextDaily());
    }, 1000);
  }
</script>

<div class="hub">
  <nav class="topbar">
    <a class="topbar-logo" href="/">VALOR<span>ANDLE</span></a>
    <div class="topbar-right">
      {#if streak > 0}
        <span class="streak-chip">🔥 {streak}</span>
      {/if}
      <a class="lang-btn" class:active={lang === 'pt-BR'} href="/">
        <span class="fi fi-br" aria-hidden="true"></span> PT
      </a>
      <a class="lang-btn" class:active={lang === 'en'} href="/en">
        <span class="fi fi-us" aria-hidden="true"></span> EN
      </a>
    </div>
  </nav>

  <main class="hub-content">
    <!-- Hero card -->
    <div class="hub-hero">
      <div class="hub-hero-inner">
        <div class="hub-hero-top">
          <div>
            <div class="hub-hero-meta">{heroMeta}</div>
            <div class="hub-hero-title">Pro Players</div>
            <div class="hub-hero-desc">
              {isPT
                ? 'Adivinhe qual jogador profissional do VCT está escondido. 8 tentativas por round.'
                : 'Guess which VCT pro player is hidden. 8 attempts per round.'}
            </div>
          </div>
          <div class="hub-status {statusClass}">
            <span class="dot"></span>
            <span>{statusText}</span>
          </div>
        </div>

        <div class="hub-pips">
          {#each pips as pip}
            <div class="hub-pip {pip}"></div>
          {/each}
        </div>

        <div class="hub-cta-row">
          <a class="btn primary" href="/league-select?mode=daily">{btnText}</a>
          <a class="btn ghost" href="/league-select?mode=free">
            {isPT ? 'Modo livre' : 'Free mode'}
          </a>
        </div>
      </div>
    </div>

    <!-- Other modes -->
    <div class="section-label">{isPT ? 'Outros modos' : 'Other modes'}</div>

    <div class="mode-list">
      <a class="mode-row" href={isPT ? '/agents?mode=daily' : '/en/agents?mode=daily'}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="3"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>
          </svg>
        </div>
        <div class="mode-info">
          <div class="mode-name">{isPT ? 'Agentes' : 'Agents'}</div>
          <div class="mode-desc">{isPT ? 'Gênero, função, origem, lançamento, pts. ult' : 'Gender, role, origin, release, ult points'}</div>
        </div>
        <span class="mode-tag new">{isPT ? 'Novo' : 'New'}</span>
        <span class="mode-arrow">→</span>
      </a>

      <a class="mode-row" href={isPT ? '/maps' : '/en/maps'}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v16M15 6v16"/>
          </svg>
        </div>
        <div class="mode-info">
          <div class="mode-name">{isPT ? 'Mapas' : 'Maps'}</div>
          <div class="mode-desc">{isPT ? 'Imagem com zoom progressivo · fácil/difícil' : 'Progressive zoom image · easy/hard'}</div>
        </div>
        <span class="mode-tag new">{isPT ? 'Novo' : 'New'}</span>
        <span class="mode-arrow">→</span>
      </a>

      <a class="mode-row" href={isPT ? '/skins' : '/en/skins'}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 13h11l3-4 4 1-1 3-5 3H3z"/><circle cx="17" cy="14" r="1" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div class="mode-info">
          <div class="mode-name">Skins</div>
          <div class="mode-desc">{isPT ? 'Ouça o som do tiro · adivinhe bundle, arma e edição' : 'Hear the gunshot · guess bundle, weapon and edition'}</div>
        </div>
        <span class="mode-tag new">{isPT ? 'Novo' : 'New'}</span>
        <span class="mode-arrow">→</span>
      </a>

      <a class="mode-row" href={isPT ? '/abilities' : '/en/abilities'}>
        <div class="mode-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>
          </svg>
        </div>
        <div class="mode-info">
          <div class="mode-name">{isPT ? 'Habilidades' : 'Abilities'}</div>
          <div class="mode-desc">{isPT ? 'Descrição ou ícone revelado progressivamente' : 'Censored description or progressively revealed icon'}</div>
        </div>
        <span class="mode-tag new">{isPT ? 'Novo' : 'New'}</span>
        <span class="mode-arrow">→</span>
      </a>
    </div>

    <!-- Quick stats -->
    <div class="qstats-row">
      <div class="qstat">
        <span class="qstat-num">{statToday}</span>
        <div class="qstat-lbl">{isPT ? 'Jogos hoje' : 'Today'}</div>
      </div>
      <div class="qstat">
        <span class="qstat-num">{streak}</span>
        <div class="qstat-lbl">Streak</div>
      </div>
      <div class="qstat">
        <span class="qstat-num">{statWinrate}</span>
        <div class="qstat-lbl">Win rate</div>
      </div>
    </div>

    <!-- Countdown -->
    <div class="countdown-wrap">
      <span class="countdown-lbl">{isPT ? 'Próximo daily em' : 'Next daily in'}</span>
      <span class="countdown-timer">{countdown}</span>
    </div>

    <footer class="hub-footer">
      <span>Fan-made. {isPT ? 'Não afiliado à' : 'Not affiliated with'}
        <a href="https://playvalorant.com" target="_blank" rel="noopener">Riot Games</a>.</span>
      <span class="footer-sep"> · </span>
      <span>{isPT ? 'Dados dos jogadores:' : 'Player data:'}
        <a href="https://liquipedia.net/valorant" target="_blank" rel="noopener">Liquipedia</a>
        (<a href="https://liquipedia.net/commons/Liquipedia:Copyrights" target="_blank" rel="noopener">CC BY-SA</a>)
      </span>
    </footer>
  </main>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620; --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32); --red-glow:rgba(255,70,85,0.22);
    --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8; --green:#34d47e;
    --font-display:'Russo One',sans-serif; --font-ui:'Outfit',sans-serif; --font-mono:'Outfit',sans-serif;
    --col-americas:#FF5400;
  }
  :global(html,body) { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-ui); overflow-x:hidden; }
  :global(body::before) { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px); background-size:28px 28px; pointer-events:none; opacity:.5; }
  :global(body::after)  { content:''; position:fixed; top:-180px; left:50%; z-index:0; transform:translateX(-50%); width:600px; height:480px; background:radial-gradient(ellipse,rgba(255,70,85,0.05) 0%,transparent 70%); pointer-events:none; }

  .hub { position:relative; z-index:1; min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:1.25rem 1.5rem 5rem; }

  .topbar { width:100%; max-width:640px; display:flex; align-items:center; justify-content:space-between; padding-bottom:1rem; border-bottom:1px solid var(--border); margin-bottom:1.5rem; animation:fadeUp 0.38s ease both; }
  .topbar-logo { font-family:var(--font-display); font-size:1.2rem; letter-spacing:0; text-transform:uppercase; color:var(--text); text-decoration:none; }
  .topbar-logo span { color:var(--red); }
  .topbar-right { display:flex; align-items:center; gap:6px; }

  .streak-chip { font-family:var(--font-mono); font-size:0.68rem; font-weight:700; letter-spacing:0.02em; color:var(--red); background:var(--red-dim); border:1px solid var(--red-bd); padding:0.3rem 0.6rem; border-radius:3px; display:flex; align-items:center; gap:0.3rem; }

  .lang-btn { background:transparent; border:1px solid var(--border2); color:var(--text-dim); font-family:var(--font-mono); font-size:0.68rem; letter-spacing:0.03em; padding:0.32rem 0.7rem; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:0.35rem; border-radius:3px; }
  .lang-btn.active { background:var(--red); color:#fff; border-color:var(--red); }
  .lang-btn:hover:not(.active) { border-color:var(--text-dim); color:var(--text-mid); }

  .hub-content { width:100%; max-width:640px; display:flex; flex-direction:column; gap:10px; animation:fadeUp 0.38s 0.06s ease both; }

  .hub-hero { background:linear-gradient(135deg,var(--surface) 0%,#1a0a10 60%,rgba(255,70,85,0.1) 100%); border:1px solid var(--red-bd); border-radius:8px; padding:1.5rem 1.75rem; position:relative; overflow:hidden; }
  .hub-hero::before { content:''; position:absolute; top:-60px; right:-60px; width:260px; height:260px; background:radial-gradient(circle,rgba(255,70,85,0.18),transparent 70%); pointer-events:none; }
  .hub-hero-inner { position:relative; }
  .hub-hero-top { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1rem; }
  .hub-hero-meta { font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.07em; text-transform:uppercase; color:var(--red); opacity:0.85; margin-bottom:0.4rem; }
  .hub-hero-title { font-family:var(--font-display); font-size:2rem; line-height:1; text-transform:uppercase; margin-bottom:0.4rem; }
  .hub-hero-desc { font-size:0.82rem; color:var(--text-mid); line-height:1.5; max-width:340px; }

  .hub-status { font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0; color:var(--text-mid); text-transform:uppercase; padding:0.35rem 0.6rem; background:rgba(0,0,0,0.3); border:1px solid var(--border2); border-radius:3px; display:inline-flex; align-items:center; gap:0.4rem; white-space:nowrap; flex-shrink:0; align-self:flex-start; }
  .hub-status .dot { width:6px; height:6px; border-radius:50%; background:var(--red); animation:pulse 1.8s ease infinite; }
  .hub-status.done .dot { background:var(--green); animation:none; }
  .hub-status.new  .dot { background:var(--text-dim); animation:none; }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .hub-pips { display:flex; gap:5px; margin-bottom:1.1rem; }
  .hub-pip { flex:1; height:4px; border-radius:2px; background:var(--surface2); border:1px solid var(--border2); transition:background 0.3s,border-color 0.3s; }
  .hub-pip.done   { background:var(--green); border-color:var(--green); }
  .hub-pip.active { background:var(--red); border-color:var(--red); box-shadow:0 0 6px var(--red-glow); }

  .hub-cta-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .btn { font-family:var(--font-mono); font-size:0.72rem; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:0.65rem 1.2rem; border-radius:4px; cursor:pointer; transition:all 0.2s; border:none; display:inline-flex; align-items:center; gap:0.35rem; text-decoration:none; }
  .btn.primary { background:var(--red); color:#fff; }
  .btn.primary:hover { background:#e03040; box-shadow:0 0 14px var(--red-glow); }
  .btn.ghost { background:transparent; border:1px solid var(--border2); color:var(--text-mid); }
  .btn.ghost:hover { border-color:var(--red); color:var(--red); }

  .section-label { font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.02em; text-transform:uppercase; color:var(--text-dim); display:flex; align-items:center; gap:0.65rem; margin:0.4rem 0 0.1rem; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--border); }

  .mode-list { display:flex; flex-direction:column; gap:5px; }
  .mode-row { display:flex; align-items:center; gap:0.9rem; background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:0.85rem 1rem; cursor:pointer; text-decoration:none; color:inherit; transition:border-color 0.18s,transform 0.18s,background 0.18s; }
  .mode-row:hover { border-color:var(--red); transform:translateX(2px); background:var(--surface2); }
  .mode-row:hover .mode-icon { background:var(--red); border-color:var(--red); color:#fff; }
  .mode-row:hover .mode-arrow { color:var(--red); }
  .mode-row.disabled { opacity:0.45; pointer-events:none; }
  .mode-icon { width:36px; height:36px; border-radius:6px; background:var(--surface2); border:1px solid var(--border2); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--text-mid); transition:background 0.18s,border-color 0.18s,color 0.18s; }
  .mode-icon svg { width:18px; height:18px; }
  .mode-info { flex:1; min-width:0; }
  .mode-name { font-family:var(--font-display); font-size:1rem; text-transform:uppercase; line-height:1; }
  .mode-desc { font-size:0.73rem; color:var(--text-dim); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mode-tag { font-family:var(--font-mono); font-size:0.55rem; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:0.18rem 0.5rem; border-radius:2px; }
  .mode-tag.new  { background:var(--red); color:#0d0002; border:1px solid var(--red); }
  .mode-tag.beta { background:transparent; color:var(--text-dim); border:1px solid var(--border2); }
  .mode-tag.soon { background:transparent; color:var(--text-dim); border:1px solid var(--border2); opacity:0.6; }
  .mode-arrow { color:var(--text-dim); font-family:var(--font-mono); font-size:0.95rem; flex-shrink:0; transition:color 0.18s; }

  .qstats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); border-radius:6px; overflow:hidden; }
  .qstat { background:var(--surface); text-align:center; padding:0.85rem 0.5rem; }
  .qstat-num { display:block; font-family:var(--font-display); font-size:1.7rem; color:var(--red); line-height:1; }
  .qstat-lbl { font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0; text-transform:uppercase; color:var(--text-dim); margin-top:0.35rem; }

  .countdown-wrap { background:var(--surface); border:1px solid var(--border); border-radius:6px; display:flex; align-items:center; justify-content:space-between; padding:0.85rem 1.25rem; }
  .countdown-lbl { font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-dim); }
  .countdown-timer { font-family:var(--font-mono); font-size:1.1rem; font-weight:700; color:var(--red); letter-spacing:0.02em; }

  .hub-footer { margin-top:1.5rem; font-family:var(--font-mono); font-size:0.65rem; color:var(--text-dim); text-align:center; line-height:1.8; }
  .hub-footer a { color:var(--text-mid); text-decoration:none; }
  .hub-footer a:hover { color:var(--red); }
  .footer-sep { color:var(--border2); }

  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  @media (max-width:500px) {
    .hub { padding:1rem 1rem 4rem; }
    .hub-hero { padding:1.1rem 1.2rem; }
    .hub-hero-title { font-size:1.6rem; }
    .hub-hero-desc { display:none; }
    .hub-hero-top { flex-direction:column; gap:0.6rem; }
    .mode-desc { display:none; }
  }
</style>
