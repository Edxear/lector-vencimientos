import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

function b64ToU8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const pushSupported = () =>
  !!VAPID && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// 'unsupported' | 'denied' | 'on' | 'off'
export async function getPushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

async function saveSubscription(sub) {
  const j = sub.toJSON()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
  if (error) throw error
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('Este navegador no soporta avisos push.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado.')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID) }))
  await saveSubscription(sub)
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

// Reasocia la suscripción existente con el usuario que acaba de entrar
export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await saveSubscription(sub).catch(() => {})
}
