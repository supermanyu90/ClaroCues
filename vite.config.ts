import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Audio worklets must load from our own origin: the production CSP (script-src 'self')
    // blocks the data: URLs Vite would otherwise inline small assets as.
    assetsInlineLimit: (filePath: string) => (filePath.endsWith('.worklet.js') ? false : undefined),
  },
  server: {
    // AI Studio sets DISABLE_HMR=true to stop reloads while an agent edits files.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
