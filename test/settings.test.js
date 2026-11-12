import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

globalThis.__settingsSupabase = { auth: {} }
const source = (await readFile(new URL('../src/lib/settings.js', import.meta.url), 'utf8'))
  .replace("'./supabase'", JSON.stringify('data:text/javascript,export const supabase = globalThis.__settingsSupabase'))
const settings = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

function setup(data) {
  const values = new Map()
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const payloads = []
  globalThis.__settingsSupabase.auth.getSession = async () => ({ data: { session: { user: { id: 'user' } } } })
  globalThis.__settingsSupabase.from = () => ({
    select: () => ({ maybeSingle: async () => ({ data, error: null }) }),
    upsert: async (payload) => { payloads.push(payload); return { error: null } },
  })
  return { values, payloads }
}

test('el uso anterior no cambia el contexto comercial ni importa su geocerca', async () => {
  const { values } = setup({
    app_use_case: 'hogar', geofence_latitude: -34, geofence_longitude: -58,
    geofence_radius: 150, default_notify_days: 7, date_order: 'MDY',
  })
  values.set('lv-app-use-case', 'hogar')
  await settings.hydrateUserSettingsFromSupabase()
  assert.equal(settings.getAppUseCase(), 'comercio')
  assert.equal(settings.getGeofenceForUseCase().saved, false)
  assert.equal(settings.getDefaultNotifyDays(), 7)
  assert.equal(settings.getDateOrder(), 'MDY')
  assert.ok(!settings.LOCATIONS.includes('Cocina'))
})

test('la geocerca comercial se hidrata y sincroniza incluso con coordenadas cero', async () => {
  const { payloads } = setup({
    app_use_case: 'comercio', geofence_latitude: 0, geofence_longitude: 0, geofence_radius: 400,
  })
  await settings.hydrateUserSettingsFromSupabase()
  assert.equal(settings.getGeofenceForUseCase().saved, true)
  await settings.syncUserSettingsToSupabase()
  assert.equal(payloads[0].app_use_case, 'comercio')
  assert.equal(payloads[0].geofence_latitude, 0)
  assert.equal(payloads[0].geofence_longitude, 0)
})

test('una geocerca comercial sin coordenadas no se considera guardada', async () => {
  setup({ app_use_case: 'comercio', geofence_latitude: null, geofence_longitude: null })
  await settings.hydrateUserSettingsFromSupabase()
  assert.equal(settings.getGeofenceForUseCase().saved, false)
})
