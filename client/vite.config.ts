import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GH Pages serves at https://ciaranf3308-star.github.io/nylah_os/
// Base must be /nylah_os/ so built assets point correctly, then we rewrite to relative ./assets/ for resilience.
export default defineConfig({
  base: '/nylah_os/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
})
