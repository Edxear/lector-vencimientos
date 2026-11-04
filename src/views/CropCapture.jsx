import { useEffect, useRef, useState } from 'react'
import { loadBitmap } from '../lib/image'

const MIN = 0.06
const MAX_SIDE = 1800
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Captura estilo Lens: cámara en vivo con un recuadro ajustable.
// "Capturar" congela la imagen, se afina el recuadro y solo esa zona se envía al OCR.
export default function CropCapture({ source, onDone, onCancel }) {
  const videoRef = useRef(null)
  const stillRef = useRef(null)
  const boxRef = useRef(null)
  const dragRef = useRef(null)
  const [live, setLive] = useState(!source)
  const [still, setStill] = useState(null)
  const [ratio, setRatio] = useState(4 / 3)
  const [error, setError] = useState('')
  const [rect, setRect] = useState({ x: 0.08, y: 0.38, w: 0.84, h: 0.24 })

  useEffect(() => {
    if (!source) return
    let alive = true
    loadBitmap(source)
      .then((b) => alive && openStill(b))
      .catch(() => alive && setError('No se pudo abrir la imagen.'))
    return () => { alive = false }
  }, [source])

  useEffect(() => {
    if (!live) return
    let stopped = false
    let stream
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('La cámara no está disponible. Usa la galería.')
      setLive(false)
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const v = videoRef.current
        v.srcObject = s
        v.play().catch(() => {})
      })
      .catch(() => {
        if (stopped) return
        setError('No se pudo abrir la cámara. Revisa el permiso o usa la galería.')
        setLive(false)
      })
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [live])

  useEffect(() => {
    if (!still || !stillRef.current) return
    const c = stillRef.current
    c.width = still.width
    c.height = still.height
    c.getContext('2d').drawImage(still, 0, 0)
  }, [still])

  function openStill(bmp) {
    setError('')
    setRatio(bmp.width / bmp.height)
    setStill(bmp)
    setLive(false)
  }

  async function freeze() {
    const v = videoRef.current
    if (!v?.videoWidth) return
    openStill(await createImageBitmap(v))
  }

  async function fromGallery(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) openStill(await loadBitmap(file))
  }

  function retake() {
    setStill(null)
    setError('')
    setLive(true)
  }

  function begin(e, mode) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mode, x: e.clientX, y: e.clientY, r: rect }
  }

  function move(e) {
    const d = dragRef.current
    if (!d) return
    const b = boxRef.current.getBoundingClientRect()
    const dx = (e.clientX - d.x) / b.width
    const dy = (e.clientY - d.y) / b.height
    let { x, y, w, h } = d.r
    if (d.mode === 'move') {
      setRect({ x: clamp(x + dx, 0, 1 - w), y: clamp(y + dy, 0, 1 - h), w, h })
      return
    }
    let x1 = x, y1 = y, x2 = x + w, y2 = y + h
    if (d.mode.includes('l')) x1 = clamp(x1 + dx, 0, x2 - MIN)
    if (d.mode.includes('r')) x2 = clamp(x2 + dx, x1 + MIN, 1)
    if (d.mode.includes('t')) y1 = clamp(y1 + dy, 0, y2 - MIN)
    if (d.mode.includes('b')) y2 = clamp(y2 + dy, y1 + MIN, 1)
    setRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 })
  }

  const end = () => { dragRef.current = null }

  function confirm() {
    const sx = rect.x * still.width
    const sy = rect.y * still.height
    const sw = rect.w * still.width
    const sh = rect.h * still.height
    const k = Math.min(1, MAX_SIDE / Math.max(sw, sh))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(sw * k))
    c.height = Math.max(1, Math.round(sh * k))
    c.getContext('2d').drawImage(still, sx, sy, sw, sh, 0, 0, c.width, c.height)
    c.toBlob((blob) => onDone(new File([blob], 'fecha.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.92)
  }

  const frameStyle = { aspectRatio: String(ratio), width: `min(100%, calc(62dvh * ${ratio}))` }

  return (
    <div className="crop-screen" role="dialog" aria-modal="true">
      <div className="crop-top">
        <button type="button" className="crop-x" onClick={onCancel} aria-label="Cerrar">✕</button>
        <span>{live ? 'Apunta a la fecha' : 'Ajusta el recuadro sobre la fecha'}</span>
      </div>

      <div className="crop-stage">
        {error && <p className="crop-error">{error}</p>}
        {(live || still) && (
          <div className="crop-frame" ref={boxRef} style={frameStyle}>
            {live ? (
              <video ref={videoRef} playsInline muted
                onLoadedMetadata={(e) => setRatio(e.target.videoWidth / e.target.videoHeight)} />
            ) : (
              <canvas ref={stillRef} />
            )}
            <div className="crop-rect" onPointerDown={(e) => begin(e, 'move')} onPointerMove={move}
              onPointerUp={end} onPointerCancel={end}
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}>
              {['tl', 'tr', 'bl', 'br'].map((h) => (
                <span key={h} className={`crop-h ${h}`} onPointerDown={(e) => begin(e, h)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="crop-bar">
        <label className="btn small">
          🖼 Galería
          <input type="file" accept="image/*" onChange={fromGallery} hidden />
        </label>
        {live ? (
          <button type="button" className="shutter" onClick={freeze} aria-label="Capturar" />
        ) : (
          <>
            <button type="button" className="btn small" onClick={() => setRect({ x: 0, y: 0, w: 1, h: 1 })}>Todo</button>
            {!source && <button type="button" className="btn small" onClick={retake}>Repetir</button>}
            <button type="button" className="btn small primary" disabled={!still} onClick={confirm}>Usar selección</button>
          </>
        )}
      </div>
    </div>
  )
}
