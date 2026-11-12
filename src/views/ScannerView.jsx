import { useEffect, useRef, useState } from 'react'

export default function ScannerView({ onDetect, onError }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const supported = 'BarcodeDetector' in window

  useEffect(() => {
    if (!supported) {
      onError?.()
      return
    }
    let stream
    let stopped = false
    let detector

    async function start() {
      try {
        const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
        const supportedFormats = await window.BarcodeDetector.getSupportedFormats()
        const formats = wanted.filter((format) => supportedFormats.includes(format))
        if (!formats.length) throw new Error('El navegador no admite los formatos de códigos utilizados.')
        if (!formats.includes('qr_code')) setError('Este navegador no admite lectura de QR. Podés ingresar el identificador manualmente.')
        detector = new window.BarcodeDetector({ formats })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const track = stream.getVideoTracks()[0]
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        loop()
      } catch (e) {
        if (!stopped) {
          onError?.()
          setError(e.message || 'No se pudo acceder a la cámara. Revisa los permisos.')
        }
      }
    }

    async function loop() {
      if (stopped) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length) {
          navigator.vibrate?.(60)
          onDetect(codes[0].rawValue, codes[0].format)
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
  }, [supported, onDetect, onError])

  if (!supported) return <p className="msg" role="status">Este navegador no permite escanear códigos con la cámara. No se solicitará acceso a la cámara para el código; ingresá el identificador manualmente o probá otro navegador compatible.</p>

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted />
      <div className="guide" />
      {error && <p className="msg">{error}</p>}
    </div>
  )
}
