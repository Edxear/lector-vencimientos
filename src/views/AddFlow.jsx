import { useCallback, useState } from 'react'
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

  const handleEan = useCallback(async (ean) => {
    setStep('lookup')
    let p = await getProduct(ean)
    let source = 'cache'
    if (!p) {
      p = await lookupOpenFoodFacts(ean)
      source = p ? 'openfoodfacts' : 'manual'
    }
    logEvent('scan', { ean, source })
    setProduct(p || { ean, name: '', brand: '', content: '', category: '', imageUrl: '', source: 'manual' })
    setStep('confirm-product')
  }, [])

  async function confirmProduct() {
    await saveProduct(product)
    setStep('expiry')
  }

  async function saveExpiry(item, meta) {
    await addItem({ ean: product.ean, ...item })
    logEvent('expiry', { ocrUsed: !!meta.ocrText, candidates: meta.candidates.length, finalDate: item.expiryDate, ocrText: meta.ocrText })
    if (pushSupported() && Notification.permission === 'default') enablePush().catch(() => {})
    onDone()
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
        </div>
      </>
    )

  if (step === 'lookup') return <p className="msg">Buscando producto…</p>

  if (step === 'confirm-product')
    return (
      <div className="card">
        <h3>Producto</h3>
        <ProductFields value={product} onChange={setProduct} />
        <button className="btn primary" disabled={!product.name.trim()} onClick={confirmProduct}>Continuar</button>
      </div>
    )

  return <ExpiryCapture onConfirm={saveExpiry} />
}
