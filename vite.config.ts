import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // GitHub Pages project site; local/dev uses `/` so phones can open the LAN URL directly.
  const base = command === 'build' ? '/QuranMemorization/' : '/'

  return {
    base,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
        // Dev server also needs a manifest for install (Chrome rejects a manifest
        // whose start_url/scope fall outside base).
        devOptions: {
          enabled: true,
          type: 'module',
        },
        manifest: {
          id: base,
          name: 'ReciteHelper · Quran',
          short_name: 'ReciteHelper',
          description: 'Memorize the Quran with repetition, highlight, and offline audio',
          theme_color: '#0c1f18',
          background_color: '#0c1f18',
          display: 'standalone',
          orientation: 'any',
          start_url: base,
          scope: base,
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
          // Full Quran text (Arabic + English + Malay) + mushaf page lines bundle
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
      }),
    ],
  }
})
