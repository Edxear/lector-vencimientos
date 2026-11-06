import test from 'node:test'
import assert from 'node:assert/strict'
import { getMonthlyReuseSavings, getWasteAnalytics, formatWasteCurrency, shouldAutoWaste, expiredAt } from '../src/lib/waste.js'

test('un lote vencido se registra solo como pérdida con la fecha en que venció', () => {
  const now = new Date(2026, 10, 5, 10).getTime()
  assert.equal(shouldAutoWaste({ expiryDate: '2026-11-04' }, now), true)
  assert.equal(expiredAt('2026-11-04'), new Date(2026, 10, 5).getTime())
  assert.equal(shouldAutoWaste({ expiryDate: '2026-11-05' }, now), false, 'vence hoy: todavía sirve')
  assert.equal(shouldAutoWaste({ expiryDate: '2026-11-06' }, now), false)
})

test('no se descarta solo un lote con destino o conservado a propósito', () => {
  const now = new Date(2026, 10, 5, 10).getTime()
  const base = { expiryDate: '2026-10-01' }
  assert.equal(shouldAutoWaste({ ...base, wastedAt: 1 }, now), false)
  assert.equal(shouldAutoWaste({ ...base, reusedAt: 1 }, now), false)
  assert.equal(shouldAutoWaste({ ...base, keepActive: true }, now), false)
  assert.equal(shouldAutoWaste({ expiryDate: '' }, now), false)
})

test('desglosa las pérdidas por área y no cuenta lotes reutilizados', () => {
  const { byArea, totalLoss } = getWasteAnalytics([
    { wastedAt: new Date(2026, 10, 4).getTime(), unitCost: 10, quantity: 2, location: 'Frío' },
    { wastedAt: new Date(2026, 10, 4).getTime(), unitCost: 5, quantity: 1, location: 'Almacén' },
    { wastedAt: null, reusedAt: Date.now(), unitCost: 999, quantity: 1, location: 'Frío' },
  ], new Date(2026, 10, 15))
  assert.equal(totalLoss, 25)
  assert.deepEqual(byArea.map((a) => [a.area, a.total, a.lots]), [['Frío', 20, 1], ['Almacén', 5, 1]])
})

test('agrupa pérdidas por mes y multiplica el costo por la cantidad', () => {
  const { months, totalLoss, pricedLots, unpricedLots } = getWasteAnalytics([
    { wastedAt: new Date(2026, 10, 4).getTime(), unitCost: 25.5, quantity: 2 },
    { wastedAt: new Date(2026, 10, 5).getTime(), unitCost: null, quantity: 1 },
    { wastedAt: new Date(2026, 9, 20).getTime(), unitCost: 10, quantity: 3 },
  ], new Date(2026, 10, 15))

  assert.equal(totalLoss, 81)
  assert.equal(pricedLots, 2)
  assert.equal(unpricedLots, 1)
  assert.equal(months.at(-1).total, 51)
  assert.equal(months.at(-1).unpriced, 1)
  assert.equal(months.at(-2).total, 30)
})

test('no contabiliza registros sin desperdicio ni fechas fuera del gráfico mensual', () => {
  const { months, totalLoss } = getWasteAnalytics([
    { wastedAt: null, unitCost: 100, quantity: 1 },
    { wastedAt: new Date(2025, 0, 1).getTime(), unitCost: 20, quantity: 2 },
  ], new Date(2026, 10, 15))

  assert.equal(totalLoss, 40)
  assert.ok(months.every((month) => month.total === 0))
})

test('formatea los importes en pesos argentinos', () => {
  assert.match(formatWasteCurrency(1250), /1\.250/)
  assert.match(formatWasteCurrency(1250), /\$/)
})

test('estima el ahorro mensual solo para productos consumidos a tiempo', () => {
  const now = new Date(2026, 10, 5)
  const { total, pricedLots, totalLots } = getMonthlyReuseSavings([
    { reusedAt: new Date(2026, 10, 2).getTime(), reuseLabel: 'Consumido a tiempo', unitCost: 25, quantity: 2 },
    { reusedAt: new Date(2026, 10, 3).getTime(), reuseLabel: 'Consumido a tiempo', unitCost: null, quantity: 1 },
    { reusedAt: new Date(2026, 10, 3).getTime(), reuseLabel: 'Donado', unitCost: 500, quantity: 1 },
    { reusedAt: new Date(2026, 9, 30).getTime(), reuseLabel: 'Consumido a tiempo', unitCost: 100, quantity: 1 },
  ], now)

  assert.equal(total, 50)
  assert.equal(pricedLots, 1)
  assert.equal(totalLots, 2)
})
