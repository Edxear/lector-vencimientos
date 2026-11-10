import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { verifySessionUnlock } from '../lib/sessionLock'

export default function SessionLock({ email, userId, onUnlock }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function unlock(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await verifySessionUnlock(supabase.auth, { email, password, userId }, navigator.onLine)
      setPassword('')
      onUnlock()
    } catch (cause) {
      console.error('Error al desbloquear la sesión:', cause)
      setError(navigator.onLine ? 'No se pudo desbloquear. Verificá tu contraseña e intentá de nuevo.' : 'Conectate a internet para desbloquear la sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={unlock}>
      <h3>Sesión bloqueada</h3>
      <p className="hint">Ingresá la contraseña de {email} para continuar. Se requiere conexión a internet.</p>
      <label>
        Contraseña
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button className="btn primary" disabled={busy}>Desbloquear</button>
      {error && <p className="msg" role="alert">{error}</p>}
    </form>
  )
}
