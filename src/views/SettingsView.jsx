import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db, exportAll, flush, clearLocal, pendingChanges, importInventory } from '../lib/db'
import { inventoryRows, parseInventoryRows } from '../lib/excel'
import { summarizeAddMetrics } from '../lib/addMetrics'
import { ALARM_SOUNDS, getAlarmSound, setAlarmSound, playAlarm } from '../lib/alarm'
import { getPushState, enablePush, disablePush } from '../lib/push'
import { appVersion, buildDate } from '../lib/buildInfo'
import ChangeEmail from './ChangeEmail'
import DeleteAccount from './DeleteAccount'
import { isSessionLockEnabled, setSessionLockEnabled, SESSION_LOCK_EVENT } from '../lib/sessionLock'
import {
  NOTIFY_OPTIONS,
  DATE_ORDER_OPTIONS,
  APP_CONTEXTS,
  getDefaultNotifyDays,
  setDefaultNotifyDays,
  getDateOrder,
  setDateOrder,
  getAppUseCase,
  getGeofenceForUseCase,
  setGeofenceForUseCase,
  clearGeofenceForUseCase,
  hydrateUserSettingsFromSupabase,
  syncUserSettingsToSupabase,
} from '../lib/settings'

const STATE_TEXT = {
  on: 'Suscripción activa en este dispositivo',
  off: 'Desactivados',
  denied: 'Bloqueados en el navegador. Habilítalos desde los ajustes del sitio.',
  unsupported: 'No disponibles en este navegador',
}

