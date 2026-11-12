import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

process.env.VITE_SUPABASE_URL = 'https://example.invalid'
process.env.VITE_SUPABASE_ANON_KEY = 'test'
process.env.CRON_SECRET = 'test-secret'
globalThis.__cronWebPush = {
  setVapidDetails() {},
  async sendNotification({ endpoint }) {
    if (endpoint === 'dead') throw Object.assign(new Error('expired'), { statusCode: 410 })
    if (endpoint === 'failed') throw Object.assign(new Error('unavailable'), { statusCode: 503 })
  },
}
const calls = []
globalThis.fetch = async (url, options) => {
  const name = url.split('/').at(-1)
  calls.push({ name, body: JSON.parse(options.body) })
  const rows = [
    { endpoint: 'ok', p256dh: 'p', auth: 'a', item_id: 'a', name: 'A', days_left: 1 },
    { endpoint: 'dead', p256dh: 'p', auth: 'a', item_id: 'b', name: 'B', days_left: 1 },
    { endpoint: 'failed', p256dh: 'p', auth: 'a', item_id: 'c', name: 'C', days_left: 1 },
  ]
  return { ok: true, json: async () => name === 'cron_due' ? rows : null }
}
const source = (await readFile(new URL('../api/cron.js', import.meta.url), 'utf8'))
  .replace("'web-push'", JSON.stringify('data:text/javascript,export default globalThis.__cronWebPush'))
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('informa fallos transitorios sin marcar como enviados los avisos fallidos', async () => {
  const response = { status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  const originalError = console.error
  console.error = () => {}
  try {
    await handler({ headers: { authorization: 'Bearer test-secret' } }, response)
  } finally {
    console.error = originalError
  }
  assert.equal(response.code, 503)
  assert.deepEqual(response.body, { due: 3, delivered: 1, removedSubscriptions: 1, failedSends: 1 })
  assert.deepEqual(calls.find((call) => call.name === 'cron_mark').body.ids, ['a'])
  assert.deepEqual(calls.find((call) => call.name === 'cron_drop_sub').body.endpoint, 'dead')
})
