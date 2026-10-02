import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const API = process.env.API_URL || 'http://localhost:4000';

export default defineConfig({
  root: 'frontend',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@challenges': path.resolve(__dirname, 'challenges'),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [path.resolve(__dirname)] },
    proxy: {
      '/api': API,
      '/payment-gateway': API,
      '/popups': API,
      '/lab-pages': API,
      '/sample-files': API,
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
});
