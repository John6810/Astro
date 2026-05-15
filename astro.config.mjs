import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: process.env.ASTRO_SITE || 'https://jonathan-aerts.dev',
  base: process.env.ASTRO_BASE || '/',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
