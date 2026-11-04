import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { exportAll, flush, clearLocal } from '../lib/db'
import { getPushState, enablePush, disablePush } from '../lib/push'
import { NOTIFY_OPTIONS, DATE_ORDER_OPTIONS, getDefaultNotifyDays, setDefaultNotifyDays, getDateOrder, setDateOrder } from '../lib/settings'

const STATE_TEXT = {
  on: 'Activados en este dispositivo',
  off: 'Desactivados',
  denied: 'Bloqueados en el navegador. Habilítalos desde los ajustes del sitio.',
  unsupported: 'No disponibles en este navegador',
}

export default function SettingsView({ email, onLogout }) {
  const [state, setState] = useState('off')
  const [days, setDays] = useState(getDefaultNotifyDays())
  const [order, setOrder] = useState(getDateOrder())
  const [err, setErr] = useState('')

  useEffect(() => { getPushState().then(setState) }, [])

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

  async function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'lector-vencimientos.json'
    a.click()
    URL.revokeObjectURL(url)
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
          <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setDefaultNotifyDays(Number(e.target.value)) }}>
            {NOTIFY_OPTIONS.map((d) => <option key={d} value={d}>{d} días antes</option>)}
          </select>
        </label>
        <p className="hint">El aviso se envía una vez al día, por la mañana, para los productos que entraron en su plazo. Cada producto puede tener su propia anticipación.</p>
      </div>
      <div className="card">
        <h3>Lectura de fechas</h3>
        <label>
          Orden habitual de las fechas impresas
          <select value={order} onChange={(e) => { setOrder(e.target.value); setDateOrder(e.target.value) }}>
            {DATE_ORDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <p className="hint">Se usa para decidir cuando una fecha como 03/04/27 puede leerse de más de una forma. Siempre podrás elegir otra lectura antes de guardar.</p>
      </div>
      <div className="card">
        <h3>Cuenta</h3>
        <p className="hint">{email}</p>
        <button className="btn" onClick={exportJson}>Exportar datos (JSON)</button>
        <button className="btn danger" onClick={async () => { await flush(); await disablePush().catch(() => {}); await supabase.auth.signOut(); await clearLocal(); onLogout?.() }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
