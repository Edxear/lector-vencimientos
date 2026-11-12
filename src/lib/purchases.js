import { withOpeningExpiry } from './opened.js'

export const PURCHASE_SUPERMARKETS = ['auto', 'Mercadona', 'Carrefour', 'Dia', 'Rappi', 'PedidosYa', 'Supermercado']

const CATEGORY_RULES = [
  { pattern: /(leche|yogur|queso|manteca|nata|crema|dulce|milk|batido|postre)/i, category: 'Lácteos', location: 'Frío', days: 10 },
  { pattern: /(pollo|carne|vacuno|cerdo|pescado|salmon|atun|jamon|hamburguesa|embutido|merluza)/i, category: 'Carnes', location: 'Frío', days: 7 },
  { pattern: /(manzana|pera|uva|banana|tomate|fruta|verdura|ensalada|zanahoria|lechuga|pepino|limon|naranja)/i, category: 'Frutas y verduras', location: 'Verdulería', days: 6 },
  { pattern: /(pan|harina|arroz|fideos|pasta|cereal|galleta|cookie|bizcochuelo|bolleria|tostadas)/i, category: 'Almacén', location: 'Almacén', days: 30 },
  { pattern: /(agua|gaseosa|jugo|vino|cerveza|refresco|bebida|soda|té|cafe|café)/i, category: 'Bebidas', location: 'Almacén', days: 180 },
  { pattern: /(helado|congelado|pizza|verdura congel|patata congel|pescado congel|croquetas|hamburguesa congel)/i, category: 'Congelados', location: 'Congelados', days: 90 },
  { pattern: /(lavandina|detergente|jabón|papel|esponja|desinfectante|limpieza|shampoo|lavavajillas)/i, category: 'Limpieza', location: 'Bazar', days: 365 },
]

function normalizeText(value = '') {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function addDays(baseDate, days) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + Number(days || 0))
  return date
}

function toIso(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function guessCategory(name) {
  const normalized = normalizeText(name)
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))
  return match ? match.category : 'Otros'
}

function guessLocation(name) {
  const normalized = normalizeText(name)
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))
  return match ? match.location : 'Almacén'
}

function inferExpiryDays(name) {
  const normalized = normalizeText(name)
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))
  return match ? match.days : 30
}

export function detectSupermarket(text = '') {
  const value = normalizeText(text).toLowerCase()
  if (!value) return 'auto'
  if (/(mercadona)/i.test(value)) return 'Mercadona'
  if (/(carrefour|carref)/i.test(value)) return 'Carrefour'
  if (/(d[íi]a|dia)/i.test(value)) return 'Dia'
  if (/rappi/i.test(value)) return 'Rappi'
  if (/(pedidosya|pedidos ya)/i.test(value)) return 'PedidosYa'
  return 'auto'
}

function stripPriceAndMeta(value) {
  return normalizeText(
    value
      .replace(/\b\d{1,2}[:.]\d{2}\b/g, '')
      .replace(/\$\s*\d+[.,]\d{2}/g, '')
      .replace(/\b\d+[.,]\d{2}\b(?=\s*(?:€|ars|ars\$|pesos|\$)?$)/g, '')
      .replace(/\b(?:x|u|ud|unid|unidades|unit|kg|gr|g|lt|l|ml|cc|mL)\s*\d+(?:[.,]\d+)?\b/gi, '')
      .replace(/\b\d+\s*(?:kg|gr|g|lt|l|ml|cc|u|ud|unid|unidades)\b/gi, '')
      .replace(/\b\d+\s*\/\s*\d+\b/g, '')
      .replace(/\b(?:subtotal|total|efectivo|tarjeta|vuelto|fecha|hora|pedido|orden|delivery|entrega)\b/gi, ''),
  )
}

function extractProductName(rawLine, supermarket) {
  const line = normalizeText(rawLine)
  if (!line) return ''

  const cleaned = stripPriceAndMeta(line)
  const withoutHeader = cleaned
    .replace(new RegExp(`^${supermarket || 'auto'}\\b`, 'i'), '')
    .replace(/^(?:ticket|pedido|compra|orden|factura|recibo)\b/gi, '')
    .trim()

  if (!withoutHeader) return ''
  const reduced = withoutHeader
    .replace(/\b(?:\d+)\s*(?:x|u|ud|unid|unidad|unidades|kg|gr|g|lt|l|ml)\b/gi, '')
    .replace(/\b\d+[.,]\d{2}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!reduced) return ''
  return reduced.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, '').replace(/[-–—]+$/, '').trim()
}

