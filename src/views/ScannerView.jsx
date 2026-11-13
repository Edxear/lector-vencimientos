import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'

export default function ScannerView({ onDetect, onError }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const [isScanning, setIsScanning] = useState(true)

  useEffect(() => {
    let controls
    let isMounted = true

    // Configuramos ZXing para que busque los formatos más comunes de tickets y productos
    const hints = new Map()
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE
    ]
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
    // TRY_HARDER ayuda con códigos borrosos o lejanos
    hints.set(DecodeHintType.TRY_HARDER, true) 

    const codeReader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 150, // Escanea cada 150ms (rendimiento óptimo)
    })

    async function startCamera() {
      try {
        // ZXing maneja automáticamente el pedido de permisos y la cámara trasera
        controls = await codeReader.decodeFromVideoDevice(
          undefined, // undefined = usa la cámara por defecto (trasera en móviles)
          videoRef.current,
          (result, error) => {
            if (!isMounted) return
            
            if (result) {
              // ¡Código detectado!
              navigator.vibrate?.(60) // Vibración háptica
              setIsScanning(false)    // Pausamos temporalmente para no escanear doble
              onDetect(result.getText(), result.getBarcodeFormat().toString())
              
              // Opcional: Reanudar el escaneo después de 2 segundos si el componente sigue montado
              setTimeout(() => {
                if (isMounted) setIsScanning(true)
              }, 2000)
            }
            
            if (error && error.name !== 'NotFoundException') {
              // NotFoundException es normal (significa que no hay código en el frame actual)
              // console.log("Error de escaneo:", error)
            }
          }
        )
      } catch (e) {
        if (!isMounted) return
        console.error("Error al iniciar cámara:", e)
        onError?.()
        setError(
          e.name === 'NotAllowedError' 
            ? 'Permiso de cámara denegado. Habilítalo en la configuración de tu navegador.' 
            : 'No se pudo acceder a la cámara. Revisa que no esté en uso por otra app.'
        )
      }
    }

    startCamera()

    return () => {
      isMounted = false
      if (controls) {
        controls.stop() // Apaga la cámara y libera los recursos
      }
    }
  }, [onDetect, onError])

  return (
    <div className="scanner">
      {/* El video se mantiene siempre en el DOM para que ZXing lo controle */}
      <video 
        ref={videoRef} 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      
      {/* Guía visual para el usuario */}
      {isScanning && <div className="guide" />}
      
      {/* Mensaje de error si falla la cámara */}
      {error && <p className="msg" style={{ color: 'red', textAlign: 'center', marginTop: '10px' }}>{error}</p>}
      
      {/* Puedes agregar un texto de ayuda */}
      {!error && isScanning && (
        <p className="hint" style={{ textAlign: 'center', fontSize: '12px' }}>
          Apunta la cámara al código de barras
        </p>
      )}
    </div>
  )
}

/* import { useEffect, useRef, useState } from 'react'

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
}*/
