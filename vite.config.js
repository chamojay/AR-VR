import { resolve } from 'path';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  base: './',
  root: '.',
  publicDir: 'public',
  plugins: [basicSsl()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dish: resolve(__dirname, 'dish.html'),
        markerAr: resolve(__dirname, 'marker-ar.html'),
        about: resolve(__dirname, 'about.html')
      }
    }
  },
  server: {
    host: true,
    port: 3000,
    open: false
  }
});
