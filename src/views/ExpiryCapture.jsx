import { useEffect, useMemo, useRef, useState } from 'react'
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
          <small>{c.precision === 'month' ? 'fin de mes · ' : ''}{c.label}{c.confidence ? ` · puntaje ${c.confidence}/100` : ''}</small>
        </button>
      ))}
    </div>
  )
}

export default function ExpiryCapture({ onConfirm, onOcrError }) {
  const [busy, setBusy] = useState('')
  const [saving, setSaving] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [raw, setRaw] = useState('')
  const [typed, setTyped] = useState('')
  const [additionalLots, setAdditionalLots] = useState([])
  const ocrReview = useRef({ suggestedDate: '', edited: false })
  const [item, setItem] = useState({
    expiryDate: '', receivedDate: '', quantity: 1, location: '', notes: '', notifyDays: getDefaultNotifyDays(), expiryPhoto: '',
  })

  async function onPhotoFile(file) {
    setBusy('Leyendo fecha…')
    ocrReview.current = { suggestedDate: '', edited: false }
    setCandidates([])
    setRaw('')
    try {
      const res = await recognizeExpiry(file, {
        order: getDateOrder(),
        onProgress: (i, n) => setBusy(`Leyendo fecha… (${i}/${n})`),
      })
      setRaw(res.text)
      setCandidates(res.candidates)
      ocrReview.current.suggestedDate = res.candidates[0]?.iso || ''
      if (res.candidates[0]) setItem((cur) => ({ ...cur, expiryDate: res.candidates[0].iso }))
      else setRaw(res.text || 'No se detectó texto.')
    } catch (error) {
      console.error('Error al leer la fecha:', error)
      onOcrError?.()
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
    if (fromTyped[0]) {
      setItem((cur) => ({ ...cur, expiryDate: fromTyped[0].iso }))
    }
  }, [typed, fromTyped])

  const ambiguous = candidates[0]?.ambiguous || fromTyped[0]?.ambiguous
  const noResult = !busy && raw && candidates.length === 0
  const selectedDate = item.expiryDate ? formatDisplay(item.expiryDate) : 'Sin fecha aún'
  const validQuantity = (quantity) => Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) <= 2147483647
  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await onConfirm([item, ...additionalLots.map((lot) => ({ ...item, ...lot, expiryPhoto: '' }))], {
        ocrText: raw, candidates, ocrSuggested: !!ocrReview.current.suggestedDate,
        ocrUnedited: !!ocrReview.current.suggestedDate && !ocrReview.current.edited &&
          item.expiryDate === ocrReview.current.suggestedDate,
      })
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
          <p className="hint">El puntaje es orientativo, no una probabilidad de acierto. Revisá la fecha impresa antes de guardar.</p>
          <Chips list={candidates} selected={item.expiryDate} onPick={(iso) => {
            if (iso !== item.expiryDate && ocrReview.current.suggestedDate) ocrReview.current.edited = true
            setItem({ ...item, expiryDate: iso })
          }} />
          {ambiguous && <p className="hint warn">La fecha puede leerse de dos formas. Elige la correcta antes de guardar.</p>}
        </>
      )}
      {noResult && <p className="hint warn">No pude reconocer una fecha. Vuelve a recuadrarla o escríbela abajo.</p>}
      <ItemFields value={item} onChange={(next) => {
        if (next.expiryDate !== item.expiryDate && ocrReview.current.suggestedDate) ocrReview.current.edited = true
        setItem(next)
      }} onPhotoFile={onPhotoFile} />
      {additionalLots.map((lot, index) => (
        <div className="card" key={lot.key}>
          <strong>Vencimiento adicional {index + 1}</strong>
          <label>Fecha de vencimiento
            <input type="date" value={lot.expiryDate} onChange={(e) => setAdditionalLots((lots) => lots.map((entry) => entry.key === lot.key ? { ...entry, expiryDate: e.target.value } : entry))} />
          </label>
          <label>Cantidad
            <input type="number" min="1" step="1" value={lot.quantity} onChange={(e) => setAdditionalLots((lots) => lots.map((entry) => entry.key === lot.key ? { ...entry, quantity: e.target.value } : entry))} />
          </label>
          <button type="button" className="btn small" onClick={() => setAdditionalLots((lots) => lots.filter((entry) => entry.key !== lot.key))}>Quitar fecha</button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => setAdditionalLots((lots) => [...lots, { key: crypto.randomUUID(), expiryDate: '', quantity: 1 }])}>Agregar otra fecha</button>
      {additionalLots.length > 0 && <p className="hint">Cada fecha crea un lote independiente. Los demás datos se aplican a todos los lotes.</p>}
      <label>
        Escribir la fecha tal como figura
        <input type="text" value={typed} placeholder="Ej: 15MAR27, 03/27, 2027-03-15"
          autoCapitalize="characters" onChange={(e) => {
            if (ocrReview.current.suggestedDate) ocrReview.current.edited = true
            setTyped(e.target.value)
          }} />
      </label>
      <div className="chips cand">
        {EXAMPLE_FORMATS.map((example) => (
          <button type="button" key={example} className="chip" onClick={() => {
            if (ocrReview.current.suggestedDate) ocrReview.current.edited = true
            setTyped(example)
          }}>
            {example}
          </button>
        ))}
      </div>
      {fromTyped.length > 0 && (
        <>
          {candidates.length === 0 && <p className="hint">El puntaje es orientativo, no una probabilidad de acierto. Revisá la fecha impresa antes de guardar.</p>}
          <Chips list={fromTyped} selected={item.expiryDate} onPick={(iso) => {
            if (iso !== item.expiryDate && ocrReview.current.suggestedDate) ocrReview.current.edited = true
            setItem({ ...item, expiryDate: iso })
          }} />
          {ambiguous && <p className="hint warn">La lectura escrita es ambigua; revisá la sugerencia antes de guardar.</p>}
        </>
      )}
      {raw && <details><summary>Texto leído</summary><pre>{raw}</pre></details>}
      <button className="btn primary" disabled={!item.expiryDate || !validQuantity(item.quantity) || !!busy || saving || additionalLots.some((lot) => !lot.expiryDate || !validQuantity(lot.quantity))}
        onClick={save}>
        Guardar
      </button>
    </div>
  )
}
