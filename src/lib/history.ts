import type { Hole, Trace } from "./board"
import type { IcConfig, IcRotation, PlacedPart } from "./parts"

export const HISTORY_LIMIT = 20

export type NameChange = {
  id: string
  from?: string
  to: string
}

export type ColorChange = {
  id: string
  from?: string
  to: string
}

export type TraceEdit =
  | { type: "add"; index: number; trace: Trace }
  | { type: "remove"; index: number; trace: Trace }
  | { type: "rename"; changes: NameChange[] }
  | { type: "recolor"; changes: ColorChange[] }

export type PartPose = {
  a: Hole
  b: Hole
  rotation?: IcRotation
}

export type BoardEdit =
  | TraceEdit
  | { type: "place"; index: number; component: PlacedPart }
  | { type: "unplace"; index: number; component: PlacedPart }
  | { type: "polarize"; id: string; from: boolean; to: boolean }
  | { type: "partName"; id: string; from: string; to: string }
  | { type: "partValue"; id: string; from: string; to: string }
  | { type: "icConfig"; id: string; from: IcConfig; to: IcConfig }
  | { type: "move"; id: string; from: { a: Hole; b: Hole }; to: { a: Hole; b: Hole } }
  | { type: "turn"; id: string; from: PartPose; to: PartPose }

export type BoardSnapshot = {
  traces: Trace[]
  components: PlacedPart[]
}

function withName(trace: Trace, name: string | undefined): Trace {
  if (!name) {
    if (trace.name == null) return trace
    const { name: _name, ...rest } = trace
    return rest
  }
  if (trace.name === name) return trace
  return { ...trace, name }
}

function withColor(trace: Trace, color: string | undefined): Trace {
  if (!color) {
    if (trace.color == null) return trace
    const { color: _color, ...rest } = trace
    return rest
  }
  if (trace.color === color) return trace
  return { ...trace, color }
}

export function pushEdit<T>(past: readonly T[], edit: T): T[] {
  const next = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past.slice()
  next.push(edit)
  return next
}

export function applyEdit(traces: readonly Trace[], edit: TraceEdit, direction: "undo" | "redo"): Trace[] {
  if (edit.type === "rename" || edit.type === "recolor") {
    const byId = new Map(edit.changes.map((change) => [change.id, change]))
    return traces.map((trace) => {
      if (!trace.id) return trace
      const change = byId.get(trace.id)
      if (!change) return trace
      const next = direction === "undo" ? change.from : change.to
      return edit.type === "rename" ? withName(trace, next) : withColor(trace, next)
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
  if (edit.type === "partName" || edit.type === "partValue") {
    const next = direction === "undo" ? edit.from : edit.to
    return {
      traces: state.traces.slice(),
      components: state.components.map((part) => {
        if (part.id !== edit.id) return part
        return edit.type === "partName" ? { ...part, name: next } : { ...part, value: next }
      }),
    }
  }
  if (edit.type === "icConfig") {
    const next = direction === "undo" ? edit.from : edit.to
    return {
      traces: state.traces.slice(),
      components: state.components.map((part) => {
        if (part.id !== edit.id) return part
        return { ...part, ...next, pinLabels: [...next.pinLabels] }
      }),
    }
  }
  if (edit.type === "move") {
    const next = direction === "undo" ? edit.from : edit.to
    return {
      traces: state.traces.slice(),
      components: state.components.map((part) =>
        part.id === edit.id ? { ...part, a: { ...next.a }, b: { ...next.b } } : part,
      ),
    }
  }
  if (edit.type === "turn") {
    const pose = direction === "undo" ? edit.from : edit.to
    return {
      traces: state.traces.slice(),
      components: state.components.map((part) => {
        if (part.id !== edit.id) return part
        const turned: PlacedPart = { ...part, a: { ...pose.a }, b: { ...pose.b } }
        if (pose.rotation === undefined) {
          const { rotation: _removed, ...rest } = turned
          return rest
        }
        return { ...turned, rotation: pose.rotation }
      }),
    }
  }
  return { traces: applyEdit(state.traces, edit, direction), components: state.components.slice() }
}
