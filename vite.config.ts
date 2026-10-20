import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site: https://jiraiya78.github.io/QuranMemorization/
  base: '/QuranMemorization/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'ReciteHelper · Quran',
        short_name: 'ReciteHelper',
        description: 'Memorize the Quran with repetition, highlight, and offline audio',
        theme_color: '#0c1f18',
        background_color: '#0c1f18',
        display: 'standalone',
        orientation: 'any',
        start_url: '/QuranMemorization/',
        scope: '/QuranMemorization/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Full Quran text + mushaf page lines bundle
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
