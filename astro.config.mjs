import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const env = loadEnv('development', process.cwd(), '');

const root = path.dirname(fileURLToPath(import.meta.url));

function normalizeBasePath(raw) {
  const value = (raw ?? '/').trim();
  if (!value || value === '/') return '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

const base = normalizeBasePath(env.BASE_PATH);

export default defineConfig({
  base,
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
      }
    }
  }
});