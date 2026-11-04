// Lector de fechas de vencimiento tolerante a OCR.
// Registro de formatos: cada patrón extrae números/nombres y genera interpretaciones;
// luego se puntúan por validez, orden preferido, plausibilidad y etiquetas cercanas (VENC, ELAB…).

export const DATE_ORDERS = ['DMY', 'MDY', 'YMD']

const MONTHS = {
  ENE: 1, ENERO: 1, JAN: 1, JANUARY: 1,
  FEB: 2, FEBRERO: 2, FEBRUARY: 2,
  MAR: 3, MARZO: 3, MARCH: 3,
  ABR: 4, ABRIL: 4, APR: 4, APRIL: 4,
  MAY: 5, MAYO: 5,
  JUN: 6, JUNIO: 6, JUNE: 6,
  JUL: 7, JULIO: 7, JULY: 7,
  AGO: 8, AGOSTO: 8, AUG: 8, AUGUST: 8,
  SEP: 9, SEPT: 9, SET: 9, SEPTIEMBRE: 9, SETIEMBRE: 9, SEPTEMBER: 9,
  OCT: 10, OCTUBRE: 10, OCTOBER: 10,
  NOV: 11, NOVIEMBRE: 11, NOVEMBER: 11,
  DIC: 12, DICIEMBRE: 12, DEC: 12, DECEMBER: 12,
}
const SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'JAN', 'APR', 'AUG', 'DEC']
// Palabras de etiqueta que no deben confundirse con meses al corregir errores del OCR
const NOT_MONTH = new Set(['FAB', 'MAN', 'LOT', 'EXP', 'USE', 'VTO', 'PRD', 'ELA', 'BEST', 'MFG', 'MFD', 'ENV', 'CAD', 'PROD'])

const EXP_LABELS = /(VENC\w*|VTO|VCTO|VENCE|EXP\w*|BEST\s*BEFORE|BEST\s*BEF|USE\s*BY|BB|BBE|CONSUMIR|CONSUMO\s*PREF\w*|PREF\w*|CADUC\w*|CAD|VALID\w*|ANTES\s*DE|MHD)/
const MFG_LABELS = /(ELAB\w*|FAB\w*|PROD\w*|MFG|MFD|MANUF\w*|PACKED|PKD|ENVAS\w*|ENV|EMB\w*)/

const pad = (n) => String(n).padStart(2, '0')

function lev(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j++) m[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return m[a.length][b.length]
}

function matchMonth(word) {
  if (MONTHS[word]) return { month: MONTHS[word], fuzzy: false }
  if (word.length !== 3 || NOT_MONTH.has(word)) return null
  const near = [...new Set(SHORT.filter((s) => lev(word, s) === 1).map((s) => MONTHS[s]))]
  return near.length === 1 ? { month: near[0], fuzzy: true } : null
}

// Corrige confusiones típicas del OCR (O→0, I→1, S→5…) solo en tokens pegados a números
const CONFUSE = { O: '0', Q: '0', D: '0', I: '1', L: '1', '|': '1', '!': '1', Z: '2', S: '5', B: '8', G: '6' }
export function normalizeOcr(text) {
  const t = String(text).toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/[·•]/g, '.').replace(/\\/g, '/')
  return t.replace(/(?<![A-Z])[0-9OQDIL|!ZSBG]+(?![A-Z])/g, (w, off) => {
    if (/^\d+$/.test(w)) return w
    const before = t.slice(Math.max(0, off - 3), off)
    const after = t.slice(off + w.length, off + w.length + 3)
    const nearDigit = /\d[\s/.\-]{0,2}$/.test(before) || /^[\s/.\-]{0,2}\d/.test(after)
    const hasDigit = /\d/.test(w)
    if (!hasDigit && !(nearDigit && w.length <= 4)) return w
    if (/^[A-Z]{3,}$/.test(w) && !hasDigit) return w
    return w.replace(/[OQDIL|!ZSBG]/g, (c) => CONFUSE[c])
  })
}

const SEP = '[\\/.\\-]'
const MON = '([A-Z]{3,10})'

function mkDate(y, m, d) {
  if (m < 1 || m > 12 || d < 1) return null
  const last = new Date(y, m, 0).getDate()
  if (d > last) return null
  return { y, m, d }
}
const year = (s) => (s.length === 2 ? 2000 + Number(s) : Number(s))

// Interpretaciones de a/b/c con año de 2 o 4 dígitos
function triples(a, b, c) {
  const out = []
  const add = (order, y, m, d) => {
    const v = mkDate(y, m, d)
    if (v) out.push({ ...v, order })
  }
  if (a.length === 4) add('YMD', year(a), Number(b), Number(c))
  else if (c.length === 4) {
    add('DMY', year(c), Number(b), Number(a))
    add('MDY', year(c), Number(a), Number(b))
  } else {
    add('DMY', year(c), Number(b), Number(a))
    add('YMD', year(a), Number(b), Number(c))
    add('MDY', year(c), Number(a), Number(b))
  }
  return out
}

