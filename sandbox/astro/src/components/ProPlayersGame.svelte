<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { loadLang, saveLang } from '../lib/game-utils.js';

  // All game logic lives in window globals loaded via <script is:inline> in game.astro
  // This component wires up the DOM that the existing inline JS expects.

  let lang = $state('pt-BR');
  let isPT = $derived(lang === 'pt-BR');

  // These are updated by the inline JS via DOM IDs; we just provide the template.
  // The inline script runs after DOMContentLoaded and drives everything imperatively.

  onMount(() => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);
  });
</script>

<!-- The inline script in the .astro page shell drives all interactivity via DOM IDs -->
<!-- This component is purely a template wrapper -->

<div class="game-screen">

  <header class="game-header">
    <div class="header-left">
      <a class="back-btn" href={isPT ? '/' : '/en'} id="back-btn">← Lobby</a>
      <div class="streak-chip" id="streak-chip" title="Sequência atual">
        <span>🔥</span><span class="streak-num" id="streak-num">0</span>
      </div>
    </div>

    <div class="game-title-area">
      <div class="game-logo">VALOR<span>ANDLE</span></div>
      <div class="mode-tag" id="mode-tag">Daily Mode</div>
      <div class="league-tag" id="league-tag"></div>
    </div>

    <div class="header-right">
<button class="icon-btn" id="hard-btn" title="Modo Hard (sem setas)">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4.5zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z"/></svg>
      </button>
      <button class="icon-btn active" id="sound-btn" title="Sons">
        <svg id="sound-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M9 2.5a.5.5 0 0 0-.854-.354L4.793 5.5H2.5A1.5 1.5 0 0 0 1 7v2a1.5 1.5 0 0 0 1.5 1.5h2.293l3.353 3.354A.5.5 0 0 0 9 13.5v-11zm2.854.646a.5.5 0 0 1 .707 0A6.5 6.5 0 0 1 14 8a6.5 6.5 0 0 1-1.439 4.104.5.5 0 0 1-.708-.707A5.5 5.5 0 0 0 13 8a5.5 5.5 0 0 0-1.146-3.397.5.5 0 0 1 0-.707z"/></svg>
      </button>
    </div>
  </header>

  <div class="round-progress" id="round-progress" style="display:none"></div>

  <div class="round-info">
    <span class="round-label" id="round-label">Round 1 de 5</span>
    <span class="attempts-label" id="attempts-label">0/8 tentativas</span>
  </div>

  <div class="input-section">
    <div class="guess-input-wrap">
      <input type="text" class="guess-input" id="guess-input" autocomplete="off" spellcheck="false" />
      <button class="guess-btn" id="guess-btn">OK →</button>
    </div>
    <div class="autocomplete-list" id="autocomplete-list" style="display:none"></div>
    <div class="input-error" id="input-error"></div>
  </div>

  <div class="grid-scroll-wrapper">
    <div class="grid-container" id="grid-container">
      <div class="grid-headers" id="grid-headers">
        <div class="col-header" id="hdr-name">Jogador</div>
        <div class="col-header" id="hdr-country">País</div>
        <div class="col-header" id="hdr-team">Time</div>
        <div class="col-header" id="hdr-age">Idade</div>
        <div class="col-header" id="hdr-role">Função</div>
        <div class="col-header" id="hdr-titles">Títulos</div>
        <div class="col-header" id="hdr-years">Anos Ativo</div>
      </div>
      <div class="guess-grid" id="guess-grid"></div>
    </div>
  </div>

  <div class="result-panel" id="result-banner">
    <div class="result-status" id="banner-title"></div>
    <div class="result-body">
      <div class="result-player" id="result-player-card">
        <div class="result-flag" id="result-flag"></div>
        <div>
          <span class="result-player-name" id="result-name"></span>
          <span class="result-player-sub" id="result-sub"></span>
        </div>
      </div>
      <div id="result-graph" style="display:none">
        <span class="result-graph-label" id="result-graph-label">Tentativas</span>
        <div class="attempt-track" id="attempt-track"></div>
      </div>
      <div id="result-replay" style="display:none">
        <span class="replay-label" id="replay-label">Último chute</span>
        <div class="replay-cells" id="replay-cells"></div>
      </div>
      <div class="result-actions" id="banner-actions"></div>
    </div>
  </div>

  <div class="daily-complete" id="daily-complete">
    <span class="dc-eyebrow">Daily Completo</span>
    <div class="daily-complete-title" id="dc-title">Parabéns!</div>
    <div class="daily-complete-sub" id="dc-sub"></div>
    <div class="result-actions" style="justify-content:center" id="dc-actions"></div>
  </div>

  <footer class="game-footer">
    <span id="gf-liq">Dados dos jogadores: <a href="https://liquipedia.net/valorant" target="_blank" rel="noopener">Liquipedia</a> (<a href="https://liquipedia.net/commons/Liquipedia:Copyrights" target="_blank" rel="noopener">CC BY-SA</a>)</span>
    <span class="footer-sep">·</span>
    <span>Fan-made · <a href="https://playvalorant.com" target="_blank" rel="noopener">Riot Games</a></span>
  </footer>
