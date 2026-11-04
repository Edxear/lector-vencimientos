const KEY = 'lv-default-notify-days'
const USE_KEY = 'lv-app-use-case'
const ORDER_KEY = 'lv-date-order'

export const NOTIFY_OPTIONS = [3, 7, 15, 30]
export const LOCATIONS = ['Almacén', 'Frío', 'Congelados', 'Bazar', 'Verdulería', 'Carnicería', 'Devolución Proveedor']
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

export function getDefaultNotifyDays() {
  const v = Number(localStorage.getItem(KEY))
  return NOTIFY_OPTIONS.includes(v) ? v : 15
}

export function setDefaultNotifyDays(days) {
  localStorage.setItem(KEY, String(days))
}

export function getAppUseCase() {
  const v = localStorage.getItem(USE_KEY)
  return APP_CONTEXTS[v] ? v : 'hogar'
}

export function setAppUseCase(value) {
  if (!APP_CONTEXTS[value]) return
  localStorage.setItem(USE_KEY, value)
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
