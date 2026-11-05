import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateItem } from '../lib/db'
import { getWasteAnalytics, formatWasteCurrency } from '../lib/waste'

export default function WasteAnalytics() {
  const [error, setError] = useState('')
  const items = useLiveQuery(async () => {
    const wasted = await db.items.filter((item) => Boolean(item.wastedAt)).toArray()
    const products = await db.products.bulkGet(wasted.map((item) => item.ean))
    return wasted.map((item, index) => ({ ...item, product: products[index] }))
  }, [])

  if (!items) return null

  const { months, totalLoss, pricedLots, unpricedLots } = getWasteAnalytics(items)
  const max = Math.max(1, ...months.map((month) => month.total))

  async function restore(item) {
    setError('')
    try {
      await updateItem(item.id, { wastedAt: null })
    } catch (e) {
      setError(e.message || 'No se pudo restaurar el lote.')
    }
  }

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

      <section className="card">
        <h3>Historial de desperdicios</h3>
        {error && <p className="hint warn" role="alert">{error}</p>}
        {items.length === 0 ? (
          <p className="msg">Todavía no hay pérdidas registradas. Marca como desperdiciado un producto vencido para empezar a medirlas.</p>
        ) : (
          <ul className="list">
            {[...items].sort((a, b) => b.wastedAt - a.wastedAt).map((item) => (
              <li className="row waste-row" key={item.id}>
                <div className="info">
                  <strong>{item.product?.name || item.ean}</strong>
                  <small>{new Date(item.wastedAt).toLocaleDateString('es-AR')} · {item.quantity} un.</small>
                  <small>{item.unitCost == null ? 'Sin costo registrado' : formatWasteCurrency(item.unitCost * item.quantity)}</small>
                </div>
                <button className="btn small" onClick={() => restore(item)}>Restaurar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
