<script lang="ts">
  import type { Player, RoundResult } from '../../lib/types';
  import { generateShareText } from '../../lib/persistence';
  import { DAILY_ROUNDS } from '../../lib/daily';

  interface Props {
    won: boolean;
    target: Player;
    guesses: import('../../lib/types').Guess[];
    roundResults: RoundResult[];
    currentRound: number;
    mode: string;
    dailyDone: boolean;
    lang: string;
    onnextround?: () => void;
  }

  let { won, target, guesses, roundResults, currentRound, mode, dailyDone, lang, onnextround }: Props = $props();

  const isPT = lang === 'pt-BR';
  let copied = $state(false);

  const isLastRound = currentRound >= DAILY_ROUNDS - 1;

  function share() {
    const text = generateShareText(roundResults, lang);
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    });
  }
</script>

<div class="result-panel" class:won class:lost={!won}>
  <div class="result-glow"></div>

  <div class="result-inner">
    {#if won}
      <div class="result-icon">🎯</div>
      <div class="result-title">{isPT ? 'Você acertou!' : 'You got it!'}</div>
      <div class="result-sub">
        {isPT
          ? `${guesses.length} tentativa${guesses.length > 1 ? 's' : ''}`
          : `${guesses.length} guess${guesses.length > 1 ? 'es' : ''}`}
      </div>
    {:else}
      <div class="result-icon">❌</div>
      <div class="result-title">{isPT ? 'Não foi dessa vez' : 'Better luck next time'}</div>
      <div class="result-sub">
        {isPT ? 'Era' : 'It was'}
        <strong class="result-target">{target.name}</strong>
        <span class="fi fi-{target.countryCode?.toLowerCase()}"></span>
      </div>
    {/if}

    <div class="result-actions">
      {#if mode === 'daily' && !dailyDone && !isLastRound}
        <button class="result-btn primary" onclick={onnextround}>
          {isPT ? 'Próximo Round →' : 'Next Round →'}
        </button>
      {/if}

      {#if mode === 'daily' && (dailyDone || isLastRound)}
        <button class="result-btn ghost" onclick={share}>
          {copied ? (isPT ? '✓ Copiado!' : '✓ Copied!') : (isPT ? 'Compartilhar' : 'Share')}
        </button>
      {/if}

      <a class="result-btn ghost" href="/">
        {isPT ? 'Voltar ao Lobby' : 'Back to Lobby'}
      </a>

      {#if mode === 'free'}
        <button class="result-btn ghost" onclick={() => location.reload()}>
          {isPT ? 'Jogar de Novo' : 'Play Again'}
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .result-panel {
    position: relative; overflow: hidden;
    border-radius: 8px; padding: 1.5rem 1.75rem;
    border: 1px solid;
    text-align: center;
  }
  .result-panel.won  { border-color: rgba(52,212,126,0.4); background: rgba(52,212,126,0.06); }
  .result-panel.lost { border-color: rgba(255,70,85,0.4);  background: rgba(255,70,85,0.05); }

  .result-glow {
    position: absolute; top: -40px; left: 50%; transform: translateX(-50%);
    width: 200px; height: 200px;
    pointer-events: none; border-radius: 50%;
  }
  .won  .result-glow { background: radial-gradient(circle, rgba(52,212,126,0.15), transparent 70%); }
  .lost .result-glow { background: radial-gradient(circle, rgba(255,70,85,0.12), transparent 70%); }

  .result-inner { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }

  .result-icon  { font-size: 2rem; line-height: 1; }
  .result-title { font-family: var(--font-display); font-size: 1.6rem; text-transform: uppercase; }
  .result-sub   { font-size: 0.9rem; color: var(--text-mid); display: flex; align-items: center; gap: 0.4rem; }
  .result-target { color: var(--text); margin: 0 0.2rem; }

  .result-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 0.6rem; }

  .result-btn {
    font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.6rem 1.1rem; border-radius: 4px;
    cursor: pointer; transition: all 0.2s; text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .result-btn.primary { background: var(--red); color: #fff; border: none; }
  .result-btn.primary:hover { background: #e03040; }
  .result-btn.ghost {
    background: transparent; border: 1px solid var(--border2); color: var(--text-mid);
  }
  .result-btn.ghost:hover { border-color: var(--red); color: var(--red); }
</style>
