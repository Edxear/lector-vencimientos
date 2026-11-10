import test from 'node:test'
import assert from 'node:assert/strict'
import { getAlarmSound, setAlarmSound, playAlarm } from '../src/lib/alarm.js'

test('la alarma requiere activación y reproduce el sonido configurado', async () => {
  const values = new Map()
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const frequencies = []
  class AudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    createOscillator() {
      const frequency = {}
      frequencies.push(frequency)
      return { frequency, connect() {}, disconnect() {}, start() {}, stop() {} }
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }
    }
  }
  globalThis.window = { AudioContext }
  assert.equal(getAlarmSound(), 'off')
  setAlarmSound('alarm')
  await assert.rejects(playAlarm(), /Probá la alarma/)
  await playAlarm('alarm', { activate: true })
  assert.deepEqual(frequencies.map((frequency) => frequency.value), [660, 880, 660, 880])
  await playAlarm()
  assert.equal(frequencies.length, 8)
  assert.throws(() => setAlarmSound('otro'), /inválido/)
})
