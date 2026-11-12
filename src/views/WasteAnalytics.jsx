import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateItem } from '../lib/db'
import { getMonthlyReuseSavings, getWasteAnalytics, getMonthlyWasteTrends, wasteTrendsCsv, formatWasteCurrency, REUSE_LABELS } from '../lib/waste'

const compactCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const areaIcon = (area) => /frío|heladera|congelad/i.test(area)
  ? '🧊'
  : /baño/i.test(area) ? '🧴' : /sin área/i.test(area) ? '📍' : '📦'

export default function WasteAnalytics() {
  const [error, setError] = useState('')
  const [reuseOptionsId, setReuseOptionsId] = useState(null)
  const [editingCostId, setEditingCostId] = useState(null)
  const [costDraft, setCostDraft] = useState('')
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
  const savings = useMemo(() => (all ? getMonthlyReuseSavings(all) : null), [all])
  const trends = useMemo(() => (all ? getMonthlyWasteTrends(all) : []), [all])

  if (!items || !savings) return null

  const { months, totalLoss, pricedLots, unpricedLots, byArea } = analytics
  const max = Math.max(1, ...months.map((month) => month.total))
  const activeMonths = months.filter((month) => month.total > 0).length
  const current = trends.at(-1)
  const previous = trends.at(-2)

  function exportTrends() {
    const url = URL.createObjectURL(new Blob(['\uFEFF', wasteTrendsCsv(trends)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'tendencias-inventario.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function run(action, fallback) {
    setError('')
    try {
      await action()
    } catch (e) {
      setError(e.message || fallback)
    }
  }

  const reuse = (item, label) => run(
    () => updateItem(item.id, { reusedAt: Date.now(), reuseLabel: label, wastedAt: null }),
    'No se pudo registrar la reutilización.',
  )
  const backToLoss = (item) => run(
    () => updateItem(item.id, { reusedAt: null, reuseLabel: '', wastedAt: Date.now() }),
    'No se pudo pasar el lote a pérdida.',
  )
  const undoLoss = (item) => run(
    () => updateItem(item.id, { wastedAt: null, keepActive: true }),
    'No se pudo devolver el producto al inventario.',
  )
  const saveCost = async (item) => {
    const value = Number(costDraft)
    if (!costDraft.trim() || !Number.isFinite(value) || value < 0) {
      setError('Ingresá un costo válido igual o mayor que cero.')
      return
    }
    await run(async () => {
      await updateItem(item.id, { unitCost: value })
      setEditingCostId(null)
    }, 'No se pudo guardar el costo.')
  }
  const areaDenominator = totalLoss > 0 ? totalLoss : byArea.reduce((sum, area) => sum + area.lots, 0)

  return (
    <div className="waste-analytics">
      <div className="card">
        <h3>Resumen de pérdidas</h3>
        <p className="hint">Este es el valor de los productos que tuviste que descartar.</p>
        <div className="waste-total">
          <span>Valor perdido</span>
          <strong>{formatWasteCurrency(totalLoss)}</strong>
          <span className="waste-total-detail">
            {pricedLots > 0
              ? `Valor de ${pricedLots} ${pricedLots === 1 ? 'producto descartado' : 'productos descartados'} con costo registrado`
              : 'Todavía no hay costos registrados'}
            {unpricedLots > 0 ? ` · ${unpricedLots} ${unpricedLots === 1 ? 'producto' : 'productos'} sin costo registrado` : ''}
          </span>
        </div>
        <div className="waste-savings">
          <span className="waste-savings-icon" aria-hidden="true">↗</span>
          <div>
            <span>Ahorro estimado este mes</span>
            <strong>{formatWasteCurrency(savings.total)}</strong>
            <small>
              {savings.totalLots === 0
                ? 'Todavía no hay productos consumidos a tiempo este mes'
                : `${savings.totalLots} ${savings.totalLots === 1 ? 'producto consumido' : 'productos consumidos'} a tiempo${savings.pricedLots < savings.totalLots ? ' · algunos sin costo registrado' : ''}`}
            </small>
          </div>
        </div>
      </div>

      <section className="card" aria-labelledby="waste-chart-title">
        <h3 id="waste-chart-title">Últimos 6 meses</h3>
        <div className="waste-chart" role="group" aria-label="Valor de productos vencidos por mes en los últimos seis meses">
          {months.map((month) => (
            <div className="waste-month" key={month.key} role="img"
              aria-label={`${month.label}: ${formatWasteCurrency(month.total)}${month.unpriced ? `, ${month.unpriced} sin importe` : ''}`}
              title={`${month.label}: ${formatWasteCurrency(month.total)}${month.unpriced ? `, ${month.unpriced} sin importe` : ''}`}>
              <span className="waste-value">{month.total ? compactCurrency.format(month.total) : ''}</span>
              <div className="waste-bar-track">
                {month.total > 0
                  ? <div className="waste-bar" style={{ height: `${Math.max(4, month.total / max * 100)}%` }} />
                  : <span className="waste-zero" aria-hidden="true" />}
              </div>
              <span className="waste-label">{month.label}</span>
            </div>
          ))}
        </div>
        {activeMonths < 2 && (
          <p className="hint waste-trend">
            {activeMonths === 0
              ? 'Todavía no hay suficientes datos para mostrar una tendencia.'
              : 'Aún no hay suficientes datos para ver una tendencia.'}
          </p>
        )}
        <p className="hint">Valor total de productos vencidos por mes.</p>
        <p className="hint">
          Mes actual: {formatWasteCurrency(current.total)} · mes anterior: {formatWasteCurrency(previous.total)}.
          {current.unpriced || previous.unpriced ? ' Hay lotes sin costo; la comparación es parcial.' : ' Comparación de costos registrados.'}
        </p>
        <p className="hint">Ahorro estimado por productos consumidos a tiempo: {formatWasteCurrency(current.savings)} este mes y {formatWasteCurrency(previous.savings)} el anterior.
          {(current.reusedUnpriced || previous.reusedUnpriced) ? ' Hay lotes aprovechados sin costo; los importes son parciales.' : ''}
        </p>
        <button type="button" className="btn" onClick={exportTrends}>Exportar tendencias (CSV)</button>
      </section>

      {byArea.length > 0 && (
        <section className="card">
          <h3>Pérdidas por área</h3>
          <p className="hint">Mirá en qué áreas se concentran los productos descartados.</p>
          <ul className="list">
            {byArea.map((a, index) => {
              const share = areaDenominator
                ? ((totalLoss > 0 ? a.total : a.lots) / areaDenominator) * 100
                : 0
              return (
                <li className="waste-area" key={a.area}>
                  <div className="waste-area-top">
                    <strong><span aria-hidden="true">{areaIcon(a.area)}</span> {a.area}</strong>
                    <strong>{formatWasteCurrency(a.total)}</strong>
                  </div>
                  <div className="waste-area-track" aria-hidden="true">
                    <span style={{ width: `${share}%`, '--area-color': `var(--waste-area-${index % 4})` }} />
                  </div>
                  <small>{a.lots} {a.lots === 1 ? 'lote' : 'lotes'}</small>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Historial de pérdidas</h3>
        <p className="hint">Los lotes vencidos se registran automáticamente. Si fue un error, podés deshacerlo.</p>
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
                  {item.receivedDate && <small>Recepción: {item.receivedDate}</small>}
                  {reuseOptionsId === item.id && (
                    <div className="waste-reuse-options" aria-label={`Opciones de aprovechamiento para ${item.product?.name || item.ean}`}>
                      {REUSE_LABELS.map((label) => (
                        <button type="button" className="chip" key={label} onClick={() => {
                          setReuseOptionsId(null)
                          reuse(item, label)
                        }}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="waste-history-side">
                  {editingCostId === item.id ? (
                    <div className="waste-cost-editor">
                      <label>
                        Costo por unidad
                        <input type="number" min="0" step="0.01" value={costDraft}
                          onChange={(event) => setCostDraft(event.target.value)} />
                      </label>
                      <button type="button" className="btn small" onClick={() => saveCost(item)}>Guardar costo</button>
                      <button type="button" className="waste-text-button" onClick={() => setEditingCostId(null)}>Cancelar</button>
                    </div>
                  ) : (
                    <strong className="waste-history-cost">
                      {item.unitCost == null ? 'Sin costo registrado' : formatWasteCurrency(item.unitCost * item.quantity)}
                    </strong>
                  )}
                  <div className="waste-actions">
                    <button type="button" className="waste-text-button" onClick={() => {
                      setEditingCostId(item.id)
                      setCostDraft(item.unitCost == null ? '' : String(item.unitCost))
                    }}>Editar costo</button>
                    <button type="button" className="waste-text-button" onClick={() => {
                      setReuseOptionsId(reuseOptionsId === item.id ? null : item.id)
                    }}>Registrar aprovechamiento</button>
                    <button type="button" className="waste-text-button waste-undo-button" onClick={() => undoLoss(item)}>
                      ↶ Devolver al inventario
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Reutilizados</h3>
        <p className="hint">Productos que pudiste aprovechar y no cuentan como pérdida.</p>
        {reused.length === 0 ? (
        <p className="msg">¡Buen trabajo! Aquí aparecerán los productos que aprovechaste antes de que vencieran.</p>
        ) : (
          <ul className="list">
            {reused.map((item) => (
              <li className="row waste-row" key={item.id}>
                <div className="info">
                  <strong>{item.product?.name || item.ean}</strong>
                  <small>{new Date(item.reusedAt).toLocaleDateString('es-AR')} · {item.quantity} un.{item.location ? ` · ${item.location}` : ''}</small>
                  {item.receivedDate && <small>Recepción: {item.receivedDate}</small>}
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
