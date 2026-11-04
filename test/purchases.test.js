import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePurchaseImport, parseCsvPurchase, detectSupermarket } from '../src/lib/purchases.js'

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
