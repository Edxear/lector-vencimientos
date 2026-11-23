import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import InventoryList from './views/InventoryList'
import AuthView from './views/AuthView'
import SessionLock from './views/SessionLock'
import { isLockTimeoutReached, isSessionLockEnabled, sessionLockKey, SESSION_LOCK_EVENT, SESSION_LOCK_TIMEOUT_MS } from './lib/sessionLock'
import { syncBannerMessage } from './lib/connectivity'

const AddFlow = lazy(() => import('./views/AddFlow'))
const PurchaseImportView = lazy(() => import('./views/PurchaseImportView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
const WasteAnalytics = lazy(() => import('./views/WasteAnalytics'))
import Logo from './views/Logo'
import { supabase } from './lib/supabase'
import { db, pull, autoWasteExpired, SYNC_STATUS_EVENT } from './lib/db'
import { checkExpiringNow, requestNotificationPermission } from './lib/notifications' // NUEVO: Importamos requestNotificationPermission
import { syncPushSubscription } from './lib/push'
import { playAlarm } from './lib/alarm'

export default function App() {
  const [tab, setTab] = useState('list')
  const [session, setSession] = useState(undefined)
  const [syncError, setSyncError] = useState('')
  const [pushError, setPushError] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [alarmError, setAlarmError] = useState('')
  // NUEVO: Estado para controlar el permiso de notificaciones
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )

  const pending = useLiveQuery(() => db.outbox.count(), [], 0)
  const [online, setOnline] = useState(navigator.onLine)
  const [unlockedFor, setUnlockedFor] = useState(null)
  const [, setLockRevision] = useState(0)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    navigator.storage?.persist?.()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') setUnlockedFor(null)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id
  const lockEnabled = isSessionLockEnabled(userId)
  const locked = unlockedFor !== userId
  const bannerMessage = syncBannerMessage({ online, pending, syncError })

  useEffect(() => {
    if (!userId) {
      setLastSync(null)
      return
    }
    try {
      setLastSync(localStorage.getItem(`lv-last-sync-${userId}`))
    } catch (error) {
      console.warn('No se pudo leer la última sincronización:', error)
      setLastSync(null)
    }
  }, [userId])

  useEffect(() => {
    const updateLock = () => {
      setUnlockedFor(null)
      setLockRevision((revision) => revision + 1)
    }
    const onStorage = (event) => {
      if (event.key === null || event.key === sessionLockKey(userId)) updateLock()
    }
    window.addEventListener(SESSION_LOCK_EVENT, updateLock)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(SESSION_LOCK_EVENT, updateLock)
      window.removeEventListener('storage', onStorage)
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !lockEnabled || locked) return
    let timer
    let lastActivity = Date.now()
    const lockIfInactive = () => {
      if (isLockTimeoutReached(lastActivity)) setUnlockedFor(null)
      else timer = setTimeout(lockIfInactive, SESSION_LOCK_TIMEOUT_MS - (Date.now() - lastActivity))
    }
    const activity = () => {
      if (isLockTimeoutReached(lastActivity)) {
        setUnlockedFor(null)
        return
      }
      lastActivity = Date.now()
      clearTimeout(timer)
      timer = setTimeout(lockIfInactive, SESSION_LOCK_TIMEOUT_MS)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer)
        lockIfInactive()
      }
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, activity))
    document.addEventListener('visibilitychange', onVisibilityChange)
    activity()
    return () => {
      clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, activity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [userId, lockEnabled, locked])

  const sync = useCallback(async () => {
    try {
      if (await pull()) {
        const time = new Date().toISOString()
        setLastSync(time)
        if (userId) {
          try {
            localStorage.setItem(`lv-last-sync-${userId}`, time)
          } catch (error) {
            console.warn('No se pudo guardar la última sincronización:', error)
          }
        }
        setSyncError('')
      }
    } catch (error) {
      console.error('Error al actualizar los datos desde la nube:', error)
      setSyncError('No se pudieron actualizar los datos desde la nube. Inténtalo de nuevo cuando tengas conexión.')
      return
    }
    try {
      await autoWasteExpired()
    } catch (error) {
      console.error('Error al actualizar vencimientos automáticamente:', error)
      setSyncError('No se pudieron actualizar automáticamente los vencimientos.')
    }
    try {
      await checkExpiringNow()
    } catch (error) {
      console.error('Error al comprobar avisos de vencimiento:', error)
      setSyncError('No se pudieron comprobar los avisos de vencimiento.')
    }
  }, [userId])

  const retryPush = useCallback(async () => {
    try {
      const synced = await syncPushSubscription()
      setPushError((previous) => synced ? '' : previous ? 'No hay una suscripción push activa. Abrí Ajustes para revisar los permisos y activarla.' : '')
    } catch (error) {
      console.error('No se pudo registrar la suscripción de avisos:', error)
      setPushError('No se pudieron sincronizar los avisos push. Revisá la conexión y volvé a intentarlo.')
    }
  }, [])

  useEffect(() => {
    const onSyncStatus = (event) => {
      if (!event.detail.ok) setSyncError(event.detail.message)
    }
    window.addEventListener(SYNC_STATUS_EVENT, onSyncStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onSyncStatus)
  }, [])

  useEffect(() => {
    if (!userId) return
    sync()
    retryPush()
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        await autoWasteExpired()
        await checkExpiringNow()
      } catch (error) {
        console.error('Error al comprobar vencimientos:', error)
        setAlarmError('No se pudieron comprobar los avisos o reproducir la alarma. Revisá Ajustes.')
      }
    }
    const onMessage = (event) => {
      if (event.data?.type !== 'EXPIRY_ALARM' || document.visibilityState !== 'visible') return
      playAlarm().catch((error) => {
        console.error('No se pudo reproducir la alarma:', error)
        setAlarmError('El navegador bloqueó el sonido. Probá la alarma desde Ajustes.')
      })
    }
    const timer = setInterval(tick, 10 * 60 * 1000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', sync)
    window.addEventListener('online', retryPush)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', sync)
      window.removeEventListener('online', retryPush)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [userId, sync, retryPush])

  // NUEVO: Función para pedir el permiso desde el banner
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission()
    setNotifPermission(granted ? 'granted' : 'denied')
    if (granted) {
      // Si acepta, intentamos sincronizar el push inmediatamente
      retryPush()
    }
  }

  if (session === undefined) return null

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Lector Vencimientos</h1>
      </header>
      
      {/* NUEVO: Banner para pedir notificaciones si están en 'default' */}
      {session && notifPermission === 'default' && (
        <div className="sync-banner" role="alert" style={{ backgroundColor: '#fffbeb', color: '#b45309', borderColor: '#fcd34d' }}>
          <span>⚠️ <strong>Activa las notificaciones</strong> para recibir alertas antes de que tus productos venzan.</span>
          <button type="button" className="btn small" style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none' }} onClick={handleEnableNotifications}>
            Activar ahora
          </button>
        </div>
      )}

      {session && bannerMessage && (
        <div className="sync-banner" role={syncError ? 'alert' : 'status'}>
          <span>{bannerMessage}</span>
          {online && (pending > 0 || syncError) && <button type="button" className="btn small" onClick={sync}>Reintentar</button>}
        </div>
      )}
      {session && alarmError && <div className="sync-banner" role="alert">{alarmError}<button type="button" className="btn small" onClick={() => setAlarmError('')}>Cerrar</button></div>}
      {session && pushError && <div className="sync-banner" role="alert">{pushError}<button type="button" className="btn small" onClick={retryPush}>Reintentar</button></div>}
      
      <main>
        <Suspense fallback={<p className="msg" role="status">Cargando…</p>}>
        {!session ? (
          <AuthView />
        ) : lockEnabled && locked ? (
          <SessionLock email={session.user.email} userId={userId} onUnlock={() => setUnlockedFor(userId)} />
        ) : tab === 'list' ? (
          <InventoryList onNavigate={setTab} />
        ) : tab === 'add' ? (
          <AddFlow onDone={() => setTab('list')} onPushError={() => setPushError('No se pudieron activar los avisos push. Revisá la conexión y los permisos en Ajustes.')} />
        ) : tab === 'purchases' ? (
          <PurchaseImportView />
        ) : tab === 'waste' ? (
          <WasteAnalytics />
        ) : (
          <SettingsView email={session.user.email} userId={userId} onLogout={() => setTab('list')}
            lastSync={lastSync} pending={pending} online={online} syncError={syncError} onSync={sync} onPushChanged={() => setPushError('')} />
        )}
        </Suspense>
      </main>
            {session && !(lockEnabled && locked) && (
        <nav aria-label="Navegación principal">
          <button
            type="button"
            className={tab === 'list' ? 'on' : ''}
            aria-current={tab === 'list' ? 'page' : undefined}
            onClick={() => setTab('list')}
          >
            <span className="nav-ico" aria-hidden="true">📦</span>
            <span>Inventario</span>
          </button>
          <button
            type="button"
            className={tab === 'add' ? 'on' : ''}
            aria-current={tab === 'add' ? 'page' : undefined}
            onClick={() => setTab('add')}
          >
            <span className="nav-ico" aria-hidden="true">＋</span>
            <span>Agregar</span>
          </button>
          <button
            type="button"
            className={tab === 'purchases' ? 'on' : ''}
            aria-current={tab === 'purchases' ? 'page' : undefined}
            onClick={() => setTab('purchases')}
          >
            <span className="nav-ico" aria-hidden="true">🧾</span>
            <span>Compras</span>
          </button>
          <button
            type="button"
            className={tab === 'waste' ? 'on' : ''}
            aria-current={tab === 'waste' ? 'page' : undefined}
            onClick={() => setTab('waste')}
          >
            <span className="nav-ico" aria-hidden="true">📉</span>
            <span>Pérdidas</span>
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'on' : ''}
            aria-current={tab === 'settings' ? 'page' : undefined}
            onClick={() => setTab('settings')}
          >
            <span className="nav-ico" aria-hidden="true">⚙️</span>
            <span>Ajustes</span>
          </button>
        </nav>
      )}

    </div>
  )
}