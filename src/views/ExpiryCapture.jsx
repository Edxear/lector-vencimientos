import { useState } from 'react'
import { recognizeText } from '../lib/ocr'
import { parseExpiryDates } from '../lib/dates'
import { getDefaultNotifyDays } from '../lib/settings'
import ItemFields from './ItemFields'

export default function ExpiryCapture({ onConfirm }) {
  const [busy, setBusy] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [raw, setRaw] = useState('')
  const [item, setItem] = useState({
    expiryDate: '', quantity: 1, location: '', notes: '', notifyDays: getDefaultNotifyDays(), expiryPhoto: '',
  })

  async function onPhotoFile(file) {
    setBusy(true)
    try {
      const text = await recognizeText(file)
      setRaw(text)
      const found = parseExpiryDates(text)
      setCandidates(found)
      if (found[0]) setItem((cur) => ({ ...cur, expiryDate: found[0] }))
    } catch {
      setRaw('Error de OCR. Ingresa la fecha manualmente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h3>Vencimiento</h3>
      <p className="hint">Toma una foto de la fecha para leerla automáticamente y confirma que sea correcta.</p>
      {busy && <p className="msg">Leyendo texto…</p>}
      {candidates.length > 1 && (
        <div className="chips">
          {candidates.map((c) => (
            <button type="button" key={c} className={`chip ${item.expiryDate === c ? 'on' : ''}`}
              onClick={() => setItem({ ...item, expiryDate: c })}>{c}</button>
          ))}
        </div>
      )}
      <ItemFields value={item} onChange={setItem} onPhotoFile={onPhotoFile} />
      {raw && <details><summary>Texto leído</summary><pre>{raw}</pre></details>}
      <button className="btn primary" disabled={!item.expiryDate || busy}
        onClick={() => onConfirm(item, { ocrText: raw, candidates })}>
        Guardar
      </button>
    </div>
  )
}
