// Valores ausentes o inválidos no se consideran stock cero.
export const isZeroStock = (item) => item.quantity === 0 || item.quantity === '0'
export const hasActiveStock = (item) => !item.wastedAt && !item.reusedAt && !isZeroStock(item)
