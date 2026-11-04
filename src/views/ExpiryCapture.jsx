import { useMemo, useState } from 'react'
import { recognizeExpiry } from '../lib/ocr'
import { mergeCandidates, formatDisplay } from '../lib/dates'
import { getDefaultNotifyDays, getDateOrder } from '../lib/settings'
import ItemFields from './ItemFields'

function Chips({ list, selected, onPick }) {
  return (
    <div className="chips cand">
      {list.map((c) => (
        <button type="button" key={c.iso} className={`chip ${selected === c.iso ? 'on' : ''}`} onClick={() => onPick(c.iso)}>
          <strong>{formatDisplay(c.iso)}</strong>
          <small>{c.precision === 'month' ? 'fin de mes · ' : ''}{c.label}{c.confidence ? ` · ${c.confidence}%` : ''}</small>
        </button>
      ))}
    </div>
  )
}

export default function ExpiryCapture({ onConfirm }) {
  const [busy, setBusy] = useState('')
  const [candidates, setCandidates] = useState([])
  const [raw, setRaw] = useState('')
  const [typed, setTyped] = useState('')
  const [item, setItem] = useState({
    expiryDate: '', quantity: 1, location: '', notes: '', notifyDays: getDefaultNotifyDays(), expiryPhoto: '',
  })

  async function onPhotoFile(file) {
    setBusy('Leyendo fecha…')
    try {
      const res = await recognizeExpiry(file, {
        order: getDateOrder(),
        onProgress: (i, n) => setBusy(`Leyendo fecha… (${i}/${n})`),
      })
      setRaw(res.text)
      setCandidates(res.candidates)
      if (res.candidates[0]) setItem((cur) => ({ ...cur, expiryDate: res.candidates[0].iso }))
      else setRaw(res.text || 'No se detectó texto.')
    } catch {
      setRaw('Error de OCR. Escribe la fecha manualmente.')
    } finally {
      setBusy('')
    }
  }

  const fromTyped = useMemo(
    () => (typed.trim() ? mergeCandidates([typed], { order: getDateOrder() }) : []),
    [typed],
  )
  const ambiguous = candidates[0]?.ambiguous
  const noResult = !busy && raw && candidates.length === 0

  return (
    <div className="card">
      <h3>Vencimiento</h3>
      <p className="hint">Escanea la fecha y recuadra solo ese texto. Se entienden formatos como 15/03/27, 27-03-15, 15MAR27, 03/2027 o VENC 15 MAR 2027.</p>
      {busy && <p className="msg">{busy}</p>}
      {candidates.length > 0 && (
        <>
          <Chips list={candidates} selected={item.expiryDate} onPick={(iso) => setItem({ ...item, expiryDate: iso })} />
          {ambiguous && <p className="hint warn">La fecha puede leerse de dos formas. Elige la correcta.</p>}
        </>
      )}
      {noResult && <p className="hint warn">No pude reconocer una fecha. Vuelve a recuadrarla o escríbela abajo.</p>}
      <ItemFields value={item} onChange={setItem} onPhotoFile={onPhotoFile} />
      <label>
        Escribir la fecha tal como figura
        <input type="text" value={typed} placeholder="Ej: 15MAR27, 03/27, 2027-03-15"
          autoCapitalize="characters" onChange={(e) => setTyped(e.target.value)} />
      </label>
      {fromTyped.length > 0 && (
        <Chips list={fromTyped} selected={item.expiryDate} onPick={(iso) => setItem({ ...item, expiryDate: iso })} />
      )}
      {raw && <details><summary>Texto leído</summary><pre>{raw}</pre></details>}
      <button className="btn primary" disabled={!item.expiryDate || !!busy}
        onClick={() => onConfirm(item, { ocrText: raw, candidates })}>
        Guardar
      </button>
    </div>
  )
}
