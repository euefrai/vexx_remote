import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
      },
      '/session': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/tunnel': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      }
    }
  },
  plugins: [react()],
});
