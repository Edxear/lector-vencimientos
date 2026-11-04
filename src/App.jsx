import { useEffect, useState } from 'react'
import InventoryList from './views/InventoryList'
import AddFlow from './views/AddFlow'
import AuthView from './views/AuthView'
import SettingsView from './views/SettingsView'
import Logo from './views/Logo'
import { supabase } from './lib/supabase'
import { pull } from './lib/db'
import { checkExpiringNow } from './lib/notifications'
import { syncPushSubscription } from './lib/push'

export default function App() {
  const [tab, setTab] = useState('list')
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    navigator.storage?.persist?.()
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    const sync = () => pull().then(checkExpiringNow)
    sync()
    syncPushSubscription()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [userId])

  if (session === undefined) return null

  return (
    <div className="app">
      <header>
        <Logo />
        <h1>Lector Vencimientos</h1>
      </header>
      <main>
        {!session ? (
          <AuthView />
        ) : tab === 'list' ? (
          <InventoryList />
        ) : tab === 'add' ? (
          <AddFlow onDone={() => setTab('list')} />
        ) : (
          <SettingsView email={session.user.email} onLogout={() => setTab('list')} />
        )}
      </main>
      {session && (
        <nav>
          <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>Inventario</button>
          <button className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>＋ Agregar</button>
          <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>Ajustes</button>
        </nav>
      )}
    </div>
  )
}
