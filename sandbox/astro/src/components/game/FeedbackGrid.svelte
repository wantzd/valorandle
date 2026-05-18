<script lang="ts">
  import type { Guess } from '../../lib/types';

  interface Props {
    guesses: Guess[];
    lang: string;
  }

  let { guesses, lang }: Props = $props();

  const isPT = lang === 'pt-BR';

  const HEADERS: Record<string, string> = {
    country:     isPT ? 'País'      : 'Country',
    team:        isPT ? 'Time'      : 'Team',
    age:         isPT ? 'Idade'     : 'Age',
    role:        isPT ? 'Função'    : 'Role',
    titles:      isPT ? 'Títulos'   : 'Titles',
    yearsActive: isPT ? 'Anos Ativo' : 'Yrs Active',
  };

  const ROLES_PT: Record<string, string> = {
    Duelist: 'Duelista', Initiator: 'Iniciador',
    Controller: 'Controlador', Sentinel: 'Sentinela', Flex: 'Flex',
  };

  function displayValue(cell: Guess['feedback'][number]): string {
    let v = String(cell.value);
    if (cell.attr === 'role' && isPT) {
      const base = v.replace(' (Flex)', '');
      const isFlex = v.includes(' (Flex)');
      v = (ROLES_PT[base] ?? base) + (isFlex ? ' (Flex)' : '');
    }
    if (cell.attr === 'age' || cell.attr === 'yearsActive') {
      return cell.hint ? `${v} ${cell.hint}` : v;
    }
    return v;
  }
</script>

{#if guesses.length > 0}
  <div class="feedback-wrap">
    <!-- Column headers -->
    <div class="feedback-headers">
      <div class="header-player">{isPT ? 'Jogador' : 'Player'}</div>
      {#each guesses[0].feedback as cell}
        <div class="header-cell">{HEADERS[cell.attr] ?? cell.attr}</div>
      {/each}
    </div>

    <!-- Guess rows -->
    {#each guesses as guess, i}
      <div class="feedback-row" class:latest={i === guesses.length - 1}>
        <!-- Player name -->
        <div class="cell cell-player">
          <span class="fi fi-{guess.player.countryCode?.toLowerCase()} player-flag"></span>
          {guess.player.name}
        </div>

        <!-- Attribute cells -->
        {#each guess.feedback as cell}
          <div class="cell cell--{cell.status}" title={cell.attr === 'role' ? (isPT ? 'Baseado nas últimas partidas' : 'Based on recent matches') : undefined}>
            <span class="cell-value">{displayValue(cell)}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  .feedback-wrap { display: flex; flex-direction: column; gap: 4px; }

  .feedback-headers, .feedback-row {
    display: grid;
    grid-template-columns: 1.4fr repeat(6, 1fr);
    gap: 4px;
  }

  .header-player, .header-cell {
    font-family: var(--font-mono); font-size: 0.55rem;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--text-dim); text-align: center;
    padding: 0.2rem 0.3rem;
  }
  .header-player { text-align: left; }

  .cell {
    border-radius: 4px; padding: 0.5rem 0.4rem;
    font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700;
    text-align: center; display: flex; align-items: center; justify-content: center;
    min-height: 48px; word-break: break-word; line-height: 1.3;
    transition: opacity 0.2s;
  }

  .cell-player {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); font-family: var(--font-ui); font-size: 0.8rem; font-weight: 500;
    justify-content: flex-start; gap: 0.45rem; padding: 0.5rem 0.6rem;
    text-align: left;
  }
  .player-flag { font-size: 1rem; flex-shrink: 0; }

  .cell--correct { background: rgba(52,212,126,0.18); border: 1px solid rgba(52,212,126,0.5); color: #34d47e; }
  .cell--close   { background: rgba(240,180,41,0.15); border: 1px solid rgba(240,180,41,0.5); color: #f0b429; }
  .cell--wrong   { background: rgba(255,70,85,0.08);  border: 1px solid rgba(255,70,85,0.25); color: var(--text-mid); }

  .feedback-row.latest .cell:not(.cell-player) { animation: popIn 0.25s ease both; }
  @keyframes popIn { from { transform: scale(0.88); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .cell-value { overflow: hidden; text-overflow: ellipsis; }

  @media (max-width: 600px) {
    .feedback-headers, .feedback-row {
      grid-template-columns: 1fr repeat(6, 1fr);
    }
    .header-player { display: none; }
    .cell-player { display: none; }
    .cell { font-size: 0.65rem; padding: 0.4rem 0.2rem; min-height: 42px; }
  }
</style>
