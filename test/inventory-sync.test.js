import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import 'fake-indexeddb/auto'
import { hasActiveStock, isZeroStock } from '../src/lib/stock.js'

Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true })
globalThis.window = new EventTarget()

const remote = { products: [], items: [] }
let failure = false
globalThis.__inventoryTestSupabase = {
  auth: { getSession: async () => ({ data: { session: {} }, error: null }) },
  from(table) {
    return {
      async upsert(row) {
        if (failure) return { error: new Error('schema missing') }
        const key = table === 'products' ? 'ean' : 'id'
        const rows = remote[table]
        const index = rows.findIndex((r) => r[key] === row[key])
        const stored = { ...row, created_at: row.created_at || '2026-01-01T00:00:00Z' }
        if (index < 0) rows.push(stored)
        else rows[index] = stored
        return { error: null }
      },
      select: async () => ({ data: remote[table], error: null }),
    }
  },
}

const source = (await readFile(new URL('../src/lib/db.js', import.meta.url), 'utf8'))
  .replace("'dexie'", JSON.stringify(import.meta.resolve('dexie')))
  .replace("'./waste'", JSON.stringify(new URL('../src/lib/waste.js', import.meta.url).href))
  .replace("'./stock.js'", JSON.stringify(new URL('../src/lib/stock.js', import.meta.url).href))
  .replace("'./opened.js'", JSON.stringify(new URL('../src/lib/opened.js', import.meta.url).href))
  .replace("'./supabase'", JSON.stringify('data:text/javascript,export const supabase = globalThis.__inventoryTestSupabase'))
