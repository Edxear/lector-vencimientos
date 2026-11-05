import { useState } from 'react'
import { NOTIFY_OPTIONS, LOCATIONS } from '../lib/settings'
import PhotoField from './PhotoField'

// Datos propios de cada unidad/lote: vencimiento, cantidad, ubicación, aviso, notas y foto de la fecha
export default function ItemFields({ value, onChange, onPhotoFile }) {
  const [scanSignal, setScanSignal] = useState(0)
  const set = (k, v) => onChange({ ...value, [k]: v })

  return (
    <>
      <div className="date-row">
        <label>
          Fecha de vencimiento
          <input type="date" value={value.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
        </label>
        <button type="button" className="btn small scan-btn" onClick={() => setScanSignal((n) => n + 1)}>
          📷 {value.expiryPhoto ? 'Reescanear' : 'Escanear'}
        </button>
      </div>
      <div className="two">
        <label>
          Cantidad
          <input type="number" min="1" inputMode="numeric" value={value.quantity}
            onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
        </label>
        <label>
          Área
          <select value={value.location} onChange={(e) => set('location', e.target.value)}>
            <option value="">Sin definir</option>
            {value.location && !LOCATIONS.includes(value.location) && <option>{value.location}</option>}
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
      </div>
      <label>
        Costo por unidad (ARS)
        <input type="number" min="0" max="9999999999.99" step="0.01" inputMode="decimal" value={value.unitCost ?? ''}
          placeholder="Opcional" onChange={(e) => {
            const cost = Number(e.target.value)
            set('unitCost', e.target.value === '' ? null : Number.isFinite(cost) && cost >= 0 && cost <= 9999999999.99 ? cost : null)
          }} />
      </label>
      <label>
        Avisar con anticipación
        <select value={value.notifyDays} onChange={(e) => set('notifyDays', Number(e.target.value))}>
          {NOTIFY_OPTIONS.map((d) => <option key={d} value={d}>{d} días antes</option>)}
        </select>
      </label>
      <label>
        Notas
        <textarea rows="2" value={value.notes} placeholder="Ej: abierto el 10/11, lote 4521"
          onChange={(e) => set('notes', e.target.value)} />
      </label>
      <PhotoField label="Foto de la fecha" value={value.expiryPhoto} autoMax={1000} crop scanSignal={scanSignal}
        onChange={(v) => set('expiryPhoto', v)} onFile={onPhotoFile} />
    </>
  )
}
