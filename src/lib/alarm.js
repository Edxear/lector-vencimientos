const KEY = 'lv-alarm-sound'
export const ALARM_SOUNDS = { off: 'Sin sonido', bell: 'Campana', alarm: 'Alarma' }
let context

export function getAlarmSound() {
  const value = localStorage.getItem(KEY)
  return Object.hasOwn(ALARM_SOUNDS, value) ? value : 'off'
}

export function setAlarmSound(value) {
  if (!Object.hasOwn(ALARM_SOUNDS, value)) throw new Error('Sonido de alarma inválido.')
  localStorage.setItem(KEY, value)
}

export function clearAlarmSound() {
  localStorage.removeItem(KEY)
}

export async function playAlarm(sound = getAlarmSound(), { activate = false } = {}) {
  if (sound === 'off') return
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) throw new Error('Este navegador no admite sonido de alarma.')
  if (activate) {
    context ||= new AudioContext()
    if (context.state !== 'running') await context.resume()
  }
  if (!context || context.state !== 'running') throw new Error('El navegador bloqueó el sonido. Probá la alarma desde Ajustes.')
  const notes = sound === 'bell' ? [880, 660] : [660, 880, 660, 880]
  const start = context.currentTime
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const at = start + index * 0.22
    oscillator.type = sound === 'bell' ? 'sine' : 'square'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    oscillator.start(at)
    oscillator.stop(at + 0.21)
  })
}
