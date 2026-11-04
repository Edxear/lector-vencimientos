import { useEffect, useMemo, useState } from 'react'
import { loadBitmap, renderJpeg, formatKB } from '../lib/image'

// Ajusta el tamaño y la calidad de una foto con vista previa en vivo
export default function ImageResizer({ source, initialMax = 800, onSave, onCancel }) {
  const [bmp, setBmp] = useState(null)
  const [error, setError] = useState('')
  const [maxDim, setMaxDim] = useState(initialMax)
  const [quality, setQuality] = useState(80)

  useEffect(() => {
    let alive = true
    loadBitmap(source)
      .then((b) => {
        if (!alive) return
        setBmp(b)
        setMaxDim(Math.min(initialMax, Math.max(b.width, b.height)))
      })
      .catch(() => alive && setError('No se pudo abrir la imagen.'))
    return () => { alive = false }
  }, [source, initialMax])

  const longSide = bmp ? Math.max(bmp.width, bmp.height) : 0
  const out = useMemo(() => (bmp ? renderJpeg(bmp, maxDim, quality / 100) : null), [bmp, maxDim, quality])

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="sheet">
        <h3>Ajustar foto</h3>
        {error && <p className="msg">{error}</p>}
        {out && (
          <>
            <div className="preview"><img src={out.dataUrl} alt="Vista previa" /></div>
            <p className="meta">{out.w} × {out.h} px · {formatKB(out.bytes)}</p>
            <label>
              Tamaño: {Math.min(maxDim, longSide)} px
              <input type="range" min="200" max={Math.max(200, longSide)} step="20"
                value={Math.min(maxDim, longSide)} onChange={(e) => setMaxDim(Number(e.target.value))} />
            </label>
            <label>
              Calidad: {quality}%
              <input type="range" min="40" max="95" step="5" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
            </label>
          </>
        )}
        <div className="btn-row">
          <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn primary" disabled={!out} onClick={() => onSave(out.dataUrl)}>Aplicar</button>
        </div>
      </div>
    </div>
  )
}
