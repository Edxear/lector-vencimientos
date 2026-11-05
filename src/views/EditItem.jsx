import { useState } from 'react'
import { saveProduct, updateItem, removeItem } from '../lib/db'
import ProductFields from './ProductFields'
import ItemFields from './ItemFields'
import { daysUntil } from '../lib/dates'

// Hoja de edición de un lote y de su producto
export default function EditItem({ row, onClose }) {
  const [product, setProduct] = useState(
    row.product || { ean: row.ean, name: '', brand: '', content: '', category: '', imageUrl: '', source: 'manual' },
  )
  const [item, setItem] = useState({
    expiryDate: row.expiryDate, quantity: row.quantity, location: row.location || '', notes: row.notes || '',
    notifyDays: row.notifyDays ?? 15, expiryPhoto: row.expiryPhoto || '', unitCost: row.unitCost ?? null,
  })

  const [error, setError] = useState('')

  async function save() {
    await saveProduct(product)
    await updateItem(row.id, item)
    onClose()
  }

  async function remove() {
    if (!confirm('¿Eliminar este producto del inventario?')) return
    await removeItem(row.id)
    onClose()
  }

  async function markAsWasted() {
    if (!confirm('\u00bfRegistrar este lote como desperdiciado? Se conservar\u00e1 en la anal\u00edtica de p\u00e9rdidas.')) return
    setError('')
    try {
      await updateItem(row.id, { wastedAt: Date.now() })
      onClose()
    } catch (e) {
      setError(e.message || 'No se pudo registrar el desperdicio.')
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="sheet tall">
        <h3>Editar producto</h3>
        <ProductFields value={product} onChange={setProduct} />
        <hr />
        <ItemFields value={item} onChange={setItem} />
        {error && <p className="hint warn" role="alert">{error}</p>}
        <div className="btn-row">
          {daysUntil(row.expiryDate) < 0 && (
            <button className="btn danger" onClick={markAsWasted}>Marcar como desperdiciado</button>
          )}
          <button className="btn danger" onClick={remove}>Eliminar</button>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!item.expiryDate || !product.name.trim()} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
