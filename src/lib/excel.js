import { withOpeningExpiry } from './opened.js'

export const EXCEL_COLUMNS = ['codigo', 'nombre', 'marca', 'contenido', 'categoria', 'id_lote', 'vencimiento', 'cantidad', 'area', 'aviso_dias', 'costo', 'notas', 'apertura', 'dias_abierto', 'cuenta_origen']

export function inventoryRows(products, items, userId) {
  const rows = [EXCEL_COLUMNS]
  for (const product of products) {
    const lots = items.filter((item) => item.ean === product.ean && !item.wastedAt && !item.reusedAt)
    for (const item of lots.length ? lots : [null]) {
      rows.push([
        product.ean, product.name, product.brand || '', product.content || '', product.category || '',
        item?.id || '', item?.sealedExpiryDate || item?.expiryDate || '', item?.quantity ?? '',
        item?.location || '', item?.notifyDays ?? '', item?.unitCost ?? '', item?.notes || '',
        item?.openedDate || '', item?.openedDays ?? '', item ? userId : '',
      ])
    }
  }
  return rows
}

export function parseInventoryRows(rows, userId) {
  if (!rows.length || EXCEL_COLUMNS.some((name, index) => rows[0][index] !== name)) {
    throw new Error('Las columnas no coinciden con la plantilla de inventario. Exportá un Excel para usarlo como plantilla.')
  }
  if (rows.length > 10001) throw new Error('El archivo supera el límite de 10.000 filas.')
  const products = new Map()
  const items = []
  const ids = new Set()
  for (const [index, row] of rows.slice(1).entries()) {
    if (row.every((value) => value == null || value === '')) continue
    const text = (column) => {
      const value = row[column]
      if (value == null) return ''
      if (typeof value !== 'string' || value.length > 5000) throw new Error(`Fila ${index + 2}: ${EXCEL_COLUMNS[column]} debe ser texto.`)
      return value.trim()
    }
    const number = (column, fallback) => {
      const value = row[column]
      if (value == null || value === '') return fallback
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) throw new Error(`Fila ${index + 2}: ${EXCEL_COLUMNS[column]} debe ser numérico.`)
      return parsed
    }
    const ean = text(0)
    const name = text(1)
    if (!ean || !name) throw new Error(`Fila ${index + 2}: código y nombre son obligatorios.`)
    const product = { ean, name, brand: text(2), content: text(3), category: text(4), source: 'manual' }
    const previous = products.get(ean)
    if (previous && JSON.stringify(previous) !== JSON.stringify(product)) throw new Error(`Fila ${index + 2}: datos contradictorios para el mismo código.`)
    products.set(ean, product)
    const expiryDate = text(6)
    if (!expiryDate) {
      if (row.slice(5).some((value) => value != null && value !== '')) throw new Error(`Fila ${index + 2}: falta el vencimiento del lote.`)
      continue
    }
    const originalId = text(5)
    if (originalId && (!userId || text(14) !== userId)) {
      throw new Error(`Fila ${index + 2}: el lote pertenece a otra cuenta o no indica su origen. Borrá id_lote para importarlo como nuevo.`)
    }
    const id = (originalId || crypto.randomUUID()).toLowerCase()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || ids.has(id)) throw new Error(`Fila ${index + 2}: identificador de lote inválido o duplicado.`)
    ids.add(id)
    const quantity = number(7, 1)
    const notifyDays = number(9, 15)
    const unitCost = number(10, null)
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647 || !Number.isInteger(notifyDays) || notifyDays < 0 || notifyDays > 3650 || (unitCost != null && (unitCost < 0 || unitCost > 9999999999.99))) {
      throw new Error(`Fila ${index + 2}: cantidad, aviso o costo inválidos.`)
    }
    try {
      items.push(withOpeningExpiry({ id, ean, expiryDate, quantity, location: text(8), notifyDays, unitCost, notes: text(11), openedDate: text(12), openedDays: number(13, null) }))
    } catch (error) {
      throw new Error(`Fila ${index + 2}: ${error.message}`)
    }
  }
  return { products: [...products.values()], items }
}
