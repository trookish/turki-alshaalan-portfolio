import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: false,
    // three.js lives in the lazy game chunk (~570 kB / ~144 kB gzip)
    chunkSizeWarningLimit: 700,
  },
})
