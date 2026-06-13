import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // In production the FastAPI server serves from /
  base: '/',

  build: {
    // Output directly into backend-adjacent dist folder
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    // Proxy API calls to FastAPI during `npm run dev`
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
