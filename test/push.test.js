import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

let saveError = null
let deleteError = null
let unsubscribed = false
const subscription = {
  endpoint: 'endpoint',
  toJSON: () => ({ endpoint: 'endpoint', keys: { p256dh: 'public', auth: 'auth' } }),
  unsubscribe: async () => { unsubscribed = true; return true },
}
globalThis.__pushTestSupabase = {
  from: () => ({
    upsert: async () => ({ error: saveError }),
    delete: () => ({ eq: async () => ({ error: deleteError }) }),
  }),
}
globalThis.window = { PushManager: {}, Notification: {} }
globalThis.Notification = { permission: 'granted', requestPermission: async () => 'granted' }
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => subscription } }) } },
})
const source = (await readFile(new URL('../src/lib/push.js', import.meta.url), 'utf8'))
  .replace("'./supabase'", JSON.stringify('data:text/javascript,export const supabase = globalThis.__pushTestSupabase'))
  .replace('import.meta.env.VITE_VAPID_PUBLIC_KEY', "'dGVzdA'")
const push = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('propaga errores de registro y permite reintentar la suscripción existente', async () => {
  saveError = new Error('sin conexión')
  await assert.rejects(push.syncPushSubscription(), /sin conexión/)
  await assert.rejects(push.enablePush(), /sin conexión/)
  saveError = null
  assert.equal(await push.syncPushSubscription(), true)
})

test('desactiva la suscripción local aunque falle el borrado remoto', async () => {
  deleteError = new Error('sin conexión')
  await assert.rejects(push.disablePush(), /sin conexión/)
  assert.equal(unsubscribed, true)
  deleteError = null
})
