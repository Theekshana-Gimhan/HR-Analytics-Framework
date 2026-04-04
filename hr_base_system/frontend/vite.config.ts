import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 700,
    // Hidden source maps for production error tracking (not served to browsers)
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // MUI + Emotion (largest dependency — isolated for long-term caching)
          if (
            id.includes('@mui/') ||
            id.includes('@emotion/') ||
            id.includes('@popperjs/')
          ) {
            return 'vendor-mui';
          }

          // TanStack (React Query) — changes rarely
          if (id.includes('@tanstack/')) {
            return 'vendor-tanstack';
          }

          // React core (react, react-dom, react-router, scheduler)
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          // Everything else from node_modules
          return 'vendor';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    restoreMocks: true,
  },
});
