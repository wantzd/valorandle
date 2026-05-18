<script lang="ts">
  interface Props {
    lang: 'pt-BR' | 'en';
  }

  let { lang }: Props = $props();
  const isPT = lang === 'pt-BR';

  // Read ?mode from URL at runtime
  let mode = $state<'daily' | 'free'>('daily');

  import { onMount } from 'svelte';
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    mode = (params.get('mode') as 'daily' | 'free') ?? 'daily';
  });

  const LEAGUES = [
    { id: 'americas', label: 'Americas',
      desc: isPT ? 'NRG, MIBR, Loud, EG...' : 'NRG, MIBR, Loud, EG...',
      flag: '🌎' },
    { id: 'emea',     label: 'EMEA',
      desc: isPT ? 'Fnatic, Navi, TL, KC...' : 'Fnatic, Navi, TL, KC...',
      flag: '🌍' },
    { id: 'pacific',  label: 'Pacific',
      desc: isPT ? 'DRX, T1, PRX, GEN...' : 'DRX, T1, PRX, GEN...',
      flag: '🌏' },
    { id: 'china',    label: 'China',
      desc: isPT ? 'EDG, FPX, TEC...' : 'EDG, FPX, TEC...',
      flag: '🇨🇳' },
  ] as const;

  function pick(leagueId: string) {
    const base = lang === 'en' ? '/en/game' : '/game';
    window.location.href = `${base}?mode=${mode}&league=${leagueId}`;
  }
</script>

<div class="ls-wrap">

  <header class="ls-header">
    <a class="back-btn" href={lang === 'en' ? '/en/' : '/'}>← {isPT ? 'Lobby' : 'Lobby'}</a>
    <div class="ls-title">
      <span class="ls-mode-tag">{mode === 'daily' ? 'DAILY' : (isPT ? 'MODO LIVRE' : 'FREE MODE')}</span>
      <span class="ls-headline">{isPT ? 'Escolha a Liga' : 'Choose a League'}</span>
    </div>
  </header>

  <div class="ls-grid">
    {#each LEAGUES as league}
      <button class="league-card" onclick={() => pick(league.id)}>
        <span class="league-flag">{league.flag}</span>
        <div class="league-info">
          <span class="league-name">{league.label}</span>
          <span class="league-desc">{league.desc}</span>
        </div>
        <span class="league-arrow">→</span>
      </button>
    {/each}
  </div>

</div>

<style>
  .ls-wrap {
    width: 100%; max-width: 520px; margin: 0 auto;
    display: flex; flex-direction: column; gap: 1.5rem;
    padding: 2rem 1.25rem 4rem;
  }

  .ls-header {
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .back-btn {
    font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-dim); text-decoration: none;
    transition: color 0.2s; align-self: flex-start;
  }
  .back-btn:hover { color: var(--red); }

  .ls-title { display: flex; flex-direction: column; gap: 0.3rem; }
  .ls-mode-tag {
    font-family: var(--font-mono); font-size: 0.58rem; letter-spacing: 0.15em;
    color: var(--red); background: var(--red-dim); border: 1px solid var(--red-bd);
    padding: 0.15rem 0.5rem; border-radius: 2px; align-self: flex-start;
  }
  .ls-headline {
    font-family: var(--font-display); font-size: 1.6rem; text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .ls-grid { display: flex; flex-direction: column; gap: 8px; }

  .league-card {
    display: flex; align-items: center; gap: 1rem;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 8px; padding: 1rem 1.1rem;
    cursor: pointer; text-align: left;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
  }
  .league-card:hover {
    border-color: var(--red); background: var(--surface2);
    transform: translateX(3px);
  }
  .league-flag { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
  .league-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .league-name {
    font-family: var(--font-display); font-size: 1rem; text-transform: uppercase;
    color: var(--text);
  }
  .league-desc {
    font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.08em;
    color: var(--text-dim);
  }
  .league-arrow {
    font-family: var(--font-mono); font-size: 0.9rem; color: var(--text-dim);
    transition: color 0.2s;
  }
  .league-card:hover .league-arrow { color: var(--red); }
</style>
