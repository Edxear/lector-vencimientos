import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('avisos locales ignoran lotes sin stock pero no lotes con stock', async () => {
  const notified = []
  const shown = []
  const items = [
    { id: 'zero', ean: '1', quantity: 0, expiryDate: '2000-01-01' },
    { id: 'full', ean: '2', quantity: 1, expiryDate: '2000-01-01' },
  ]
  globalThis.__testNotifications = {
    db: { items: { toArray: async () => items }, products: { get: async () => ({ name: 'Producto' }) } },
    markNotified: async (id) => notified.push(id),
  }
  globalThis.window = { Notification: {} }
  globalThis.Notification = { permission: 'granted' }
  globalThis.document = { visibilityState: 'visible' }
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { serviceWorker: { ready: Promise.resolve({ showNotification: async (...args) => shown.push(args) }) } },
  })
  const source = (await readFile(new URL('../src/lib/notifications.js', import.meta.url), 'utf8'))
    .replace("'./db'", JSON.stringify('data:text/javascript,export const { db, markNotified } = globalThis.__testNotifications'))
    .replace("'./dates'", JSON.stringify(new URL('../src/lib/dates.js', import.meta.url).href))
    .replace("'./settings'", JSON.stringify('data:text/javascript,export const APP_CONTEXTS = {}; export const getAppUseCase = () => ""; export const getGeofenceForUseCase = () => ({})'))
    .replace("'./stock.js'", JSON.stringify(new URL('../src/lib/stock.js', import.meta.url).href))
    .replace("'./alarm.js'", JSON.stringify('data:text/javascript,export const playAlarm = async () => {}'))
  const { checkExpiringNow } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
  await checkExpiringNow()
  assert.deepEqual(notified, ['full'])
  assert.equal(shown.length, 1)
  assert.equal(shown[0][1].tag, 'item-full')
})

test('la migración excluye stock cero del cron de avisos push', async () => {
  const sql = await readFile(new URL('../supabase/migration_v5.sql', import.meta.url), 'utf8')
  assert.match(sql, /create or replace function public\.cron_due/i)
  assert.match(sql, /i\.quantity\s*<>\s*0/i)
})
