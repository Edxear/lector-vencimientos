import { useCallback, useEffect, useRef, useState } from 'react'
import ScannerView from './ScannerView'
import ExpiryCapture from './ExpiryCapture'
import ProductFields from './ProductFields'
import { getProduct, saveProduct, addItems, logEvent } from '../lib/db'
import { lookupOpenFoodFacts } from '../lib/products'
import { pushSupported, enablePush } from '../lib/push'

function finishMetrics(metrics, outcome, extra = {}) {
  if (!metrics || metrics.ended) return
  metrics.ended = true
  logEvent('add_flow_end', {
    id: metrics.id, outcome, step: metrics.step,
    durationMs: Math.max(0, Date.now() - metrics.startedAt), errors: metrics.errors, ...extra,
  }).catch((error) => console.error('No se pudo registrar el resultado de la medición local:', error))
}

export default function AddFlow({ onDone, onPushError }) {
  const [step, setStep] = useState('scan')
  const [product, setProduct] = useState(null)
  const [manualEan, setManualEan] = useState('')
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const metricsRef = useRef(null)
  const initialErrorsRef = useRef(0)

  useEffect(() => {
    const metrics = { id: crypto.randomUUID(), startedAt: Date.now(), errors: initialErrorsRef.current, step: 'scan', ended: false, saving: false, unmounted: false }
    metricsRef.current = metrics
    logEvent('add_flow_start', { id: metrics.id }).catch((error) => console.error('No se pudo registrar el inicio de la medición local:', error))
    return () => {
      abortRef.current?.abort()
      metrics.unmounted = true
      if (!metrics.saving) finishMetrics(metrics, 'abandoned')
    }
  }, [])

  const recordError = useCallback(() => {
    if (metricsRef.current && !metricsRef.current.ended) metricsRef.current.errors++
    else if (!metricsRef.current) initialErrorsRef.current++
  }, [])

  useEffect(() => {
    if (metricsRef.current) metricsRef.current.step = step
  }, [step])

  const handleEan = useCallback(async (ean, format) => {
    ean = ean.trim()
    if (!ean) {
      setError('El código está vacío.')
      recordError()
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStep('lookup')
    setError('')
    try {
      let p = await getProduct(ean)
      let source = 'cache'
      if (!p && format !== 'qr_code' && /^\d{8,14}$/.test(ean)) {
        p = await lookupOpenFoodFacts(ean, { signal: ctrl.signal })
        source = p ? 'openfoodfacts' : 'manual'
      }
      if (ctrl.signal.aborted) return
      logEvent('scan', { ean, source })
      setProduct(p || { ean, name: '', brand: '', content: '', category: '', imageUrl: '', source: 'manual' })
      setStep('confirm-product')
    } catch (e) {
      if (!ctrl.signal.aborted) {
        recordError()
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
      recordError()
      setError(e.message || 'No se pudo guardar el producto.')
    }
  }

  async function saveExpiry(items, meta) {
    setError('')
    const metrics = metricsRef.current
    if (metrics) metrics.saving = true
    try {
      await addItems(items.map(({ key, ...item }) => ({ ean: product.ean, ...item, quantity: Number(item.quantity) })))
      finishMetrics(metrics, 'completed', { ocrSuggested: meta.ocrSuggested, ocrUnedited: meta.ocrUnedited })
      logEvent('expiry', { ocrUsed: !!meta.ocrText, candidates: meta.candidates.length, finalDate: items[0].expiryDate, ocrText: meta.ocrText })
      if (pushSupported() && Notification.permission === 'default') enablePush().catch((error) => {
        console.error('No se pudieron activar los avisos push:', error)
        onPushError?.()
      })
      if (!metrics?.unmounted) onDone()
    } catch (e) {
      recordError()
      if (metrics?.unmounted) finishMetrics(metrics, 'abandoned')
      else setError(e.message || 'No se pudo guardar el lote.')
    } finally {
      if (metrics) metrics.saving = false
    }
  }

  if (step === 'scan')
    return (
      <>
        <ScannerView onDetect={handleEan} onError={recordError} />
        <div className="card">
          <label>
            O ingresá el identificador a mano
            <input value={manualEan} onChange={(e) => setManualEan(e.target.value)} />
          </label>
          <button className="btn" disabled={!manualEan.trim()} onClick={() => handleEan(manualEan)}>Buscar</button>
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

  return <><ExpiryCapture onConfirm={saveExpiry} onOcrError={recordError} />{error && <p className="hint warn" role="alert">{error}</p>}</>
}
