export function syncBannerMessage({ online, pending, syncError }) {
  if (syncError) return syncError
  if (!online) {
    return pending > 0
      ? `Sin conexión: ${pending} ${pending === 1 ? 'cambio se guardará' : 'cambios se guardarán'} al volver internet.`
      : 'Sin conexión. Podés trabajar con los datos guardados en este dispositivo.'
  }
  if (pending > 0) return `${pending} ${pending === 1 ? 'cambio' : 'cambios'} sin sincronizar.`
  return ''
}
