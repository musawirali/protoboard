import type { Trace } from "./board"
import type { PlacedPart } from "./parts"

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

export type BoardEdit =
  | TraceEdit
  | { type: "place"; index: number; component: PlacedPart }
  | { type: "unplace"; index: number; component: PlacedPart }
  | { type: "polarize"; id: string; from: boolean; to: boolean }

export type BoardSnapshot = {
  traces: Trace[]
  components: PlacedPart[]
}

function withName(trace: Trace, name: string | undefined): Trace {
  if (!name) {
    if (trace.name == null) return trace
    return { id: trace.id, a: trace.a, b: trace.b }
  }
  if (trace.name === name) return trace
  return { ...trace, name }
}

export function pushEdit<T>(past: readonly T[], edit: T): T[] {
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

export function applyBoardEdit(
  state: { traces: readonly Trace[]; components: readonly PlacedPart[] },
  edit: BoardEdit,
  direction: "undo" | "redo",
): BoardSnapshot {
  if (edit.type === "place" || edit.type === "unplace") {
    const insert = direction === "undo" ? edit.type === "unplace" : edit.type === "place"
    const components = state.components.slice()
    if (insert) {
      const index = Math.min(Math.max(edit.index, 0), components.length)
      components.splice(index, 0, edit.component)
    } else if (edit.index >= 0 && edit.index < components.length) {
      components.splice(edit.index, 1)
    }
    return { traces: state.traces.slice(), components }
  }
  if (edit.type === "polarize") {
    const polarized = direction === "undo" ? edit.from : edit.to
    return {
      traces: state.traces.slice(),
      components: state.components.map((part) => (part.id === edit.id ? { ...part, polarized } : part)),
    }
  }
  return { traces: applyEdit(state.traces, edit, direction), components: state.components.slice() }
}
