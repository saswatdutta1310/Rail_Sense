import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  base: '/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Dev server — proxy /api to local FastAPI backend
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  // Expose VITE_API_BASE_URL to the client bundle when set
  // Set this in Vercel → Project Settings → Environment Variables:
  //   VITE_API_BASE_URL = https://rail-sense-api.onrender.com/api
  envPrefix: 'VITE_',
})
