import { createWorker } from 'tesseract.js'

let workerPromise

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      langPath: '/tesseract/lang',
    })
  }
  return workerPromise
}

// Escala de grises + contraste para mejorar el OCR sobre impresión punteada
async function preprocess(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(2, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    const v = Math.max(0, Math.min(255, (g - 128) * 1.6 + 128))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export async function recognizeText(file) {
  const worker = await getWorker()
  const canvas = await preprocess(file)
  const { data } = await worker.recognize(canvas)
  return data.text
}
