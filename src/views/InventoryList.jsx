import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { daysUntil } from '../lib/dates'
import { LOCATIONS } from '../lib/settings'
import { buildIcs } from '../lib/notifications'
import EditItem from './EditItem'

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const color = (days, notifyDays) => (days <= 7 ? 'red' : days <= notifyDays ? 'yellow' : 'green')

export default function InventoryList() {
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')

  const rows = useLiveQuery(async () => {
    const items = await db.items.orderBy('expiryDate').toArray()
    const products = await db.products.bulkGet(items.map((i) => i.ean))
    return items.map((it, i) => ({ ...it, product: products[i] }))
  }, [])

  const areas = useMemo(
    () => [...new Set([...LOCATIONS, ...(rows || []).map((r) => r.location).filter(Boolean)])],
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!rows) return rows
    return rows
      .filter((r) => !area || (area === '__none' ? !r.location : r.location === area))
      .filter((r) => !q || [r.product?.name, r.product?.brand, r.product?.category, r.location, r.notes].some((v) => v?.toLowerCase().includes(q)))
  }, [rows, query, area])

  if (!rows) return null

  const expired = rows.filter((r) => daysUntil(r.expiryDate) < 0).length
  const soon = rows.filter((r) => { const d = daysUntil(r.expiryDate); return d >= 0 && d <= (r.notifyDays ?? 15) }).length

  return (
    <div>
      <div className="summary">
        <div><strong>{rows.length}</strong><span>Productos</span></div>
        <div className="y"><strong>{soon}</strong><span>Por vencer</span></div>
        <div className="r"><strong>{expired}</strong><span>Vencidos</span></div>
      </div>
      <input className="search" type="search" placeholder="Buscar por nombre, marca, área…"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips areas">
        <button type="button" className={`chip ${area === '' ? 'on' : ''}`} onClick={() => setArea('')}>Todas</button>
        {areas.map((a) => (
          <button type="button" key={a} className={`chip ${area === a ? 'on' : ''}`} onClick={() => setArea(a)}>
            {a} ({rows.filter((r) => r.location === a).length})
          </button>
        ))}
        {rows.some((r) => !r.location) && (
          <button type="button" className={`chip ${area === '__none' ? 'on' : ''}`} onClick={() => setArea('__none')}>Sin área</button>
        )}
      </div>
      {rows.length === 0 && <p className="msg">Todavía no hay productos. Usa “Agregar” para escanear el primero.</p>}
      <ul className="list">
        {filtered.map((r) => {
          const days = daysUntil(r.expiryDate)
          const name = r.product?.name || r.ean
          const sub = [r.product?.brand, r.product?.content].filter(Boolean).join(' · ')
          return (
            <li key={r.id} className={`row ${color(days, r.notifyDays ?? 15)}`} onClick={() => setEditing(r)}>
              {r.product?.imageUrl ? <img className="mini" src={r.product.imageUrl} alt="" /> : <div className="mini ph">📦</div>}
              <div className="info">
                <strong>{name}</strong>
                {sub && <small>{sub}</small>}
                <small>
                  {r.expiryDate} · {days < 0 ? `venció hace ${-days} d` : days === 0 ? 'vence hoy' : `${days} d`}
                  {r.quantity > 1 ? ` · x${r.quantity}` : ''}{r.location ? ` · ${r.location}` : ''}
                </small>
              </div>
              <button className="icon-btn" aria-label="Recordatorio de calendario"
                onClick={(e) => { e.stopPropagation(); download(`${name}.ics`, buildIcs(name, r.expiryDate, r.notifyDays ?? 15), 'text/calendar') }}>🔔</button>
            </li>
          )
        })}
      </ul>
      {editing && <EditItem row={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
