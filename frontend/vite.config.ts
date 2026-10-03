import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server (and, identically, the production preview server after `vite
// build`) proxy /api → Express backend (http://localhost:3000), so the
// browser only ever talks to this one origin (cookies included, no CORS
// needed for normal app usage).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
