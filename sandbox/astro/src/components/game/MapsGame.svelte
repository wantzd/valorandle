<script lang="ts">
  /**
   * MapsGame.svelte
   *
   * Maps game mode — guess the Valorant map callout from a cropped screenshot.
   *
   * Mechanics:
   *  - Screenshot shown with progressive blur/zoom-out (every 2 wrong guesses)
   *  - Toggle between 📸 Screenshot view and 🗺️ Minimap view
   *  - In minimap view: dropdown selects the map → callout buttons appear
   *  - Click a callout → "Confirm →" button submits the guess
   *  - Feedback: 3 cells (Map / Callout / Area), green = correct, red = wrong
   *  - Hint button reveals up to 5 hints for the target map (no guess cost)
   *  - Daily state is persisted in localStorage
   *
   * Adding screenshot assets later:
   *   Set target.img = "/maps/screenshots/bind_a_main.webp" in DAILY_MAP_TARGETS
   *   and drop the image file in public/maps/screenshots/.
   *   The <img> in .screenshot-frame will auto-display it.
   */

  import { onMount } from 'svelte';
  import {
    MAPS_DB, MAPS_CALLOUTS, MAPS_HINTS,
    getDailyMapTarget, getRandomMapTarget,
    compareMapGuess, loadMapsDailyState, saveMapsDailyState,
    MAPS_MAX_GUESSES, MAPS_MAX_HINTS, ZOOM_BLUR_STEPS,
    type MapId, type DailyMapTarget, type MapGuessFeedback,
  } from '../../lib/maps';

  interface Props {
    lang: 'pt-BR' | 'en';
  }

  let { lang }: Props = $props();
  const isPT = lang === 'pt-BR';

  // ── State ──────────────────────────────────────────────────────────────────
  let mode     = $state<'daily' | 'free'>('daily');
  let target   = $state<DailyMapTarget | null>(null);
  let loading  = $state(true);
  let error    = $state('');

  type GuessRecord = { mapId: MapId; calloutId: string; feedback: MapGuessFeedback[] };
  let guesses   = $state<GuessRecord[]>([]);
  let hintsUsed = $state(0);
  let finished  = $state(false);
  let won       = $state(false);

  // UI state
  let view          = $state<'screenshot' | 'map'>('screenshot');
  let selectedMapId = $state<MapId | ''>('');
  let selectedCalloutId = $state('');
  let copied        = $state(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  let wrongCount = $derived(guesses.filter(g => g.feedback[0].status !== 'correct').length);
  let blurPx     = $derived(ZOOM_BLUR_STEPS[Math.min(Math.floor(wrongCount / 2), ZOOM_BLUR_STEPS.length - 1)]);
  let remaining  = $derived(MAPS_MAX_GUESSES - guesses.length);
  let hints      = $derived(target ? (MAPS_HINTS[target.mapId] ?? []) : []);
  let hintsLeft  = $derived(Math.min(MAPS_MAX_HINTS, hints.length) - hintsUsed);

  let callouts   = $derived(
    selectedMapId ? (MAPS_CALLOUTS[selectedMapId as MapId] ?? []) : []
  );
  let selectedCallout = $derived(
    callouts.find(c => c.id === selectedCalloutId) ?? null
  );

  // ── Init ───────────────────────────────────────────────────────────────────
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    mode = (params.get('mode') as 'daily' | 'free') ?? 'daily';

    if (mode === 'daily') {
      target = getDailyMapTarget();
      const saved = loadMapsDailyState();
      if (saved) {
        guesses   = saved.guesses as GuessRecord[];
        hintsUsed = saved.hintsUsed;
        finished  = saved.finished;
        won       = saved.won;
      }
    } else {
      target = getRandomMapTarget();
    }

    loading = false;
  });

  // ── Actions ────────────────────────────────────────────────────────────────
  function submitGuess() {
    if (!target || finished || !selectedMapId || !selectedCalloutId) return;
    const feedback = compareMapGuess(selectedMapId as MapId, selectedCalloutId, target);
    const isWin    = feedback.every(f => f.status === 'correct');

    guesses  = [...guesses, { mapId: selectedMapId as MapId, calloutId: selectedCalloutId, feedback }];
    won      = isWin;
    finished = isWin || guesses.length >= MAPS_MAX_GUESSES;

    // Reset selection UI
    selectedCalloutId = '';

    if (mode === 'daily') persist();
  }

  function revealHint() {
    if (hintsLeft <= 0 || finished) return;
    hintsUsed++;
    if (mode === 'daily') persist();
  }

  function persist() {
    saveMapsDailyState({ guesses, hintsUsed, finished, won });
  }

  function share() {
    if (!target) return;
    const mapName = MAPS_DB[target.mapId]?.name ?? target.mapId;
    const calloutName = MAPS_CALLOUTS[target.mapId]?.find(c => c.id === target.calloutId)?.name ?? target.calloutId;
    const lines = guesses.map(g =>
      g.feedback.map(f => f.status === 'correct' ? '🟩' : '🟥').join('')
    );
    const header = isPT
      ? `Valorandle 🗺️ Mapas (${mode === 'daily' ? 'Daily' : 'Livre'})`
      : `Valorandle 🗺️ Maps (${mode === 'daily' ? 'Daily' : 'Free'})`;
    const result = won
      ? (isPT ? `${mapName} · ${calloutName} em ${guesses.length}/${MAPS_MAX_GUESSES}` : `${mapName} · ${calloutName} in ${guesses.length}/${MAPS_MAX_GUESSES}`)
      : (isPT ? `Não consegui 😅` : `Couldn't get it 😅`);
    const text = [header, result, '', ...lines].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    });
  }

  function restart() { location.reload(); }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const allMapIds = Object.keys(MAPS_DB) as MapId[];

  function areaLabel(area: string): string {
    const map: Record<string, { pt: string; en: string }> = {
      A:     { pt: 'Site A', en: 'A Site' },
      B:     { pt: 'Site B', en: 'B Site' },
      C:     { pt: 'Site C', en: 'C Site' },
      Mid:   { pt: 'Meio',   en: 'Mid'    },
      Spawn: { pt: 'Spawn',  en: 'Spawn'  },
      Other: { pt: 'Outro',  en: 'Other'  },
    };
    return isPT ? (map[area]?.pt ?? area) : (map[area]?.en ?? area);
  }
