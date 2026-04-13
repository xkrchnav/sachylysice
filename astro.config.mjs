// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.sachylysice.cz',

  build: {
    inlineStylesheets: 'auto',
  },

  image: {},

  compressHTML: true,
  integrations: [mdx(), sitemap()],
});