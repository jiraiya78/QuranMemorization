import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site: https://jiraiya78.github.io/QuranMemorization/
  base: '/QuranMemorization/',
  plugins: [react()],
})
