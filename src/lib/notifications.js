import { db, markNotified } from './db'
import { daysUntil } from './dates'

export async function checkExpiringNow() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (!reg) return
  const items = await db.items.toArray()
  for (const it of items) {
    if (it.notifiedAt) continue
    const left = daysUntil(it.expiryDate)
    if (left <= (it.notifyDays ?? 15)) {
      const p = await db.products.get(it.ean)
      await reg.showNotification('Próximo a vencer', {
        body: `${p?.name || it.ean} ${left < 0 ? `venció hace ${-left} día(s)` : left === 0 ? 'vence hoy' : `vence en ${left} día(s)`}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `item-${it.id}`,
      })
      await markNotified(it.id)
    }
  }
}

// Genera un .ics con alarma antes del vencimiento
export function buildIcs(name, expiryISO, notifyDays = 15) {
  const d = expiryISO.replace(/-/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lector Vencimientos//ES',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@lector-vencimientos`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:Vence: ${name}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${name} vence en ${notifyDays} días`,
    `TRIGGER:-P${notifyDays}D`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
