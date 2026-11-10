import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportAll, flush, clearLocal, pendingChanges } from '../lib/db'
import { getPushState, enablePush, disablePush } from '../lib/push'
import { appVersion, buildCommit, buildDate, latestMigration } from '../lib/buildInfo'
import ChangeEmail from './ChangeEmail'
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
  setAppUseCase,
  getGeofenceForUseCase,
  setGeofenceForUseCase,
  clearGeofenceForUseCase,
  hydrateUserSettingsFromSupabase,
  syncUserSettingsToSupabase,
} from '../lib/settings'

const STATE_TEXT = {
  on: 'Activados en este dispositivo',
  off: 'Desactivados',
  denied: 'Bloqueados en el navegador. Habilítalos desde los ajustes del sitio.',
  unsupported: 'No disponibles en este navegador',
}

export default function SettingsView({ email, userId, onLogout }) {
  const [state, setState] = useState('off')
  const [days, setDays] = useState(getDefaultNotifyDays())
  const [order, setOrder] = useState(getDateOrder())
  const [useCase, setUseCaseState] = useState(getAppUseCase())
  const [geoState, setGeoState] = useState('unknown')
  const [geofence, setGeofence] = useState(getGeofenceForUseCase())
  const [err, setErr] = useState('')
  const [sessionLock, setSessionLock] = useState(() => isSessionLockEnabled(userId))

  useEffect(() => {
    getPushState().then(setState)
    hydrateUserSettingsFromSupabase().finally(() => {
      setDays(getDefaultNotifyDays())
      setOrder(getDateOrder())
      setUseCaseState(getAppUseCase())
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
    } catch (e) {
      setErr(e.message)
    }
    setState(await getPushState())
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

  async function persistLocalAndRemote() {
    await syncUserSettingsToSupabase().catch(() => { })
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

  function handleUseCaseChange(nextUseCase) {
    setUseCaseState(nextUseCase)
    setAppUseCase(nextUseCase)
    setGeofence(getGeofenceForUseCase(nextUseCase))
    persistLocalAndRemote()
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
        {(state === 'on' || state === 'off') && (
          <button className={`btn ${state === 'off' ? 'primary' : ''}`} onClick={toggle}>
            {state === 'on' ? 'Desactivar avisos' : 'Activar avisos'}
          </button>
        )}
        {err && <p className="msg">{err}</p>}
        <label>
          Anticipación por defecto (productos nuevos)
          <select value={days} onChange={(e) => handleNotifyDaysChange(Number(e.target.value))}>
            {NOTIFY_OPTIONS.map((d) => <option key={d} value={d}>{d} días antes</option>)}
          </select>
        </label>
        <p className="hint">El aviso se envía una vez al día, por la mañana, para los productos que entraron en su plazo. Cada producto puede tener su propia anticipación.</p>
      </div>
      <div className="card">
        <h3>Uso de la app</h3>
        <label>
          ¿Es para uso en hogar o comercio?
          <select value={useCase} onChange={(e) => handleUseCaseChange(e.target.value)}>
            {Object.entries(APP_CONTEXTS).map(([key, ctx]) => <option key={key} value={key}>{ctx.label}</option>)}
          </select>
        </label>
        <p className="hint">Esto cambia el estilo de los avisos: para hogar se prioriza cocina/despensa; para comercio, almacén, frío y depósito.</p>
      </div>
      <div className="card">
        <h3>Ubicación</h3>
        <p className="hint">Permite la ubicación para avisos más contextuales según el entorno: hogar o comercio.</p>
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
        <h3>Versión</h3>
        <p className="hint">App: {appVersion} · commit {buildCommit}</p>
        <p className="hint">Build: {new Date(buildDate).toLocaleString()}</p>
        <p className="hint">Última migración incluida: {latestMigration}</p>
        <p className="hint">La migración indicada es la última disponible en el código; su aplicación en Supabase se realiza por separado.</p>
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
        <button className="btn danger" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
