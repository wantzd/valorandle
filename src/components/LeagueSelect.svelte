<script>
  import { onMount } from 'svelte';
  import { loadLang, saveLang, getDailyDateKey } from '../lib/game-utils.js';

  let lang        = $state('pt-BR');
  let isPT        = $derived(lang === 'pt-BR');
  let mode        = $state('daily');
  let amCount     = $state(0);
  let amStatus    = $state(null); // null | { type: 'done', wins: number } | { type: 'progress' }
  let cardsReady  = $state(false);

  onMount(async () => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);
    const params = new URLSearchParams(window.location.search);
    mode = params.get('mode') === 'free' ? 'free' : 'daily';

    if (window.initPlayersDB) {
      await window.initPlayersDB();
      if (window.PLAYERS_DB) {
        amCount = window.PLAYERS_DB.filter(p => p.leagueId === 'americas').length;
      }
    }

    if (mode === 'daily' && window.getDailyDateKey) {
      const key   = 'valorandle_daily_americas_' + window.getDailyDateKey();
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved?.dailyDone) {
          const wins = (saved.roundResults || []).filter(r => r.won).length;
          amStatus = { type: 'done', wins };
        } else if (saved?.guesses?.length > 0) {
          amStatus = { type: 'progress' };
        }
      } catch {}
    } else if (mode === 'daily') {
      const key   = 'valorandle_daily_americas_' + getDailyDateKey();
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved?.dailyDone) {
          const wins = (saved.roundResults || []).filter(r => r.won).length;
          amStatus = { type: 'done', wins };
        } else if (saved?.guesses?.length > 0) {
          amStatus = { type: 'progress' };
        }
      } catch {}
    }

    // stagger cards
    setTimeout(() => { cardsReady = true; }, 30);
  });

  function modePillText() {
    if (mode === 'daily') return 'Daily';
    return isPT ? 'Livre' : 'Free';
  }

  function americasHref() {
    return `/game?mode=${mode}&league=americas`;
  }
</script>

