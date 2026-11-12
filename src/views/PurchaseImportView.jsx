import { useState } from 'react'
import { recognizeExpiry } from '../lib/ocr'
import { parsePurchaseImport, validatePurchaseLines } from '../lib/purchases'
import { CATEGORIES, LOCATIONS } from '../lib/settings'
import { importInventory } from '../lib/db'

const MODES = [
  { id: 'ticket', label: 'Ticket', detail: 'Foto' },
  { id: 'text', label: 'Texto', detail: 'Online' },
  { id: 'csv', label: 'Archivo', detail: 'CSV' },
]

function makeSyntheticEan(index) {
  return `import-${crypto.randomUUID()}-${index}`
}

function UploadIcon({ document = false }) {
  return document ? (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M9 4.5h9l6 6V27H9V4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 5v6h6M13 17h7m-7 4h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M5 10h5l2-3h8l2 3h5v16H5V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default function PurchaseImportView() {
  const [mode, setMode] = useState('ticket')
  const [ticketFile, setTicketFile] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [stage, setStage] = useState('input')
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('status')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  function chooseMode(nextMode) {
    setMode(nextMode)
    setStage('input')
    setStatus('')
    setPreview([])
  }

  function selectFile(file) {
    if (!file) return
    const valid = mode === 'ticket'
      ? ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
      : file.type === 'text/csv' || /\.csv$/i.test(file.name)
    if (!valid) {
      if (mode === 'ticket') setTicketFile(null)
      else setCsvFile(null)
      setStatusType('alert')
      setStatus(mode === 'ticket' ? 'Elegí una imagen JPG, PNG o WEBP.' : 'Elegí un archivo CSV válido.')
      return
    }
    if (mode === 'ticket') setTicketFile(file)
    else setCsvFile(file)
    setStatus('')
    setPreview([])
    setStage('input')
  }

  async function processInput() {
    setBusy(true)
    setStatus('')
    setStatusType('status')
    try {
      let input = text
      if (mode === 'ticket') {
        if (!ticketFile) return
        setStatus('Leyendo ticket…')
        input = (await recognizeExpiry(ticketFile)).text
      } else if (mode === 'csv') {
        if (!csvFile) return
        setStatus('Leyendo archivo…')
        input = await csvFile.text()
      }

      const parsed = parsePurchaseImport(input)
      if (!parsed.length) {
        setStatusType('alert')
        setStatus('No se detectaron productos. Probá con una imagen más clara o revisá el texto.')
        return
      }
      setPreview(parsed.map((item) => ({ ...item, id: crypto.randomUUID(), expiryConfirmed: false })))
      setStage('review')
      setStatus(`${parsed.length} ${parsed.length === 1 ? 'producto detectado' : 'productos detectados'}. Revisá los datos antes de importar.`)
      setStatusType('status')
    } catch (error) {
      console.error('No se pudo analizar la compra:', error)
      setStatusType('alert')
      setStatus('No se pudo leer el archivo. Revisá que sea válido e intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function updatePreview(index, field, value) {
    setPreview((items) => items.map((item, current) => (
      current === index ? { ...item, [field]: value, ...(field === 'expiryDate' ? { expiryConfirmed: false } : {}) } : item
    )))
  }

  async function importAll() {
    try {
      validatePurchaseLines(preview)
    } catch (error) {
      setStatusType('alert')
      setStatus(error.message)
      return
    }
    setBusy(true)
    setStatus('Importando al inventario…')
    setStatusType('status')
    try {
      const products = []
      const items = []
      for (const [index, line] of preview.entries()) {
        const ean = makeSyntheticEan(index)
        products.push({
          ean,
          name: line.name.trim(),
          brand: line.brand || '',
          content: line.content || '',
          category: line.category || 'Otros',
          imageUrl: '',
          source: 'purchase-import',
        })
        items.push({
          id: crypto.randomUUID(),
          ean,
          expiryDate: line.expiryDate,
          receivedDate: line.receivedDate || '',
          quantity: Number(line.quantity),
          location: line.location,
          notes: `${line.supermarket || 'Compra'} · ${line.source || 'importación'}`,
          notifyDays: Number(line.notifyDays) || 15,
        })
      }
      await importInventory({ products, items })
      setStage('done')
      setStatus(`${preview.length} ${preview.length === 1 ? 'producto importado' : 'productos importados'} al inventario.`)
      setText('')
      setTicketFile(null)
      setCsvFile(null)
    } catch (error) {
      console.error('No se pudo importar la compra:', error)
      setStatusType('alert')
      setStatus('No se pudo completar la importación. No se guardaron los productos; revisá los datos e intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function newPurchase() {
    setMode('ticket')
    setTicketFile(null)
    setCsvFile(null)
    setText('')
    setPreview([])
    setStage('input')
    setStatus('')
  }

  const canProcess = mode === 'ticket' ? !!ticketFile : mode === 'csv' ? !!csvFile : !!text.trim()
  const dropzoneProps = {
    onDragOver: (event) => { event.preventDefault(); setDragging(true) },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
    },
    onDrop: (event) => {
      event.preventDefault()
      setDragging(false)
      selectFile(event.dataTransfer.files[0])
    },
  }

  return (
    <section className="card purchase-import">
      <div className="purchase-heading">
        <h3>Cargar compra</h3>
        <p className="hint">Ahorrá tiempo cargando tus productos desde un ticket, un archivo o texto.</p>
      </div>

      {stage === 'input' && (
        <>
          <div className="purchase-tabs" aria-label="Cómo querés cargar la compra">
            {MODES.map((option) => (
              <button
                type="button"
                aria-pressed={mode === option.id}
                className={`purchase-tab ${mode === option.id ? 'on' : ''}`}
                key={option.id}
                onClick={() => chooseMode(option.id)}
              >
                <span>{option.label}</span>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>

          {mode === 'ticket' && (
            <div
              className={`purchase-dropzone ${dragging ? 'dragging' : ''}`}
              {...dropzoneProps}
            >
              <input
                id="purchase-ticket-file"
                className="purchase-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Subir foto del ticket"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <label className="purchase-drop-label" htmlFor="purchase-ticket-file">
                <span className="purchase-upload-icon"><UploadIcon /></span>
                <strong>{ticketFile ? ticketFile.name : 'Subí una foto clara de tu ticket'}</strong>
                <span>{ticketFile ? 'Tocá para elegir otra imagen' : 'Hacé clic para subirla o arrastrala aquí'}</span>
                <small>JPG, PNG o WEBP</small>
              </label>
            </div>
          )}

          {mode === 'text' && (
            <label className="purchase-text-label">
              Texto del pedido o ticket
              <textarea
                rows="7"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={'Pegá aquí el texto de tu pedido o ticket. Ejemplo:\nLeche entera 1L x2\nYogur griego 4u'}
              />
            </label>
          )}

          {mode === 'csv' && (
            <div className={`purchase-dropzone purchase-dropzone-file ${dragging ? 'dragging' : ''}`} {...dropzoneProps}>
              <input
                id="purchase-csv-file"
                className="purchase-file-input"
                type="file"
                accept=".csv,text/csv,text/plain"
                aria-label="Subir archivo CSV"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <label className="purchase-drop-label" htmlFor="purchase-csv-file">
                <span className="purchase-upload-icon"><UploadIcon document /></span>
                <strong>{csvFile ? csvFile.name : 'Elegí tu archivo CSV'}</strong>
                <span>Hacé clic para buscarlo o arrastralo aquí</span>
                <small>CSV separado por comas o punto y coma</small>
              </label>
            </div>
          )}

          <button type="button" className="btn primary purchase-primary" disabled={busy || !canProcess} onClick={processInput}>
            {busy ? 'Procesando…' : mode === 'ticket' ? 'Procesar ticket' : 'Procesar compra'}
          </button>
          {mode === 'ticket' && <p className="hint purchase-help">El supermercado se detectará automáticamente.</p>}
        </>
      )}

      {stage === 'review' && (
        <>
          <div className="purchase-review-heading">
            <div>
              <h4>Revisá tu compra</h4>
              <p className="hint">Revisá cada línea. Las fechas son estimaciones, no se leen del envase: confirmalas o corregilas antes de importar.</p>
            </div>
            <button type="button" className="btn small" disabled={busy} onClick={() => setStage('input')}>Volver</button>
          </div>
          <fieldset className="purchase-review-fields" disabled={busy}>
          <ul className="list purchase-preview">
            {preview.map((item, index) => (
              <li key={item.id} className="purchase-preview-item">
                {item.originalLine && <p className="hint">Línea detectada: {item.originalLine}</p>}
                <label>
                  Producto
                  <input value={item.name} required onChange={(event) => updatePreview(index, 'name', event.target.value)} />
                </label>
                <label>
                  Contenido del producto (opcional)
                  <input value={item.content || ''} placeholder="Ej: 1 L" onChange={(event) => updatePreview(index, 'content', event.target.value)} />
                </label>
                <div className="two">
                  <label>
                    Cantidad
                    <input type="number" min="1" max="2147483647" step="1" value={item.quantity}
                      onChange={(event) => updatePreview(index, 'quantity', event.target.value)} />
                  </label>
                  <label>
                    Vencimiento
                    <input type="date" value={item.expiryDate}
                      onChange={(event) => updatePreview(index, 'expiryDate', event.target.value)} />
                  </label>
                </div>
                <label>
                  <span><input type="checkbox" checked={item.expiryConfirmed} onChange={(event) => updatePreview(index, 'expiryConfirmed', event.target.checked)} /> Confirmé esta fecha de vencimiento</span>
                </label>
                <label>
                  Fecha de recepción (opcional)
                  <input type="date" value={item.receivedDate || ''}
                    onChange={(event) => updatePreview(index, 'receivedDate', event.target.value)} />
                </label>
                <div className="two">
                  <label>Categoría
                    <input list="purchase-categories" value={item.category || ''} onChange={(event) => updatePreview(index, 'category', event.target.value)} />
                  </label>
                  <label>Área
                    <select value={item.location || ''} onChange={(event) => updatePreview(index, 'location', event.target.value)}>
                      <option value="">Sin definir</option>
                      {item.location && !LOCATIONS.includes(item.location) && <option>{item.location}</option>}
                      {LOCATIONS.map((location) => <option key={location}>{location}</option>)}
                    </select>
                  </label>
                </div>
                <button type="button" className="btn small" disabled={busy} onClick={() => setPreview((items) => items.filter((entry) => entry.id !== item.id))}>Quitar línea</button>
              </li>
            ))}
          </ul>
          <datalist id="purchase-categories">{CATEGORIES.map((category) => <option key={category} value={category} />)}</datalist>
          <p className="hint">La cantidad representa unidades enteras de inventario.</p>
          </fieldset>
          <button type="button" className="btn primary purchase-primary" disabled={busy} onClick={importAll}>
            {busy ? 'Importando…' : 'Confirmar e importar al inventario'}
          </button>
        </>
      )}

      {stage === 'done' && (
        <div className="purchase-complete">
          <span aria-hidden="true">✓</span>
          <h4>¡Compra cargada!</h4>
          <button type="button" className="btn primary purchase-primary" onClick={newPurchase}>Cargar otra compra</button>
        </div>
      )}

      {status && <p className={`msg purchase-status ${statusType}`} role={statusType}>{status}</p>}
    </section>
  )
}
