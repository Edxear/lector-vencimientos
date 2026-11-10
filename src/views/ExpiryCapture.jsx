import { useEffect, useMemo, useState } from 'react'
import { recognizeExpiry } from '../lib/ocr'
import { mergeCandidates, formatDisplay } from '../lib/dates'
import { getDefaultNotifyDays, getDateOrder } from '../lib/settings'
import ItemFields from './ItemFields'

const EXAMPLE_FORMATS = ['15/03/27', '03/2027', '15MAR27', '14ABR27', 'L08/27']

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
  const [saving, setSaving] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [raw, setRaw] = useState('')
  const [typed, setTyped] = useState('')
  const [item, setItem] = useState({
    expiryDate: '', receivedDate: '', quantity: 1, location: '', notes: '', notifyDays: getDefaultNotifyDays(), expiryPhoto: '',
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

  useEffect(() => {
    if (!typed.trim()) return
    if (fromTyped[0] && (!item.expiryDate || item.expiryDate !== fromTyped[0].iso)) {
      setItem((cur) => ({ ...cur, expiryDate: fromTyped[0].iso }))
    }
  }, [typed, fromTyped, item.expiryDate])

  const ambiguous = candidates[0]?.ambiguous || fromTyped[0]?.ambiguous
  const noResult = !busy && raw && candidates.length === 0
  const selectedDate = item.expiryDate ? formatDisplay(item.expiryDate) : 'Sin fecha aún'
  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await onConfirm(item, { ocrText: raw, candidates })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h3>Vencimiento</h3>
      <p className="hint">Escanea la fecha y recuadra solo ese texto. Acepta formatos como 15/03/27, 03/2027, 15MAR27, 14ABR27, L08/27 o VENC 15 MAR 2027.</p>
      {busy && <p className="msg">{busy}</p>}
      <p className="hint"><strong>Fecha seleccionada:</strong> {selectedDate}</p>
      {candidates.length > 0 && (
        <>
          <Chips list={candidates} selected={item.expiryDate} onPick={(iso) => setItem({ ...item, expiryDate: iso })} />
          {ambiguous && <p className="hint warn">La fecha puede leerse de dos formas. Elige la correcta antes de guardar.</p>}
        </>
      )}
      {noResult && <p className="hint warn">No pude reconocer una fecha. Vuelve a recuadrarla o escríbela abajo.</p>}
      <ItemFields value={item} onChange={setItem} onPhotoFile={onPhotoFile} />
      <label>
        Escribir la fecha tal como figura
        <input type="text" value={typed} placeholder="Ej: 15MAR27, 03/27, 2027-03-15"
          autoCapitalize="characters" onChange={(e) => setTyped(e.target.value)} />
      </label>
      <div className="chips cand">
        {EXAMPLE_FORMATS.map((example) => (
          <button type="button" key={example} className="chip" onClick={() => setTyped(example)}>
            {example}
          </button>
        ))}
      </div>
      {fromTyped.length > 0 && (
        <>
          <Chips list={fromTyped} selected={item.expiryDate} onPick={(iso) => setItem({ ...item, expiryDate: iso })} />
          {ambiguous && <p className="hint warn">La lectura escrita es ambigua; revisá la sugerencia antes de guardar.</p>}
        </>
      )}
      {raw && <details><summary>Texto leído</summary><pre>{raw}</pre></details>}
      <button className="btn primary" disabled={!item.expiryDate || !!busy || saving}
        onClick={save}>
        Guardar
      </button>
    </div>
  )
}
