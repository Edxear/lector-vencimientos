import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }

  const authorization = req.headers.authorization
  const token = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : null
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    console.error('Falta configuración de Supabase para eliminar cuentas.')
    return res.status(503).json({ error: 'La eliminación de cuenta no está configurada en el servidor.' })
  }
  if (!token) return res.status(401).json({ error: 'La sesión no es válida.' })

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error: authError } = await authClient.auth.getUser(token)
  if (authError) {
    console.error('No se pudo validar la sesión antes de eliminar la cuenta:', authError)
    const invalidSession = authError.status === 401
    return res.status(invalidSession ? 401 : 502).json({
      error: invalidSession
        ? 'La sesión venció. Volvé a iniciar sesión e intentá de nuevo.'
        : 'No se pudo validar la sesión. Revisá la conexión e intentá de nuevo.',
    })
  }
  if (!data.user) return res.status(401).json({ error: 'La sesión no es válida.' })

  const adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id)
  if (deleteError) {
    console.error('No se pudo eliminar la cuenta de Supabase:', deleteError)
    return res.status(500).json({ error: 'No se pudo eliminar la cuenta. Revisá la conexión e intentá de nuevo.' })
  }

  return res.status(200).json({ ok: true })
}
