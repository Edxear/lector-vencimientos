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
import { checkExpiringNow } from './lib/notifications'
import { syncPushSubscription } from './lib/push'
import { playAlarm } from './lib/alarm'

export default function App() {
  const [tab, setTab] = useState('list')
  const [session, setSession] = useState(undefined)
  const [syncError, setSyncError] = useState('')
  const [alarmError, setAlarmError] = useState('')
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
      await pull()
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
  }, [])

  useEffect(() => {
    const onSyncStatus = (event) => {
      setSyncError(event.detail.ok ? '' : event.detail.message)
    }
    window.addEventListener(SYNC_STATUS_EVENT, onSyncStatus)
    return () => window.removeEventListener(SYNC_STATUS_EVENT, onSyncStatus)
  }, [])

  useEffect(() => {
    if (!userId) return
    sync()
    syncPushSubscription()
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
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', sync)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, [userId, sync])

  if (session === undefined) return null

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Lector Vencimientos</h1>
      </header>
      {session && bannerMessage && (
        <div className="sync-banner" role={syncError ? 'alert' : 'status'}>
          <span>{bannerMessage}</span>
          {online && (pending > 0 || syncError) && <button type="button" className="btn small" onClick={sync}>Reintentar</button>}
        </div>
      )}
      {session && alarmError && <div className="sync-banner" role="alert">{alarmError}<button type="button" className="btn small" onClick={() => setAlarmError('')}>Cerrar</button></div>}
      <main>
        <Suspense fallback={<p className="msg" role="status">Cargando…</p>}>
        {!session ? (
          <AuthView />
        ) : lockEnabled && locked ? (
          <SessionLock email={session.user.email} userId={userId} onUnlock={() => setUnlockedFor(userId)} />
        ) : tab === 'list' ? (
          <InventoryList />
        ) : tab === 'add' ? (
          <AddFlow onDone={() => setTab('list')} />
        ) : tab === 'purchases' ? (
          <PurchaseImportView />
        ) : tab === 'waste' ? (
          <WasteAnalytics />
        ) : (
          <SettingsView email={session.user.email} userId={userId} onLogout={() => setTab('list')} />
        )}
        </Suspense>
      </main>
      {session && !(lockEnabled && locked) && (
        <nav>
          <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>Inventario</button>
          <button className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>＋ Agregar</button>
          <button className={tab === 'purchases' ? 'on' : ''} onClick={() => setTab('purchases')}>Compras</button>
          <button className={tab === 'waste' ? 'on' : ''} onClick={() => setTab('waste')}>Pérdidas</button>
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>Ajustes</button>
        </nav>
      )}
    </div>
  )
}