function extractQuantity(rawLine) {
  const line = normalizeText(rawLine)
  const matches = [
    line.match(/(?:x|X)\s*(\d+(?:[.,]\d+)?)/),
    line.match(/(\d+(?:[.,]\d+)?)\s*(?:u|ud|unid|unidades|unidad)/i),
    line.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|gr|g|lt|l|ml)/i),
  ]
  const qty = matches.find(Boolean)?.[1]
  return qty ? Number(qty.replace(',', '.')) : 1
}

function extractUnit(rawLine) {
  const line = normalizeText(rawLine)
  const match = line.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|l|ml|u|ud|unid|unidad|unidades)\b/i)
  return match ? match[2].toLowerCase() : ''
}

export function parsePurchaseText(text = '', options = {}) {
  const supermarket = options.supermarket || detectSupermarket(text) || 'auto'
  const purchaseDate = options.purchaseDate ? new Date(options.purchaseDate) : new Date()
  const lines = normalizeText(text)
    .split(/\r?\n|\|/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2)

  const candidates = []
  for (const rawLine of lines) {
    const lower = rawLine.toLowerCase()
    if (/(subtotal|total|efectivo|tarjeta|vuelto|caja|pedido|fecha|hora|recibo|ticket|orden|delivery|entrega)/i.test(lower)) continue
    const name = extractProductName(rawLine, supermarket)
    if (!name || name.length < 3) continue

    const quantity = extractQuantity(rawLine)
    const category = guessCategory(name)
    const location = guessLocation(name)
    const days = inferExpiryDays(name)
    const expiryDate = toIso(addDays(purchaseDate, days))

    candidates.push({
      originalLine: rawLine,
      name,
      quantity,
      unit: extractUnit(rawLine),
      brand: '',
      category,
      location,
      expiryDate,
      notifyDays: 15,
      supermarket,
      purchaseDate: toIso(purchaseDate),
      source: 'ticket',
    })
  }

  return candidates
}

export function parseCsvPurchase(text = '', options = {}) {
  const purchaseDate = options.purchaseDate ? new Date(options.purchaseDate) : new Date()
  const rows = normalizeText(text)
    .split(/\r?\n/)
    .filter((line) => line.length > 0)

  if (!rows.length) return []
  const separator = rows[0].includes(';') ? ';' : ','
  const headers = rows[0].split(separator)
  const productIndex = headers.findIndex((cell) => /producto|nombre|art[ií]culo|item/i.test(cell))
  const qtyIndex = headers.findIndex((cell) => /cantidad|qty|quantity|unidades/i.test(cell))
  const productNameField = productIndex >= 0 ? productIndex : 0
  const qtyField = qtyIndex >= 0 ? qtyIndex : 1
  const candidates = []
  for (const row of rows.slice(1)) {
    const cells = row.split(separator)

    const name = String(cells[productNameField] || '')
      .replace(/^(producto|nombre|articulo|item)\s*[:\-]?/i, '')
      .trim()
    const qtyRaw = String(cells[qtyField] || '1').replace(/[^0-9.,]/g, '').replace(',', '.')
    const qty = Number(qtyRaw)
    if (!name || name.length < 3) continue

    const category = guessCategory(name)
    const location = guessLocation(name)
    const days = inferExpiryDays(name)
    candidates.push({
      originalLine: row,
      name,
      quantity: qty,
      category,
      location,
      expiryDate: toIso(addDays(purchaseDate, days)),
      notifyDays: 15,
      supermarket: options.supermarket || detectSupermarket(text) || 'auto',
      purchaseDate: toIso(purchaseDate),
      source: 'csv',
    })
  }

  return candidates
}

export function parseOrderText(text = '', options = {}) {
  const supermarket = options.supermarket || detectSupermarket(text) || 'auto'
  return parsePurchaseText(text, { supermarket, purchaseDate: options.purchaseDate })
}

export function parsePurchaseImport(text = '', options = {}) {
  const input = normalizeText(text)
  if (!input) return []
  const maybeCsv = input.includes(',') || input.includes(';')
  if (maybeCsv && /producto|cantidad|nombre|articulo|item/i.test(input)) {
    const csv = parseCsvPurchase(input, options)
    if (csv.length) return csv
  }
  return parsePurchaseText(input, options)
}

export function validatePurchaseLines(lines) {
  if (!lines.length) throw new Error('No hay productos para importar.')
  for (const [index, item] of lines.entries()) {
    const prefix = `Producto ${index + 1}:`
    if (!item.name.trim()) throw new Error(`${prefix} completá el nombre.`)
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      throw new Error(`${prefix} la cantidad debe ser un número entero entre 1 y 2147483647.`)
    }
    if (!item.expiryConfirmed) throw new Error(`${prefix} revisá y confirmá la fecha de vencimiento.`)
    try {
      withOpeningExpiry({ expiryDate: item.expiryDate })
    } catch {
      throw new Error(`${prefix} ingresá una fecha de vencimiento válida.`)
    }
  }
}
