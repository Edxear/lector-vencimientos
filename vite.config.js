import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const migrations = readdirSync(new URL('./supabase/', import.meta.url))
  .map((file) => file.match(/^migration_v(\d+)\.sql$/))
  .filter(Boolean)
  .sort((a, b) => Number(b[1]) - Number(a[1]))
const latestMigrationMatch = migrations[0]
const latestMigrationLabel = latestMigrationMatch
  ? `v${latestMigrationMatch[1]} (${latestMigrationMatch[0]})`
  : 'Sin migraciones'

function getCommit() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA
  if (commit) return commit.slice(0, 12)

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'local'
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_COMMIT__: JSON.stringify(getCommit()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __LATEST_MIGRATION__: JSON.stringify(latestMigrationLabel),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-supabase', test: /node_modules[\\/]@supabase/ },
            { name: 'vendor-dexie', test: /node_modules[\\/]dexie/ },
          ],
        },
      },
    },
  },
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
