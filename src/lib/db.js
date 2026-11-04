import Dexie from 'dexie'
import { supabase } from './supabase'

export const db = new Dexie('lector-vencimientos')

db.version(1).stores({
  products: 'ean, name',
  items: 'id, ean, expiryDate',
  outbox: '++seq',
  events: '++id, type, ts',
})

const toRemoteProduct = (p) => ({
  ean: p.ean, name: p.name, brand: p.brand || '', content: p.content || '',
  image_url: p.imageUrl || '', category: p.category || '', source: p.source || 'manual',
})
const fromRemoteProduct = (r) => ({
  ean: r.ean, name: r.name, brand: r.brand, content: r.content,
  imageUrl: r.image_url, category: r.category, source: r.source,
})
const toRemoteItem = (i) => ({
  id: i.id, ean: i.ean, expiry_date: i.expiryDate, quantity: i.quantity, location: i.location || '',
  notes: i.notes || '', notify_days: i.notifyDays ?? 15, expiry_photo: i.expiryPhoto || '',
  notified_at: i.notifiedAt ? new Date(i.notifiedAt).toISOString() : null,
})
const fromRemoteItem = (r) => ({
  id: r.id, ean: r.ean, expiryDate: r.expiry_date, quantity: r.quantity, location: r.location,
  notes: r.notes, notifyDays: r.notify_days, expiryPhoto: r.expiry_photo,
  notifiedAt: r.notified_at ? Date.parse(r.notified_at) : null, addedAt: Date.parse(r.created_at),
})

export const getProduct = (ean) => db.products.get(ean)

export async function saveProduct(product) {
  await db.products.put(product)
  await db.outbox.add({ op: 'upsert', table: 'products', row: toRemoteProduct(product) })
  flush()
}

export async function addItem(data) {
  const item = {
    id: crypto.randomUUID(),
    quantity: 1,
    location: '',
    notes: '',
    notifyDays: 15,
    expiryPhoto: '',
    ...data,
    addedAt: Date.now(),
    notifiedAt: null,
  }
  await db.items.add(item)
  await db.outbox.add({ op: 'upsert', table: 'items', row: toRemoteItem(item) })
  flush()
  return item.id
}

export async function updateItem(id, patch) {
  const current = await db.items.get(id)
  if (!current) return
  const rearm = patch.expiryDate !== current.expiryDate || patch.notifyDays !== current.notifyDays
  const next = { ...current, ...patch, notifiedAt: rearm ? null : current.notifiedAt }
  await db.items.put(next)
  await db.outbox.add({ op: 'upsert', table: 'items', row: toRemoteItem(next) })
  flush()
}

export async function markNotified(id) {
  const item = await db.items.get(id)
  if (!item) return
  await updateItem(id, { notifiedAt: Date.now(), expiryDate: item.expiryDate, notifyDays: item.notifyDays })
}

export async function removeItem(id) {
  await db.items.delete(id)
  await db.outbox.add({ op: 'delete', table: 'items', row: { id } })
  flush()
}

export async function logEvent(type, data = {}) {
  await db.events.add({ type, data, ts: Date.now() })
}

export async function exportAll() {
  return {
    products: await db.products.toArray(),
    items: (await db.items.toArray()).map(({ expiryPhoto, ...rest }) => ({ ...rest, hasExpiryPhoto: !!expiryPhoto })),
    events: await db.events.toArray(),
  }
}

let flushing = null

// Envía a Supabase los cambios hechos offline, en orden
export function flush() {
  if (!navigator.onLine) return Promise.resolve()
  if (!flushing) {
    flushing = (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const pending = await db.outbox.orderBy('seq').toArray()
      for (const job of pending) {
        const q = supabase.from(job.table)
        const { error } =
          job.op === 'delete'
            ? await q.delete().eq('id', job.row.id)
            : await q.upsert(job.row, job.table === 'products' ? { onConflict: 'user_id,ean' } : undefined)
        if (error) return
        await db.outbox.delete(job.seq)
      }
    })().finally(() => { flushing = null })
  }
  return flushing
}

// Baja el estado de la nube. Solo reemplaza lo local si no hay cambios pendientes.
export async function pull() {
  if (!navigator.onLine) return
  await flush()
  if ((await db.outbox.count()) > 0) return
  const [p, i] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('items').select('*'),
  ])
  if (p.error || i.error) return
  await db.transaction('rw', db.products, db.items, db.outbox, async () => {
    if ((await db.outbox.count()) > 0) return
    await db.products.clear()
    await db.items.clear()
    await db.products.bulkPut(p.data.map(fromRemoteProduct))
    await db.items.bulkPut(i.data.map(fromRemoteItem))
  })
}

export async function clearLocal() {
  await Promise.all([db.products.clear(), db.items.clear(), db.outbox.clear()])
}
