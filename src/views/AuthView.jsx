import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Revisa tu correo para confirmar la cuenta.')
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>{mode === 'in' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>
      <input type="email" placeholder="Email" value={email} required autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Contraseña (mín. 6)" value={password} required minLength={6}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn primary" disabled={busy}>{mode === 'in' ? 'Entrar' : 'Registrarme'}</button>
      <button type="button" className="btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'Crear cuenta' : 'Ya tengo cuenta'}
      </button>
      {msg && <p className="msg">{msg}</p>}
    </form>
  )
}
