import { db, markNotified } from './db'
import { daysUntil } from './dates'
import { APP_CONTEXTS, getAppUseCase } from './settings'

async function getLocationContext() {
  if (!('geolocation' in navigator)) return { allowed: false }
  const useCase = getAppUseCase()
  const ctx = APP_CONTEXTS[useCase]
  try {
    const permission = await navigator.permissions?.query?.({ name: 'geolocation' }).catch(() => null)
    if (permission && permission.state === 'denied') return { allowed: false, useCase: ctx.label }
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 })
    })
    return {
      allowed: true,
      useCase: ctx.label,
      geofenceLabel: ctx.geofenceLabel,
      radius: ctx.radius,
      coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
    }
  } catch {
    return { allowed: false, useCase: ctx.label }
  }
}

function buildBody(name, left, itemLocation, proximity) {
  const locationText = itemLocation ? ` en ${itemLocation}` : ''
  const phrase = left < 0 ? `venció hace ${-left} día(s)` : left === 0 ? 'vence hoy' : `vence en ${left} día(s)`
  if (proximity?.allowed && proximity.useCase) {
    return `Ubicación activa para ${proximity.useCase.toLowerCase()}. ${name}${locationText} ${phrase}.`
  }
  return `${name}${locationText} ${phrase}.`
}

export async function checkExpiringNow() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker?.ready
  if (!reg) return
  const items = await db.items.toArray()
  const locationContext = await getLocationContext()
  for (const it of items) {
    if (it.notifiedAt) continue
    const left = daysUntil(it.expiryDate)
    if (left <= (it.notifyDays ?? 15)) {
      const p = await db.products.get(it.ean)
      const body = buildBody(p?.name || it.ean, left, it.location, locationContext)
      await reg.showNotification(locationContext.allowed ? `Aviso contextual · ${locationContext.useCase}` : 'Próximo a vencer', {
        body,
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
