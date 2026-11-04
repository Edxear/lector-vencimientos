const KEY = 'lv-default-notify-days'

export const NOTIFY_OPTIONS = [3, 7, 15, 30]
export const LOCATIONS = ['Almacén', 'Frío', 'Congelados', 'Bazar', 'Verdulería', 'Carnicería', 'Devolución Proveedor']
export const CATEGORIES = ['Lácteos', 'Carnes', 'Frutas y verduras', 'Almacén', 'Bebidas', 'Congelados', 'Limpieza', 'Otros']

export function getDefaultNotifyDays() {
  const v = Number(localStorage.getItem(KEY))
  return NOTIFY_OPTIONS.includes(v) ? v : 15
}

export function setDefaultNotifyDays(days) {
  localStorage.setItem(KEY, String(days))
}
