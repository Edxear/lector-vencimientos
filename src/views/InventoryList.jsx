import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { REUSE_LABELS, buildReusePatch, buildWastePatch } from '../lib/waste'
import { addItems, db, removeItem, setProductArchived, updateItem } from '../lib/db'
import { daysUntil } from '../lib/dates'
import { LOCATIONS } from '../lib/settings'
import { buildIcs } from '../lib/notifications'
import { buildBulkMovePatch, hasActiveStock, isZeroStock, sanitizeSelectedIds } from '../lib/stock.js'
import EditItem from './EditItem'
import ExpiryCapture from './ExpiryCapture'
import EmptyState from '../components/EmptyState'



function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const color = (days, notifyDays) => (days <= 7 ? 'red' : days <= notifyDays ? 'yellow' : 'green')

export default function InventoryList({ onNavigate }) {
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addingProduct, setAddingProduct] = useState(null)
  const [catalogError, setCatalogError] = useState('')

  const [reuseTargetId, setReuseTargetId] = useState(null)
  const [actionError, setActionError] = useState('')

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLocation, setBulkLocation] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) setSelectedIds([])
      return !prev
    })
    setBulkLocation('')
    setActionError('')
  }

  function toggleSelectItem(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    if (!filtered?.length) return
    if (activeSelectedIds.length === filtered.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map((item) => item.id))
    }
  }

  async function handleBulkMove(targetLocation) {
    if (!activeSelectedIds.length) return
    setBulkBusy(true)
    setActionError('')
    try {
      const patch = buildBulkMovePatch(targetLocation)
      for (const id of activeSelectedIds) {
        await updateItem(id, patch)
      }
      setSelectedIds([])
      setSelectMode(false)
      setBulkLocation('')
    } catch (err) {
      setActionError(err.message || 'No se pudieron mover los lotes seleccionados.')
      setBulkLocation('')
    } finally {
      setBulkBusy(false)
    }
  }

  async function handleBulkDelete() {
    if (!activeSelectedIds.length) return
    if (!window.confirm(`¿Eliminar permanentemente ${activeSelectedIds.length} lote(s) seleccionado(s)? Esta acción no se puede deshacer.`)) {
      return
    }
    setBulkBusy(true)
    setActionError('')
    try {
      for (const id of activeSelectedIds) {
        await removeItem(id)
      }
      setSelectedIds([])
      setSelectMode(false)
    } catch (err) {
      setActionError(err.message || 'No se pudieron eliminar los lotes seleccionados.')
    } finally {
      setBulkBusy(false)
    }
  }


  async function handleQuickWaste(e, item) {
    e.stopPropagation()
    setActionError('')
    try {
      await updateItem(item.id, buildWastePatch())
      if (reuseTargetId === item.id) setReuseTargetId(null)
    } catch (err) {
      setActionError(err.message || 'No se pudo registrar la pérdida.')
    }
  }

  async function handleQuickReuse(e, item, label) {
    e.stopPropagation()
    setActionError('')
    try {
      await updateItem(item.id, buildReusePatch(label))
      setReuseTargetId(null)
    } catch (err) {
      setActionError(err.message || 'No se pudo registrar el aprovechamiento.')
    }
  }


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

  const statusCounts = useMemo(() => {
    const counts = { all: 0, expired: 0, soon: 0, opened: 0, unpriced: 0 }
    for (const r of rows || []) {
      if (area && (area === '__none' ? r.location : r.location !== area)) continue
      counts.all++
      const d = daysUntil(r.expiryDate)
      if (d < 0) counts.expired++
      else if (d <= (r.notifyDays ?? 15)) counts.soon++
      if (r.openedDate) counts.opened++
      if (r.unitCost == null) counts.unpriced++
    }
    return counts
  }, [rows, area])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!rows) return rows
    const matches = rows
      .filter((r) => !area || (area === '__none' ? !r.location : r.location === area))
      .filter((r) => {
        if (statusFilter === 'all') return true
        const d = daysUntil(r.expiryDate)
        if (statusFilter === 'expired') return d < 0
        if (statusFilter === 'soon') return d >= 0 && d <= (r.notifyDays ?? 15)
        if (statusFilter === 'opened') return Boolean(r.openedDate)
        if (statusFilter === 'unpriced') return r.unitCost == null
        return true
      })
      .filter((r) => !q || [r.product?.name, r.product?.brand, r.product?.category, r.location, r.notes].some((v) => v?.toLowerCase().includes(q)))
    return area === '' ? matches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)) : matches
  }, [rows, query, area, statusFilter])

  const activeSelectedIds = useMemo(
    () => sanitizeSelectedIds(selectedIds, filtered || []),
    [selectedIds, filtered],
  )

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

  const pickArea = (a) => setArea(a)

  const { expired, soon } = stats
  function clearFilters() {
    setQuery('')
    setArea('')
    setStatusFilter('all')
  }

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
      <ul className="list catalog-list">
        {products.map((p) => (
          <li className="row catalog-row" key={p.ean}>
            {p.imageUrl ? <img className="mini" src={p.imageUrl} alt="" /> : <div className="mini ph">📦</div>}
            <div className="info"><strong>{p.name || p.ean}</strong><small>{p.ean} · {p.archived ? 'Archivado' : 'Sin stock'}</small></div>
            <div className="catalog-actions">
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
        <button
          type="button"
          className={`summary-filter y ${statusFilter === 'soon' ? 'on' : ''}`}
          aria-pressed={statusFilter === 'soon'}
          onClick={() => setStatusFilter(statusFilter === 'soon' ? 'all' : 'soon')}
        >
          <strong>{soon}</strong><span>Por vencer</span>
        </button>
        <button
          type="button"
          className={`summary-filter r ${statusFilter === 'expired' ? 'on' : ''}`}
          aria-pressed={statusFilter === 'expired'}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
        >
          <strong>{expired}</strong><span>Vencidos</span>
        </button>
      </div>
      
      <div className="toolbar">
        <input className="search" type="search" placeholder="Buscar por nombre, marca, área…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        {rows.length > 0 && (
          <button
            type="button"
            className={`btn small ${selectMode ? 'primary' : ''}`}
            onClick={toggleSelectMode}
          >
            {selectMode ? 'Listo' : 'Seleccionar'}
          </button>
        )}
      </div>

      {/* Pestañas deslizables para las áreas */}
      {actionError && <p className="hint warn" role="alert">{actionError}</p>}
      <div className="chips areas" role="tablist" aria-label="Filtrar por ubicación">
        <button
          type="button"
          role="tab"
          aria-selected={area === ''}
          className={`chip ${area === '' ? 'on' : ''}`}
          onClick={() => pickArea('')}
        >
          Todas ({rows.length})
        </button>
        {areas.map((a) => (
          <button
            type="button"
            role="tab"
            key={a}
            aria-selected={area === a}
            className={`chip ${area === a ? 'on' : ''}`}
            onClick={() => pickArea(a)}
          >
            {a} ({stats.byArea[a] || 0})
          </button>
        ))}
        {stats.none > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={area === '__none'}
            className={`chip ${area === '__none' ? 'on' : ''}`}
            onClick={() => pickArea('__none')}
          >
            Sin área ({stats.none})
          </button>
        )}
      </div>

      {/* Filtros rápidos de estado */}
      <div className="chips areas" role="group" aria-label="Filtros rápidos por estado">
        <button
          type="button"
          aria-pressed={statusFilter === 'all'}
          className={`chip ${statusFilter === 'all' ? 'on' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          Todos ({statusCounts.all})
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'soon'}
          className={`chip ${statusFilter === 'soon' ? 'on' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'soon' ? 'all' : 'soon')}
        >
          🟡 Vencen pronto ({statusCounts.soon})
        </button>
        <button
          type="button"
          aria-pressed={statusFilter === 'expired'}
          className={`chip ${statusFilter === 'expired' ? 'on' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'expired' ? 'all' : 'expired')}
        >
          🔴 Vencidos ({statusCounts.expired})
        </button>
        {statusCounts.opened > 0 && (
          <button
            type="button"
            aria-pressed={statusFilter === 'opened'}
            className={`chip ${statusFilter === 'opened' ? 'on' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'opened' ? 'all' : 'opened')}
          >
            📦 Abiertos ({statusCounts.opened})
          </button>
        )}
        {statusCounts.unpriced > 0 && (
          <button
            type="button"
            aria-pressed={statusFilter === 'unpriced'}
            className={`chip ${statusFilter === 'unpriced' ? 'on' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'unpriced' ? 'all' : 'unpriced')}
          >
            💲 Sin costo ({statusCounts.unpriced})
          </button>
        )}
      </div>

      {selectMode && rows.length > 0 && (
        <div className="bulk-bar card" role="region" aria-label="Acciones en lote">
          <div className="bulk-bar-top">
            <strong>{activeSelectedIds.length} seleccionado(s)</strong>
            <button type="button" className="waste-text-button" onClick={toggleSelectAll}>
              {activeSelectedIds.length === filtered.length && filtered.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="btn-row">
            <select
              aria-label="Mover seleccionados a área"
              value={bulkLocation}
              disabled={!activeSelectedIds.length || bulkBusy}
              onChange={(e) => {
                const next = e.target.value
                setBulkLocation(next)
                if (next !== '') handleBulkMove(next === '__none' ? '' : next)
              }}
            >
              <option value="">Mover a área…</option>
              <option value="__none">Sin área</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn small danger"
              disabled={!activeSelectedIds.length || bulkBusy}
              onClick={handleBulkDelete}
            >
              Eliminar ({activeSelectedIds.length})
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState 
          icon="🛒"
          title="Tu inventario está vacío"
          description="Escanea tu primer ticket de compra o agrega un producto manualmente para empezar a controlar sus vencimientos."
          actionLabel="Cargar mi primera compra"
          onAction={() => onNavigate && onNavigate('purchases')}
        />
      ) : (
        filtered.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="No encontramos productos"
            description="Probá cambiar la búsqueda o los filtros para volver a ver productos."
            actionLabel="Limpiar filtros"
            onAction={clearFilters}
          />
        ) : (
          <ul className={`list ${area === '' && !selectMode ? 'carousel' : ''}`} aria-label={area === '' ? 'Productos ordenados por vencimiento más próximo' : undefined}>
            {filtered.map((r) => {
            const days = daysUntil(r.expiryDate)
            const name = r.product?.name || r.ean
            const sub = [r.product?.brand, r.product?.content].filter(Boolean).join(' · ')
            const isChoosingReuse = reuseTargetId === r.id
            const isSelected = activeSelectedIds.includes(r.id)
            return (
              <li
                key={r.id}
                className={`row ${color(days, r.notifyDays ?? 15)} ${isSelected ? 'selected' : ''}`}
                onClick={() => (selectMode ? toggleSelectItem(r.id) : setEditing(r))}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    className="bulk-check"
                    checked={isSelected}
                    aria-label={`Seleccionar ${name}`}
                    onChange={() => toggleSelectItem(r.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
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

                  {!selectMode && isChoosingReuse && (
                    <div className="waste-reuse-options" onClick={(e) => e.stopPropagation()}>
                      {REUSE_LABELS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          className="chip"
                          onClick={(e) => handleQuickReuse(e, r, label)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!selectMode && (
                  <div className="quick-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`icon-btn reuse ${isChoosingReuse ? 'on' : ''}`}
                      title="Marcar como aprovechado / reutilizado"
                      aria-label={`Marcar ${name} como reutilizado`}
                      aria-expanded={isChoosingReuse}
                      onClick={() => setReuseTargetId(isChoosingReuse ? null : r.id)}
                    >
                      ♻️
                    </button>
                    <button
                      type="button"
                      className="icon-btn waste"
                      title="Marcar como pérdida"
                      aria-label={`Marcar ${name} como pérdida`}
                      onClick={(e) => handleQuickWaste(e, r)}
                    >
                      🗑️
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Recordatorio de calendario"
                      aria-label="Recordatorio de calendario"
                      onClick={(e) => { e.stopPropagation(); download(`${name}.ics`, buildIcs(name, r.expiryDate, r.notifyDays ?? 15), 'text/calendar') }}
                    >
                      🔔
                    </button>
                  </div>
                )}
              </li>
            )
            })}
          </ul>
        )
      )}

      <section className="card" aria-labelledby="catalog-title">
        <h3 id="catalog-title">Productos sin stock</h3>
        <p className="hint">Archivá los productos que no necesitás ver en la lista principal; sus datos e historial se conservan. Podés agregar un lote para reutilizarlos.</p>
        {catalogError && <p className="hint warn" role="alert">{catalogError}</p>}

        {catalog && catalog.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No hay productos sin stock"
            description="Todos los productos que registraste tienen stock activo en este momento."
          />
        ) : (
          <>
            {catalogList(matchingCatalog.filter((p) => !p.archived))}
            {matchingCatalog.some((p) => p.archived) && <details>
              <summary>Archivados ({matchingCatalog.filter((p) => p.archived).length})</summary>
              {catalogList(matchingCatalog.filter((p) => p.archived))}
            </details>}
          </>
        )}
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