function compact(s) {
  const out = []
  const add = (order, y, m, d) => {
    const v = mkDate(y, m, d)
    if (v) out.push({ ...v, order })
  }
  const n = (i, l) => Number(s.slice(i, i + l))
  if (s.length === 6) {
    add('DMY', 2000 + n(4, 2), n(2, 2), n(0, 2))
    add('YMD', 2000 + n(0, 2), n(2, 2), n(4, 2))
    add('MDY', 2000 + n(4, 2), n(0, 2), n(2, 2))
  } else {
    add('DMY', n(4, 4), n(2, 2), n(0, 2))
    add('YMD', n(0, 4), n(4, 2), n(6, 2))
    add('MDY', n(4, 4), n(0, 2), n(2, 2))
  }
  return out
}

// Registro de formatos. Cada uno devuelve interpretaciones { y, m, d, order?, precision }.
const FORMATS = [
  {
    id: 'numeric3',
    base: 50,
    re: new RegExp(`(?<!\\d)(\\d{1,4})\\s?${SEP}\\s?(\\d{1,2})\\s?${SEP}\\s?(\\d{2,4})(?!\\d)`, 'g'),
    read: (m) => triples(m[1], m[2], m[3]),
  },
  {
    id: 'spaced3',
    base: 34,
    re: /(?<![\d/.\-])(\d{2,4}) (\d{2}) (\d{2,4})(?![\d/.\-])/g,
    read: (m) => triples(m[1], m[2], m[3]),
  },
  {
    id: 'day-month-name-year',
    base: 58,
    re: new RegExp(`(?<!\\d)(\\d{1,2})\\s?${SEP}?\\s?${MON}\\s?${SEP}?\\s?(\\d{4}|\\d{2})(?!\\d)`, 'g'),
    read: (m) => {
      const mo = matchMonth(m[2])
      const v = mo && mkDate(year(m[3]), mo.month, Number(m[1]))
      return v ? [{ ...v, order: 'DMY', penalty: mo.fuzzy ? 8 : 0 }] : []
    },
  },
  {
    id: 'month-name-day-year',
    base: 52,
    re: new RegExp(`(?<![A-Z])${MON}\\s?${SEP}?\\s?(\\d{1,2})\\s?[,.\\-/]?\\s?(\\d{4})(?!\\d)`, 'g'),
    read: (m) => {
      const mo = matchMonth(m[1])
      const v = mo && mkDate(Number(m[3]), mo.month, Number(m[2]))
      return v ? [{ ...v, order: 'MDY', penalty: mo.fuzzy ? 8 : 0 }] : []
    },
  },
  {
    id: 'month-name-year',
    base: 46,
    re: new RegExp(`(?<![A-Z])${MON}\\s?${SEP}?\\s?(\\d{4}|\\d{2})(?!\\d)`, 'g'),
    read: (m) => {
      const mo = matchMonth(m[1])
      return mo ? [{ y: year(m[2]), m: mo.month, d: 0, precision: 'month', penalty: mo.fuzzy ? 8 : 0 }] : []
    },
  },
  {
    id: 'month-year',
    base: 38,
    re: new RegExp(`(?<![\\d/.\\-])(\\d{1,4})\\s?${SEP}\\s?(\\d{2,4})(?![\\d/.\\-]\\d)(?!\\d)`, 'g'),
    read: (m) => {
      const [a, b] = [m[1], m[2]]
      const out = []
      const add = (y, mo, order) => {
        if (mo >= 1 && mo <= 12) out.push({ y, m: mo, d: 0, precision: 'month', order })
      }
      if (a.length === 4) add(Number(a), Number(b), 'YM')
      else if (b.length === 4) add(Number(b), Number(a), 'MY')
      else if (a.length <= 2 && b.length === 2) {
        add(year(b), Number(a), 'MY')
        add(year(a), Number(b), 'YM')
      }
      return out
    },
  },
  {
    id: 'compact',
    base: 24,
    re: /(?<!\d)(\d{6}|\d{8})(?!\d)/g,
    read: (m) => compact(m[1]),
  },
]

const LABEL = { 'numeric3': 'DD/MM/AA', 'spaced3': 'DD MM AA', 'day-month-name-year': 'DD MES AA', 'month-name-day-year': 'MES DD AAAA', 'month-name-year': 'MES AA', 'month-year': 'MM/AA', 'compact': 'DDMMAA' }
const ORDER_TEXT = { DMY: 'DD/MM/AA', MDY: 'MM/DD/AA', YMD: 'AA/MM/DD', MY: 'MM/AA', YM: 'AA/MM' }

export function formatLabel(c) {
  if (c.format.includes('name') || !ORDER_TEXT[c.order]) return LABEL[c.format]
  return `${ORDER_TEXT[c.order]}${c.format === 'compact' ? ' (junto)' : ''}`
}

