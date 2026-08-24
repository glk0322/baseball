import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const projectRoot = decodeURIComponent(new URL('.', import.meta.url).pathname)

export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  test: {
    root: projectRoot,
    environment: 'jsdom',
    setupFiles: decodeURIComponent(new URL('./src/test/setup.ts', import.meta.url).pathname),
    css: true,
  },
})
