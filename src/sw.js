import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Los archivos de OCR son pesados: se cachean al primer uso
registerRoute(
  ({ url }) => url.pathname.startsWith('/tesseract/'),
  new CacheFirst({ cacheName: 'ocr-assets' }),
)

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Web Push enviado por el servidor (Supabase Edge Function)
self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Próximo a vencer', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag,
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const visible = clients.find((client) => client.visibilityState === 'visible')
        visible?.postMessage({ type: 'EXPIRY_ALARM' })
      }),
    ]),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
