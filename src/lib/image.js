export async function loadBitmap(src) {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
  return createImageBitmap(blob)
}

// Reescala a un lado máximo (maxDim) y comprime a JPEG
export function renderJpeg(bmp, maxDim, quality = 0.8) {
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(bmp, 0, 0, w, h)
  const dataUrl = c.toDataURL('image/jpeg', quality)
  return { dataUrl, w, h, bytes: Math.round(((dataUrl.length - 23) * 3) / 4) }
}

export async function compressFile(file, maxDim, quality = 0.8) {
  const bmp = await loadBitmap(file)
  return renderJpeg(bmp, maxDim, quality).dataUrl
}

export const formatKB = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`
