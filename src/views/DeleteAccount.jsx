import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearLocal } from '../lib/db'
import { clearLocalSettings } from '../lib/settings'
import { clearAlarmSound } from '../lib/alarm'
import { sessionLockKey } from '../lib/sessionLock'

export default function DeleteAccount({ email, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const emailMatches = confirmation.trim().toLowerCase() === email?.trim().toLowerCase()

  async function submit(event) {
    event.preventDefault()
    if (!emailMatches || busy) return
    setBusy(true)
    setError('')
    let accountDeleted = false
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session?.access_token) throw new Error('Tu sesión venció. Volvé a iniciar sesión e intentá de nuevo.')
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la cuenta.')
      accountDeleted = true

      await clearLocal()
      clearLocalSettings()
      clearAlarmSound()
      localStorage.removeItem(sessionLockKey(data.session.user.id))
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
      onDeleted?.()
    } catch (cause) {
      console.error('Error al eliminar la cuenta:', cause)
      setError(accountDeleted
        ? 'La cuenta se eliminó, pero no se pudo limpiar o cerrar la sesión de este dispositivo. Borrá los datos del sitio desde el navegador.'
        : cause.message || 'No se pudo eliminar la cuenta. Revisá la conexión e intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="delete-account" aria-labelledby="delete-account-title">
      <h3 id="delete-account-title">Eliminar cuenta</h3>
      <p className="hint">Esta acción elimina permanentemente la cuenta y los datos sincronizados. También borra los datos locales de este dispositivo; las copias guardadas sin conexión en otros dispositivos deberán borrarse allí.</p>
      {!expanded ? (
        <button type="button" className="btn danger" onClick={() => setExpanded(true)}>Eliminar cuenta y datos</button>
      ) : (
        <form className="delete-account-confirm" onSubmit={submit}>
          <p className="hint warn">Los cambios que todavía no se sincronizaron también se perderán. Para confirmar, escribí el correo actual de la cuenta.</p>
          <label>
            Correo de la cuenta
            <input type="email" autoComplete="email" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          {error && <p className="msg" role="alert">{error}</p>}
          <div className="btn-row">
            <button type="button" className="btn" disabled={busy} onClick={() => { setExpanded(false); setConfirmation(''); setError('') }}>Cancelar</button>
            <button type="submit" className="btn danger" disabled={busy || !emailMatches}>
              {busy ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
