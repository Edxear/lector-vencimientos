import { CATEGORIES } from '../lib/settings'
import PhotoField from './PhotoField'

// Datos propios del producto (comunes a todos sus lotes)
export default function ProductFields({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })

  return (
    <>
      <label>
        Nombre
        <input value={value.name} onChange={(e) => set('name', e.target.value)} />
      </label>
      <div className="two">
        <label>
          Marca
          <input value={value.brand || ''} onChange={(e) => set('brand', e.target.value)} />
        </label>
        <label>
          Contenido
          <input value={value.content || ''} placeholder="500 g, 1 L" onChange={(e) => set('content', e.target.value)} />
        </label>
      </div>
      <label>
        Categoría
        <input list="categories" value={value.category || ''} onChange={(e) => set('category', e.target.value)} />
        <datalist id="categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <PhotoField label="Foto del producto" value={value.imageUrl || ''} autoMax={800}
        onChange={(v) => set('imageUrl', v)} />
      <small>EAN {value.ean}</small>
    </>
  )
}
