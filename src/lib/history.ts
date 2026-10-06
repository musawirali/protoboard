import type { Trace } from "./board"

export const HISTORY_LIMIT = 20

export type TraceEdit =
  | { type: "add"; index: number; trace: Trace }
  | { type: "remove"; index: number; trace: Trace }

export function pushEdit(past: readonly TraceEdit[], edit: TraceEdit): TraceEdit[] {
  const next = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past.slice()
  next.push(edit)
  return next
}

export function applyEdit(traces: readonly Trace[], edit: TraceEdit, direction: "undo" | "redo"): Trace[] {
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
