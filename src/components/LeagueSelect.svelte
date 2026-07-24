<script>
  import { onMount } from 'svelte';
  import { loadLang, saveLang, getDailyDateKey } from '../lib/game-utils.js';
  import '../styles/arena.css';

  let lang        = $state('pt-BR');
  let isPT        = $derived(lang === 'pt-BR');
  let mode        = $state('daily');
  let amCount     = $state(0);
  let amStatus    = $state(null); // null | { type: 'done', wins } | { type: 'progress' }

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

    if (mode === 'daily') {
      const key = 'valorandle_daily_americas_' + (window.getDailyDateKey?.() || getDailyDateKey());
      try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved?.dailyDone) {
          amStatus = { type: 'done', wins: (saved.roundResults || []).filter(r => r.won).length };
        } else if (saved?.guesses?.length > 0) {
          amStatus = { type: 'progress' };
        }
      } catch {}
    }
  });

  function modePillText() { return mode === 'daily' ? 'Daily' : (isPT ? 'Livre' : 'Free'); }
  function americasHref() { return `/game?mode=${mode}&league=americas`; }

  const soon = [
    { id: 'emea',    name: 'EMEA',    region: 'EU · TR · CIS', color: 'var(--col-emea)' },
    { id: 'pacific', name: 'Pacific', region: 'KR · JP · SEA', color: 'var(--col-pacific)' },
    { id: 'china',   name: 'China',   region: 'CN',            color: 'var(--col-china)' },
    { id: 'all',     name: isPT ? 'Todas' : 'All', region: 'AM · EMEA · PAC · CN', color: 'var(--col-all)' },
  ];
</script>

<header class="ticker">
  <a class="wordmark" href={isPT ? '/' : '/en'} title="Lobby">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
    VALOR<b>ANDLE</b>
  </a>
  <div class="meta">
    <span class="sub">{isPT ? 'modo' : 'mode'} <b>{modePillText()}</b></span>
    <a class="t-btn" href={isPT ? '/en/league-select' : '/league-select'}
       title={isPT ? 'Switch to English' : 'Mudar para Português'}
       aria-label={isPT ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{isPT ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

<main class="arena" style="--accent:var(--col-americas)">
  <header class="ls-head">
    <h1>{isPT ? 'QUAL' : 'WHICH'} <em>{isPT ? 'LIGA?' : 'LEAGUE?'}</em></h1>
    <p>{isPT ? 'Escolha a liga dos jogadores para adivinhar.' : 'Choose the league of players to guess.'}</p>
  </header>

  <div class="ls-grid">
    <a class="ls-card active" href={americasHref()}>
      <span class="ls-icon"><img src="/assets/logos/americas.png" alt="VCT Americas" /></span>
      <span class="ls-name">VCT Americas</span>
      <span class="ls-region">NA · LATAM · BR</span>
      <span class="ls-meta">
        {amCount > 0 ? `${amCount} ${isPT ? 'jogadores' : 'players'}` : '—'}
        {#if amStatus?.type === 'done'} · <b class="ok">✓ {amStatus.wins}/5</b>
        {:else if amStatus?.type === 'progress'} · <b class="prog">{isPT ? 'em progresso' : 'in progress'}</b>{/if}
      </span>
      <span class="ls-go" aria-hidden="true">→</span>
    </a>

    {#each soon as l}
      <div class="ls-card soon" style={`--lc:${l.color}`}>
        <span class="ls-icon">{#if l.id !== 'all'}<img src={`/assets/logos/${l.id}.png`} alt={`VCT ${l.name}`} />{:else}<svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="20" stroke="currentColor" stroke-width="2"/><ellipse cx="28" cy="28" rx="10" ry="20" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="28" x2="48" y2="28" stroke="currentColor" stroke-width="1.5"/></svg>{/if}</span>
        <span class="ls-name">{l.id === 'all' ? l.name : `VCT ${l.name}`}</span>
        <span class="ls-region">{l.region}</span>
        <span class="ls-soon">{isPT ? 'Em breve' : 'Soon'}</span>
      </div>
    {/each}
  </div>

  <p class="ls-foot">{isPT ? 'Dados aproximados — Mai 2026' : 'Approximate data — May 2026'}</p>
</main>

<style>
  .ls-head { padding:20px 0 6px; }
  .ls-head h1 { font-family:var(--font-display); font-size:clamp(1.8rem, 3.4vw, 2.8rem); font-weight:400; }
  .ls-head h1 em { font-style:normal; color:var(--accent); }
  .ls-head p { color:var(--text-dim); font-size:0.82rem; margin-top:8px; }

  .ls-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; }

  .ls-card {
    position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:8px;
    padding:24px 22px; background:var(--surface); border:1px solid var(--border2); color:var(--text);
    text-decoration:none;
    animation:a-rise 0.45s var(--ease-out) both;
    transition:border-color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out), translate var(--t-fast) var(--ease-out);
  }
  .ls-card.active { border-bottom:2px solid var(--accent); }
  .ls-card.active:hover { border-color:color-mix(in srgb,var(--accent) 55%,transparent); border-bottom-color:var(--accent); background:var(--surface2); translate:0 -2px; }
  .ls-icon { width:52px; height:52px; display:flex; align-items:center; justify-content:center; color:var(--accent); }
  .ls-icon img, .ls-icon svg { width:100%; height:100%; object-fit:contain; }
  .ls-name { font-family:var(--font-display); font-size:1rem; letter-spacing:0.02em; }
  .ls-region { font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-dim); font-weight:700; }
  .ls-meta { font-size:0.72rem; color:var(--text-dim); margin-top:4px; }
  .ls-meta b.ok { color:var(--green); } .ls-meta b.prog { color:var(--accent); }
  .ls-go { position:absolute; right:20px; bottom:18px; color:var(--accent); font-weight:700; opacity:0.5; transition:opacity var(--t-fast) var(--ease-out), translate var(--t-fast) var(--ease-out); }
  .ls-card.active:hover .ls-go { opacity:1; translate:3px 0; }

  .ls-card.soon { --lc:var(--border2); color:var(--text-dim); filter:grayscale(0.7) brightness(0.7); pointer-events:none; }
  .ls-card.soon .ls-icon { color:var(--text-dim); }
  .ls-soon { margin-top:4px; font-size:0.58rem; letter-spacing:0.1em; text-transform:uppercase; font-weight:700; color:var(--text-dim); border:1px solid var(--border2); padding:4px 10px; }

  .ls-foot { margin-top:8px; text-align:center; font-size:0.64rem; color:var(--text-dim); }

  @media (max-width: 720px) {
    .ls-grid { grid-template-columns:repeat(2, 1fr); }
  }
</style>
