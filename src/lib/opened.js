function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function withOpeningExpiry(item) {
  const sealed = item.sealedExpiryDate || item.expiryDate
  if (!validDate(sealed)) throw new Error('Ingresá una fecha de vencimiento válida.')
  if (!item.openedDate && (item.openedDays == null || item.openedDays === '')) {
    return { ...item, expiryDate: sealed, sealedExpiryDate: '', openedDate: '', openedDays: null }
  }
  const days = Number(item.openedDays)
  if (!validDate(item.openedDate) || !Number.isSafeInteger(days) || days < 1 || days > 3650) {
    throw new Error('Ingresá la fecha de apertura y entre 1 y 3650 días de conservación.')
  }
  const date = new Date(`${item.openedDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  const openedExpiry = date.toISOString().split('T')[0]
  if (!validDate(openedExpiry)) throw new Error('La fecha de conservación calculada está fuera del rango admitido.')
  return { ...item, expiryDate: openedExpiry < sealed ? openedExpiry : sealed, sealedExpiryDate: sealed, openedDays: days }
}
