import test from 'node:test'
import assert from 'node:assert/strict'
import { getWasteAnalytics, formatWasteCurrency } from '../src/lib/waste.js'

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
