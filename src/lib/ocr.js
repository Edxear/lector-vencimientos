import { mergeCandidates } from './dates'

const WHITELIST = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/.-: ,'
let workerPromise

function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js')
      .then(({ createWorker }) => createWorker('eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/',
        langPath: '/tesseract/lang',
      }))
      .then(async (w) => {
        await w.setParameters({
          tessedit_char_whitelist: WHITELIST,
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: '6',
        })
        return w
      })
      .catch((e) => { workerPromise = undefined; throw e })
  }
  return workerPromise
}

async function loadGray(file) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(3, 1600 / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0, p = 0; i < d.length; i += 4, p++) gray[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  return { gray, w, h }
}

function toCanvas(gray, w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let p = 0; p < gray.length; p++) {
    const v = gray[p]
    img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v
    img.data[p * 4 + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

// Estira el histograma entre los percentiles 2 y 98
function autoContrast(gray) {
  const hist = new Array(256).fill(0)
  for (const v of gray) hist[v]++
  const cut = gray.length * 0.02
  let lo = 0, hi = 255, acc = 0
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > cut) { lo = i; break } }
  acc = 0
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > cut) { hi = i; break } }
  const span = Math.max(1, hi - lo)
  return gray.map((v) => ((v - lo) * 255) / span)
}

// Desenfoque 3x3: une los puntos de las impresiones punteadas (inkjet)
function blur(gray, w, h) {
  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx >= 0 && xx < w && yy >= 0 && yy < h) { s += gray[yy * w + xx]; n++ }
        }
      }
      out[y * w + x] = s / n
    }
  }
  return out
}

function otsu(gray) {
  const hist = new Array(256).fill(0)
  for (const v of gray) hist[v]++
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, best = 0, threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = total - wB
    if (!wF) break
    sumB += t * hist[t]
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2
    if (between > best) { best = between; threshold = t }
  }
  return threshold
}

// Umbral local (media por ventana): resiste sombras y plástico arrugado
function adaptive(gray, w, h) {
  const win = Math.max(15, Math.round(w / 10)) | 1
  const r = win >> 1
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 1; y <= h; y++) {
    let row = 0
    for (let x = 1; x <= w; x++) {
      row += gray[(y - 1) * w + (x - 1)]
      integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + row
    }
  }
  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r)
      const area = (x1 - x0 + 1) * (y1 - y0 + 1)
      const sum = integral[(y1 + 1) * (w + 1) + x1 + 1] - integral[y0 * (w + 1) + x1 + 1] - integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0]
      out[y * w + x] = gray[y * w + x] < sum / area - 10 ? 0 : 255
    }
  }
  return out
}

function variants({ gray, w, h }) {
  const stretched = autoContrast(gray)
  const smooth = blur(stretched, w, h)
  const t = otsu(smooth)
  const bin = smooth.map((v) => (v > t ? 255 : 0))
  return [
    { name: 'contraste', data: stretched },
    { name: 'binaria', data: bin },
    { name: 'local', data: adaptive(smooth, w, h) },
    { name: 'invertida', data: bin.map((v) => 255 - v) },
  ].map((v) => ({ ...v, w, h }))
}

// Lee la fecha con varias versiones de la imagen y combina los resultados por votación
export async function recognizeExpiry(file, { order = 'DMY', onProgress } = {}) {
  const worker = await getWorker()
  const list = variants(await loadGray(file))
  const texts = []
  let candidates = []
  for (let i = 0; i < list.length; i++) {
    onProgress?.(i + 1, list.length)
    const v = list[i]
    const { data } = await worker.recognize(toCanvas(v.data, v.w, v.h))
    texts.push(data.text)
    candidates = mergeCandidates(texts, { order })
    const top = candidates[0]
    if (i >= 1 && top && top.votes >= 2 && top.score >= 80 && !top.ambiguous) break
  }
  return { texts, text: texts.join('\n---\n'), candidates }
}
