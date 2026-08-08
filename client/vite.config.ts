import { defineConfig } from 'vite'
export default defineConfig({
  base: '/nylah_os/',
  build: { outDir: 'dist' },
  esbuild: { jsx: 'automatic' }
})
