import { useEffect, useRef, useState } from 'react'

export default function ScannerView({ onDetect }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const supported = 'BarcodeDetector' in window

  useEffect(() => {
    if (!supported) return
    let stream
    let stopped = false
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        const track = stream.getVideoTracks()[0]
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        loop()
      } catch {
        setError('No se pudo acceder a la cámara. Revisa los permisos.')
      }
    }

    async function loop() {
      if (stopped) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length) {
          navigator.vibrate?.(60)
          onDetect(codes[0].rawValue)
          return
        }
      } catch {
        /* frame no listo */
      }
      setTimeout(loop, 150)
    }

    start()
    return () => {
      stopped = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [supported, onDetect])

  if (!supported) return <p className="msg">Tu navegador no soporta escaneo. Usa la carga manual.</p>

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted />
      <div className="guide" />
      {error && <p className="msg">{error}</p>}
    </div>
  )
}
