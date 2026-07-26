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
  
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    }
  }
});