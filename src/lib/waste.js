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

    const date = new Date(item.wastedAt)
    if (Number.isNaN(date.getTime())) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const month = months.find((entry) => entry.key === key)
    if (!month) continue
    if (hasCost) month.total += safeAmount
    else month.unpriced += 1
  }

  return { months, totalLoss, pricedLots, unpricedLots }
}

export function formatWasteCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(amount)
}
