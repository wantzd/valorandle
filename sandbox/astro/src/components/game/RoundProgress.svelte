<script lang="ts">
  import type { RoundResult } from '../../lib/types';
  import { DAILY_ROUNDS } from '../../lib/daily';

  interface Props {
    roundResults: RoundResult[];
    currentRound: number;
    lang: string;
  }

  let { roundResults, currentRound, lang }: Props = $props();

  const isPT = lang === 'pt-BR';
</script>

<div class="round-progress">
  <span class="round-label">
    {isPT
      ? `Round ${currentRound + 1} de ${DAILY_ROUNDS}`
      : `Round ${currentRound + 1} of ${DAILY_ROUNDS}`}
  </span>
  <div class="pips">
    {#each Array.from({ length: DAILY_ROUNDS }, (_, i) => i) as i}
      {@const result = roundResults[i]}
      <div
        class="pip"
        class:done={!!result}
        class:won={result?.won}
        class:active={i === currentRound && !result}
        title={result ? (result.won ? '✓' : '✗') : ''}
      ></div>
    {/each}
  </div>
</div>

<style>
  .round-progress {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem;
  }
  .round-label {
    font-family: var(--font-mono); font-size: 0.65rem;
    letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-dim);
  }
  .pips { display: flex; gap: 5px; }
  .pip {
    width: 44px; height: 5px; border-radius: 3px;
    background: var(--surface2); border: 1px solid var(--border2);
    transition: all 0.3s;
  }
  .pip.active { background: var(--red); border-color: var(--red); box-shadow: 0 0 8px var(--red-glow); }
  .pip.done.won   { background: var(--green); border-color: var(--green); }
  .pip.done:not(.won) { background: var(--text-dim); border-color: var(--text-dim); }
</style>
