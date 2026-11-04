import { db, markNotified } from './db'
import { daysUntil } from './dates'
import { APP_CONTEXTS, getAppUseCase, getGeofenceForUseCase } from './settings'

function haversineKm(a, b) {
  const earthR = 6371
  const toRad = (v) => (v * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthR * Math.asin(Math.sqrt(h))
}

async function getLocationContext() {
  if (!('geolocation' in navigator)) return { allowed: false }
  const useCase = getAppUseCase()
  const ctx = APP_CONTEXTS[useCase]
  const geofence = getGeofenceForUseCase(useCase)
  try {
    const permission = await navigator.permissions?.query?.({ name: 'geolocation' }).catch(() => null)
    if (permission && permission.state === 'denied') return { allowed: false, useCase: ctx.label }
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 })
    })
    const current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
    const geofenceActive = geofence.saved && geofence.latitude && geofence.longitude
      ? haversineKm(current, geofence) <= (Number(geofence.radius) || ctx.radius) / 1000
      : false
    return {
      allowed: true,
      useCase: ctx.label,
      geofenceLabel: geofence.label || ctx.geofenceLabel,
      radius: Number(geofence.radius) || ctx.radius,
      geofenceActive,
      coords: current,
    }
  } catch {
    return { allowed: false, useCase: ctx.label }
  }
}

function buildBody(name, left, itemLocation, proximity) {
  const locationText = itemLocation ? ` en ${itemLocation}` : ''
  const phrase = left < 0 ? `venció hace ${-left} día(s)` : left === 0 ? 'vence hoy' : `vence en ${left} día(s)`
  if (proximity?.allowed && proximity.useCase) {
    const context = proximity.geofenceActive ? `Ubicación activa ${proximity.geofenceLabel}.` : `Ubicación detectada para ${proximity.useCase.toLowerCase()}.`
    return `${context} ${name}${locationText} ${phrase}.`
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