function nearestLabel(text, start, end, floor) {
  const before = text.slice(Math.max(floor, start - 28), start)
  const after = text.slice(end, end + 14)
  const find = (s, re) => {
    let last = null
    const g = new RegExp(re.source, 'g')
    let x
    while ((x = g.exec(s))) last = x.index
    return last
  }
  const e = find(before, EXP_LABELS)
  const f = find(before, MFG_LABELS)
  if (e !== null || f !== null) return (e ?? -1) >= (f ?? -1) ? 'exp' : 'mfg'
  if (new RegExp('^\\s*' + EXP_LABELS.source).test(after)) return 'exp'
  if (new RegExp('^\\s*' + MFG_LABELS.source).test(after)) return 'mfg'
  return null
}

function priorFor(order, pref) {
  if (!DATE_ORDERS.includes(order)) return 0
  if (order === pref) return 10
  const second = { DMY: 'YMD', MDY: 'DMY', YMD: 'DMY' }[pref]
  return order === second ? 5 : 0
}

function plausibility(date, now) {
  const days = Math.round((date - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  if (days >= -30 && days <= 3 * 365) return 15
  if (days > 3 * 365 && days <= 8 * 365) return 0
  if (days < -30 && days >= -365) return 4
  return -35
}

const endOfMonth = (y, m) => new Date(y, m, 0).getDate()

// Devuelve candidatos ordenados por confianza: [{ iso, precision, score, format, order, label, ambiguous }]
export function parseExpiryCandidates(rawText, { order = 'DMY', now = new Date() } = {}) {
  const text = normalizeOcr(rawText)
  const found = []
  const taken = []
  let groupId = 0

  for (const fmt of FORMATS) {
    for (const m of text.matchAll(fmt.re)) {
      const start = m.index
      const end = start + m[0].length
      if (taken.some(([s, e]) => start < e && end > s)) continue
      const reads = fmt.read(m)
      if (!reads.length) continue
      taken.push([start, end])
      groupId += 1
      const ctx = nearestLabel(text, start, end, 0)
      const unique = reads.length === 1
      for (const r of reads) {
        const precision = r.precision || 'day'
        const d = precision === 'month' ? endOfMonth(r.y, r.m) : r.d
        const date = new Date(r.y, r.m - 1, d)
        let score = fmt.base + priorFor(r.order, order) + plausibility(date, now) - (r.penalty || 0)
        if (unique) score += 8
        if (ctx === 'exp') score += 30
        if (ctx === 'mfg') score -= 30
        found.push({
          iso: `${r.y}-${pad(r.m)}-${pad(d)}`, precision, score, format: fmt.id, order: r.order, group: groupId, ctx, ms: +date,
        })
      }
    }
  }

  // Con dos fechas sin etiqueta, la posterior suele ser el vencimiento (la otra es elaboración)
  const groups = new Set(found.filter((c) => !c.ctx && c.score > 0).map((c) => c.group))
  if (groups.size > 1) {
    const latest = found.filter((c) => !c.ctx && groups.has(c.group)).reduce((a, b) => (b.ms > a.ms ? b : a))
    for (const c of found) if (c.group === latest.group) c.score += 6
  }

  const best = new Map()
  for (const c of found) {
    const key = c.iso
    const cur = best.get(key)
    if (!cur || c.score > cur.score) best.set(key, c)
  }
  const list = [...best.values()].filter((c) => c.score >= 30).sort((a, b) => b.score - a.score)
  list.forEach((c, i) => {
    c.label = formatLabel(c)
    c.ambiguous = i === 0 && list[1] && list[0].score - list[1].score < 8 && list[1].group === list[0].group
  })
  return list.slice(0, 6)
}

// Combina el texto de varias lecturas del OCR: una fecha repetida en varias lecturas gana confianza
export function mergeCandidates(texts, opts) {
  const all = new Map()
  for (const t of texts) {
    for (const c of parseExpiryCandidates(t, opts)) {
      const cur = all.get(c.iso)
      if (!cur) all.set(c.iso, { ...c, votes: 1 })
      else {
        cur.votes += 1
        cur.score = Math.max(cur.score, c.score) + 6
        if (c.ctx === 'exp') cur.ctx = 'exp'
      }
    }
  }
  const list = [...all.values()].sort((a, b) => b.score - a.score)
  list.forEach((c, i) => {
    c.confidence = Math.max(5, Math.min(99, Math.round(c.score)))
    c.ambiguous = i === 0 && !!list[1] && list[0].score - list[1].score < 8
  })
  return list.slice(0, 6)
}

// Compatibilidad: solo las fechas ISO
export function parseExpiryDates(text, opts) {
  return mergeCandidates([text], opts).map((c) => c.iso)
}

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDisplay(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function daysUntil(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}
