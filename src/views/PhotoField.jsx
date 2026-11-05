import { useEffect, useRef, useState } from 'react'
import ImageResizer from './ImageResizer'
import CropCapture from './CropCapture'
import { compressFile } from '../lib/image'

// Foto con captura, miniatura ampliable y ajuste de tamaño.
// Conserva el archivo original durante la sesión para poder volver a agrandar.
export default function PhotoField({ label, value, onChange, onFile, autoMax = 800, crop = false, scanSignal = 0 }) {
  const originalRef = useRef(null)
  const [resizing, setResizing] = useState(false)
  const [cropping, setCropping] = useState(false)
  const [recropSource, setRecropSource] = useState(null)
  const [zoom, setZoom] = useState(false)
  const [big, setBig] = useState(false)

  useEffect(() => {
    if (scanSignal > 0) { setRecropSource(null); setCropping(true) }
  }, [scanSignal])

  async function handleFile(file) {
    originalRef.current = file
    onFile?.(file)
    onChange(await compressFile(file, autoMax))
  }

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleFile(file)
  }

  function closeCrop() {
    setCropping(false)
    setRecropSource(null)
  }

  return (
    <div className="photo-field">
      <span className="label">{label}</span>
      {value && (
        <button type="button" className="thumb" onClick={() => setZoom(true)} aria-label="Ampliar foto">
          <img src={value} alt={label} />
        </button>
      )}
      <div className="btn-row">
        {!crop && (
          <label className="btn small">
            📷 {value ? 'Nueva foto' : 'Tomar foto'}
            <input type="file" accept="image/*" capture="environment" onChange={pick} hidden />
          </label>
        )}
        {value && (
          <>
            {crop && (
              <button type="button" className="btn small"
                onClick={() => { setRecropSource(originalRef.current || value); setCropping(true) }}>✂ Recortar</button>
            )}
            <button type="button" className="btn small" onClick={() => setResizing(true)}>↔ Tamaño</button>
            <button type="button" className="btn small" onClick={() => { originalRef.current = null; onChange('') }}>Quitar</button>
          </>
        )}
      </div>

      {cropping && (
        <CropCapture
          source={recropSource}
          onCancel={closeCrop}
          onDone={(file) => { closeCrop(); handleFile(file) }}
        />
      )}

      {resizing && (
        <ImageResizer
          source={originalRef.current || value}
          initialMax={autoMax}
          onCancel={() => setResizing(false)}
          onSave={(url) => { onChange(url); setResizing(false) }}
        />
      )}

      {zoom && (
        <div className="lightbox" onClick={() => { setZoom(false); setBig(false) }}>
          <img src={value} alt={label} className={big ? 'big' : ''}
            onClick={(e) => { e.stopPropagation(); setBig(!big) }} />
          <small>Toca la imagen para acercar o alejar · toca fuera para cerrar</small>
        </div>
      )}
    </div>
  )
}
