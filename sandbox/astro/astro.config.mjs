import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [svelte()],
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
