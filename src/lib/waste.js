export const REUSE_LABELS = ['Cocinado', 'Congelado', 'Donado', 'Compartido', 'Devuelto a proveedor', 'Consumido a tiempo']

// Momento en que el lote pasó a estar vencido: el inicio del día siguiente a su fecha de vencimiento
export function expiredAt(expiryDate) {
  const [y, m, d] = String(expiryDate || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d + 1).getTime()
}

// Un lote vencido se registra solo como pérdida, salvo que ya tenga destino o el usuario lo haya conservado
export function shouldAutoWaste(item, now = Date.now()) {
  if (item.wastedAt || item.reusedAt || item.keepActive) return false
  const at = expiredAt(item.expiryDate)
  return at != null && at <= now
}

export function getWasteAnalytics(items, now = new Date()) {
  const months = []
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date).replace('.', ''),
      total: 0,
      unpriced: 0,
    })
  }

  let totalLoss = 0
  let pricedLots = 0
  let unpricedLots = 0
  const byArea = {}
  for (const item of items) {
    if (!item.wastedAt) continue
    const quantity = Number(item.quantity)
    const unitCost = Number(item.unitCost)
    const hasCost = item.unitCost != null && Number.isFinite(unitCost) && unitCost >= 0
      && Number.isFinite(quantity) && quantity >= 0
    const amount = hasCost ? unitCost * quantity : 0
    const safeAmount = Number.isFinite(amount) ? amount : 0
    if (hasCost) {
      totalLoss += safeAmount
      pricedLots += 1
    } else {
      unpricedLots += 1
    }
    const area = item.location || 'Sin área'
    byArea[area] ||= { area, total: 0, lots: 0 }
    byArea[area].total += safeAmount
    byArea[area].lots += 1

    const date = new Date(item.wastedAt)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const month = months.find((entry) => entry.key === key)
    if (!month) continue
    if (hasCost) month.total += safeAmount
    else month.unpriced += 1
  }

  return { months, totalLoss, pricedLots, unpricedLots, byArea: Object.values(byArea).sort((a, b) => b.total - a.total || b.lots - a.lots) }
}

export function getMonthlyReuseSavings(items, now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  let total = 0
  let pricedLots = 0
  let totalLots = 0

  for (const item of items) {
    if (!item.reusedAt || item.wastedAt || item.reuseLabel !== 'Consumido a tiempo') continue
    const reusedAt = new Date(item.reusedAt)
    if (reusedAt.getFullYear() !== year || reusedAt.getMonth() !== month) continue
    totalLots += 1

    const quantity = Number(item.quantity)
    const unitCost = Number(item.unitCost)
    if (item.unitCost == null || !Number.isFinite(unitCost) || unitCost < 0
      || !Number.isFinite(quantity) || quantity < 0) continue

    const amount = unitCost * quantity
    if (!Number.isFinite(amount)) continue
    total += amount
    pricedLots += 1
  }

  return { total, pricedLots, totalLots }
}

export function formatWasteCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(amount)
}
