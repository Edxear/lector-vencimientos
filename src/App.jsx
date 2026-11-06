import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import InventoryList from './views/InventoryList'
import AuthView from './views/AuthView'

const AddFlow = lazy(() => import('./views/AddFlow'))
const PurchaseImportView = lazy(() => import('./views/PurchaseImportView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
const WasteAnalytics = lazy(() => import('./views/WasteAnalytics'))
import Logo from './views/Logo'
import { supabase } from './lib/supabase'
import { db, pull, autoWasteExpired, SYNC_STATUS_EVENT } from './lib/db'
import { checkExpiringNow } from './lib/notifications'
import { syncPushSubscription } from './lib/push'

export default function App() {
  const [tab, setTab] = useState('list')
  const [session, setSession] = useState(undefined)
  const [syncError, setSyncError] = useState('')
  const pending = useLiveQuery(() => db.outbox.count(), [], 0)
  const [online, setOnline] = useState(navigator.onLine)

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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

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
    const tick = () => { if (document.visibilityState === 'visible') autoWasteExpired() }
    const timer = setInterval(tick, 10 * 60 * 1000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', sync)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', sync)
    }
  }, [userId, sync])

  if (session === undefined) return null

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Lector Vencimientos</h1>
      </header>
      {session && (pending > 0 || syncError) && (
        <div className="sync-banner" role={syncError ? 'alert' : 'status'}>
          <span>
            {syncError || (online
              ? `${pending} ${pending === 1 ? 'cambio' : 'cambios'} sin sincronizar.`
              : `Sin conexión: ${pending} ${pending === 1 ? 'cambio se guardará' : 'cambios se guardarán'} al volver internet.`)}
          </span>
          {online && <button type="button" className="btn small" onClick={sync}>Reintentar</button>}
        </div>
      )}
      <main>
        <Suspense fallback={<p className="msg" role="status">Cargando…</p>}>
        {!session ? (
          <AuthView />
        ) : tab === 'list' ? (
          <InventoryList />
        ) : tab === 'add' ? (
          <AddFlow onDone={() => setTab('list')} />
        ) : tab === 'purchases' ? (
          <PurchaseImportView />
        ) : tab === 'waste' ? (
          <WasteAnalytics />
        ) : (
          <SettingsView email={session.user.email} onLogout={() => setTab('list')} />
        )}
        </Suspense>
      </main>
      {session && (
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
