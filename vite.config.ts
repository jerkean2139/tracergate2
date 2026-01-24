import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787',
      '/webhooks': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
