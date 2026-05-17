import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.VITE_SUPABASE_URL
  const supabaseRuntimePattern = supabaseUrl
    ? new RegExp(`^${escapeRegExp(supabaseUrl)}/.*`, 'i')
    : /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i

  return {
    plugins: [
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-*.png'],
      manifest: {
        name: 'PrecificaPro',
        short_name: 'PrecificaPro',
        description: 'Sistema profissional de gestão e precificação de obras para arquitetos e engenheiros.',
        theme_color: '#0d9488',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Cache de assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Estratégia network-first para APIs (Supabase)
        runtimeCaching: [
          {
            urlPattern: supabaseRuntimePattern,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutos
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
    server: {
      proxy: supabaseUrl ? {
        '/functions/v1': {
          target: supabaseUrl,
          changeOrigin: true,
          secure: false,
        }
      } : undefined,
    },
  }
})
