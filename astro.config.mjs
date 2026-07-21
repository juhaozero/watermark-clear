import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, process.cwd(), '');

const root = path.dirname(fileURLToPath(import.meta.url));

function normalizeBasePath(raw) {
  const value = (raw ?? '/').trim();
  if (!value || value === '/') return '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

function normalizeSite(raw) {
  const value = (raw ?? '').trim().replace(/\/+$/, '');
  if (!value) return 'http://localhost:4321';
  return value;
}

const base = normalizeBasePath(env.BASE_PATH);
const site = normalizeSite(env.PUBLIC_SITE_URL || env.SITE_URL);

export default defineConfig({
  site,
  base,
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const homepage =
          item.url === site ||
          item.url === `${site}/` ||
          item.url === `${site}${base}` ||
          item.url === `${site}${base}`.replace(/\/$/, '');

        if (homepage) {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        } else {
          item.changefreq = 'monthly';
          item.priority = 0.7;
        }
        item.lastmod = new Date();
        return item;
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
      },
    },
  },
});
