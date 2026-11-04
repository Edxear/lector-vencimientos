import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: { globIgnores: ['tesseract/**'] },
      manifest: {
        name: 'Lector Vencimientos',
        short_name: 'Vencimientos',
        description: 'Escanea productos, lee fechas de vencimiento y recibe avisos antes de que caduquen',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f2a43',
        theme_color: '#0f2a43',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
})
