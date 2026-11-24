import { defineConfig } from 'vite';
import { normalizeBase } from './src/lib/routes.ts';
import { themeIds, themeStorageKey } from './src/lib/theme.ts';

export default defineConfig({
  base: normalizeBase(process.env.PORTFOLIO_BASE_PATH ?? '/'),
  plugins: [{
    name: 'restore-portfolio-theme',
    transformIndexHtml() {
      // Restore before CSS paints, including on direct requests to a static case page.
      return [{
        tag: 'script',
        injectTo: 'head-prepend',
        children: `try{const t=JSON.parse(localStorage.getItem(${JSON.stringify(themeStorageKey)}))?.theme;if(${JSON.stringify(themeIds)}.includes(t))document.documentElement.dataset.theme=t}catch{}`,
      }];
    },
  }],
  esbuild: { jsx: 'automatic' },
});
