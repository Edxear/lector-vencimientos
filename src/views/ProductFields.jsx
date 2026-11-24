import { useState } from 'react'
import { CATEGORIES } from '../lib/settings'
import PhotoField from './PhotoField'

// Datos propios del producto (comunes a todos sus lotes)
export default function ProductFields({ value, onChange }) {
  const isCustomInitial = Boolean(value.category && !CATEGORIES.includes(value.category))
  const [customMode, setCustomMode] = useState(isCustomInitial)
  const set = (k, v) => onChange({ ...value, [k]: v })

  function handleSelectCategory(cat) {
    if (cat === '__custom') {
      setCustomMode(true)
      set('category', '')
    } else {
      setCustomMode(false)
      set('category', cat)
    }
  }

  return (
    <>
      <label>
        Nombre
        <input
          value={value.name}
          placeholder="Ej: Leche entera, Yogur natural…"
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
      <div className="two">
        <label>
          Marca
          <input value={value.brand || ''} placeholder="Opcional" onChange={(e) => set('brand', e.target.value)} />
        </label>
        <label>
          Contenido
          <input value={value.content || ''} placeholder="500 g, 1 L" onChange={(e) => set('content', e.target.value)} />
        </label>
      </div>

      <label>
        Categoría
        <select
          value={customMode ? '__custom' : (value.category || '')}
          onChange={(e) => handleSelectCategory(e.target.value)}
        >
          <option value="">Seleccionar categoría…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="__custom">+ Otra categoría…</option>
        </select>
      </label>

      {customMode && (
        <label>
          Nombre de la categoría
          <input
            value={value.category || ''}
            placeholder="Ej: Panadería, Fiambres…"
            onChange={(e) => set('category', e.target.value)}
            autoFocus
          />
        </label>
      )}

      <div className="chips" role="group" aria-label="Categorías rápidas">
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            className={`chip ${value.category === c && !customMode ? 'on' : ''}`}
            onClick={() => handleSelectCategory(value.category === c ? '' : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <PhotoField
        label="Foto del producto"
        value={value.imageUrl || ''}
        autoMax={800}
        onChange={(v) => set('imageUrl', v)}
      />
      <small>EAN {value.ean}</small>
    </>
  )
}
