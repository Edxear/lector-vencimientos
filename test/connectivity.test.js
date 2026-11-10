import test from 'node:test'
import assert from 'node:assert/strict'
import { syncBannerMessage } from '../src/lib/connectivity.js'

test('muestra la conexión y los cambios pendientes correctamente', () => {
  assert.equal(syncBannerMessage({ online: true, pending: 0, syncError: '' }), '')
  assert.match(syncBannerMessage({ online: false, pending: 0, syncError: '' }), /Sin conexión/)
  assert.match(syncBannerMessage({ online: false, pending: 1, syncError: '' }), /1 cambio se guardará/)
  assert.match(syncBannerMessage({ online: false, pending: 2, syncError: '' }), /2 cambios se guardarán/)
  assert.match(syncBannerMessage({ online: true, pending: 1, syncError: '' }), /1 cambio sin sincronizar/)
  assert.equal(syncBannerMessage({ online: false, pending: 1, syncError: 'Error de sincronización' }), 'Error de sincronización')
})
