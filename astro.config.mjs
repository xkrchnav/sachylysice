// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.sachylysice.cz',

  build: {
    // Inline small styles for performance
    inlineStylesheets: 'auto',
  },

  image: {
    // Sharp is the default — produces webp/avif at build time
    // All <Image /> components will be optimised automatically
  },

  compressHTML: true,
  integrations: [sitemap()],
});