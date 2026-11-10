import Dexie from 'dexie'
import { supabase } from './supabase'
import { shouldAutoWaste, expiredAt } from './waste'
import { hasActiveStock } from './stock.js'

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
  archived: !!p.archived,
})
const fromRemoteProduct = (r) => ({
  ean: r.ean, name: r.name, brand: r.brand, content: r.content,
  imageUrl: r.image_url, category: r.category, source: r.source,
  archived: !!r.archived,
})
const toRemoteItem = (i) => ({
  id: i.id, ean: i.ean, expiry_date: i.expiryDate, quantity: i.quantity, location: i.location || '',
  notes: i.notes || '', notify_days: i.notifyDays ?? 15, expiry_photo: i.expiryPhoto || '',
  notified_at: i.notifiedAt ? new Date(i.notifiedAt).toISOString() : null,
  unit_cost: i.unitCost ?? null,
  received_date: i.receivedDate || null,
  wasted_at: i.wastedAt ? new Date(i.wastedAt).toISOString() : null,
  reused_at: i.reusedAt ? new Date(i.reusedAt).toISOString() : null,
  reuse_label: i.reuseLabel || '',
  keep_active: !!i.keepActive,
})
const fromRemoteItem = (r) => ({
  id: r.id, ean: r.ean, expiryDate: r.expiry_date, quantity: r.quantity, location: r.location,
  notes: r.notes, notifyDays: r.notify_days, expiryPhoto: r.expiry_photo,
  notifiedAt: r.notified_at ? Date.parse(r.notified_at) : null, addedAt: Date.parse(r.created_at),
  unitCost: r.unit_cost == null ? null : Number(r.unit_cost),
  receivedDate: r.received_date || '',
  wastedAt: r.wasted_at ? Date.parse(r.wasted_at) : null,
  reusedAt: r.reused_at ? Date.parse(r.reused_at) : null,
  reuseLabel: r.reuse_label || '',
  keepActive: !!r.keep_active,
})

export const getProduct = (ean) => db.products.get(ean)

export async function saveProduct(product) {
  await db.transaction('rw', db.products, db.outbox, async () => {
    const current = await db.products.get(product.ean)
    const next = { ...current, ...product, archived: current?.archived ?? !!product.archived }
    await db.products.put(next)
    await db.outbox.add({ op: 'upsert', table: 'products', row: toRemoteProduct(next) })
  })
  flush()
}

export async function setProductArchived(ean, archived) {
  await db.transaction('rw', db.products, db.items, db.outbox, async () => {
    const product = await db.products.get(ean)
    if (!product) throw new Error('No se encontró el producto.')
    if (archived && (await db.items.where('ean').equals(ean).toArray()).some(hasActiveStock)) {
      throw new Error('No se puede archivar un producto con lotes activos con stock.')
    }
    const next = { ...product, archived }
    await db.products.put(next)
    await db.outbox.add({ op: 'upsert', table: 'products', row: toRemoteProduct(next) })
  })
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
    unitCost: null,
    receivedDate: '',
    wastedAt: null,
    reusedAt: null,
    reuseLabel: '',
    keepActive: false,
    ...data,
    addedAt: Date.now(),
    notifiedAt: null,
  }
  await db.transaction('rw', db.products, db.items, db.outbox, async () => {
    const product = await db.products.get(item.ean)
    if (product?.archived && hasActiveStock(item)) {
      const active = { ...product, archived: false }
      await db.products.put(active)
      await db.outbox.add({ op: 'upsert', table: 'products', row: toRemoteProduct(active) })
    }
    await db.items.add(item)
    await db.outbox.add({ op: 'upsert', table: 'items', row: toRemoteItem(item) })
  })
  flush()
  return item.id
}

export async function updateItem(id, patch, { autoWasteAt } = {}) {
  const updated = await db.transaction('rw', db.products, db.items, db.outbox, async () => {
    const current = await db.items.get(id)
    if (!current) throw new Error('No se encontró el lote.')
    if (autoWasteAt != null) {
      if (!shouldAutoWaste(current, autoWasteAt)) return false
      patch = { ...patch, wastedAt: expiredAt(current.expiryDate) }
    }
    const rearm = ('expiryDate' in patch && patch.expiryDate !== current.expiryDate) ||
      ('notifyDays' in patch && patch.notifyDays !== current.notifyDays)
    const next = { ...current, ...patch, notifiedAt: rearm ? null : ('notifiedAt' in patch ? patch.notifiedAt : current.notifiedAt) }
    if (hasActiveStock(next)) {
      const product = await db.products.get(next.ean)
      if (product?.archived) {
        const active = { ...product, archived: false }
        await db.products.put(active)
        await db.outbox.add({ op: 'upsert', table: 'products', row: toRemoteProduct(active) })
      }
    }
    await db.items.put(next)
    await db.outbox.add({ op: 'upsert', table: 'items', row: toRemoteItem(next) })
    return true
  })
  if (updated) flush()
  return updated
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

// Registra como pérdida, con la fecha en que venció, todo lote vencido que no tenga destino
let autoWasting = null
export function autoWasteExpired() {
  if (!autoWasting) {
    autoWasting = (async () => {
      const now = Date.now()
      const due = (await db.items.toArray()).filter((item) => shouldAutoWaste(item, now))
      let count = 0
      for (const item of due) if (await updateItem(item.id, {}, { autoWasteAt: now })) count++
      return count
    })().finally(() => { autoWasting = null })
  }
  return autoWasting
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
export const SYNC_STATUS_EVENT = 'lector:sync-status'

function reportSyncStatus(ok, message = '') {
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { ok, message } }))
}

// Envía a Supabase los cambios hechos offline, en orden
export function flush() {
  if (!navigator.onLine) return Promise.resolve(false)
  if (flushing) return flushing.then((ok) => ok ? flush() : false)
  if (!flushing) {
    flushing = (async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session) return false
      const pending = await db.outbox.orderBy('seq').toArray()
      for (const job of pending) {
        const q = supabase.from(job.table)
        const { error } =
          job.op === 'delete'
            ? await q.delete().eq('id', job.row.id)
            : await q.upsert(job.row, job.table === 'products' ? { onConflict: 'user_id,ean' } : undefined)
        if (error) throw error
        await db.outbox.delete(job.seq)
      }
      reportSyncStatus(true)
      return true
    })().catch((error) => {
      console.error('Error de sincronización:', error)
      reportSyncStatus(
        false,
        'No se pudieron sincronizar los cambios. Tus datos siguen guardados en este dispositivo; vuelve a intentarlo.',
      )
      return false
    }).finally(() => { flushing = null })
  }
  return flushing
}

export const pendingChanges = () => db.outbox.count()

// Baja el estado de la nube. Solo reemplaza lo local si no hay cambios pendientes.
export async function pull() {
  if (!navigator.onLine) return
  await flush()
  if ((await db.outbox.count()) > 0) return
  const [p, i] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('items').select('*'),
  ])
  if (p.error || i.error) {
    console.error('Error al actualizar los datos desde la nube:', p.error || i.error)
    throw new Error('No se pudieron actualizar los datos desde la nube.')
  }
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
