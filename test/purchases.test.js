import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePurchaseImport, parseCsvPurchase, detectSupermarket, validatePurchaseLines } from '../src/lib/purchases.js'

const date = new Date('2026-11-03')

test('detecta supermercado por texto', () => {
  assert.equal(detectSupermarket('Mercadona factura 2026'), 'Mercadona')
  assert.equal(detectSupermarket('Pedido Rappi'), 'Rappi')
})

test('parsea ticket con varios productos y estima vencimiento', () => {
  const result = parsePurchaseImport('Mercadona\nLeche entera 1L x2\nYogur griego 4u\nPollo trozado 1kg\nManzana 3kg', { purchaseDate: date })
  assert.ok(result.some((r) => r.name.toLowerCase().includes('leche')))
  assert.ok(result.some((r) => r.name.toLowerCase().includes('pollo')))
  assert.ok(result.every((r) => r.expiryDate))
})

test('parsea csv de compras', () => {
  const csv = 'Producto,Cantidad\nLeche entera,2\nQueso,1\n'
  const result = parseCsvPurchase(csv, { purchaseDate: date })
  assert.equal(result[0].name, 'Leche entera')
  assert.equal(result[1].category, 'Lácteos')
})

test('usa los encabezados del CSV aunque las columnas cambien de orden', () => {
  const result = parseCsvPurchase('Cantidad;Producto\n2;Leche entera\n0;Yogur\n', { purchaseDate: date })
  assert.deepEqual(result.map((line) => [line.name, line.quantity]), [['Leche entera', 2], ['Yogur', 0]])
})

test('exige revisar cada vencimiento y cantidades compatibles con el inventario', () => {
  const line = { name: 'Leche', quantity: 2, expiryDate: '2027-03-15', expiryConfirmed: true }
  assert.doesNotThrow(() => validatePurchaseLines([line]))
  assert.throws(() => validatePurchaseLines([]), /No hay productos/)
  assert.throws(() => validatePurchaseLines([{ ...line, expiryConfirmed: false }]), /confirmá/)
  assert.throws(() => validatePurchaseLines([{ ...line, expiryDate: '2027-02-30' }]), /válida/)
  assert.throws(() => validatePurchaseLines([{ ...line, quantity: 1.5 }]), /entero/)
  assert.throws(() => validatePurchaseLines([{ ...line, quantity: 2147483648 }]), /entero/)
})

test('conserva la línea detectada para revisión antes de importar', () => {
  const [item] = parsePurchaseImport('Leche entera 1L x2', { purchaseDate: date })
  assert.equal(item.originalLine, 'Leche entera 1L x2')
})
