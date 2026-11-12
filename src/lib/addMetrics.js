export function summarizeAddMetrics(events) {
  const starts = new Map()
  const ends = new Map()
  for (const event of events) {
    if (event.type === 'add_flow_start') starts.set(event.data.id, event)
    if (event.type === 'add_flow_end') ends.set(event.data.id, event)
  }
  const result = {
    started: starts.size, completed: 0, abandoned: 0, incomplete: 0,
    averageDurationMs: null, ocrSuggested: 0, ocrUnedited: 0, errors: 0,
  }
  let durationTotal = 0
  for (const id of starts.keys()) {
    const data = ends.get(id)?.data
    if (!data) {
      result.incomplete++
      continue
    }
    result.errors += data.errors
    if (data.outcome === 'abandoned') {
      result.abandoned++
    } else if (data.outcome === 'completed') {
      result.completed++
      durationTotal += data.durationMs
      if (data.ocrSuggested) {
        result.ocrSuggested++
        if (data.ocrUnedited) result.ocrUnedited++
      }
    }
  }
  if (result.completed) result.averageDurationMs = Math.round(durationTotal / result.completed)
  return result
}
