import test from 'node:test'
import assert from 'node:assert/strict'
import writeExcelFile from 'write-excel-file/node'
import { readSheet } from 'read-excel-file/node'
import { inventoryRows, parseInventoryRows } from '../src/lib/excel.js'

test('exporta e importa un XLSX real con varios lotes y apertura', async () => {
  const products = [{ ean: '0012345678905', name: 'Salsa', brand: 'Marca', content: '', category: 'Almacén' }]
  const items = [
    { id: '00000000-0000-4000-8000-000000000001', ean: products[0].ean, expiryDate: '2030-01-04', sealedExpiryDate: '2030-02-01', openedDate: '2030-01-01', openedDays: 3, quantity: 2, notifyDays: 7 },
    { id: '00000000-0000-4000-8000-000000000002', ean: products[0].ean, expiryDate: '2030-03-01', quantity: 1, notifyDays: 15 },
  ]
  const rows = inventoryRows(products, items, 'cuenta')
  const buffer = await writeExcelFile(rows.map((row) => row.map((value) => ({ value, type: typeof value === 'number' ? Number : String })))).toBuffer()
  const result = parseInventoryRows(await readSheet(buffer), 'cuenta')
  assert.equal(result.products[0].ean, '0012345678905')
  assert.deepEqual(result.items.map((item) => item.expiryDate), ['2030-01-04', '2030-03-01'])
  assert.equal(result.items[0].sealedExpiryDate, '2030-02-01')
  assert.equal(result.items[0].quantity, 2)
})

test('rechaza archivos con encabezados o datos inválidos antes de importar', () => {
  assert.throws(() => parseInventoryRows([['otra columna']]), /columnas/)
  const rows = inventoryRows([{ ean: '123', name: 'Leche' }], [{ id: '00000000-0000-4000-8000-000000000001', ean: '123', expiryDate: '2030-01-01', quantity: -1 }], 'cuenta')
  assert.throws(() => parseInventoryRows(rows, 'cuenta'), /cantidad/)
  assert.throws(() => parseInventoryRows(rows, 'otra'), /otra cuenta/)
})
