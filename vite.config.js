import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  build: { assetsInlineLimit: 0 },
  test: { include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}'] },
})
