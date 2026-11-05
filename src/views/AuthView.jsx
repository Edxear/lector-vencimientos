import { useState } from 'react'
import { supabase } from '../lib/supabase'

const FRIENDLY_ERRORS = [
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.'],
  [/already registered|already been registered/i, 'Ya existe una cuenta con ese email.'],
  [/rate limit|too many/i, 'Demasiados intentos. Probá de nuevo en unos minutos.'],
  [/failed to fetch|network/i, 'No hay conexión. Verificá tu internet e intentá de nuevo.'],
]

const friendly = (m) => FRIENDLY_ERRORS.find(([re]) => re.test(m))?.[1] || 'No se pudo completar la acción. Intentá de nuevo.'

export default function AuthView() {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      const { data, error } =
        mode === 'in'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (error) setMsg(friendly(error.message))
      else if (mode === 'up' && !data.session) setMsg('Revisa tu correo para confirmar la cuenta.')
    } catch (err) {
      setMsg(friendly(err?.message || ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card welcome">
        <h3>Nunca más tires comida vencida</h3>
        <ol className="steps">
          <li><strong>Escaneá</strong> el código de barras del producto.</li>
          <li><strong>Fotografiá</strong> la fecha: la app la lee por vos.</li>
          <li><strong>Recibí avisos</strong> antes de que venza.</li>
        </ol>
        <p className="hint">Te pediremos acceso a la cámara para escanear y, si querés, a las notificaciones para avisarte. Tus datos funcionan sin conexión.</p>
      </section>
      <form className="card" onSubmit={submit}>
        <h3>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>
        <input type="email" placeholder="Email" aria-label="Email" value={email} required autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña (mín. 6)" aria-label="Contraseña" value={password} required minLength={6}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn primary" disabled={busy}>{mode === 'in' ? 'Entrar' : 'Registrarme'}</button>
        <button type="button" className="btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Crear cuenta' : 'Ya tengo cuenta'}
        </button>
        {msg && <p className="msg" role="alert">{msg}</p>}
      </form>
    </>
  )
}