<div class="page">
  <header class="header">
    <a class="back-btn" href={isPT ? '/' : '/en'}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px">
        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
      </svg>Lobby
    </a>
    <div class="header-logo">VALOR<span>ANDLE</span></div>
    <div class="mode-pill">{modePillText()}</div>
  </header>

  <div class="hero">
    <p class="hero-eyebrow">{isPT ? 'Selecione a Liga' : 'Select League'}</p>
    <h1 class="hero-title">{isPT ? 'Qual liga?' : 'Which league?'}</h1>
    <p class="hero-sub">{isPT ? 'Escolha a liga dos jogadores para adivinhar' : 'Choose the league of players to guess'}</p>
  </div>

  <div class="league-grid">
    <!-- Americas -->
    <a
      class="league-card"
      href={americasHref()}
      style="--lc:var(--col-americas); opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:80ms"
    >
      <div class="league-icon-wrap"><img src="/assets/logos/americas.png" alt="VCT Americas" /></div>
      <div class="league-name">VCT<br>Americas</div>
      <div class="league-region">NA · LATAM · BR</div>
      <div class="league-count">{amCount > 0 ? `${amCount} ${isPT ? 'jogadores' : 'players'}` : '—'}</div>
      {#if amStatus?.type === 'done'}
        <div class="am-badge am-done">✓ {amStatus.wins}/5</div>
      {:else if amStatus?.type === 'progress'}
        <div class="am-badge am-prog">{isPT ? '▶ em progresso' : '▶ in progress'}</div>
      {/if}
    </a>

    <!-- EMEA -->
    <div class="league-card soon" style="--lc:var(--col-emea); opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:135ms">
      <div class="league-icon-wrap"><img src="/assets/logos/emea.png" alt="VCT EMEA" /></div>
      <div class="league-name">VCT<br>EMEA</div>
      <div class="league-region">EU · TR · CIS</div>
      <div class="soon-badge">{isPT ? 'Em breve' : 'Soon'}</div>
    </div>

    <!-- Pacific -->
    <div class="league-card soon" style="--lc:var(--col-pacific); opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:190ms">
      <div class="league-icon-wrap"><img src="/assets/logos/pacific.png" alt="VCT Pacific" /></div>
      <div class="league-name">VCT<br>Pacific</div>
      <div class="league-region">KR · JP · SEA</div>
      <div class="soon-badge">{isPT ? 'Em breve' : 'Soon'}</div>
    </div>

    <!-- China -->
    <div class="league-card soon" style="--lc:var(--col-china); opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:245ms">
      <div class="league-icon-wrap"><img src="/assets/logos/china.png" alt="VCT China" /></div>
      <div class="league-name">VCT<br>China</div>
      <div class="league-region">CN</div>
      <div class="soon-badge">{isPT ? 'Em breve' : 'Soon'}</div>
    </div>

    <!-- All -->
    <div class="league-card all soon" style="--lc:var(--col-all); opacity:{cardsReady?1:0}; transform:{cardsReady?'translateY(0)':'translateY(18px)'}; transition-delay:300ms">
      <svg class="league-icon" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="28" cy="28" r="22" stroke="#E5C96A" stroke-width="2"/>
        <ellipse cx="28" cy="28" rx="11" ry="22" stroke="#E5C96A" stroke-width="1.5"/>
        <line x1="6" y1="18" x2="50" y2="18" stroke="#E5C96A" stroke-width="1" opacity="0.5"/>
        <line x1="6" y1="28" x2="50" y2="28" stroke="#E5C96A" stroke-width="1.5"/>
        <line x1="6" y1="38" x2="50" y2="38" stroke="#E5C96A" stroke-width="1" opacity="0.5"/>
        <circle cx="28" cy="28" r="3.5" fill="#E5C96A"/>
      </svg>
      <div class="league-name">All —<br>Todas</div>
      <div class="league-region">AM · EMEA · PAC · CN</div>
      <div class="soon-badge">{isPT ? 'Em breve' : 'Soon'}</div>
    </div>
  </div>

  <p class="page-footer">{isPT ? 'Dados aproximados — Mai 2026' : 'Approximate data — May 2026'}</p>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620; --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8;
    --font-display:'Russo One', sans-serif; --font-ui:'Outfit', sans-serif; --font-mono:'Outfit', sans-serif;
    --col-americas:#FF5400; --col-emea:#C4FF00; --col-pacific:#00DCFF; --col-china:#FF1675; --col-all:#E5C96A;
  }
  :global(html, body) { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-ui); }
  :global(body::before) { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px); background-size:28px 28px; pointer-events:none; opacity:0.5; }

  .page { position:relative; z-index:1; min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:1.5rem 1.5rem 4rem; animation:fadeUp 0.38s ease both; }
  .header { width:100%; max-width:900px; display:flex; align-items:center; gap:1rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); margin-bottom:2.5rem; }
  .back-btn { background:transparent; border:1px solid var(--border2); color:var(--text-dim); font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.03em; padding:0.4rem 0.85rem; cursor:pointer; border-radius:3px; transition:all 0.2s; text-decoration:none; }
  .back-btn:hover { border-color:var(--red); color:var(--red); }
  .header-logo { font-family:var(--font-display); font-size:1.3rem; color:var(--text); text-transform:uppercase; }
  .header-logo span { color:var(--red); }
  .mode-pill { margin-left:auto; font-family:var(--font-mono); font-size:0.6rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; background:var(--surface2); border:1px solid var(--border2); color:var(--text-dim); padding:0.3rem 0.7rem; border-radius:2px; }

  .hero { text-align:center; margin-bottom:2.5rem; animation:fadeUp 0.38s ease both; }
  .hero-eyebrow { font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.02em; text-transform:uppercase; color:var(--red); margin-bottom:0.75rem; opacity:0.85; }
  .hero-title { font-family:var(--font-display); font-size:clamp(2rem,6vw,3.2rem); text-transform:uppercase; color:var(--text); line-height:1; }
  .hero-sub { margin-top:0.7rem; font-size:0.8rem; color:var(--text-dim); font-weight:400; }

  .league-grid { width:100%; max-width:900px; display:grid; grid-template-columns:repeat(5,1fr); gap:10px; animation:fadeUp 0.38s 0.07s ease both; }
  @media (max-width:720px) { .league-grid{grid-template-columns:repeat(2,1fr)} .league-card.all{grid-column:1/-1} }

  .league-card { background:var(--surface); border:1px solid var(--border); border-radius:6px; padding:1.75rem 0.75rem 1.25rem; cursor:pointer; text-decoration:none; color:inherit; display:flex; flex-direction:column; align-items:center; gap:0.7rem; position:relative; overflow:hidden; transition:transform 0.2s, border-color 0.2s, box-shadow 0.2s, opacity 0.35s ease; }
  .league-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background:var(--lc,#fff); transform:scaleX(0); transform-origin:center; transition:transform 0.25s ease; }
  .league-card:hover { transform:translateY(-4px); border-color:var(--lc,#fff); box-shadow:0 12px 36px rgba(0,0,0,0.4),0 0 0 1px var(--lc,#fff); }
  .league-card:hover::after { transform:scaleX(1); }
  .league-card:hover .league-name { color:var(--lc); }
  .league-icon-wrap { width:64px; height:64px; display:flex; align-items:center; justify-content:center; transition:transform 0.3s,filter 0.3s; }
  .league-card:hover .league-icon-wrap { transform:scale(1.1); filter:drop-shadow(0 0 8px var(--lc)); }
  .league-icon-wrap img { width:100%; height:100%; object-fit:contain; }
  .league-icon { width:60px; height:60px; }
  .league-name { font-family:var(--font-display); font-size:0.88rem; text-transform:uppercase; text-align:center; color:var(--text); transition:color 0.2s; line-height:1.2; }
  .league-region { font-family:var(--font-mono); font-size:0.56rem; letter-spacing:0.03em; text-transform:uppercase; text-align:center; color:var(--text-dim); }
  .league-count { font-family:var(--font-mono); font-size:0.62rem; color:var(--lc,var(--text-dim)); border:1px solid var(--lc,var(--border)); background:var(--surface2); padding:0.18rem 0.65rem; border-radius:2px; margin-top:auto; transition:color 0.2s,border-color 0.2s; opacity:0.7; }
  .league-card:hover .league-count { opacity:1; }

  .am-badge { font-family:var(--font-mono); font-size:0.58rem; margin-top:-4px; opacity:0.8; }
  .am-done { color:var(--lc); }
  .am-prog { color:var(--text-dim); }

  .league-card.soon { filter:grayscale(1) brightness(0.45); cursor:not-allowed !important; pointer-events:none; }
  .league-card.soon::after { display:none !important; }
  .soon-badge { font-family:var(--font-mono); font-size:0.56rem; font-weight:700; letter-spacing:0; text-transform:uppercase; background:var(--border2); color:var(--text-dim); border:1px solid var(--border2); padding:0.18rem 0.6rem; border-radius:2px; margin-top:2px; width:fit-content; }

  .page-footer { margin-top:2rem; font-family:var(--font-mono); font-size:0.62rem; color:var(--text-dim); text-align:center; animation:fadeUp 0.38s 0.14s ease both; }

  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
</style>
