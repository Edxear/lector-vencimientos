import test from 'node:test'
import assert from 'node:assert/strict'
import { requestEmailChange } from '../src/lib/account.js'

test('solicita el cambio de correo con el valor normalizado', async () => {
  let payload
  await requestEmailChange({ updateUser: async (value) => { payload = value; return { error: null } } }, ' nueva@example.com ', 'actual@example.com')
  assert.deepEqual(payload, { email: 'nueva@example.com' })
})

test('rechaza el correo actual sin llamar a Supabase', async () => {
  const auth = { updateUser: () => { throw new Error('No debe llamarse') } }
  await assert.rejects(requestEmailChange(auth, ' ACTUAL@example.com ', 'actual@example.com'), /diferente/)
  await assert.rejects(requestEmailChange(auth, ' ', 'actual@example.com'), /Ingresá/)
})

test('propaga errores del proveedor de autenticación', async () => {
  const error = new Error('Sin conexión')
  await assert.rejects(requestEmailChange({ updateUser: async () => ({ error }) }, 'nueva@example.com', 'actual@example.com'), error)
})
