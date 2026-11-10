import test from 'node:test'
import assert from 'node:assert/strict'
import { withOpeningExpiry } from '../src/lib/opened.js'

test('la apertura acorta el vencimiento y conserva el original', () => {
  const item = withOpeningExpiry({ expiryDate: '2027-03-20', openedDate: '2027-03-01', openedDays: 3 })
  assert.equal(item.expiryDate, '2027-03-04')
  assert.equal(item.sealedExpiryDate, '2027-03-20')
  assert.equal(withOpeningExpiry({ ...item, openedDate: '', openedDays: '' }).expiryDate, '2027-03-20')
})

test('abrir no extiende la fecha original y rechaza datos incompletos', () => {
  assert.equal(withOpeningExpiry({ expiryDate: '2027-03-02', openedDate: '2027-03-01', openedDays: 3 }).expiryDate, '2027-03-02')
  assert.throws(() => withOpeningExpiry({ expiryDate: '2027-03-02', openedDate: '2027-03-01' }), /fecha de apertura/)
  assert.throws(() => withOpeningExpiry({ expiryDate: '2027-03-02', openedDate: '2027-02-30', openedDays: 3 }), /fecha de apertura/)
  assert.throws(() => withOpeningExpiry({ expiryDate: '9999-12-31', openedDate: '9999-12-31', openedDays: 3 }), /fuera del rango/)
})