export default function SettingsView({ email, userId, onLogout, lastSync, pending, online, syncError, onSync, onPushChanged }) {
  const [state, setState] = useState('off')
  const [days, setDays] = useState(getDefaultNotifyDays())
  const [order, setOrder] = useState(getDateOrder())
  const useCase = getAppUseCase()
  const [geoState, setGeoState] = useState('unknown')
  const [geofence, setGeofence] = useState(getGeofenceForUseCase())
  const [err, setErr] = useState('')
  const [sessionLock, setSessionLock] = useState(() => isSessionLockEnabled(userId))
  const [excelStatus, setExcelStatus] = useState('')
  const [excelBusy, setExcelBusy] = useState(false)
  const [alarmSound, setAlarmSoundState] = useState(getAlarmSound())
  const metricEvents = useLiveQuery(() => db.events.where('type').anyOf('add_flow_start', 'add_flow_end').toArray(), [])
  const metrics = summarizeAddMetrics(metricEvents || [])
  const permission = !('Notification' in window) ? 'No disponible'
    : Notification.permission === 'granted' ? 'Concedido'
      : Notification.permission === 'denied' ? 'Bloqueado' : 'Sin solicitar'

  useEffect(() => {
    getPushState().then(setState).catch((error) => {
      console.error('No se pudo consultar el estado de avisos:', error)
      setErr('No se pudo consultar el estado de avisos. Recargá la página e intentá nuevamente.')
    })
    hydrateUserSettingsFromSupabase().catch((error) => {
      console.error('No se pudieron cargar las preferencias:', error)
      setErr('No se pudieron cargar las preferencias de la nube. Revisá la conexión y volvé a abrir Ajustes.')
    }).finally(() => {
      setDays(getDefaultNotifyDays())
      setOrder(getDateOrder())
      setGeofence(getGeofenceForUseCase())
    })
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported')
      return
    }
    navigator.permissions?.query?.({ name: 'geolocation' })
      .then((p) => setGeoState(p?.state || 'unknown'))
      .catch(() => setGeoState('unknown'))
  }, [])

  async function toggle() {
    setErr('')
    try {
      if (state === 'on') await disablePush()
      else await enablePush()
      await onPushChanged()
    } catch (e) {
      console.error('No se pudo cambiar el estado de avisos:', e)
      setErr('No se pudieron actualizar los avisos. Revisá los permisos y la conexión, e intentá nuevamente.')
    }
    try {
      setState(await getPushState())
    } catch (error) {
      console.error('No se pudo consultar el estado de avisos:', error)
      setErr('No se pudo consultar el estado de avisos. Recargá la página e intentá nuevamente.')
    }
  }

  async function retryNotifications() {
    setErr('')
    try {
      await enablePush()
      await onPushChanged()
      setState(await getPushState())
    } catch (error) {
      console.error('No se pudo registrar la suscripción de avisos:', error)
      setErr('No se pudieron registrar los avisos. Revisá los permisos y la conexión, e intentá nuevamente.')
    }
  }

  async function logout() {
    setErr('')
    try {
      await flush()
      const pending = await pendingChanges()
      if (pending > 0 && !confirm(`Hay ${pending} cambios que todavía no se subieron. Si cerrás sesión ahora se perderán. ¿Cerrar sesión igual?`)) return
      try {
        await disablePush()
      } catch (error) {
        console.warn('No se pudo desactivar la suscripción push al cerrar sesión:', error)
      }
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      await clearLocal()
      onLogout?.()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      setErr('No se pudo completar el cierre de sesión. Revisá la conexión e intentá de nuevo.')
    }
  }

  function changeSessionLock(enabled) {
    try {
      setSessionLockEnabled(userId, enabled)
      setSessionLock(enabled)
      window.dispatchEvent(new Event(SESSION_LOCK_EVENT))
    } catch (error) {
      console.error('Error al cambiar el bloqueo de sesión:', error)
      setErr('No se pudo cambiar el bloqueo de sesión en este dispositivo.')
    }
  }

  async function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'lector-vencimientos.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportMetrics() {
    try {
      const events = await db.events.where('type').anyOf('add_flow_start', 'add_flow_end').toArray()
      const url = URL.createObjectURL(new Blob([JSON.stringify({ summary: summarizeAddMetrics(events), events }, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'metricas-alta-locales.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('No se pudieron exportar las métricas:', error)
      setErr('No se pudieron exportar las métricas locales.')
    }
  }

  async function exportExcel() {
    setExcelBusy(true)
    setExcelStatus('')
    try {
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const data = await db.transaction('r', db.products, db.items, async () =>
        inventoryRows(await db.products.toArray(), await db.items.toArray(), userId))
      const cells = data.map((row) => row.map((value) => ({ value, type: typeof value === 'number' ? Number : String })))
      await writeExcelFile(cells).toFile('inventario-vencimientos.xlsx')
      setExcelStatus('Excel exportado.')
    } catch (error) {
      console.error('Error al exportar Excel:', error)
      setExcelStatus('No se pudo exportar el Excel.')
    } finally {
      setExcelBusy(false)
    }
  }

  async function importExcel(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setExcelBusy(true)
    setExcelStatus('')
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error('Elegí un archivo XLSX de hasta 10 MB.')
      const { readSheet } = await import('read-excel-file/browser')
      const inventory = parseInventoryRows(await readSheet(file), userId)
      if (!confirm(`Se revisaron ${inventory.products.length} productos y ${inventory.items.length} lotes. Se agregarán solo los que no existan; no se modificará ningún registro existente. ¿Continuar?`)) return
      const result = await importInventory(inventory)
      setExcelStatus(`Importación completa: ${result.addedProducts} productos y ${result.addedItems} lotes nuevos.`)
    } catch (error) {
      console.error('Error al importar Excel:', error)
      setExcelStatus(error.message || 'No se pudo importar el Excel.')
    } finally {
      setExcelBusy(false)
    }
  }

  async function persistLocalAndRemote() {
    try {
      await syncUserSettingsToSupabase()
    } catch (error) {
      console.error('No se pudieron sincronizar las preferencias:', error)
      setErr('Las preferencias se guardaron en este dispositivo, pero no se sincronizaron. Revisá la conexión y volvé a cambiar el ajuste.')
    }
  }

  async function requestLocation() {
    setErr('')
    try {
      if (!('geolocation' in navigator)) throw new Error('Tu navegador no admite geolocalización.')
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 })
      })
      const currentGeofence = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        radius: APP_CONTEXTS[useCase].radius,
        label: APP_CONTEXTS[useCase].geofenceLabel,
      }
      setGeofenceForUseCase(useCase, currentGeofence)
      setGeofence({ ...currentGeofence, saved: true })
      setGeoState('granted')
      await persistLocalAndRemote()
    } catch (e) {
      setGeoState('denied')
      setErr(e.message || 'No se pudo activar la ubicación.')
    }
  }

  function handleNotifyDaysChange(nextDays) {
    setDays(nextDays)
    setDefaultNotifyDays(nextDays)
    persistLocalAndRemote()
  }

  function handleDateOrderChange(nextOrder) {
    setOrder(nextOrder)
    setDateOrder(nextOrder)
    persistLocalAndRemote()
  }

  async function handleClearGeofence() {
    clearGeofenceForUseCase(useCase)
    setGeofence(getGeofenceForUseCase(useCase))
    setGeoState('unknown')
    await persistLocalAndRemote()
  }

  return (
    <div>
      <div className="card">
        <h3>Avisos de vencimiento</h3>
        <p className="hint">Estado: {STATE_TEXT[state]}</p>
        <p className="hint">Permiso de notificaciones: {permission}.</p>
        <p className="hint">La suscripción del navegador no garantiza la entrega de cada aviso. Revisá también los permisos y la configuración del dispositivo.</p>
        {(state === 'on' || state === 'off') && (
          <button className={`btn ${state === 'off' ? 'primary' : ''}`} onClick={toggle}>
            {state === 'on' ? 'Desactivar avisos' : 'Activar avisos'}
          </button>
        )}
        {state === 'on' && <button className="btn" onClick={retryNotifications}>Reintentar registro de avisos</button>}
        {err && <p className="msg">{err}</p>}
        <label>
          Anticipación por defecto (productos nuevos)
          <select value={days} onChange={(e) => handleNotifyDaysChange(Number(e.target.value))}>
            {NOTIFY_OPTIONS.map((d) => <option key={d} value={d}>{d} días antes</option>)}
          </select>
        </label>
        <p className="hint">El aviso se envía una vez al día, por la mañana, para los productos que entraron en su plazo. Cada producto puede tener su propia anticipación.</p>
        <label>
          Sonido de alarma en este dispositivo
          <select value={alarmSound} onChange={(event) => {
            try {
              setAlarmSound(event.target.value)
              setAlarmSoundState(event.target.value)
              setErr('')
            } catch (error) { setErr(error.message) }
          }}>
            {Object.entries(ALARM_SOUNDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <button type="button" className="btn" disabled={alarmSound === 'off'} onClick={() => {
          setErr('')
          playAlarm(alarmSound, { activate: true }).catch((error) => setErr(error.message))
        }}>Probar sonido</button>
        <p className="hint">El sonido elegido funciona con la app abierta y visible si el navegador permite audio. Tocá «Probar sonido» para habilitarlo. Con la app cerrada el sonido depende del sistema de notificaciones.</p>
      </div>
      <div className="card">
        <h3>Sincronización del inventario</h3>
        <p className="hint">{online ? 'Con conexión' : 'Sin conexión'} · {pending} cambios pendientes</p>
        <p className="hint">Última sincronización completa en este dispositivo: {lastSync ? new Date(lastSync).toLocaleString('es-AR') : 'sin registro'}.</p>
        {syncError && <p className="hint warn" role="alert">{syncError}</p>}
        <button type="button" className="btn" disabled={!online} onClick={onSync}>Sincronizar ahora</button>
      </div>
      <div className="card">
        <h3>Ubicación</h3>
        <p className="hint">Guarda la ubicación de tu supermercado para recibir recordatorios cuando estés cerca.</p>
        <button className="btn primary" onClick={requestLocation}>Guardar punto de referencia</button>
        <button className="btn" onClick={handleClearGeofence}>Borrar geocerca</button>
        <p className="hint">Estado: {geoState === 'granted' ? 'Activada' : geoState === 'denied' ? 'Denegada' : geoState === 'unsupported' ? 'No disponible' : 'Sin permiso aún'}</p>
        {geofence.saved && (
          <p className="hint">Punto guardado: {geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)} · radio {geofence.radius} m · {geofence.label}</p>
        )}
      </div>
      <div className="card">
        <h3>Lectura de fechas</h3>
        <label>
          Orden habitual de las fechas impresas
          <select value={order} onChange={(e) => handleDateOrderChange(e.target.value)}>
            {DATE_ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <p className="hint">Se usa para decidir cuando una fecha como 03/04/27 puede leerse de más de una forma. Siempre podrás elegir otra lectura antes de guardar.</p>
      </div>
      <div className="card">
        <h3>Medición local del alta</h3>
        <p className="hint">Solo en este dispositivo: {metrics.started} intentos, {metrics.completed} completados, {metrics.abandoned} abandonados y {metrics.incomplete} incompletos.</p>
        <p className="hint">Tiempo medio de altas completadas: {metrics.averageDurationMs == null ? 'sin datos' : `${(metrics.averageDurationMs / 1000).toFixed(1)} s`}. Errores de escaneo, búsqueda, guardado u OCR registrados: {metrics.errors}.</p>
        <p className="hint">Fechas OCR confirmadas sin edición: {metrics.ocrSuggested ? `${metrics.ocrUnedited}/${metrics.ocrSuggested} (${Math.round(metrics.ocrUnedited * 100 / metrics.ocrSuggested)} %)` : 'sin datos'}. Esto no mide la precisión real.</p>
        <p className="hint">Los intentos incompletos pueden deberse a interrupciones; no se cuentan como abandonos confirmados. Al cerrar sesión se borran estos datos locales.</p>
        <button type="button" className="btn" onClick={exportMetrics}>Exportar métricas locales</button>
      </div>
      <div className="card">
        <h3>Cuenta</h3>
        <p className="hint">{email}</p>
        <ChangeEmail currentEmail={email} />
        <label>
          <span>
            <input type="checkbox" checked={sessionLock} onChange={(event) => changeSessionLock(event.target.checked)} />
            Bloquear la pantalla después de 15 minutos de inactividad
          </span>
        </label>
        <p className="hint">Al activarlo, se solicita la contraseña con conexión a internet al abrir o desbloquear la app. Este bloqueo no cifra los datos del dispositivo.</p>
        {err && <p className="msg" role="alert">{err}</p>}
        <button className="btn" onClick={exportJson}>Exportar datos (JSON)</button>
        <button className="btn" disabled={excelBusy} onClick={exportExcel}>Exportar inventario (Excel)</button>
        <label>
          Importar inventario (Excel)
          <input type="file" accept=".xlsx" disabled={excelBusy} onChange={importExcel} />
        </label>
        <div className="excel-import-help">
          <strong>¡Cargá tu stock en segundos!</strong>
          <p>Usá el Excel exportado como plantilla, respetando códigos y fechas (AAAA-MM-DD) en formato texto.</p>
          <ul><li><strong>Sin riesgos:</strong> No sobrescribe tus productos ni lotes actuales.</li></ul>
        </div>
        {excelStatus && <p className="msg" role="status">{excelStatus}</p>}
        <DeleteAccount email={email} onDeleted={() => onLogout?.()} />
        <button className="btn danger" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      <div className="card">
        <h3>Versión</h3>
        <p className="hint">Versión: {appVersion}</p>
        <p className="hint">Actualizado: {new Date(buildDate).toLocaleString()}</p>
      </div>
    </div>
  )
}
