<script>
  import { onMount } from 'svelte';
  import { saveLang } from '../lib/game-utils.js';

  // Todo o comportamento é dirigido pelo <script is:inline> em game.astro,
  // que manipula este DOM por IDs. Este componente é só o template + estilo.
  let lang = $state('pt-BR');
  let isPT = $derived(lang === 'pt-BR');

  onMount(() => {
    lang = window.location.pathname.startsWith('/en') ? 'en' : 'pt-BR';
    saveLang(lang);
  });
</script>

<header class="ticker">
  <a class="t-back" id="back-btn" href={isPT ? '/' : '/en'}>← Lobby</a>
  <div class="meta">
    <a class="t-btn" href={isPT ? '/en/game' : '/game'}
       title={isPT ? 'Switch to English' : 'Mudar para Português'}
       aria-label={isPT ? 'Switch to English' : 'Mudar para Português'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18 M12 3a14.5 14.5 0 0 1 0 18 M12 3a14.5 14.5 0 0 0 0 18"/>
      </svg>
      <b>{isPT ? 'EN' : 'PT'}</b>
    </a>
  </div>
</header>

<main class="arena">

  <div class="statusbar">
    <div class="sb-mode">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M12 3v3 M12 18v3 M3 12h3 M18 12h3"/>
      </svg>
      <b>PRO PLAYERS</b>
      <span class="league-tag" id="league-tag"></span>
      <span class="mode-tag" id="mode-tag">Daily Mode</span>
    </div>
    <div class="sb-item">
      <span class="lab">{isPT ? 'Sequência' : 'Streak'}</span>
      <span class="val">🔥 <span id="streak-num">0</span></span>
    </div>
    <div class="sb-tail">
      <button class="sb-btn" id="hard-btn" title="Modo Hard (sem setas)" aria-label="Modo Hard">
        <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4.5zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z"/></svg>
      </button>
      <button class="sb-btn active" id="sound-btn" title="Sons" aria-label="Sons">
        <svg id="sound-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M9 2.5a.5.5 0 0 0-.854-.354L4.793 5.5H2.5A1.5 1.5 0 0 0 1 7v2a1.5 1.5 0 0 0 1.5 1.5h2.293l3.353 3.354A.5.5 0 0 0 9 13.5v-11zm2.854.646a.5.5 0 0 1 .707 0A6.5 6.5 0 0 1 14 8a6.5 6.5 0 0 1-1.439 4.104.5.5 0 0 1-.708-.707A5.5 5.5 0 0 0 13 8a5.5 5.5 0 0 0-1.146-3.397.5.5 0 0 1 0-.707z"/></svg>
      </button>
    </div>
  </div>

  <div class="round-progress" id="round-progress" style="display:none"></div>

  <div class="round-info">
    <span class="round-label" id="round-label">Round 1 de 5</span>
    <span class="attempts-label" id="attempts-label">0/8 tentativas</span>
  </div>

  <div class="input-section">
    <div class="gi">
      <svg class="gi-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input type="text" class="guess-input" id="guess-input" autocomplete="off" spellcheck="false" />
      <button class="go guess-btn" id="guess-btn">OK →</button>
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

  <footer class="foot">
    <span>Fan-made. {isPT ? 'Não afiliado à' : 'Not affiliated with'}
      <a href="https://playvalorant.com" target="_blank" rel="noopener">Riot Games</a>.</span>
    <span>{isPT ? 'Dados dos jogadores:' : 'Player data:'}
      <a href="https://liquipedia.net/valorant" target="_blank" rel="noopener">Liquipedia</a>
      (<a href="https://liquipedia.net/commons/Liquipedia:Copyrights" target="_blank" rel="noopener">CC BY-SA</a>)
    </span>
  </footer>
</main>

<div id="loading-overlay">
  <div class="lo-logo">VALOR<span>ANDLE</span></div>
  <div class="lo-spinner"></div>
</div>

<div id="g-tip"></div>
<div class="toast" id="toast"></div>

<style>
  :global(*, *::before, *::after) { box-sizing:border-box; margin:0; padding:0; }
  :global(:root) {
    --bg:#08090d; --surface:#0e1018; --surface2:#141620; --border:#1c1f2e; --border2:#252838;
    --red:#FF4655; --red-dim:rgba(255,70,85,0.08); --red-bd:rgba(255,70,85,0.32); --red-glow:rgba(255,70,85,0.22);
    --text:#eeeef5; --text-dim:#6e7190; --text-mid:#8a8da8;
    --green:#34d47e; --green-bg:rgba(52,212,126,0.10); --green-bd:rgba(52,212,126,0.45);
    --yellow:#E5C96A; --yellow-bg:rgba(229,201,106,0.10); --yellow-bd:rgba(229,201,106,0.45);
    --font-display:'Russo One', sans-serif;
    --ease-out:cubic-bezier(0.22,1,0.36,1); --t-fast:150ms;
  }
  :global(html, body) { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--font-ui,'Epilogue',sans-serif); overflow-x:hidden; }
  :global(body::before) { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle,#1c1f2e 1px,transparent 1px); background-size:28px 28px; pointer-events:none; opacity:.4; }
  :global(body::after)  { content:''; position:fixed; top:-200px; left:50%; z-index:0; transform:translateX(-50%); width:640px; height:440px; background:radial-gradient(ellipse,rgba(255,70,85,0.05) 0%,transparent 70%); pointer-events:none; }

  /* ── ticker ── */
  .ticker { position:sticky; top:0; z-index:30; display:flex; align-items:stretch; height:54px; background:var(--bg); border-bottom:1px solid var(--border); }
  .t-back { display:flex; align-items:center; padding:0 22px; font-family:var(--font-display); font-size:0.85rem; color:var(--text); border-right:1px solid var(--border); text-decoration:none; }
  .t-back:hover { color:var(--red); }
  .meta { margin-left:auto; display:flex; align-items:stretch; border-left:1px solid var(--border); }
  .t-btn { display:flex; align-items:center; gap:8px; padding:0 22px; color:var(--text-dim); font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-decoration:none; transition:color var(--t-fast), background var(--t-fast); }
  .t-btn svg { width:16px; height:16px; }
  .t-btn:hover { color:var(--text); background:var(--surface); }

  /* ── layout ── */
  .arena { position:relative; z-index:1; width:min(100% - 56px, 980px); margin:0 auto; padding:24px 0 56px; display:flex; flex-direction:column; gap:16px; min-height:calc(100vh - 54px); }

  /* ── statusbar ── */
  .statusbar { display:flex; align-items:stretch; border-top:1px solid var(--border); border-bottom:1px solid var(--border); overflow-x:auto; scrollbar-width:none; }
  .statusbar::-webkit-scrollbar { display:none; }
  .sb-mode { display:flex; align-items:center; gap:10px; padding:15px 24px 15px 2px; border-right:1px solid var(--border); white-space:nowrap; }
  .sb-mode > svg { width:22px; height:22px; color:var(--red); flex:none; }
  .sb-mode b { font-family:var(--font-display); font-size:1.1rem; font-weight:400; letter-spacing:0.03em; }
  .league-tag { font-size:0.58rem; letter-spacing:0.08em; text-transform:uppercase; padding:3px 7px; font-weight:700; display:none; }
  .mode-tag { font-size:0.58rem; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-dim); font-weight:700; }
  .sb-item { display:flex; flex-direction:column; justify-content:center; gap:5px; padding:11px 24px; border-right:1px solid var(--border); white-space:nowrap; }
  .sb-item .lab { font-size:0.58rem; letter-spacing:0.18em; text-transform:uppercase; color:var(--text-dim); font-weight:700; }
  .sb-item .val { font-family:var(--font-display); font-size:1.05rem; line-height:1; }
  .sb-item .val #streak-num { color:var(--red); }
  .sb-tail { margin-left:auto; display:flex; align-items:center; gap:8px; padding-right:2px; }
  .sb-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border2); color:var(--text-dim); background:none; cursor:pointer; transition:border-color var(--t-fast), color var(--t-fast); }
  .sb-btn svg { width:15px; height:15px; }
  .sb-btn:hover { border-color:var(--red); color:var(--red); }
  .sb-btn.active { border-color:var(--red); color:var(--red); background:var(--red-dim); }

  /* ── round bar ── */
  .round-progress { display:flex; align-items:center; gap:5px; }
  :global(.round-pip) { flex:1; height:5px; background:var(--surface2); border:1px solid var(--border2); transition:all 0.3s; }
  :global(.round-pip.done)   { background:var(--green); border-color:var(--green); }
  :global(.round-pip.failed) { background:#200d10; border-color:var(--red-bd); }
  :global(.round-pip.active) { background:var(--red); border-color:var(--red); animation:pp-pulse 1.8s ease-in-out infinite; }
  @keyframes pp-pulse { 0%,100%{box-shadow:0 0 0 0 var(--red-glow)} 55%{box-shadow:0 0 0 5px transparent} }
  .round-info { display:flex; justify-content:space-between; align-items:center; }
  .round-label { font-size:0.66rem; font-weight:700; letter-spacing:0.14em; color:var(--text-mid); text-transform:uppercase; }
  .attempts-label { font-size:0.72rem; color:var(--text-dim); font-variant-numeric:tabular-nums; }
  :global(.attempts-label.low) { color:var(--red); }

  /* ── input ── */
  .input-section { position:relative; }
  .gi { display:flex; align-items:center; gap:10px; background:var(--surface); border:1px solid var(--border2); padding:4px 4px 4px 16px; transition:border-color var(--t-fast), box-shadow var(--t-fast); }
  .gi:focus-within { border-color:color-mix(in srgb,var(--red) 55%,transparent); box-shadow:0 0 0 3px color-mix(in srgb,var(--red) 12%,transparent); }
  .gi-search { width:17px; height:17px; color:var(--text-dim); flex:none; }
  .guess-input { flex:1; min-width:0; background:none; border:none; outline:none; color:var(--text); font-family:inherit; font-size:0.95rem; padding:12px 0; }
  .guess-input::placeholder { color:var(--text-dim); }
  .guess-input:disabled { opacity:0.5; }
  .go { flex:none; font-family:var(--font-display); font-size:0.72rem; letter-spacing:0.1em; background:var(--red); color:#0a0a0c; border:none; padding:12px 22px; cursor:pointer; transition:filter var(--t-fast); }
  .go:hover:not(:disabled) { filter:brightness(1.12); }
  .go:disabled { opacity:0.4; cursor:not-allowed; }
  .autocomplete-list { position:absolute; top:calc(100% + 6px); left:0; right:0; background:var(--surface2); border:1px solid var(--border2); z-index:100; max-height:260px; overflow-y:auto; box-shadow:0 18px 40px rgba(0,0,0,.5); }
  :global(.autocomplete-item) { padding:11px 16px; cursor:pointer; display:flex; align-items:center; gap:12px; border-bottom:1px solid var(--border); transition:background var(--t-fast); }
  :global(.autocomplete-item:last-child) { border-bottom:none; }
  :global(.autocomplete-item:hover), :global(.autocomplete-item.highlighted) { background:color-mix(in srgb,var(--red) 8%,transparent); }
  :global(.ac-flag) { width:22px; height:16px; display:flex; align-items:center; flex-shrink:0; }
  :global(.ac-flag .fi) { font-size:1rem; line-height:1; border-radius:2px; }
  :global(.ac-name) { font-weight:700; font-size:0.88rem; }
  :global(.ac-team) { font-size:0.72rem; color:var(--text-dim); }
  :global(.ac-league) { margin-left:auto; font-size:0.58rem; color:var(--text-dim); background:var(--border); padding:2px 6px; }
  .input-error { font-size:0.72rem; color:var(--red); margin-top:8px; min-height:1.1em; }

  /* ── grid / cells ── */
  .grid-scroll-wrapper { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .grid-container { min-width:680px; }
  .grid-headers { display:grid; grid-template-columns:1.4fr repeat(6,1fr); gap:8px; margin-bottom:8px; }
  .col-header { font-size:0.6rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-dim); text-align:center; padding:0 2px; display:flex; align-items:center; justify-content:center; }
  .col-header:first-child { justify-content:flex-start; }
  :global(.guess-grid) { display:flex; flex-direction:column; gap:8px; }
  :global(.guess-row), :global(.guess-row-empty) { display:grid; grid-template-columns:1.4fr repeat(6,1fr); gap:8px; }
  :global(.guess-row) { animation:pp-rise 0.3s var(--ease-out) both; }
  @keyframes pp-rise { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  :global(.guess-cell) { min-height:56px; padding:9px 8px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; text-align:center; background:var(--surface); border-bottom:2px solid var(--border2); position:relative; cursor:default; }
  :global(.guess-cell:first-child) { align-items:flex-start; justify-content:center; text-align:left; padding-left:12px; background:var(--surface2); font-weight:700; }
  :global(.guess-cell.correct) { border-bottom-color:var(--green); background:color-mix(in srgb,var(--green) 9%,var(--surface)); }
  :global(.guess-cell.close)   { border-bottom-color:var(--yellow); background:color-mix(in srgb,var(--yellow) 8%,var(--surface)); }
  :global(.guess-cell.wrong)   { border-bottom-color:var(--border2); }
  :global(.guess-cell.empty)   { background:transparent; border-bottom:1px dashed var(--border); opacity:.5; }
  :global(.cell-value) { font-size:0.86rem; font-weight:600; line-height:1.3; color:var(--text); }
  :global(.guess-cell.wrong .cell-value) { color:var(--text-dim); }
  :global(.cell-hint)  { font-size:0.82rem; font-weight:700; line-height:1; }
  :global(.correct .cell-hint) { color:var(--green); }
  :global(.close   .cell-hint) { color:var(--yellow); }
  :global(.wrong   .cell-hint) { color:var(--red); }
  :global(.cell-flag) { display:inline-flex; align-items:center; gap:0.3rem; }
  :global(.cell-flag .fi) { font-size:0.85rem; border-radius:2px; flex-shrink:0; }

  @keyframes flipOut { 0%{transform:scaleY(1)} 100%{transform:scaleY(0);opacity:.2} }
  @keyframes flipIn  { 0%{transform:scaleY(0);opacity:.2} 100%{transform:scaleY(1)} }
  :global(.guess-cell.flip-out) { animation:flipOut 0.17s ease forwards; transform-origin:center 60%; }
  :global(.guess-cell.flip-in)  { animation:flipIn  0.17s ease forwards; transform-origin:center 60%; }

  :global(#g-tip) { display:none; position:fixed; z-index:9000; pointer-events:none; background:#101220; border:1px solid var(--border2); padding:0.55rem 0.85rem; min-width:160px; max-width:270px; box-shadow:0 8px 24px rgba(0,0,0,.7); font-family:var(--font-ui,'Epilogue',sans-serif); font-size:0.75rem; color:var(--text); line-height:1.65; }
  :global(#g-tip::before) { content:''; position:absolute; bottom:100%; left:50%; transform:translateX(-50%); border:5px solid transparent; border-bottom-color:var(--border2); }
  :global(#g-tip.tip-above::before) { bottom:auto; top:100%; border-bottom-color:transparent; border-top-color:var(--border2); }
  :global(.tip-title) { font-size:0.58rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-dim); margin-bottom:0.35rem; display:block; }
  :global(.tip-row) { display:block; }
  :global(.tip-row.ok)  { color:var(--green); }
  :global(.tip-row.bad) { color:var(--red); }
  :global(.tip-row.mid) { color:var(--yellow); }
  :global(.tip-note) { display:block; margin-top:0.4rem; font-size:0.6rem; opacity:0.5; font-style:italic; }

  /* ── result panel ── */
  .result-panel { display:none; background:var(--surface); border:1px solid var(--border2); overflow:hidden; animation:pp-rise 0.38s ease both; }
  .result-status { padding:12px 20px; font-family:var(--font-display); font-size:0.9rem; letter-spacing:0.02em; text-transform:uppercase; border-bottom:1px solid var(--border); }
  :global(.result-panel.won  .result-status) { color:var(--green); background:var(--green-bg); }
  :global(.result-panel.lost .result-status) { color:var(--red); background:var(--red-dim); }
  .result-body { padding:18px 20px; display:flex; flex-direction:column; gap:16px; }
  .result-player { display:flex; align-items:center; gap:12px; padding:12px 14px; background:var(--surface2); border:1px solid var(--border); }
  .result-flag { font-size:1.5rem; line-height:1; flex-shrink:0; }
  :global(.result-flag .fi) { border-radius:3px; }
  .result-player-name { font-family:var(--font-display); font-size:1.15rem; color:var(--text); text-transform:uppercase; display:block; }
  .result-player-sub  { font-size:0.75rem; color:var(--text-mid); }
  :global(.result-graph-label), :global(.replay-label) { font-size:0.6rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:var(--text-dim); margin-bottom:8px; display:block; }
  :global(.attempt-track) { display:flex; gap:5px; }
  :global(.attempt-dot) { flex:1; height:28px; background:var(--surface2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:0.58rem; color:var(--text-dim); transition:all 0.3s; }
  :global(.attempt-dot.wrong) { background:var(--red-dim); border-color:var(--red-bd); color:var(--red); }
  :global(.attempt-dot.win)   { background:var(--green-bg); border-color:var(--green-bd); color:var(--green); }
  :global(.replay-cells) { display:flex; gap:4px; flex-wrap:wrap; }
  :global(.replay-cell) { width:28px; height:28px; border:1px solid; display:flex; align-items:center; justify-content:center; }
  :global(.replay-cell.correct) { background:var(--green-bg); border-color:var(--green-bd); }
  :global(.replay-cell.close)   { background:var(--yellow-bg); border-color:var(--yellow-bd); }
  :global(.replay-cell.wrong)   { background:var(--red-dim); border-color:var(--red-bd); }
  :global(.result-actions) { display:flex; gap:8px; flex-wrap:wrap; }
  :global(.btn-action) { font-family:var(--font-display); font-size:0.68rem; letter-spacing:0.08em; padding:12px 18px; border:none; cursor:pointer; transition:filter var(--t-fast); }
  :global(.btn-next)  { background:var(--red); color:#0a0a0c; }
  :global(.btn-next:hover) { filter:brightness(1.12); }
  :global(.btn-share), :global(.btn-img) { background:transparent; border:1px solid var(--border2); color:var(--text-mid); }
  :global(.btn-share:hover), :global(.btn-img:hover) { border-color:var(--red); color:var(--red); }
  :global(.btn-lobby) { background:transparent; border:1px solid var(--border); color:var(--text-dim); }
  :global(.btn-lobby:hover) { color:var(--text-mid); border-color:var(--border2); }

  .daily-complete { display:none; text-align:center; padding:3rem 1rem; }
  .dc-eyebrow { font-size:0.7rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--red); margin-bottom:1rem; display:block; font-weight:700; }
  :global(.daily-complete-title) { font-family:var(--font-display); font-size:2.5rem; text-transform:uppercase; color:var(--text); margin-bottom:0.6rem; line-height:1; }
  :global(.daily-complete-sub) { color:var(--text-mid); font-size:0.88rem; margin-bottom:1.75rem; }

  :global(.toast) { position:fixed; bottom:2rem; left:50%; transform:translateX(-50%) translateY(60px); background:var(--red); color:#0a0a0c; font-family:var(--font-display); font-size:0.72rem; letter-spacing:0.04em; padding:0.7rem 1.4rem; z-index:9001; transition:transform 0.28s var(--ease-out); pointer-events:none; }
  :global(.toast.show) { transform:translateX(-50%) translateY(0); }

  .foot { display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:auto; padding:22px 0 6px; border-top:1px solid var(--border); font-size:0.72rem; color:var(--text-dim); line-height:1.8; }
  .foot a { color:var(--text-mid); text-decoration:none; }
  .foot a:hover { color:var(--red); }

  #loading-overlay { position:fixed; inset:0; z-index:9999; background:var(--bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.2rem; }
  #loading-overlay .lo-logo { font-family:var(--font-display); font-size:1.6rem; color:var(--text); }
  #loading-overlay .lo-logo span { color:var(--red); }
  #loading-overlay .lo-spinner { width:28px; height:28px; border:3px solid var(--border2); border-top-color:var(--red); border-radius:50%; animation:lo-spin 0.75s linear infinite; }
  @keyframes lo-spin { to{transform:rotate(360deg)} }

  @media (max-width: 720px) {
    .arena { width:min(100% - 28px, 980px); }
    .foot { justify-content:center; text-align:center; }
    .col-header, :global(.cell-value) { font-size:0.72rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.round-pip.active), .result-panel, :global(.guess-row) { animation:none; }
  }
</style>
