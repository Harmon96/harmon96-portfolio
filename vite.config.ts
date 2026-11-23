import { defineConfig } from 'vite';
import { normalizeBase } from './src/lib/routes.ts';

export default defineConfig({
  base: normalizeBase(process.env.PORTFOLIO_BASE_PATH ?? '/'),
  esbuild: { jsx: 'automatic' },
});
