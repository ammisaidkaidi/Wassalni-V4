import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api → Express backend (http://localhost:3000), so the
// browser only ever talks to this origin (cookies included).
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
});
