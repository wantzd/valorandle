<script lang="ts">
  import type { Player } from '../../lib/types';

  interface Props {
    players: Player[];
    usedIds: string[];
    lang: string;
    disabled?: boolean;
    onguess?: (p: Player) => void;
  }

  let { players, usedIds, lang, disabled = false, onguess }: Props = $props();

  const placeholder = lang === 'pt-BR' ? 'Digite o nome do jogador...' : 'Type player name...';
  const notFound     = lang === 'pt-BR' ? 'Nenhum jogador encontrado' : 'No player found';
  const alreadyUsed  = lang === 'pt-BR' ? 'Já chutado' : 'Already guessed';

  let query = $state('');
  let open   = $state(false);
  let active = $state(-1);  // keyboard-focused suggestion index

  // Filtered suggestions
  let suggestions = $derived(
    query.trim().length < 2
      ? []
      : players
          .filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, 8)
  );

  function select(player: Player) {
    query = '';
    open = false;
    active = -1;
    onguess?.(player);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, suggestions.length - 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); active = Math.max(active - 1, -1); }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(suggestions[active]); }
    if (e.key === 'Escape') { open = false; active = -1; }
  }

  function onInput() {
    open = suggestions.length > 0;
    active = -1;
  }
</script>

<div class="guess-input-wrap">
  <div class="guess-row">
    <input
      class="guess-input"
      type="text"
      {placeholder}
      bind:value={query}
      oninput={onInput}
      onkeydown={onKeydown}
      onfocus={() => { if (suggestions.length) open = true; }}
      onblur={() => setTimeout(() => { open = false; }, 150)}
      {disabled}
      autocomplete="off"
      spellcheck={false}
    />
    <button
      class="guess-btn"
      disabled={disabled || !query.trim()}
      onclick={() => {
        if (suggestions.length > 0) select(suggestions[active >= 0 ? active : 0]);
      }}
    >
      OK →
    </button>
  </div>

  {#if open && query.trim().length >= 2}
    <ul class="suggestions" role="listbox">
      {#if suggestions.length === 0}
        <li class="suggestion suggestion--empty">{notFound}</li>
      {:else}
        {#each suggestions as player, i}
          {@const used = usedIds.includes(player.id)}
          <li
            class="suggestion"
            class:active={i === active}
            class:used
            role="option"
            aria-selected={i === active}
            onmousedown={() => !used && select(player)}
          >
            <span class="sug-flag fi fi-{player.countryCode?.toLowerCase()}"></span>
            <span class="sug-name">{player.name}</span>
            <span class="sug-team">{player.team}</span>
            {#if used}<span class="sug-used">{alreadyUsed}</span>{/if}
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>

<style>
  .guess-input-wrap { position: relative; width: 100%; }

  .guess-row {
    display: flex; gap: 6px;
  }

  .guess-input {
    flex: 1;
    background: var(--surface); border: 1px solid var(--border2);
    color: var(--text); font-family: var(--font-ui); font-size: 0.9rem;
    padding: 0.65rem 1rem; border-radius: 4px 0 0 4px;
    outline: none; transition: border-color 0.2s;
  }
  .guess-input:focus { border-color: var(--red); }
  .guess-input:disabled { opacity: 0.5; cursor: not-allowed; }

  .guess-btn {
    background: var(--red); color: #fff; border: none;
    font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 0.65rem 1.2rem; border-radius: 0 4px 4px 0;
    cursor: pointer; transition: background 0.2s;
    white-space: nowrap;
  }
  .guess-btn:hover:not(:disabled) { background: #e03040; }
  .guess-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .suggestions {
    position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 100;
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 4px; list-style: none; overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  }

  .suggestion {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.55rem 0.9rem; cursor: pointer;
    transition: background 0.12s;
    font-size: 0.85rem;
  }
  .suggestion:hover:not(.used):not(.suggestion--empty) { background: var(--surface); }
  .suggestion.active { background: var(--surface); }
  .suggestion.used { opacity: 0.4; cursor: not-allowed; }
  .suggestion--empty { color: var(--text-dim); cursor: default; font-style: italic; }

  .sug-flag { font-size: 1rem; flex-shrink: 0; border-radius: 2px; }
  .sug-name { flex: 1; color: var(--text); font-weight: 500; }
  .sug-team { color: var(--text-dim); font-size: 0.75rem; }
  .sug-used {
    font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.08em;
    color: var(--text-dim); text-transform: uppercase;
  }
</style>
