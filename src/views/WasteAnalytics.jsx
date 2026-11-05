import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateItem } from '../lib/db'
import { getWasteAnalytics, formatWasteCurrency, REUSE_LABELS } from '../lib/waste'

export default function WasteAnalytics() {
  const [error, setError] = useState('')
  const all = useLiveQuery(async () => {
    const closed = await db.items.filter((item) => Boolean(item.wastedAt || item.reusedAt)).toArray()
    const products = await db.products.bulkGet(closed.map((item) => item.ean))
    return closed.map((item, index) => ({ ...item, product: products[index] }))
  }, [])

  const items = useMemo(() => (all ? all.filter((item) => item.wastedAt) : null), [all])
  const reused = useMemo(
    () => (all ? all.filter((item) => item.reusedAt && !item.wastedAt).sort((a, b) => b.reusedAt - a.reusedAt) : []),
    [all],
  )
  const analytics = useMemo(() => (items ? getWasteAnalytics(items) : null), [items])
  const sortedItems = useMemo(() => (items ? [...items].sort((a, b) => b.wastedAt - a.wastedAt) : []), [items])

  if (!items) return null

  const { months, totalLoss, pricedLots, unpricedLots, byArea } = analytics
  const max = Math.max(1, ...months.map((month) => month.total))

  async function run(action, fallback) {
    setError('')
    try {
      await action()
    } catch (e) {
      setError(e.message || fallback)
    }
  }

  // Al restaurar un lote vencido se conserva en el inventario aunque ya haya vencido
  const restore = (item) => run(
    () => updateItem(item.id, { wastedAt: null, keepActive: true }),
    'No se pudo restaurar el lote.',
  )
  const reuse = (item, label) => run(
    () => updateItem(item.id, { reusedAt: Date.now(), reuseLabel: label, wastedAt: null }),
    'No se pudo registrar la reutilización.',
  )
  const backToLoss = (item) => run(
    () => updateItem(item.id, { reusedAt: null, reuseLabel: '', wastedAt: Date.now() }),
    'No se pudo pasar el lote a pérdida.',
  )

  return (
    <div>
      <div className="card">
        <h3>Analítica de desperdicios</h3>
        <p className="hint">Pérdidas registradas al marcar lotes vencidos como desperdiciados.</p>
        <div className="waste-total">
          <span>Total con costo registrado</span>
          <strong>{formatWasteCurrency(totalLoss)}</strong>
        </div>
        <p className="hint">{pricedLots} lotes con costo · {unpricedLots} sin importe</p>
      </div>

      <section className="card" aria-labelledby="waste-chart-title">
        <h3 id="waste-chart-title">Últimos 6 meses</h3>
        <div className="waste-chart" role="group" aria-label="Pérdida registrada por mes en los últimos seis meses">
          {months.map((month) => (
            <div className="waste-month" key={month.key} role="img"
              aria-label={`${month.label}: ${formatWasteCurrency(month.total)}${month.unpriced ? `, ${month.unpriced} sin importe` : ''}`}
              title={`${month.label}: ${formatWasteCurrency(month.total)}${month.unpriced ? `, ${month.unpriced} sin importe` : ''}`}>
              <span className="waste-value">{month.total ? formatWasteCurrency(month.total) : ''}</span>
              <div className="waste-bar-track">
                <div className="waste-bar" style={{ height: `${month.total ? Math.max(4, month.total / max * 100) : 0}%` }} />
              </div>
              <span className="waste-label">{month.label}</span>
            </div>
          ))}
        </div>
        <p className="hint">El gráfico suma el costo por unidad multiplicado por la cantidad.</p>
      </section>

      {byArea.length > 0 && (
        <section className="card">
          <h3>Pérdidas por área</h3>
          <ul className="list">
            {byArea.map((a) => (
              <li className="row waste-row" key={a.area}>
                <div className="info">
                  <strong>{a.area}</strong>
                  <small>{a.lots} {a.lots === 1 ? 'lote' : 'lotes'}</small>
                </div>
                <strong>{formatWasteCurrency(a.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Historial de pérdidas</h3>
        <p className="hint">Los lotes vencidos se registran solos al pasar su fecha de vencimiento.</p>
        {error && <p className="hint warn" role="alert">{error}</p>}
        {items.length === 0 ? (
          <p className="msg">Todavía no hay pérdidas registradas. Cuando un producto venza, aparecerá acá automáticamente.</p>
        ) : (
          <ul className="list">
            {sortedItems.map((item) => (
              <li className="row waste-row" key={item.id}>
                <div className="info">
                  <strong>{item.product?.name || item.ean}</strong>
                  <small>{new Date(item.wastedAt).toLocaleDateString('es-AR')} · {item.quantity} un.{item.location ? ` · ${item.location}` : ''}</small>
                  <small>{item.unitCost == null ? 'Sin costo registrado' : formatWasteCurrency(item.unitCost * item.quantity)}</small>
                </div>
                <div className="waste-actions">
                  <select aria-label={`Reutilizado como, ${item.product?.name || item.ean}`} value=""
                    onChange={(e) => e.target.value && reuse(item, e.target.value)}>
                    <option value="">Reutilizado…</option>
                    {REUSE_LABELS.map((label) => <option key={label}>{label}</option>)}
                  </select>
                  <button className="btn small" onClick={() => restore(item)}>Restaurar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Reutilizados</h3>
        <p className="hint">Productos que se aprovecharon y no cuentan como pérdida.</p>
        {reused.length === 0 ? (
          <p className="msg">Todavía no hay productos reutilizados. Etiquetalos desde el inventario cuando estén por vencer.</p>
        ) : (
          <ul className="list">
            {reused.map((item) => (
              <li className="row waste-row" key={item.id}>
                <div className="info">
                  <strong>{item.product?.name || item.ean}</strong>
                  <small>{new Date(item.reusedAt).toLocaleDateString('es-AR')} · {item.quantity} un.{item.location ? ` · ${item.location}` : ''}</small>
                  <small><span className="reuse-tag">{item.reuseLabel || 'Reutilizado'}</span></small>
                </div>
                <button className="btn small" onClick={() => backToLoss(item)}>Pasar a pérdida</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
