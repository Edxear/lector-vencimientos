import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeAddMetrics } from '../src/lib/addMetrics.js'

test('resume altas completadas, abandonadas e interrumpidas sin mezclar eventos anteriores', () => {
  const events = [
    { type: 'add_flow_start', data: { id: 'a' } },
    { type: 'add_flow_start', data: { id: 'b' } },
    { type: 'add_flow_start', data: { id: 'c' } },
    { type: 'add_flow_start', data: { id: 'd' } },
    { type: 'add_flow_end', data: { id: 'a', outcome: 'completed', durationMs: 10000, errors: 1, ocrSuggested: true, ocrUnedited: true } },
    { type: 'add_flow_end', data: { id: 'b', outcome: 'completed', durationMs: 20000, errors: 0, ocrSuggested: true, ocrUnedited: false } },
    { type: 'add_flow_end', data: { id: 'c', outcome: 'abandoned', durationMs: 5000, errors: 2 } },
    { type: 'scan', data: { id: 'other' } },
  ]
  assert.deepEqual(summarizeAddMetrics(events), {
    started: 4, completed: 2, abandoned: 1, incomplete: 1,
    averageDurationMs: 15000, ocrSuggested: 2, ocrUnedited: 1, errors: 3,
  })
})

test('sin altas terminadas no inventa tiempos ni tasas', () => {
  const summary = summarizeAddMetrics([{ type: 'add_flow_start', data: { id: 'a' } }])
  assert.equal(summary.incomplete, 1)
  assert.equal(summary.averageDurationMs, null)
  assert.equal(summary.ocrSuggested, 0)
})
