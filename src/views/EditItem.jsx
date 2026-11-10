import { useState } from 'react'
import { saveProduct, updateItem, removeItem } from '../lib/db'
import ProductFields from './ProductFields'
import ItemFields from './ItemFields'
import { daysUntil } from '../lib/dates'
import { REUSE_LABELS } from '../lib/waste'
import { isZeroStock } from '../lib/stock.js'

// Hoja de edición de un lote y de su producto
export default function EditItem({ row, onClose }) {
  const [product, setProduct] = useState(
    row.product || { ean: row.ean, name: '', brand: '', content: '', category: '', imageUrl: '', source: 'manual' },
  )
  const [item, setItem] = useState({
    expiryDate: row.expiryDate, quantity: row.quantity, location: row.location || '', notes: row.notes || '',
    notifyDays: row.notifyDays ?? 15, expiryPhoto: row.expiryPhoto || '', unitCost: row.unitCost ?? null,
    receivedDate: row.receivedDate || '',
  })
  const [error, setError] = useState('')

  async function save() {
    setError('')
    try {
      await saveProduct(product)
      await updateItem(row.id, item)
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudieron guardar los cambios.')
    }
  }

  async function remove() {
    if (!confirm('¿Eliminar permanentemente este lote? Esta acción no conserva su historial.')) return
    try {
      await removeItem(row.id)
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo eliminar el lote.')
    }
  }

  async function markAsWasted() {
    if (!confirm('¿Registrar este lote como pérdida? Se conservará en la analítica de pérdidas.')) return
    setError('')
    try {
      await updateItem(row.id, { wastedAt: Date.now(), keepActive: false })
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo registrar el desperdicio.')
    }
  }

  async function markAsReused(label) {
    setError('')
    try {
      await updateItem(row.id, { reusedAt: Date.now(), reuseLabel: label, wastedAt: null })
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo registrar la reutilización.')
    }
  }

  const days = daysUntil(row.expiryDate)
  const canReuse = !isZeroStock(row) && days <= (row.notifyDays ?? 15)

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="sheet tall">
        <div className="sheet-head">
          <h3>Editar producto</h3>
          <button type="button" className="close-x" aria-label="Cerrar sin guardar" onClick={onClose}>✕</button>
        </div>
        <ProductFields value={product} onChange={setProduct} />
        <hr />
        <ItemFields value={item} onChange={setItem} allowZero />
        {canReuse && (
          <div className="reuse-box">
            <strong>{days < 0 ? '¿Le diste otro uso?' : 'Por vencer: ¿lo vas a reutilizar?'}</strong>
            <p className="hint">Etiquetalo para que no cuente como pérdida.</p>
            <div className="chips">
              {REUSE_LABELS.map((label) => (
                <button type="button" key={label} className="chip" onClick={() => markAsReused(label)}>{label}</button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="hint warn" role="alert">{error}</p>}
        <div className="btn-row">
          <button className="btn danger" disabled={isZeroStock(row)} onClick={markAsWasted}>Registrar pérdida</button>
          <button className="btn danger" onClick={remove}>Eliminar lote</button>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!item.expiryDate || !product.name.trim()} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
