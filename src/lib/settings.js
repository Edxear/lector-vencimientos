import { supabase } from './supabase'

const KEY = 'lv-default-notify-days'
const USE_KEY = 'lv-app-use-case'
const ORDER_KEY = 'lv-date-order'
const GEOFENCE_KEY = 'lv-geofence'

export const NOTIFY_OPTIONS = [3, 7, 15, 30]
export const LOCATIONS = ['Cocina', 'Heladera', 'Congelados', 'Despensa', 'Almacén', 'Frío', 'Bazar', 'Verdulería', 'Carnicería', 'Devolución Proveedor']
export const CATEGORIES = ['Lácteos', 'Carnes', 'Frutas y verduras', 'Almacén', 'Bebidas', 'Congelados', 'Limpieza', 'Otros']
export const APP_CONTEXTS = {
  hogar: {
    label: 'Hogar',
    zones: ['Cocina', 'Heladera', 'Congelados', 'Despensa', 'Bazar'],
    geofenceLabel: 'la cocina',
    radius: 150,
  },
  comercio: {
    label: 'Comercio',
    zones: ['Almacén', 'Frío', 'Verdulería', 'Carnicería', 'Bazar', 'Devolución Proveedor'],
    geofenceLabel: 'el local',
    radius: 400,
  },
}

function readGeofenceMap() {
  try {
    const raw = localStorage.getItem(GEOFENCE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeGeofenceMap(map) {
  localStorage.setItem(GEOFENCE_KEY, JSON.stringify(map))
}

export function getDefaultNotifyDays() {
  const v = Number(localStorage.getItem(KEY))
  return NOTIFY_OPTIONS.includes(v) ? v : 15
}

export function setDefaultNotifyDays(days) {
  localStorage.setItem(KEY, String(days))
}

export function clearLocalSettings() {
  for (const key of [KEY, USE_KEY, ORDER_KEY, GEOFENCE_KEY]) localStorage.removeItem(key)
}

export function getAppUseCase() {
  const v = localStorage.getItem(USE_KEY)
  return APP_CONTEXTS[v] ? v : 'hogar'
}

export function setAppUseCase(value) {
  if (!APP_CONTEXTS[value]) return
  localStorage.setItem(USE_KEY, value)
}

export function getGeofenceForUseCase(useCase = getAppUseCase()) {
  const safe = APP_CONTEXTS[useCase] ? useCase : 'hogar'
  const parsed = readGeofenceMap()
  const fallback = {
    latitude: 0,
    longitude: 0,
    radius: APP_CONTEXTS[safe].radius,
    label: APP_CONTEXTS[safe].geofenceLabel,
    saved: false,
  }
  if (!parsed || !parsed[safe]) return fallback
  return { ...fallback, ...parsed[safe], saved: true }
}

export function setGeofenceForUseCase(useCase, geofence) {
  const safe = APP_CONTEXTS[useCase] ? useCase : 'hogar'
  const map = readGeofenceMap()
  map[safe] = {
    latitude: Number(geofence.latitude),
    longitude: Number(geofence.longitude),
    radius: Number(geofence.radius) || APP_CONTEXTS[safe].radius,
    label: geofence.label || APP_CONTEXTS[safe].geofenceLabel,
    saved: true,
  }
  writeGeofenceMap(map)
}

export function clearGeofenceForUseCase(useCase = getAppUseCase()) {
  const map = readGeofenceMap()
  delete map[useCase]
  writeGeofenceMap(map)
}

export const DATE_ORDER_OPTIONS = [
  { value: 'DMY', label: 'Día/Mes/Año (31/12/26)' },
  { value: 'MDY', label: 'Mes/Día/Año (12/31/26)' },
  { value: 'YMD', label: 'Año/Mes/Día (26/12/31)' },
]

export function getDateOrder() {
  const v = localStorage.getItem(ORDER_KEY)
  return DATE_ORDER_OPTIONS.some((o) => o.value === v) ? v : 'DMY'
}

export function setDateOrder(order) {
  localStorage.setItem(ORDER_KEY, order)
}

export async function syncUserSettingsToSupabase() {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return

  const payload = {
    user_id: sessionData.session.user.id,
    app_use_case: getAppUseCase(),
    date_order: getDateOrder(),
    default_notify_days: getDefaultNotifyDays(),
    geofence_latitude: getGeofenceForUseCase().latitude || null,
    geofence_longitude: getGeofenceForUseCase().longitude || null,
    geofence_radius: getGeofenceForUseCase().radius || APP_CONTEXTS[getAppUseCase()].radius,
  }

  const { error } = await supabase.from('user_settings').upsert(payload, { onConflict: 'user_id' })
  if (error) console.warn('No se pudieron sincronizar las preferencias de usuario:', error.message)
}

export async function hydrateUserSettingsFromSupabase() {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) return

  const { data, error } = await supabase.from('user_settings').select('*').maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.warn('No se pudieron cargar las preferencias desde Supabase:', error.message)
    return
  }
  if (!data) return

  if (APP_CONTEXTS[data.app_use_case]) {
    setAppUseCase(data.app_use_case)
  }
  if (NOTIFY_OPTIONS.includes(Number(data.default_notify_days))) {
    setDefaultNotifyDays(Number(data.default_notify_days))
  }
  if (DATE_ORDER_OPTIONS.some((o) => o.value === data.date_order)) {
    setDateOrder(data.date_order)
  }
  if (Number.isFinite(Number(data.geofence_latitude)) && Number.isFinite(Number(data.geofence_longitude))) {
    setGeofenceForUseCase(data.app_use_case || getAppUseCase(), {
      latitude: Number(data.geofence_latitude),
      longitude: Number(data.geofence_longitude),
      radius: Number(data.geofence_radius) || APP_CONTEXTS[data.app_use_case || getAppUseCase()].radius,
      label: APP_CONTEXTS[data.app_use_case || getAppUseCase()].geofenceLabel,
    })
  }
}
