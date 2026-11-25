import { defineConfig } from 'vite';
import { normalizeBase, playgroundPath } from './src/lib/routes.ts';
import { themeIds, themeStorageKey } from './src/lib/theme.ts';

const base = normalizeBase(process.env.PORTFOLIO_BASE_PATH ?? '/');
const path = base.slice(0, -1) + playgroundPath;
const playgroundUrls = [path, path.slice(0, -1), path + 'index.html'];

export default defineConfig({
  base,
  plugins: [{
    name: 'restore-playground-theme',
    transformIndexHtml() {
      // A build shares this template across routes. Restore before first paint on Playground only.
      return [{
        tag: 'script',
        injectTo: 'head-prepend',
        children: `if (${JSON.stringify(playgroundUrls)}.includes(location.pathname)) {
          document.documentElement.dataset.theme = 'spatial';
          try {
            const theme = JSON.parse(localStorage.getItem(${JSON.stringify(themeStorageKey)}))?.theme;
            if (${JSON.stringify(themeIds)}.includes(theme)) document.documentElement.dataset.theme = theme;
          } catch {}
        }`,
      }];
    },
  }],
  esbuild: { jsx: 'automatic' },
});
