import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://valorandle.com',
  output: 'static',

  build: {
    format: 'directory',
  },

  trailingSlash: 'never',
  integrations: [svelte()],
});