const store = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('recepción y archivo sobreviven offline, sincronización y descarga sin borrar históricos', async () => {
  const { db, saveProduct, addItem, updateItem, setProductArchived, flush, pull } = store
  await saveProduct({ ean: '123', name: 'Leche', imageUrl: 'foto', category: 'Lácteos', source: 'manual' })
  const id = await addItem({ ean: '123', expiryDate: '2030-01-01', receivedDate: '2029-12-01' })
  await assert.rejects(setProductArchived('123', true), /lotes activos/)
  await updateItem(id, { notifiedAt: 123 })
  await updateItem(id, { receivedDate: '' })
  assert.equal((await db.items.get(id)).notifiedAt, 123, 'editar recepción no rearma avisos')
  let jobs = await db.outbox.toArray()
  assert.equal(jobs.at(-1).row.received_date, null)
  await updateItem(id, { receivedDate: '2029-12-02', wastedAt: 1234 })
  await setProductArchived('123', true)
  assert.equal((await db.items.get(id)).wastedAt, 1234)
  assert.equal((await db.products.get('123')).imageUrl, 'foto')
  assert.equal((await db.products.get('123')).category, 'Lácteos')

  navigator.onLine = true
  failure = true
  let syncStatus
  window.addEventListener(store.SYNC_STATUS_EVENT, (event) => { syncStatus = event.detail })
  const originalError = console.error
  console.error = () => {}
  try {
    assert.equal(await flush(), false)
    assert.equal(await pull(), false)
  } finally {
    console.error = originalError
  }
  assert.equal(syncStatus.ok, false)
  assert.match(syncStatus.message, /sincronizar/)
  assert.ok(await db.outbox.count())
  failure = false
  assert.equal(await flush(), true)
  assert.equal(await db.outbox.count(), 0)
  assert.equal(await pull(), true)
  assert.equal((await db.items.get(id)).receivedDate, '2029-12-02')
  assert.equal((await db.items.get(id)).wastedAt, 1234)
  assert.equal((await db.products.get('123')).archived, true)
  assert.equal((await db.products.get('123')).imageUrl, 'foto')
  assert.equal((await db.products.get('123')).category, 'Lácteos')

  navigator.onLine = false
  assert.equal(await pull(), false)
  const newId = await addItem({ ean: '123', expiryDate: '2031-01-01' })
  assert.equal((await db.products.get('123')).archived, false)
  assert.equal((await db.items.get(newId)).receivedDate, '')
  jobs = await db.outbox.toArray()
  assert.deepEqual(jobs.map((j) => j.table), ['products', 'items'])
  assert.equal(jobs[1].row.received_date, null)
  assert.equal((await db.items.get(id)).wastedAt, 1234)
  await updateItem(newId, { reusedAt: 2222 })
  await setProductArchived('123', true)
  await updateItem(id, { wastedAt: null, keepActive: true })
  assert.equal((await db.products.get('123')).archived, false)
  await updateItem(id, { wastedAt: 1234 })
  await saveProduct({ ean: '456', name: 'Yogur', imageUrl: 'foto2', category: 'Frío' })
  const zeroId = await addItem({ ean: '456', expiryDate: '2000-01-01', quantity: 0, receivedDate: '1999-12-01' })
  const stockId = await addItem({ ean: '456', expiryDate: '2031-01-01', quantity: 2 })
  assert.equal(isZeroStock(await db.items.get(zeroId)), true)
  assert.equal(hasActiveStock(await db.items.get(zeroId)), false)
  assert.equal(hasActiveStock({}), true)
  await assert.rejects(setProductArchived('456', true), /stock/)
  await updateItem(stockId, { quantity: 0 })
  await setProductArchived('456', true)
  await updateItem(zeroId, { notes: 'conservar' })
  assert.equal((await db.products.get('456')).archived, true)
  assert.equal(await store.autoWasteExpired(), 0)
  assert.equal((await db.items.get(zeroId)).wastedAt, null)
  assert.equal((await db.items.get(zeroId)).reusedAt, null)

  navigator.onLine = true
  await flush()
  await pull()
  assert.equal((await db.items.get(zeroId)).quantity, 0)
  assert.equal((await db.items.get(zeroId)).notes, 'conservar')
  assert.equal((await db.products.get('456')).archived, true)
  assert.equal((await db.products.get('456')).imageUrl, 'foto2')
  navigator.onLine = false
  await updateItem(stockId, { quantity: 1 })
  assert.equal((await db.products.get('456')).archived, false)
  assert.equal((await db.items.get(zeroId)).wastedAt, null)
  await assert.rejects(setProductArchived('456', true), /stock/)

  const ids = await store.addItems([
    { ean: '456', expiryDate: '2032-01-01', quantity: 2 },
    { ean: '456', expiryDate: '2032-02-01', quantity: 3 },
    { ean: '456', expiryDate: '2032-03-01', quantity: 1 },
  ])
  assert.equal(new Set(ids).size, 3)
  const lots = await db.items.bulkGet(ids)
  assert.deepEqual(lots.map((lot) => [lot.expiryDate, lot.quantity]), [
    ['2032-01-01', 2], ['2032-02-01', 3], ['2032-03-01', 1],
  ])
  const lotJobs = (await db.outbox.toArray()).filter((job) => ids.includes(job.row.id))
  assert.equal(lotJobs.length, 3)
  await assert.rejects(store.addItems([]), /No hay lotes/)
  const before = await db.items.count()
  await assert.rejects(store.addItems([
    { ean: '456', expiryDate: '2032-01-01' },
    { ean: '456', expiryDate: '2032-02-01', openedDate: '2032-01-01', openedDays: 0 },
  ]), /fecha de apertura/)
  assert.equal(await db.items.count(), before)
  const openedId = await addItem({ ean: '456', expiryDate: '2035-02-01', openedDate: '2035-01-01', openedDays: 3 })
  assert.equal((await db.items.get(openedId)).expiryDate, '2035-01-04')
  await store.markNotified(openedId)
  assert.equal((await db.items.get(openedId)).sealedExpiryDate, '2035-02-01')
  navigator.onLine = true
  await flush()
  await pull()
  assert.equal((await db.items.get(openedId)).openedDays, 3)
  assert.equal((await db.items.get(openedId)).sealedExpiryDate, '2035-02-01')
  navigator.onLine = false
  await updateItem(openedId, { expiryDate: '2035-02-01', openedDate: '', openedDays: '' })
  assert.equal((await db.items.get(openedId)).expiryDate, '2035-02-01')
  assert.equal((await db.items.get(openedId)).notifiedAt, null)
  const importedId = '00000000-0000-4000-8000-000000000003'
  const imported = { products: [{ ean: 'importado', name: 'Nuevo' }], items: [{ id: importedId, ean: 'importado', expiryDate: '2036-01-01', quantity: 2 }] }
  assert.deepEqual(await store.importInventory(imported), { addedProducts: 1, addedItems: 1 })
  assert.deepEqual(await store.importInventory(imported), { addedProducts: 0, addedItems: 0 })
  assert.equal((await db.items.get(importedId)).quantity, 2)
  const pendingBefore = await db.outbox.count()
  await assert.rejects(store.importInventory({
    products: [{ ean: 'transaccion', name: 'Transacción' }],
    items: [{ id: '00000000-0000-4000-8000-000000000004', ean: 'ausente', expiryDate: '2036-01-01', quantity: 1 }],
  }), /No se encontró el producto/)
  assert.equal(await db.products.get('transaccion'), undefined)
  assert.equal(await db.outbox.count(), pendingBefore)
  await db.delete()
})
