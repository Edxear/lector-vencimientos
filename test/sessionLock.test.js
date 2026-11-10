import test from 'node:test'
import assert from 'node:assert/strict'
import { isLockTimeoutReached, isSessionLockEnabled, SESSION_LOCK_TIMEOUT_MS, setSessionLockEnabled, verifySessionUnlock } from '../src/lib/sessionLock.js'

test('el bloqueo es opcional, por dispositivo y por cuenta', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  assert.equal(isSessionLockEnabled('a', storage), false)
  setSessionLockEnabled('a', true, storage)
  assert.equal(isSessionLockEnabled('a', storage), true)
  assert.equal(isSessionLockEnabled('b', storage), false)
  setSessionLockEnabled('a', false, storage)
  assert.equal(isSessionLockEnabled('a', storage), false)
  assert.throws(() => setSessionLockEnabled('', true, storage))
})

test('el bloqueo se activa exactamente a los 15 minutos de inactividad', () => {
  assert.equal(SESSION_LOCK_TIMEOUT_MS, 15 * 60 * 1000)
  assert.equal(isLockTimeoutReached(1000, 1000 + SESSION_LOCK_TIMEOUT_MS - 1), false)
  assert.equal(isLockTimeoutReached(1000, 1000 + SESSION_LOCK_TIMEOUT_MS), true)
})

test('desbloquea solo con internet y la misma cuenta autenticada', async () => {
  const credentials = { email: 'usuario@example.com', password: 'secreto', userId: 'a' }
  let calls = 0
  const auth = { signInWithPassword: async (value) => {
    calls += 1
    assert.deepEqual(value, { email: credentials.email, password: credentials.password })
    return { data: { user: { id: 'a' } }, error: null }
  } }
  await assert.rejects(verifySessionUnlock(auth, credentials, false), /internet/)
  assert.equal(calls, 0)
  await verifySessionUnlock(auth, credentials, true)
  assert.equal(calls, 1)
  const other = { signInWithPassword: async () => ({ data: { user: { id: 'b' } }, error: null }) }
  await assert.rejects(verifySessionUnlock(other, credentials, true), /no coincide/)
  const error = new Error('Credenciales incorrectas')
  await assert.rejects(verifySessionUnlock({ signInWithPassword: async () => ({ error }) }, credentials, true), error)
})