</div>

<div id="loading-overlay">
  <div class="lo-logo">VALOR<span>ANDLE</span></div>
  <div class="lo-spinner"></div>
</div>

<div id="g-tip"></div>
<div class="toast" id="toast"></div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620; --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32); --red-glow:rgba(255,70,85,0.22);
    --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8;
    --green:#34d47e; --green-bg:rgba(52,212,126,0.10); --green-bd:rgba(52,212,126,0.45);
    --yellow:#f0b429; --yellow-bg:rgba(240,180,41,0.10); --yellow-bd:rgba(240,180,41,0.42);
    --font-display:'Russo One', sans-serif; --font-ui:'Outfit', sans-serif; --font-mono:'Outfit', sans-serif;
  }
  :global(html, body) { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-ui); }
  :global(body::before) { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px); background-size:28px 28px; pointer-events:none; opacity:.5; }

  .game-screen { position:relative; z-index:1; max-width:980px; margin:0 auto; padding:0 1rem 5rem; min-height:100vh; display:flex; flex-direction:column; }
  .game-header { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:0.85rem 0; border-bottom:1px solid var(--border); margin-bottom:1.1rem; }
  .header-left  { display:flex; align-items:center; gap:0.6rem; }
  .header-right { display:flex; align-items:center; gap:0.55rem; justify-content:flex-end; }
  .back-btn { background:transparent; border:1px solid var(--border2); color:var(--text-dim); font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.03em; padding:0.38rem 0.8rem; cursor:pointer; border-radius:3px; transition:all 0.2s; text-decoration:none; }
  .back-btn:hover { border-color:var(--red); color:var(--red); }
  .game-title-area { text-align:center; }
  .game-logo { font-family:var(--font-display); font-size:1.35rem; color:var(--text); text-transform:uppercase; line-height:1; }
  .game-logo span { color:var(--red); }
  .mode-tag { font-family:var(--font-mono); font-size:0.56rem; color:var(--text-dim); letter-spacing:0.02em; text-transform:uppercase; }
  .league-tag { font-family:var(--font-mono); font-size:0.55rem; letter-spacing:0; text-transform:uppercase; padding:0.14rem 0.5rem; border-radius:2px; font-weight:700; display:none; }
  .streak-chip { font-family:var(--font-mono); font-size:0.65rem; font-weight:700; letter-spacing:0.02em; background:var(--surface2); border:1px solid var(--border2); color:var(--text-mid); padding:0.3rem 0.6rem; border-radius:3px; display:flex; align-items:center; gap:0.3rem; }
  .streak-chip .streak-num { color:var(--red); }
  .lang-btn { background:transparent; border:1px solid var(--border2); color:var(--text-dim); font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.02em; padding:0.3rem 0.55rem; border-radius:3px; transition:all 0.2s; text-decoration:none; display:inline-block; }
  .lang-btn.active { border-color:var(--red-bd); color:var(--red); background:var(--red-dim); }
  .lang-btn:hover:not(.active) { color:var(--text-mid); }
  .icon-btn { background:transparent; border:1px solid var(--border); color:var(--text-dim); width:32px; height:32px; border-radius:3px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.75rem; transition:all 0.2s; }
  .icon-btn:hover { border-color:var(--border2); color:var(--text-mid); }
  .icon-btn.active { border-color:var(--red); color:var(--red); background:var(--red-dim); }
  .icon-btn svg { width:16px; height:16px; }

  .round-progress { display:flex; align-items:center; justify-content:center; gap:4px; margin-bottom:1rem; }
  :global(.round-pip) { width:40px; height:4px; border-radius:2px; background:var(--surface2); border:1px solid var(--border); transition:all 0.3s; }
  :global(.round-pip.done)   { background:var(--green); border-color:var(--green); }
  :global(.round-pip.failed) { background:#200d10; border-color:var(--red-bd); }
  :global(.round-pip.active) { background:var(--red); border-color:var(--red); box-shadow:0 0 8px var(--red-glow); }

  .round-info { display:flex; justify-content:space-between; align-items:center; padding:0 0 0.9rem; border-bottom:1px solid var(--border); margin-bottom:0.9rem; }
  .round-label { font-family:var(--font-mono); font-size:0.75rem; font-weight:700; letter-spacing:0.05em; color:var(--text-mid); text-transform:uppercase; }
  .attempts-label { font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim); letter-spacing:0.02em; }
  :global(.attempts-label.low) { color:var(--red); }

  .input-section { position:relative; margin-bottom:1.1rem; }
  .guess-input-wrap { display:flex; }
  .guess-input { flex:1; background:var(--surface); border:1px solid var(--border2); border-right:none; border-radius:4px 0 0 4px; color:var(--text); font-family:var(--font-ui); font-size:0.95rem; padding:0.8rem 1.1rem; outline:none; transition:border-color 0.2s; }
  .guess-input:focus { border-color:var(--red); }
  .guess-input::placeholder { color:var(--text-dim); }
  .guess-input:disabled { opacity:0.4; cursor:not-allowed; }
  .guess-btn { background:var(--red); border:none; color:#fff; font-family:var(--font-mono); font-size:0.8rem; font-weight:700; letter-spacing:0.02em; padding:0.8rem 1.4rem; border-radius:0 4px 4px 0; cursor:pointer; transition:all 0.2s; }
  .guess-btn:hover:not(:disabled) { background:#e03040; box-shadow:0 0 18px var(--red-glow); }
  .guess-btn:disabled { background:var(--surface2); color:var(--text-dim); cursor:not-allowed; }
  .autocomplete-list { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--surface2); border:1px solid var(--border2); border-radius:4px; z-index:100; max-height:230px; overflow-y:auto; box-shadow:0 12px 32px rgba(0,0,0,.5); }
  :global(.autocomplete-item) { padding:0.6rem 1rem; cursor:pointer; display:flex; align-items:center; gap:0.75rem; border-bottom:1px solid var(--border); transition:background 0.12s; }
  :global(.autocomplete-item:last-child) { border-bottom:none; }
  :global(.autocomplete-item:hover), :global(.autocomplete-item.highlighted) { background:var(--surface); }
  :global(.ac-flag) { width:22px; height:16px; display:flex; align-items:center; flex-shrink:0; }
  :global(.ac-flag .fi) { font-size:1rem; line-height:1; border-radius:2px; }
  :global(.ac-name) { font-weight:600; font-size:0.88rem; }
  :global(.ac-team) { font-size:0.72rem; color:var(--text-dim); }
  :global(.ac-league) { margin-left:auto; font-family:var(--font-mono); font-size:0.58rem; color:var(--text-dim); background:var(--border); padding:0.1rem 0.4rem; border-radius:2px; }
  .input-error { font-family:var(--font-mono); font-size:0.7rem; color:var(--red); margin-top:0.45rem; min-height:1.2em; padding-left:0.25rem; }

  .grid-scroll-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .grid-container { min-width:740px; overflow:visible; }
  .grid-headers { display:grid; grid-template-columns:160px repeat(6,1fr); gap:3px; margin-bottom:3px; }
  .col-header { font-family:var(--font-mono); font-size:0.7rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-dim); text-align:center; padding:0.45rem 0.25rem; background:var(--surface); border:1px solid var(--border); border-radius:3px; }
  .col-header:first-child { text-align:left; padding-left:0.75rem; }
  :global(.guess-grid) { display:flex; flex-direction:column; gap:3px; }
  :global(.guess-row) { display:grid; grid-template-columns:160px repeat(6,1fr); gap:3px; animation:rowReveal 0.28s ease both; }
  @keyframes rowReveal { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  :global(.guess-row-empty) { display:grid; grid-template-columns:160px repeat(6,1fr); gap:3px; }
  :global(.guess-cell) { background:var(--surface); border:1px solid var(--border); border-radius:3px; padding:0.55rem 0.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; text-align:center; min-height:58px; position:relative; cursor:default; }
  :global(.guess-cell:first-child) { align-items:flex-start; text-align:left; padding-left:0.75rem; border-left:3px solid transparent; }
  :global(.guess-cell.correct) { background:var(--green-bg); border-color:var(--green-bd); }
  :global(.guess-cell.correct:first-child) { border-left-color:var(--green); }
  :global(.guess-cell.close)   { background:var(--yellow-bg); border-color:var(--yellow-bd); }
  :global(.guess-cell.wrong)   { background:var(--red-dim); border-color:var(--red-bd); }
  :global(.guess-cell.empty)   { background:var(--surface); opacity:.22; }
  :global(.cell-value) { font-family:var(--font-ui); font-size:0.9rem; font-weight:600; line-height:1.3; color:var(--text); }
  :global(.cell-hint)  { font-family:var(--font-mono); font-size:0.8rem; font-weight:700; line-height:1; }
  :global(.correct .cell-hint) { color:var(--green); }
  :global(.close   .cell-hint) { color:var(--yellow); }
  :global(.wrong   .cell-hint) { color:var(--red); }
  :global(.cell-flag) { display:inline-flex; align-items:center; gap:0.3rem; }
  :global(.cell-flag .fi) { font-size:0.85rem; border-radius:2px; flex-shrink:0; }

  @keyframes flipOut { 0%{transform:scaleY(1)} 100%{transform:scaleY(0);opacity:.2} }
  @keyframes flipIn  { 0%{transform:scaleY(0);opacity:.2} 100%{transform:scaleY(1)} }
  :global(.guess-cell.flip-out) { animation:flipOut 0.17s ease forwards; }
  :global(.guess-cell.flip-in)  { animation:flipIn  0.17s ease forwards; }

  :global(#g-tip) { display:none; position:fixed; z-index:9000; pointer-events:none; background:#101220; border:1px solid var(--border2); border-radius:5px; padding:0.55rem 0.85rem; min-width:160px; max-width:270px; box-shadow:0 8px 24px rgba(0,0,0,.7); font-family:var(--font-ui); font-size:0.75rem; color:var(--text); line-height:1.65; }
  :global(#g-tip::before) { content:''; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); border:5px solid transparent; border-bottom-color:var(--border2); }
  :global(#g-tip.tip-above::before) { bottom:auto; top:100%; border-bottom-color:transparent; border-top-color:var(--border2); }
  :global(.tip-title) { font-family:var(--font-mono); font-size:0.58rem; font-weight:700; letter-spacing:0; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.35rem; display:block; }
  :global(.tip-row) { display:block; }
  :global(.tip-row.ok)  { color:var(--green); }
  :global(.tip-row.bad) { color:var(--red); }
  :global(.tip-row.mid) { color:var(--yellow); }
  :global(.tip-note) { display:block; margin-top:0.4rem; font-size:0.6rem; opacity:0.5; font-style:italic; }

  .result-panel { display:none; margin-top:1.1rem; background:var(--surface); border:1px solid var(--border2); border-radius:6px; overflow:hidden; animation:panelUp 0.38s ease both; }
  @keyframes panelUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .result-status { padding:0.7rem 1.25rem; font-family:var(--font-display); font-size:0.9rem; letter-spacing:0; text-transform:uppercase; border-bottom:1px solid var(--border); }
  :global(.result-panel.won  .result-status) { color:var(--green); background:var(--green-bg); }
  :global(.result-panel.lost .result-status) { color:var(--red); background:var(--red-dim); }
  .result-body { padding:1rem 1.25rem; display:flex; flex-direction:column; gap:1rem; }
  .result-player { display:flex; align-items:center; gap:0.85rem; padding:0.75rem 1rem; background:var(--surface2); border:1px solid var(--border); border-radius:4px; }
  .result-flag { font-size:1.5rem; line-height:1; flex-shrink:0; }
  :global(.result-flag .fi) { border-radius:3px; }
  .result-player-name { font-family:var(--font-display); font-size:1.2rem; color:var(--text); text-transform:uppercase; display:block; }
  .result-player-sub  { font-size:0.75rem; color:var(--text-mid); }
  :global(.result-graph-label), :global(.replay-label) { font-family:var(--font-mono); font-size:0.6rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.55rem; display:block; }
  :global(.attempt-track) { display:flex; gap:5px; }
  :global(.attempt-dot) { flex:1; height:28px; border-radius:3px; background:var(--surface2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-family:var(--font-mono); font-size:0.58rem; color:var(--text-dim); transition:background 0.3s,border-color 0.3s,color 0.3s; }
  :global(.attempt-dot.wrong) { background:var(--red-dim); border-color:var(--red-bd); color:var(--red); }
  :global(.attempt-dot.win)   { background:var(--green-bg); border-color:var(--green-bd); color:var(--green); }
  :global(.replay-cells) { display:flex; gap:4px; flex-wrap:wrap; }
  :global(.replay-cell) { width:28px; height:28px; border-radius:3px; border:1px solid; display:flex; align-items:center; justify-content:center; }
  :global(.replay-cell.correct) { background:var(--green-bg); border-color:var(--green-bd); }
  :global(.replay-cell.close)   { background:var(--yellow-bg); border-color:var(--yellow-bd); }
  :global(.replay-cell.wrong)   { background:var(--red-dim); border-color:var(--red-bd); }
  :global(.result-actions) { display:flex; gap:6px; flex-wrap:wrap; }
  :global(.btn-action) { font-family:var(--font-mono); font-size:0.68rem; font-weight:700; letter-spacing:0.03em; text-transform:uppercase; padding:0.5rem 1rem; border-radius:3px; border:none; cursor:pointer; transition:all 0.2s; }
  :global(.btn-next)  { background:var(--red); color:#fff; }
  :global(.btn-next:hover) { background:#e03040; box-shadow:0 0 14px var(--red-glow); }
  :global(.btn-share) { background:transparent; border:1px solid var(--border2); color:var(--text-mid); }
  :global(.btn-share:hover) { border-color:var(--red); color:var(--red); }
  :global(.btn-img)   { background:transparent; border:1px solid var(--border2); color:var(--text-mid); }
  :global(.btn-img:hover) { border-color:var(--red); color:var(--red); }
  :global(.btn-lobby) { background:transparent; border:1px solid var(--border); color:var(--text-dim); }
  :global(.btn-lobby:hover) { color:var(--text-mid); border-color:var(--border2); }

  .daily-complete { display:none; text-align:center; padding:3rem 1rem; }
  .dc-eyebrow { font-family:var(--font-mono); font-size:0.7rem; letter-spacing:0.02em; text-transform:uppercase; color:var(--red); margin-bottom:1rem; display:block; }
  :global(.daily-complete-title) { font-family:var(--font-display); font-size:2.5rem; text-transform:uppercase; color:var(--text); margin-bottom:0.6rem; line-height:1; }
  :global(.daily-complete-sub) { color:var(--text-mid); font-size:0.88rem; margin-bottom:1.75rem; }

  :global(.toast) { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%) translateY(60px); background:var(--red); color:#fff; font-family:var(--font-mono); font-size:0.75rem; font-weight:700; letter-spacing:0.02em; padding:0.6rem 1.25rem; border-radius:3px; z-index:9001; transition:transform 0.28s ease; pointer-events:none; }
  :global(.toast.show) { transform:translateX(-50%) translateY(0); }

  @media (max-width:640px) { .game-logo{font-size:1.1rem} }
  @media (max-width:600px) { .grid-container{min-width:unset} :global(.guess-row),:global(.grid-headers),:global(.guess-row-empty){grid-template-columns:110px repeat(6,1fr)} .col-header,:global(.cell-value){font-size:0.72rem} :global(.cell-hint){font-size:0.75rem} }
  @media (max-width:420px) { :global(.guess-row),:global(.grid-headers),:global(.guess-row-empty){grid-template-columns:85px repeat(6,1fr)} }

  #loading-overlay { position:fixed; inset:0; z-index:9999; background:var(--bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.2rem; }
  #loading-overlay .lo-logo { font-family:var(--font-display); font-size:1.6rem; letter-spacing:0; color:var(--text); }
  #loading-overlay .lo-logo span { color:var(--red); }
  #loading-overlay .lo-spinner { width:28px; height:28px; border:3px solid var(--border2); border-top-color:var(--red); border-radius:50%; animation:lo-spin 0.75s linear infinite; }
  @keyframes lo-spin { to{transform:rotate(360deg)} }

  .game-footer { text-align:center; padding:1.5rem 0 0.5rem; font-size:0.7rem; color:var(--text-dim); display:flex; align-items:center; justify-content:center; gap:0.35rem; flex-wrap:wrap; }
  .game-footer a { color:var(--text-dim); text-decoration:none; }
  .game-footer a:hover { color:var(--red); }
  .footer-sep { color:var(--border2); }
</style>
