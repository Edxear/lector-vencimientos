import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addItems, db, setProductArchived } from '../lib/db'
import { daysUntil } from '../lib/dates'
import { LOCATIONS } from '../lib/settings'
import { buildIcs } from '../lib/notifications'
import { hasActiveStock, isZeroStock } from '../lib/stock.js'
import EditItem from './EditItem'
import ExpiryCapture from './ExpiryCapture'

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
  const [addingProduct, setAddingProduct] = useState(null)
  const [catalogError, setCatalogError] = useState('')

  const rows = useLiveQuery(async () => {
    const items = (await db.items.orderBy('expiryDate').toArray()).filter(hasActiveStock)
    const products = await db.products.bulkGet(items.map((i) => i.ean))
    return items.map((it, i) => ({ ...it, product: products[i] }))
  }, [])
  const catalog = useLiveQuery(async () => {
    const [products, items] = await Promise.all([db.products.toArray(), db.items.toArray()])
    const active = new Set(items.filter(hasActiveStock).map((i) => i.ean))
    return products.filter((p) => !active.has(p.ean)).sort((a, b) => (a.name || a.ean).localeCompare(b.name || b.ean))
  }, [])
  const zeroRows = useLiveQuery(async () => {
    const items = (await db.items.orderBy('expiryDate').toArray()).filter((i) => !i.wastedAt && !i.reusedAt && isZeroStock(i))
    const products = await db.products.bulkGet(items.map((i) => i.ean))
    return items.map((item, index) => ({ ...item, product: products[index] }))
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
    const counts = { total: 0, expired: 0, soon: 0, none: 0, byArea: {} }
    for (const r of rows || []) {
      if (r.location) counts.byArea[r.location] = (counts.byArea[r.location] || 0) + 1
      else counts.none++
      if (area && (area === '__none' ? r.location : r.location !== area)) continue
      counts.total++
      const d = daysUntil(r.expiryDate)
      if (d < 0) counts.expired++
      else if (d <= (r.notifyDays ?? 15)) counts.soon++
    }
    return counts
  }, [rows, area])

  if (!rows) return null

  const areaLabel = area === '' ? 'Todas' : area === '__none' ? 'Sin área' : area
  const pickArea = (a) => { setArea(a); setMenuOpen(false) }

  const { expired, soon } = stats
  async function archive(product, archived) {
    setCatalogError('')
    try {
      await setProductArchived(product.ean, archived)
    } catch (e) {
      setCatalogError(e.message || 'No se pudo actualizar el producto.')
    }
  }

  async function addCatalogItem(items) {
    setCatalogError('')
    try {
      await addItems(items.map(({ key, ...item }) => ({ ...item, quantity: Number(item.quantity), ean: addingProduct.ean })))
      setAddingProduct(null)
    } catch (e) {
      setCatalogError(e.message || 'No se pudo guardar el lote.')
    }
  }
  const matchingCatalog = (catalog || []).filter((p) => !query.trim() || [p.name, p.brand, p.category, p.ean].some((v) => v?.toLowerCase().includes(query.trim().toLowerCase())))
  const catalogList = (products) => (
      <ul className="list">
        {products.map((p) => (
          <li className="row" key={p.ean}>
            {p.imageUrl ? <img className="mini" src={p.imageUrl} alt="" /> : <div className="mini ph">📦</div>}
            <div className="info"><strong>{p.name || p.ean}</strong><small>{p.ean} · {p.archived ? 'Archivado' : 'Sin stock'}</small></div>
            <div>
              <button type="button" className="btn small" onClick={() => { setCatalogError(''); setAddingProduct(p) }}>Agregar lote</button>
              <button type="button" className="btn small" onClick={() => archive(p, !p.archived)}>{p.archived ? 'Desarchivar' : 'Archivar'}</button>
            </div>
          </li>
        ))}
      </ul>
  )

  return (
    <div>
      <div className="summary">
        <div><strong>{stats.total}</strong><span>Productos</span></div>
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
      {rows.length === 0 && <p className="msg">No hay lotes con stock. Podés agregar uno o consultar los productos sin stock.</p>}
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
                {r.receivedDate && <small>Recepción: {r.receivedDate}</small>}
                {r.openedDate && <small>Abierto: {r.openedDate} · {r.openedDays} días · vencimiento original: {r.sealedExpiryDate}</small>}
                {r.product?.archived && <small>Archivado en otro dispositivo; el lote sigue activo.</small>}
              </div>
              <button className="icon-btn" aria-label="Recordatorio de calendario"
                onClick={(e) => { e.stopPropagation(); download(`${name}.ics`, buildIcs(name, r.expiryDate, r.notifyDays ?? 15), 'text/calendar') }}>🔔</button>
            </li>
          )
        })}
      </ul>
      <section className="card" aria-labelledby="catalog-title">
        <h3 id="catalog-title">Productos sin stock</h3>
        <p className="hint">Archivá los productos que no necesitás ver en la lista principal; sus datos e historial se conservan. Podés agregar un lote para reutilizarlos.</p>
        {catalogError && <p className="hint warn" role="alert">{catalogError}</p>}
        {catalog && catalog.length === 0 && <p className="hint">No hay productos sin stock.</p>}
        {catalogList(matchingCatalog.filter((p) => !p.archived))}
        {matchingCatalog.some((p) => p.archived) && <details>
          <summary>Archivados ({matchingCatalog.filter((p) => p.archived).length})</summary>
          {catalogList(matchingCatalog.filter((p) => p.archived))}
        </details>}
      </section>
      {zeroRows?.length > 0 && <section className="card">
        <details>
          <summary>Lotes con cantidad cero ({zeroRows.length})</summary>
          <p className="hint">Se conservan sin registrar pérdidas. Podés editarlos para corregir su cantidad.</p>
          <ul className="list">
            {zeroRows.filter((r) => !query.trim() || [r.product?.name, r.product?.brand, r.product?.category, r.ean].some((v) => v?.toLowerCase().includes(query.trim().toLowerCase()))).map((r) => (
              <li className="row" key={r.id}>
                <div className="info"><strong>{r.product?.name || r.ean}</strong><small>Vencimiento: {r.expiryDate} · cantidad 0{r.product?.archived ? ' · producto archivado' : ''}</small>
                  {r.receivedDate && <small>Recepción: {r.receivedDate}</small>}
                </div>
                <button type="button" className="btn small" onClick={() => setEditing(r)}>Editar lote</button>
              </li>
            ))}
          </ul>
        </details>
      </section>}
      {editing && <EditItem row={editing} onClose={() => setEditing(null)} />}
      {addingProduct && <div className="modal" role="dialog" aria-modal="true" aria-label={`Agregar lote de ${addingProduct.name}`}>
        <div className="sheet tall">
          <div className="sheet-head"><h3>Nuevo lote: {addingProduct.name}</h3>
            <button type="button" className="close-x" aria-label="Cerrar sin guardar" onClick={() => setAddingProduct(null)}>✕</button>
          </div>
          {addingProduct.archived && <p className="hint">El producto se reactivará al guardar el lote.</p>}
          {catalogError && <p className="hint warn" role="alert">{catalogError}</p>}
          <ExpiryCapture onConfirm={addCatalogItem} />
        </div>
      </div>}
    </div>
  )
}
