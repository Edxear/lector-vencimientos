import { useState } from 'react'
import { recognizeExpiry } from '../lib/ocr'
import { parsePurchaseImport, PURCHASE_SUPERMARKETS } from '../lib/purchases'
import { addItem, saveProduct } from '../lib/db'

function makeSyntheticEan(index) {
  return `import-${Date.now()}-${index}`
}

export default function PurchaseImportView() {
  const [mode, setMode] = useState('ticket')
  const [text, setText] = useState('')
  const [supermarket, setSupermarket] = useState('auto')
  const [preview, setPreview] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function runFromOcr(file) {
    if (!file) return
    setBusy(true)
    setStatus('Leyendo ticket…')
    try {
      const result = await recognizeExpiry(file)
      setText(result.text)
      const parsed = parsePurchaseImport(result.text, { supermarket })
      setPreview(parsed)
      setStatus(parsed.length ? `Se detectaron ${parsed.length} líneas de compra.` : 'No se detectaron productos en el ticket.')
    } catch (error) {
      setStatus(error.message || 'No se pudo leer la imagen.')
    } finally {
      setBusy(false)
    }
  }

  function processText() {
    const parsed = parsePurchaseImport(text, { supermarket })
    setPreview(parsed)
    setStatus(parsed.length ? `Vista previa: ${parsed.length} elementos.` : 'No se detectaron productos.')
  }

  async function importAll() {
    if (!preview.length) return
    setBusy(true)
    setStatus('Importando al inventario…')
    try {
      for (const [index, line] of preview.entries()) {
        const ean = makeSyntheticEan(index)
        await saveProduct({
          ean,
          name: line.name,
          brand: line.brand || '',
          content: line.unit ? `${line.quantity} ${line.unit}` : '',
          category: line.category || 'Otros',
          imageUrl: '',
          source: 'purchase-import',
        })
        await addItem({
          ean,
          expiryDate: line.expiryDate,
          quantity: Number(line.quantity) || 1,
          location: line.location || 'Almacén',
          notes: `${line.supermarket || 'Compra'} · ${line.source || 'importación'}`,
          notifyDays: Number(line.notifyDays) || 15,
        })
      }
      setStatus(`Importados ${preview.length} productos en el inventario.`)
      setText('')
      setPreview([])
    } catch (error) {
      setStatus(error.message || 'No se pudo importar la compra.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Importar compras</h3>
      <p className="hint">Fase 1: ticket OCR · Fase 2: plantillas por supermercado · Fase 3: compras online / CSV / texto</p>

      <div className="two">
        <label>
          Origen
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="ticket">Ticket / factura</option>
            <option value="csv">CSV / Excel</option>
            <option value="url">Texto / pedido online</option>
          </select>
        </label>
        <label>
          Supermercado
          <select value={supermarket} onChange={(e) => setSupermarket(e.target.value)}>
            {PURCHASE_SUPERMARKETS.map((v) => <option key={v} value={v}>{v === 'auto' ? 'Detectar automáticamente' : v}</option>)}
          </select>
        </label>
      </div>

      <div className="two">
        <label className="file-label">
          Subir foto de ticket
          <input type="file" accept="image/*" onChange={(e) => runFromOcr(e.target.files?.[0])} />
        </label>
      </div>

      <label>
        {mode === 'csv' ? 'Pega el CSV o texto con columnas de producto y cantidad' : 'Pega el texto del ticket o el pedido'}
        <textarea rows="8" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej: Mercadona\nLeche entera 1L x2\nYogur griego 4u\n..." />
      </label>

      <div className="two">
        <button className="btn primary" disabled={busy || !text.trim()} onClick={processText}>Procesar</button>
        <button className="btn" disabled={busy || !preview.length} onClick={importAll}>Importar al inventario</button>
      </div>

      {status && <p className="msg">{status}</p>}

      {preview.length > 0 && (
        <div className="card soft">
          <h4>Vista previa</h4>
          <ul className="list">
            {preview.map((item, idx) => (
              <li key={`${item.name}-${idx}`} className="row">
                <div className="info">
                  <strong>{item.name}</strong>
                  <small>{item.category} · {item.location}</small>
                  <small>{item.quantity} und · vence {item.expiryDate}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
