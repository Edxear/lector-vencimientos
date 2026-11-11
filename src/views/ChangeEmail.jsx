import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { requestEmailChange } from '../lib/account'

export default function ChangeEmail({ currentEmail }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await requestEmailChange(supabase.auth, email, currentEmail)
      setEmail('')
      setMessage('Solicitud enviada. Revisá las instrucciones de confirmación en ambos correos; la confirmación requerida depende de la configuración de Supabase.')
    } catch (cause) {
      console.error('Error al solicitar el cambio de correo:', cause)
      setError(cause.message || 'No se pudo solicitar el cambio de correo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="change-email-form" onSubmit={submit}>
      <label>
        Nuevo correo de la cuenta
        <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={busy}>Solicitar cambio de correo</button>
      {message && <p className="hint" role="status">{message}</p>}
      {error && <p className="msg" role="alert">{error}</p>}
    </form>
  )
}
