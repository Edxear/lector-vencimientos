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
  const [menuOpen, setMenuOpen] = useState(false)

  const rows = useLiveQuery(async () => {
    const items = (await db.items.orderBy('expiryDate').toArray()).filter((item) => !item.wastedAt)
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

  const stats = useMemo(() => {
    const counts = { expired: 0, soon: 0, none: 0, byArea: {} }
    for (const r of rows || []) {
      const d = daysUntil(r.expiryDate)
      if (d < 0) counts.expired++
      else if (d <= (r.notifyDays ?? 15)) counts.soon++
      if (r.location) counts.byArea[r.location] = (counts.byArea[r.location] || 0) + 1
      else counts.none++
    }
    return counts
  }, [rows])

  if (!rows) return null

  const areaLabel = area === '' ? 'Todas' : area === '__none' ? 'Sin área' : area
  const pickArea = (a) => { setArea(a); setMenuOpen(false) }

  const { expired, soon } = stats

  return (
    <div>
      <div className="summary">
        <div><strong>{rows.length}</strong><span>Productos</span></div>
        <div className="y"><strong>{soon}</strong><span>Por vencer</span></div>
        <div className="r"><strong>{expired}</strong><span>Vencidos</span></div>
      </div>
      <div className="toolbar">
        <button type="button" className="burger" aria-label="Menú de áreas" aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}>
          <span /><span /><span />
        </button>
        <input className="search" type="search" placeholder="Buscar por nombre, marca, área…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <p className="hint area-current">Área: <strong>{areaLabel}</strong></p>
      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" role="dialog" aria-label="Áreas" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h3>Áreas</h3>
              <button type="button" className="close-x" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <button type="button" className={`drawer-item ${area === '' ? 'on' : ''}`} onClick={() => pickArea('')}>
              Todas <span>{rows.length}</span>
            </button>
            {areas.map((a) => (
              <button type="button" key={a} className={`drawer-item ${area === a ? 'on' : ''}`} onClick={() => pickArea(a)}>
                {a} <span>{stats.byArea[a] || 0}</span>
              </button>
            ))}
            {stats.none > 0 && (
              <button type="button" className={`drawer-item ${area === '__none' ? 'on' : ''}`} onClick={() => pickArea('__none')}>
                Sin área <span>{stats.none}</span>
              </button>
            )}
          </aside>
        </div>
      )}
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
