
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        // target: 'https://api-carro.vercel.app',

        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
