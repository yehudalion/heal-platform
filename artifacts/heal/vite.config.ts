import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
