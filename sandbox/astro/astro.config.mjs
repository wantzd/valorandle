import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://valorandle.com',
  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR', 'en'],
    routing: {
      prefixDefaultLocale: false, // / = pt-BR, /en/ = EN
    },
  },
  output: 'static',
});
