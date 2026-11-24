// Valores ausentes o inválidos no se consideran stock cero.
export const isZeroStock = (item) => item.quantity === 0 || item.quantity === '0'
export const hasActiveStock = (item) => !item.wastedAt && !item.reusedAt && !isZeroStock(item)
export function sanitizeSelectedIds(selectedIds, activeItems) {
  const validIds = new Set(activeItems.map((item) => item.id))
  return [...selectedIds].filter((id) => validIds.has(id))
}

export function buildBulkMovePatch(location) {
  return { location: String(location || '').trim() }
}
