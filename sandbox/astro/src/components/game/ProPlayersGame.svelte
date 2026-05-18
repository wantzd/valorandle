<script lang="ts">
  /**
   * ProPlayersGame.svelte
   *
   * Orchestrates the full Pro Players game mode.
   * State is fully reactive — no manual DOM updates.
   *
   * Future modes (Agents, Maps, Skins) follow this exact pattern:
   *   1. Create AgentsGame.svelte / MapsGame.svelte / etc.
   *   2. Import the mode-specific logic (compare function, data source)
   *   3. Reuse <GuessInput>, <FeedbackGrid>, <RoundProgress>, <ResultPanel>
   */

  import { onMount } from 'svelte';
  import type { Player, Guess, RoundResult, DailyState } from '../../lib/types';
  import { compareGuess } from '../../lib/compare';
  import { getDailyPlayers, getRandomPlayer, MAX_GUESSES, DAILY_ROUNDS } from '../../lib/daily';
  import { loadStats, recordResult } from '../../lib/stats';
  import { loadDailyState, saveDailyState } from '../../lib/persistence';
  import GuessInput    from './GuessInput.svelte';
  import FeedbackGrid  from './FeedbackGrid.svelte';
  import RoundProgress from './RoundProgress.svelte';
  import ResultPanel   from './ResultPanel.svelte';

  interface Props {
    lang: 'pt-BR' | 'en';
  }

  let { lang }: Props = $props();
  const isPT = lang === 'pt-BR';

  // ── Game state ────────────────────────────────────────────────────────────
  let mode         = $state<'daily' | 'free'>('daily');
  let league       = $state('americas');
  let players      = $state<Player[]>([]);
  let dailyTargets = $state<Player[]>([]);
  let currentRound = $state(0);
  let target       = $state<Player | null>(null);
  let guesses      = $state<Guess[]>([]);
  let roundResults = $state<RoundResult[]>([]);
  let finished     = $state(false);
  let won          = $state(false);
  let dailyDone    = $state(false);
  let loading      = $state(true);
  let error        = $state('');

  // Derived
  let usedIds      = $derived(guesses.map(g => g.player.id));
  let remaining    = $derived(MAX_GUESSES - guesses.length);

  // ── Initialisation ────────────────────────────────────────────────────────
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    mode   = (params.get('mode') as 'daily' | 'free') ?? 'daily';
    league = params.get('league') ?? 'americas';

    // PLAYERS_DB is a global loaded via public/js/players.js + api.js
    const db = (window as any).PLAYERS_DB as Player[] | undefined;
    if (!db || db.length === 0) {
      error = isPT ? 'Erro ao carregar jogadores.' : 'Failed to load players.';
      loading = false;
      return;
    }

    players = db.filter(p => p.league === league);

    if (mode === 'daily') {
      dailyTargets = getDailyPlayers(players);
      const saved: DailyState | null = loadDailyState(league);
      if (saved) {
        currentRound = saved.currentRound;
        roundResults = saved.roundResults;
        guesses      = saved.guesses;
        finished     = saved.finished;
        won          = saved.won;
        dailyDone    = saved.dailyDone;
      }
      target = dailyTargets[currentRound];
    } else {
      target = getRandomPlayer(players);
    }

    loading = false;
  });

  // ── Game actions ──────────────────────────────────────────────────────────
  function submitGuess(player: Player) {
    if (!target || finished || usedIds.includes(player.id)) return;

    const feedback = compareGuess(player, target);
    const isWin    = feedback.every(f => f.status === 'correct');
    guesses        = [...guesses, { player, feedback }];

    if (isWin || guesses.length >= MAX_GUESSES) {
      won       = isWin;
      finished  = true;
      roundResults = [...roundResults, { won: isWin, guesses: [...guesses] }];
      dailyDone = mode === 'daily' && roundResults.length >= DAILY_ROUNDS;
      recordResult(isWin);
      if (mode === 'daily') persistState();
    } else if (mode === 'daily') {
      persistState();
    }
  }

  function nextRound() {
    if (currentRound >= DAILY_ROUNDS - 1) return;
    currentRound++;
    guesses  = [];
    finished = false;
    won      = false;
    target   = mode === 'daily'
      ? dailyTargets[currentRound]
      : getRandomPlayer(players, roundResults.map(r => r.guesses.at(-1)?.player.id ?? ''));
    if (mode === 'daily') persistState();
  }

  function persistState() {
    saveDailyState(league, {
      currentRound, roundResults, guesses,
      finished, won, dailyDone,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const leagueLabel: Record<string, string> = {
    americas: 'Americas', emea: 'EMEA', pacific: 'Pacific', china: 'China',
  };
</script>

{#if loading}
  <div class="loading">
    <div class="spinner"></div>
  </div>

{:else if error}
  <div class="error-msg">{error}</div>

{:else}
  <div class="game-wrap">

    <!-- Header bar -->
    <header class="game-header">
      <a class="back-btn" href="/">{isPT ? '← Lobby' : '← Lobby'}</a>
      <div class="game-title">
        <span class="game-mode-label">{isPT ? 'PRO PLAYERS' : 'PRO PLAYERS'}</span>
        <span class="league-tag">{leagueLabel[league] ?? league}</span>
      </div>
      <div class="attempts-label">
        {remaining > 0
          ? (isPT ? `${guesses.length}/${MAX_GUESSES} tent.` : `${guesses.length}/${MAX_GUESSES} guesses`)
          : (isPT ? 'Sem tentativas' : 'No guesses left')}
      </div>
    </header>

    <!-- Round progress (daily only) -->
    {#if mode === 'daily'}
      <RoundProgress {roundResults} {currentRound} {lang} />
    {/if}

    <!-- Guess input -->
    {#if !finished && !dailyDone}
      <GuessInput
        {players}
        {usedIds}
        {lang}
        disabled={finished}
        onguess={submitGuess}
      />
    {/if}

    <!-- Result panel (shown when round is over) -->
    {#if finished && target}
      <ResultPanel
        {won}
        {target}
        {guesses}
        {roundResults}
        {currentRound}
        {mode}
        {dailyDone}
        {lang}
        onnextround={nextRound}
      />
    {/if}

    <!-- Feedback grid -->
    <FeedbackGrid {guesses} {lang} />

    <!-- Daily done summary -->
    {#if dailyDone}
      <div class="daily-summary">
        <div class="summary-score">
          {roundResults.filter(r => r.won).length} / {DAILY_ROUNDS}
        </div>
        <div class="summary-label">{isPT ? 'rounds vencidos' : 'rounds won'}</div>
      </div>
    {/if}

  </div>
{/if}

<style>
  .game-wrap {
    width: 100%; max-width: 720px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 12px;
    padding: 1.5rem 1.25rem 4rem;
  }

  .loading {
    display: flex; justify-content: center; align-items: center;
    min-height: 40vh;
  }
  .spinner {
    width: 36px; height: 36px; border-radius: 50%;
    border: 3px solid var(--border2); border-top-color: var(--red);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .error-msg {
    text-align: center; color: var(--red); padding: 2rem;
    font-family: var(--font-mono);
  }

  /* Header */
  .game-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .back-btn {
    font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-dim); text-decoration: none;
    transition: color 0.2s;
  }
  .back-btn:hover { color: var(--red); }

  .game-title {
    display: flex; align-items: center; gap: 0.5rem;
    font-family: var(--font-display); font-size: 1rem; text-transform: uppercase;
  }
  .league-tag {
    font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.12em;
    background: var(--red-dim); border: 1px solid var(--red-bd);
    color: var(--red); padding: 0.15rem 0.45rem; border-radius: 2px;
  }

  .attempts-label {
    font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-dim);
  }

  /* Daily summary */
  .daily-summary {
    text-align: center; padding: 1.5rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
  }
  .summary-score {
    font-family: var(--font-display); font-size: 3rem; color: var(--red); line-height: 1;
  }
  .summary-label {
    font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em;
    text-transform: uppercase; color: var(--text-dim); margin-top: 0.4rem;
  }
</style>