</script>

{#if loading}
  <div class="loading"><div class="spinner"></div></div>

{:else if error}
  <div class="error-msg">{error}</div>

{:else}
  <div class="maps-wrap">

    <!-- Header -->
    <header class="maps-header">
      <a class="back-btn" href={isPT ? '/' : '/en/'}>← Lobby</a>
      <div class="maps-title">
        <span class="mode-label">🗺️ {isPT ? 'MAPAS' : 'MAPS'}</span>
        <span class="mode-tag">{mode === 'daily' ? 'DAILY' : (isPT ? 'LIVRE' : 'FREE')}</span>
      </div>
      <div class="attempts-label">
        {remaining > 0
          ? (isPT ? `${guesses.length}/${MAPS_MAX_GUESSES} tent.` : `${guesses.length}/${MAPS_MAX_GUESSES} guesses`)
          : (isPT ? 'Sem tentativas' : 'No guesses left')}
      </div>
    </header>

    <!-- Screenshot zone -->
    <div class="screenshot-zone">
      <div
        class="screenshot-frame"
        class:revealed={finished && won}
        style="--map-blur:{blurPx}px"
      >
        {#if target?.img}
          <img src={target.img} alt="Map screenshot" class="screenshot-img" />
        {:else}
          <div class="screenshot-placeholder">
            <span class="placeholder-icon">📸</span>
            <span class="placeholder-label">
              {isPT ? 'Screenshot do mapa' : 'Map screenshot'}
            </span>
            <span class="placeholder-sub">
              {isPT ? '(imagens em breve)' : '(images coming soon)'}
            </span>
          </div>
        {/if}

        <!-- Blur overlay indicator -->
        {#if blurPx > 0 && !finished}
          <div class="blur-badge">
            {isPT ? `Zoom ×${5 - Math.floor(wrongCount / 2)}` : `Zoom ×${5 - Math.floor(wrongCount / 2)}`}
          </div>
        {/if}
      </div>

      <!-- View toggle -->
      {#if !finished}
        <div class="view-toggle">
          <button
            class="toggle-btn"
            class:active={view === 'screenshot'}
            onclick={() => view = 'screenshot'}
          >📸 {isPT ? 'Screenshot' : 'Screenshot'}</button>
          <button
            class="toggle-btn"
            class:active={view === 'map'}
            onclick={() => view = 'map'}
          >🗺️ {isPT ? 'Mapa' : 'Map'}</button>
        </div>
      {/if}
    </div>

    <!-- Map selection + callout picker -->
    {#if view === 'map' && !finished}
      <div class="map-select-zone">
        <select
          class="map-picker"
          bind:value={selectedMapId}
          onchange={() => { selectedCalloutId = ''; }}
        >
          <option value="">{isPT ? 'Selecione o mapa...' : 'Select a map...'}</option>
          {#each allMapIds as mapId}
            <option value={mapId}>{MAPS_DB[mapId].name}</option>
          {/each}
        </select>

        {#if selectedMapId}
          <div class="minimap-wrapper">
            <!-- Minimap image (placeholder until assets arrive) -->
            <div class="minimap-placeholder">
              <span class="minimap-label">{MAPS_DB[selectedMapId as MapId]?.name}</span>
              <span class="minimap-sub">{isPT ? 'Minimapa tático' : 'Tactical minimap'}</span>
            </div>

            <!-- Callout buttons positioned on minimap -->
            {#each callouts as callout}
              {@const isSelected = selectedCalloutId === callout.id}
              {@const isUsed = guesses.some(
                g => g.mapId === selectedMapId && g.calloutId === callout.id
              )}
              <button
                class="callout-btn"
                class:selected={isSelected}
                class:used={isUsed}
                style="left:{callout.x}%;top:{callout.y}%"
                onclick={() => {
                  if (!isUsed) selectedCalloutId = callout.id;
                }}
                title={isUsed ? (isPT ? 'Já tentado' : 'Already tried') : callout.name}
              >
                {callout.name}
              </button>
            {/each}
          </div>

          {#if selectedCallout}
            <div class="callout-confirm-bar">
              <span class="selected-label">
                {MAPS_DB[selectedMapId as MapId]?.name} · {selectedCallout.name}
                <span class="area-chip">{areaLabel(selectedCallout.area)}</span>
              </span>
              <button class="confirm-btn" onclick={submitGuess}>
                {isPT ? 'Confirmar →' : 'Confirm →'}
              </button>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- Guess meta row: attempts + hint button -->
    {#if !finished}
      <div class="guess-meta">
        <div class="hint-section">
          <button
            class="hint-btn"
            onclick={revealHint}
            disabled={hintsLeft <= 0}
          >
            💡 {isPT ? 'Dica' : 'Hint'}
            <span class="hint-count">
              ({hintsLeft > 0
                ? (isPT ? `${hintsLeft} restantes` : `${hintsLeft} left`)
                : (isPT ? 'sem mais' : 'no more')})
            </span>
          </button>

          <!-- Revealed hints -->
          {#if hintsUsed > 0}
            <div class="hints-revealed">
              {#each hints.slice(0, hintsUsed) as hint}
                <span class="hint-chip">
                  {isPT ? hint.pt : hint.en}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Feedback rows -->
    {#if guesses.length > 0}
      <div class="feedback-wrap">
        <div class="feedback-headers">
          <div class="fh-cell">{isPT ? 'Mapa' : 'Map'}</div>
          <div class="fh-cell">{isPT ? 'Callout' : 'Callout'}</div>
          <div class="fh-cell">{isPT ? 'Área' : 'Area'}</div>
        </div>
        {#each guesses as guess, i}
          <div class="feedback-row" class:latest={i === guesses.length - 1}>
            {#each guess.feedback as cell}
              <div class="fb-cell fb-cell--{cell.status}">
                {cell.attr === 'area' ? areaLabel(cell.value) : cell.value}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Result panel -->
    {#if finished && target}
      {@const targetMap     = MAPS_DB[target.mapId]}
      {@const targetCallout = MAPS_CALLOUTS[target.mapId]?.find(c => c.id === target.calloutId)}
      <div class="result-panel" class:won class:lost={!won}>
        <div class="result-glow"></div>
        <div class="result-inner">
          {#if won}
            <div class="result-icon">🎯</div>
            <div class="result-title">{isPT ? 'Você acertou!' : 'You got it!'}</div>
            <div class="result-sub">
              {isPT
                ? `${targetMap?.name} · ${targetCallout?.name} — ${guesses.length} tentativa${guesses.length > 1 ? 's' : ''}`
                : `${targetMap?.name} · ${targetCallout?.name} — ${guesses.length} guess${guesses.length > 1 ? 'es' : ''}`}
            </div>
          {:else}
            <div class="result-icon">❌</div>
            <div class="result-title">{isPT ? 'Não foi dessa vez' : 'Better luck next time'}</div>
            <div class="result-sub">
              {isPT ? 'Era' : 'It was'}
              <strong>{targetMap?.name} · {targetCallout?.name}</strong>
            </div>
          {/if}

          <div class="result-actions">
            {#if mode === 'daily'}
              <button class="result-btn ghost" onclick={share}>
                {copied ? (isPT ? '✓ Copiado!' : '✓ Copied!') : (isPT ? 'Compartilhar' : 'Share')}
              </button>
            {/if}
            <a class="result-btn ghost" href={isPT ? '/' : '/en/'}>
              {isPT ? 'Voltar ao Lobby' : 'Back to Lobby'}
            </a>
            {#if mode === 'free'}
              <button class="result-btn ghost" onclick={restart}>
                {isPT ? 'Jogar de Novo' : 'Play Again'}
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/if}

  </div>
{/if}

<style>
  .maps-wrap {
    width: 100%; max-width: 720px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 12px;
    padding: 1.5rem 1.25rem 4rem;
  }

  /* Loading / error */
  .loading { display:flex; justify-content:center; align-items:center; min-height:40vh; }
  .spinner {
    width:36px; height:36px; border-radius:50%;
    border:3px solid var(--border2); border-top-color:var(--red);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-msg { text-align:center; color:var(--red); padding:2rem; font-family:var(--font-mono); }

  /* Header */
  .maps-header {
    display:flex; align-items:center; justify-content:space-between;
    gap:1rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border);
  }
  .back-btn {
    font-family:var(--font-mono); font-size:0.65rem; letter-spacing:0.12em;
    text-transform:uppercase; color:var(--text-dim); text-decoration:none;
    transition:color 0.2s;
  }
  .back-btn:hover { color:var(--red); }
  .maps-title { display:flex; align-items:center; gap:0.5rem; }
  .mode-label { font-family:var(--font-display); font-size:1rem; text-transform:uppercase; }
  .mode-tag {
    font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0.12em;
    background:var(--red-dim); border:1px solid var(--red-bd);
    color:var(--red); padding:0.15rem 0.45rem; border-radius:2px;
  }
  .attempts-label {
    font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.1em;
    text-transform:uppercase; color:var(--text-dim);
  }

  /* Screenshot zone */
  .screenshot-zone { display:flex; flex-direction:column; gap:8px; }
  .screenshot-frame {
    position:relative; overflow:hidden; border-radius:8px;
    border:1px solid var(--border2);
    height:240px; background:var(--surface);
    display:flex; align-items:center; justify-content:center;
  }
  .screenshot-img {
    width:100%; height:100%; object-fit:cover;
    filter:blur(var(--map-blur)) saturate(0.7);
    transition:filter 0.6s ease;
  }
  .screenshot-frame.revealed .screenshot-img { filter:none; }

  .screenshot-placeholder {
    display:flex; flex-direction:column; align-items:center; gap:0.5rem;
    color:var(--text-dim);
  }
  .placeholder-icon  { font-size:2.5rem; }
  .placeholder-label { font-family:var(--font-mono); font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; }
  .placeholder-sub   { font-size:0.65rem; opacity:0.6; }

  .blur-badge {
    position:absolute; bottom:8px; right:8px;
    font-family:var(--font-mono); font-size:0.58rem; letter-spacing:0.1em;
    background:rgba(0,0,0,0.6); color:var(--text-dim);
    padding:0.2rem 0.5rem; border-radius:3px;
  }

  /* View toggle */
  .view-toggle { display:flex; gap:6px; }
  .toggle-btn {
    flex:1; font-family:var(--font-mono); font-size:0.68rem; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase;
    padding:0.5rem; border-radius:4px; cursor:pointer;
    background:var(--surface); border:1px solid var(--border2);
    color:var(--text-dim); transition:all 0.2s;
  }
  .toggle-btn.active { background:var(--red); border-color:var(--red); color:#fff; }
  .toggle-btn:hover:not(.active) { border-color:var(--red); color:var(--red); }

  /* Map selection */
  .map-select-zone { display:flex; flex-direction:column; gap:8px; }
  .map-picker {
    width:100%; background:var(--surface); border:1px solid var(--border2);
    color:var(--text); font-family:var(--font-ui); font-size:0.9rem;
    padding:0.65rem 1rem; border-radius:4px; outline:none;
    transition:border-color 0.2s; cursor:pointer;
  }
  .map-picker:focus { border-color:var(--red); }

  /* Minimap */
  .minimap-wrapper {
    position:relative; height:320px; border-radius:8px;
    border:1px solid var(--border2); overflow:hidden;
    background:var(--surface);
  }
  .minimap-placeholder {
    position:absolute; inset:0;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:0.4rem; color:var(--text-dim);
  }
  .minimap-label { font-family:var(--font-display); font-size:1.4rem; text-transform:uppercase; }
  .minimap-sub   { font-family:var(--font-mono); font-size:0.6rem; letter-spacing:0.1em; opacity:0.6; }

  .callout-btn {
    position:absolute; transform:translate(-50%,-50%);
    font-family:var(--font-mono); font-size:0.58rem; font-weight:700;
    letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap;
    padding:0.2rem 0.4rem; border-radius:3px; cursor:pointer;
    background:rgba(0,0,0,0.65); border:1px solid var(--border2);
    color:var(--text-dim); transition:all 0.15s;
  }
  .callout-btn:hover:not(.used) { background:var(--red); border-color:var(--red); color:#fff; }
  .callout-btn.selected { background:var(--red); border-color:var(--red); color:#fff; }
  .callout-btn.used { opacity:0.3; cursor:not-allowed; }

  /* Confirm bar */
  .callout-confirm-bar {
    display:flex; align-items:center; justify-content:space-between;
    gap:1rem; padding:0.65rem 1rem;
    background:var(--surface); border:1px solid var(--border2); border-radius:6px;
  }
  .selected-label {
    font-family:var(--font-mono); font-size:0.72rem; letter-spacing:0.06em;
    color:var(--text); display:flex; align-items:center; gap:0.4rem;
  }
  .area-chip {
    font-size:0.58rem; background:var(--surface2); border:1px solid var(--border);
    padding:0.1rem 0.35rem; border-radius:2px; color:var(--text-dim);
  }
  .confirm-btn {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase;
    background:var(--red); color:#fff; border:none;
    padding:0.55rem 1.1rem; border-radius:4px; cursor:pointer;
    transition:background 0.2s; white-space:nowrap;
  }
  .confirm-btn:hover { background:#e03040; }

  /* Guess meta / hints */
  .guess-meta { display:flex; flex-direction:column; gap:8px; }
  .hint-section { display:flex; flex-direction:column; gap:8px; }
  .hint-btn {
    align-self:flex-start;
    font-family:var(--font-mono); font-size:0.68rem; font-weight:700;
    letter-spacing:0.08em; text-transform:uppercase;
    background:var(--surface); border:1px solid var(--border2);
    color:var(--text-mid); padding:0.45rem 0.9rem; border-radius:4px;
    cursor:pointer; transition:all 0.2s;
  }
  .hint-btn:hover:not(:disabled) { border-color:var(--red); color:var(--red); }
  .hint-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .hint-count { color:var(--text-dim); font-weight:400; margin-left:0.3rem; }

  .hints-revealed { display:flex; flex-wrap:wrap; gap:6px; }
  .hint-chip {
    font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.08em;
    background:rgba(240,180,41,0.12); border:1px solid rgba(240,180,41,0.4);
    color:#f0b429; padding:0.25rem 0.6rem; border-radius:3px;
  }

  /* Feedback grid */
  .feedback-wrap { display:flex; flex-direction:column; gap:4px; }
  .feedback-headers, .feedback-row {
    display:grid; grid-template-columns:repeat(3,1fr); gap:4px;
  }
  .fh-cell {
    font-family:var(--font-mono); font-size:0.55rem; letter-spacing:0.15em;
    text-transform:uppercase; color:var(--text-dim); text-align:center;
    padding:0.2rem 0.3rem;
  }
  .fb-cell {
    border-radius:4px; padding:0.5rem 0.4rem;
    font-family:var(--font-mono); font-size:0.78rem; font-weight:700;
    text-align:center; display:flex; align-items:center; justify-content:center;
    min-height:44px; word-break:break-word; line-height:1.3;
  }
  .fb-cell--correct { background:rgba(52,212,126,0.18); border:1px solid rgba(52,212,126,0.5); color:#34d47e; }
  .fb-cell--wrong   { background:rgba(255,70,85,0.08);  border:1px solid rgba(255,70,85,0.25); color:var(--text-mid); }
  .feedback-row.latest .fb-cell { animation:popIn 0.25s ease both; }
  @keyframes popIn { from { transform:scale(0.88); opacity:0; } to { transform:scale(1); opacity:1; } }

  /* Result panel */
  .result-panel {
    position:relative; overflow:hidden; border-radius:8px;
    padding:1.5rem 1.75rem; border:1px solid; text-align:center;
  }
  .result-panel.won  { border-color:rgba(52,212,126,0.4); background:rgba(52,212,126,0.06); }
  .result-panel.lost { border-color:rgba(255,70,85,0.4);  background:rgba(255,70,85,0.05); }
  .result-glow {
    position:absolute; top:-40px; left:50%; transform:translateX(-50%);
    width:200px; height:200px; pointer-events:none; border-radius:50%;
  }
  .won  .result-glow { background:radial-gradient(circle,rgba(52,212,126,0.15),transparent 70%); }
  .lost .result-glow { background:radial-gradient(circle,rgba(255,70,85,0.12),transparent 70%); }
  .result-inner { position:relative; display:flex; flex-direction:column; align-items:center; gap:0.6rem; }
  .result-icon  { font-size:2rem; line-height:1; }
  .result-title { font-family:var(--font-display); font-size:1.6rem; text-transform:uppercase; }
  .result-sub   { font-size:0.9rem; color:var(--text-mid); }
  .result-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:0.6rem; }
  .result-btn {
    font-family:var(--font-mono); font-size:0.7rem; font-weight:700;
    letter-spacing:0.1em; text-transform:uppercase;
    padding:0.6rem 1.1rem; border-radius:4px;
    cursor:pointer; transition:all 0.2s; text-decoration:none;
    display:inline-flex; align-items:center;
  }
  .result-btn.ghost {
    background:transparent; border:1px solid var(--border2); color:var(--text-mid);
  }
  .result-btn.ghost:hover { border-color:var(--red); color:var(--red); }
</style>
