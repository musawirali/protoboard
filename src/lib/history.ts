import type { Trace } from "./board"

export const HISTORY_LIMIT = 20

export type NameChange = {
  id: string
  from?: string
  to: string
}

export type TraceEdit =
  | { type: "add"; index: number; trace: Trace }
  | { type: "remove"; index: number; trace: Trace }
  | { type: "rename"; changes: NameChange[] }

function withName(trace: Trace, name: string | undefined): Trace {
  if (!name) {
    if (trace.name == null) return trace
    return { id: trace.id, a: trace.a, b: trace.b }
  }
  if (trace.name === name) return trace
  return { ...trace, name }
}

export function pushEdit(past: readonly TraceEdit[], edit: TraceEdit): TraceEdit[] {
  const next = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past.slice()
  next.push(edit)
  return next
}

export function applyEdit(traces: readonly Trace[], edit: TraceEdit, direction: "undo" | "redo"): Trace[] {
  if (edit.type === "rename") {
    const byId = new Map(edit.changes.map((change) => [change.id, change]))
    return traces.map((trace) => {
      if (!trace.id) return trace
      const change = byId.get(trace.id)
      if (!change) return trace
      return withName(trace, direction === "undo" ? change.from : change.to)
    })
  }
  const insert = direction === "undo" ? edit.type === "remove" : edit.type === "add"
  if (insert) {
    const next = traces.slice()
    const index = Math.min(Math.max(edit.index, 0), next.length)
    next.splice(index, 0, edit.trace)
    return next
  }
  if (edit.index < 0 || edit.index >= traces.length) return traces.slice()
  return traces.filter((_, index) => index !== edit.index)
}
