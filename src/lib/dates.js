import * as chrono from 'chrono-node'

// Devuelve fechas candidatas (YYYY-MM-DD) encontradas en el texto del OCR
export function parseExpiryDates(text) {
  const clean = text.replace(/[|]/g, '1').replace(/\s+/g, ' ')
  const results = chrono.es.parse(clean, new Date(), { forwardDate: true })
  const en = chrono.parse(clean, new Date(), { forwardDate: true })
  const seen = new Set()
  const out = []
  for (const r of [...results, ...en]) {
    const d = r.start.date()
    const iso = toISO(d)
    if (!seen.has(iso) && d.getFullYear() >= 2020 && d.getFullYear() <= 2100) {
      seen.add(iso)
      out.push(iso)
    }
  }
  return out
}

export function toISO(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}
