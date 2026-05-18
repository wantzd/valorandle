export type Lang = 'pt-BR' | 'en';
export const defaultLang: Lang = 'pt-BR';

export const ui = {
  'pt-BR': {
    // Meta
    'meta.title':       'Valorandle — Adivinhe o Pro Player de VALORANT',
    'meta.description': 'Valorandle é o Wordle de VALORANT: adivinhe o pro player do VCT com até 8 tentativas. Novo desafio todo dia com jogadores das 4 ligas globais.',
    'meta.keywords':    'valorandle, valdle, valorant wordle, vct pro player, adivinhe o jogador valorant, valorant quiz',
    'og.locale':        'pt_BR',
    'og.locale.alt':    'en_US',

    // Hub header
    'tagline':  'Adivinhe o Pro',
    'logo.sub': 'VCT Global · 4 Ligas',

    // Hero card
    'hero.desc':           'Adivinhe qual jogador profissional do VCT está escondido. 8 tentativas por round.',
    'hero.meta.new':       'Daily de hoje',
    'hero.meta.progress':  'Daily de hoje · Round {n} de 5',
    'hero.meta.done':      'Daily completo · {n}/5',
    'status.new':          'Novo',
    'status.progress':     'Em progresso',
    'status.done':         '✓ Completo',

    // CTAs
    'cta.play':     'Jogar →',
    'cta.continue': 'Continuar →',
    'cta.result':   'Ver resultado →',
    'cta.free':     'Modo livre',

    // Modes section
    'section.other': 'Outros modos',

    'mode.agents.name': 'Agentes',
    'mode.agents.desc': 'Função, origem, abilities, ano de lançamento',
    'mode.maps.name':   'Mapas',
    'mode.maps.desc':   'Imagem com zoom progressivo · fácil/difícil',
    'mode.skins.name':  'Skins',
    'mode.skins.desc':  'Crop da skin · linha, cor, animação, preço',
    'mode.abil.name':   'Abilities',
    'mode.abil.desc':   'Ícone borrado + descrição censurada',

    'tag.new':  'Novo',
    'tag.beta': 'Beta',
    'tag.soon': 'Em breve',

    // Stats
    'stats.today':   'Jogos hoje',
    'stats.streak':  'Streak',
    'stats.winrate': 'Win rate',

    // Countdown
    'countdown.label': 'Próximo daily em',

    // Footer
    'footer.fanmade': 'Fan-made. Não afiliado à',
    'footer.liq':     'Dados dos jogadores',
    'footer.liq.license': 'CC BY-SA',
  },

  'en': {
    // Meta
    'meta.title':       'Valorandle — Guess the VALORANT Pro Player',
    'meta.description': 'Valorandle is the VALORANT Wordle: guess the VCT pro player in up to 8 attempts. New challenge every day across all 4 global leagues.',
    'meta.keywords':    'valorandle, valdle, valorant wordle, vct pro player, guess the valorant player, valorant quiz',
    'og.locale':        'en_US',
    'og.locale.alt':    'pt_BR',

    // Hub header
    'tagline':  'Guess the Pro',
    'logo.sub': 'VCT Global · 4 Leagues',

    // Hero card
    'hero.desc':           'Guess which VCT pro player is hidden each round. 8 guesses per round.',
    'hero.meta.new':       "Today's Daily",
    'hero.meta.progress':  "Today's Daily · Round {n} of 5",
    'hero.meta.done':      'Daily complete · {n}/5',
    'status.new':          'New',
    'status.progress':     'In progress',
    'status.done':         '✓ Complete',

    // CTAs
    'cta.play':     'Play →',
    'cta.continue': 'Continue →',
    'cta.result':   'View result →',
    'cta.free':     'Free mode',

    // Modes section
    'section.other': 'Other modes',

    'mode.agents.name': 'Agents',
    'mode.agents.desc': 'Role, origin, abilities, release year',
    'mode.maps.name':   'Maps',
    'mode.maps.desc':   'Progressive zoom image · easy/hard',
    'mode.skins.name':  'Skins',
    'mode.skins.desc':  'Skin crop · line, color, animation, price',
    'mode.abil.name':   'Abilities',
    'mode.abil.desc':   'Blurred icon + censored description',

    'tag.new':  'New',
    'tag.beta': 'Beta',
    'tag.soon': 'Soon',

    // Stats
    'stats.today':   'Today',
    'stats.streak':  'Streak',
    'stats.winrate': 'Win rate',

    // Countdown
    'countdown.label': 'Next daily in',

    // Footer
    'footer.fanmade': 'Fan-made. Not affiliated with',
    'footer.liq':     'Player data',
    'footer.liq.license': 'CC BY-SA',
  },
} as const;

export type UIKey = keyof typeof ui[typeof defaultLang];

export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return (ui[lang] as Record<string, string>)[key]
      ?? (ui[defaultLang] as Record<string, string>)[key]
      ?? key;
  };
}
