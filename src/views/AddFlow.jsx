import { useCallback, useEffect, useRef, useState } from 'react'
import ScannerView from './ScannerView'
import ExpiryCapture from './ExpiryCapture'
import ProductFields from './ProductFields'
import { getProduct, saveProduct, addItem, logEvent } from '../lib/db'
import { lookupOpenFoodFacts } from '../lib/products'
import { pushSupported, enablePush } from '../lib/push'

export default function AddFlow({ onDone }) {
  const [step, setStep] = useState('scan')
  const [product, setProduct] = useState(null)
  const [manualEan, setManualEan] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleEan = useCallback(async (ean) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStep('lookup')
    setError('')
    try {
      let p = await getProduct(ean)
      let source = 'cache'
      if (!p) {
        p = await lookupOpenFoodFacts(ean, { signal: ctrl.signal })
        source = p ? 'openfoodfacts' : 'manual'
      }
      if (ctrl.signal.aborted) return
      logEvent('scan', { ean, source })
      setProduct(p || { ean, name: '', brand: '', content: '', category: '', imageUrl: '', source: 'manual' })
      setStep('confirm-product')
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setError(e.message || 'No se pudo buscar el producto en este dispositivo.')
        setStep('scan')
      }
    }
  }, [])

  function cancelLookup() {
    abortRef.current?.abort()
    setStep('scan')
  }

  async function confirmProduct() {
    setError('')
    try {
      await saveProduct(product)
      setStep('expiry')
    } catch (e) {
      setError(e.message || 'No se pudo guardar el producto.')
    }
  }

  async function saveExpiry(item, meta) {
    setError('')
    try {
      await addItem({ ean: product.ean, ...item })
      logEvent('expiry', { ocrUsed: !!meta.ocrText, candidates: meta.candidates.length, finalDate: item.expiryDate, ocrText: meta.ocrText })
      if (pushSupported() && Notification.permission === 'default') enablePush().catch(() => {})
      onDone()
    } catch (e) {
      setError(e.message || 'No se pudo guardar el lote.')
    }
  }

  if (step === 'scan')
    return (
      <>
        <ScannerView onDetect={handleEan} />
        <div className="card">
          <label>
            O ingresa el código a mano
            <input inputMode="numeric" value={manualEan} onChange={(e) => setManualEan(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="btn" disabled={manualEan.length < 8} onClick={() => handleEan(manualEan)}>Buscar</button>
          {error && <p className="hint warn" role="alert">{error}</p>}
        </div>
      </>
    )

  if (step === 'lookup')
    return (
      <div className="card">
        <p className="msg" role="status">Buscando producto…</p>
        <button className="btn" onClick={cancelLookup}>Cancelar</button>
      </div>
    )

  if (step === 'confirm-product')
    return (
      <div className="card">
        <h3>Producto</h3>
        {product.archived && <p className="hint">Producto archivado: se reactivará al guardar el nuevo lote.</p>}
        <ProductFields value={product} onChange={setProduct} />
        {error && <p className="hint warn" role="alert">{error}</p>}
        <div className="btn-row">
          <button className="btn" onClick={() => setStep('scan')}>Volver</button>
          <button className="btn primary" disabled={!product.name.trim()} onClick={confirmProduct}>Continuar</button>
        </div>
      </div>
    )

  return <><ExpiryCapture onConfirm={saveExpiry} />{error && <p className="hint warn" role="alert">{error}</p>}</>
}
