import webpush from 'web-push'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

async function rpc(name, body) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`)
  return r.json().catch(() => null)
}

// Se ejecuta una vez al día (vercel.json). Vercel envía CRON_SECRET como Bearer.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VITE_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )
    const rows = (await rpc('cron_due', { secret })) || []
    const delivered = new Set()
    const dead = new Set()
    let failed = 0

    await Promise.all(
      rows.map(async (r) => {
        const when =
          r.days_left < 0 ? `venció hace ${-r.days_left} día(s)` : r.days_left === 0 ? 'vence hoy' : `vence en ${r.days_left} día(s)`
        const payload = JSON.stringify({ title: 'Próximo a vencer', body: `${r.name} ${when}`, tag: `item-${r.item_id}` })
        try {
          await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload)
          delivered.add(r.item_id)
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) dead.add(r.endpoint)
          else {
            failed++
            console.error('Falló el envío de una notificación push:', { status: e.statusCode, code: e.code })
          }
        }
      }),
    )

    await Promise.all([...dead].map((endpoint) => rpc('cron_drop_sub', { secret, endpoint })))
    if (delivered.size) await rpc('cron_mark', { secret, ids: [...delivered] })

    res.status(failed ? 503 : 200).json({
      due: new Set(rows.map((r) => r.item_id)).size,
      delivered: delivered.size,
      removedSubscriptions: dead.size,
      failedSends: failed,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
