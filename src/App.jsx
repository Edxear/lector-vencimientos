import { lazy, Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import InventoryList from './views/InventoryList'
import AuthView from './views/AuthView'

const AddFlow = lazy(() => import('./views/AddFlow'))
const PurchaseImportView = lazy(() => import('./views/PurchaseImportView'))
const SettingsView = lazy(() => import('./views/SettingsView'))
const WasteAnalytics = lazy(() => import('./views/WasteAnalytics'))
import Logo from './views/Logo'
import { supabase } from './lib/supabase'
import { db, pull, flush, autoWasteExpired } from './lib/db'
import { checkExpiringNow } from './lib/notifications'
import { syncPushSubscription } from './lib/push'

export default function App() {
  const [tab, setTab] = useState('list')
  const [session, setSession] = useState(undefined)
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

  useEffect(() => {
    if (!userId) return
    const sync = () => pull().then(autoWasteExpired).then(checkExpiringNow)
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
  }, [userId])

  if (session === undefined) return null

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Lector Vencimientos</h1>
      </header>
      {session && pending > 0 && (
        <div className="sync-banner" role="status">
          <span>
            {online
              ? `${pending} ${pending === 1 ? 'cambio' : 'cambios'} sin sincronizar.`
              : `Sin conexión: ${pending} ${pending === 1 ? 'cambio se guardará' : 'cambios se guardarán'} al volver internet.`}
          </span>
          {online && <button type="button" className="btn small" onClick={() => flush()}>Reintentar</button>}
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
