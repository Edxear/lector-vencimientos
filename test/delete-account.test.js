import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/delete-account.js'

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('el endpoint solo elimina al usuario identificado por el token validado', async (t) => {
  const keys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  const originalFetch = globalThis.fetch
  t.after(() => {
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
    globalThis.fetch = originalFetch
  })

  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-test-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key'
  const requests = []
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    requests.push({ url, init })
    if (url.endsWith('/auth/v1/user')) {
      return new Response(JSON.stringify({ id: '550e8400-e29b-41d4-a716-446655440000', aud: 'authenticated', role: 'authenticated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/auth/v1/admin/users/')) {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const res = response()
  await handler({ method: 'POST', headers: { authorization: 'Bearer user-access-token' } }, res)

  assert.equal(res.statusCode, 200)
  const userRequest = requests.find(({ url }) => url.endsWith('/auth/v1/user'))
  assert.equal(userRequest.init.headers.Authorization, 'Bearer user-access-token')
  const deleteRequest = requests.find(({ url }) => url.includes('/auth/v1/admin/users/'))
  assert.equal(deleteRequest.url, 'https://example.supabase.co/auth/v1/admin/users/550e8400-e29b-41d4-a716-446655440000')
  assert.equal(deleteRequest.init.method, 'DELETE')
  assert.equal(deleteRequest.init.headers.Authorization, 'Bearer service-test-key')
})
