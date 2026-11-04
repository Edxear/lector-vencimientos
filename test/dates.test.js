import test from 'node:test'
import assert from 'node:assert/strict'
import { parseExpiryDates, mergeCandidates } from '../src/lib/dates.js'

const now = new Date(2026, 10, 3)
const best = (text, order = 'DMY') => mergeCandidates([text], { now, order })[0]?.iso

const cases = [
  ['VENC: 15/03/2027', '2027-03-15'],
  ['VTO 15-03-27', '2027-03-15'],
  ['EXP 2027/03/15', '2027-03-15'],
  ['2027-03-15', '2027-03-15'],
  ['27/03/15 VENC', '2027-03-15'],
  ['15.03.27', '2027-03-15'],
  ['15 03 2027', '2027-03-15'],
  ['150327', '2027-03-15'],
  ['15032027', '2027-03-15'],
  ['20270315', '2027-03-15'],
  ['15 MAR 2027', '2027-03-15'],
  ['15MAR27', '2027-03-15'],
  ['15-MAR-2027', '2027-03-15'],
  ['MAR 15 2027', '2027-03-15'],
  ['BEST BEFORE 15 MAR 2027', '2027-03-15'],
  ['VENC 15/ENE/27', '2027-01-15'],
  ['VENC 15/DIC/26', '2026-12-15'],
  ['CONSUMIR PREFERENTEMENTE ANTES DE 03/2027', '2027-03-31'],
  ['BB 03/27', '2027-03-31'],
  ['EXP MAR 2027', '2027-03-31'],
  ['VENC SEP26', '2026-09-30'],
  ['VENC 1S/O3/2O27', '2027-03-15'],
  ['VENC l5/O3/27', '2027-03-15'],
  ['ELAB 10/03/26 VENC 10/03/27', '2027-03-10'],
  ['FAB: 10/03/26  VTO: 10/09/27', '2027-09-10'],
  ['L4521 10/03/26 15/03/27', '2027-03-15'],
  ['VENC 15/NOU/27', '2027-11-15'],
  ['VENC 15/MARZO/2027', '2027-03-15'],
]

for (const [text, expected] of cases) {
  test(text, () => assert.equal(best(text), expected))
}

test('orden MDY cuando el usuario lo elige', () => {
  assert.equal(best('03/04/27', 'MDY'), '2027-03-04')
  assert.equal(best('03/04/27', 'DMY'), '2027-04-03')
})

test('formato ambiguo ofrece ambas lecturas', () => {
  const dates = parseExpiryDates('04/05/27', { now, order: 'DMY' })
  assert.ok(dates.includes('2027-05-04'))
  assert.ok(dates.includes('2027-04-05'))
})

test('precios, EAN y horas no son fechas', () => {
  assert.equal(best('PRECIO 12.50 $ 7790150330166 12:30'), undefined)
})

test('varias lecturas del OCR suman confianza', () => {
  const [c] = mergeCandidates(['VENC 15/03/27', 'VENC 15/O3/27', 'VENC 15/03/21'], { now })
  assert.equal(c.iso, '2027-03-15')
  assert.ok(c.votes >= 2)
})
