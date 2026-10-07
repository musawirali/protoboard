import { describe, expect, it } from "vitest"
import { applyEdit, HISTORY_LIMIT, pushEdit, type TraceEdit } from "./history"
import type { Trace } from "./board"

function trace(id: string, c1: number, r1: number, c2: number, r2: number): Trace {
  return { id, a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
}

function add(traces: Trace[], past: TraceEdit[], item: Trace) {
  const edit: TraceEdit = { type: "add", index: traces.length, trace: item }
  return {
    traces: applyEdit(traces, edit, "redo"),
    past: pushEdit(past, edit),
    future: [] as TraceEdit[],
  }
}

describe("trace history", () => {
  it("undoes three adds one at a time and redoes them", () => {
    const first = trace("a", 0, 0, 3, 0)
    const second = trace("b", 1, 0, 1, 3)
    const third = trace("c", 5, 1, 8, 1)
    let traces: Trace[] = []
    let past: TraceEdit[] = []
    let future: TraceEdit[] = []
    ;({ traces, past, future } = add(traces, past, first))
    ;({ traces, past, future } = add(traces, past, second))
    ;({ traces, past, future } = add(traces, past, third))
    expect(traces.map((item) => item.id)).toEqual(["a", "b", "c"])

    const undo = () => {
      const edit = past[past.length - 1]
      traces = applyEdit(traces, edit, "undo")
      past = past.slice(0, -1)
      future = [...future, edit]
    }
    const redo = () => {
      const edit = future[future.length - 1]
      traces = applyEdit(traces, edit, "redo")
      future = future.slice(0, -1)
      past = [...past, edit]
    }

    undo()
    expect(traces.map((item) => item.id)).toEqual(["a", "b"])
    undo()
    expect(traces.map((item) => item.id)).toEqual(["a"])
    undo()
    expect(traces).toEqual([])
    redo()
    redo()
    redo()
    expect(traces.map((item) => item.id)).toEqual(["a", "b", "c"])
  })

  it("removes one trace and restores it without deleting the rest", () => {
    const first = trace("a", 0, 0, 4, 0)
    const second = trace("b", 2, 0, 2, 4)
    let traces = [first, second]
    const edit: TraceEdit = { type: "remove", index: 0, trace: first }
    traces = applyEdit(traces, edit, "redo")
    expect(traces).toEqual([second])
    traces = applyEdit(traces, edit, "undo")
    expect(traces).toEqual([first, second])
  })

  it("undoes a net rename and keeps the other trace's name", () => {
    const first = trace("a", 0, 0, 4, 0)
    const second = trace("b", 0, 2, 4, 2)
    let traces = [first, second]
    const edit: TraceEdit = { type: "rename", changes: [{ id: "a", to: "Power" }] }
    traces = applyEdit(traces, edit, "redo")
    expect(traces[0].name).toBe("Power")
    expect(traces[1].name).toBeUndefined()
    traces = applyEdit(traces, edit, "undo")
    expect(traces[0].name).toBeUndefined()
    expect(traces.map((item) => item.id)).toEqual(["a", "b"])
    traces = applyEdit(traces, edit, "redo")
    expect(traces[0].name).toBe("Power")
  })

  it("drops the redo tail after a new edit and keeps about 20 steps", () => {
    let traces: Trace[] = []
    let past: TraceEdit[] = []
    let future: TraceEdit[] = []
    for (let index = 0; index < 3; index++) {
      ;({ traces, past, future } = add(traces, past, trace(`t${index}`, index, 0, index, 2)))
    }
    const edit = past[past.length - 1]
    traces = applyEdit(traces, edit, "undo")
    past = past.slice(0, -1)
    future = [edit]
    ;({ traces, past, future } = add(traces, past, trace("fresh", 6, 1, 8, 1)))
    expect(future).toEqual([])

    traces = []
    past = []
    for (let index = 0; index < HISTORY_LIMIT + 5; index++) {
      ;({ traces, past } = add(traces, past, trace(`n${index}`, 0, index, 2, index)))
    }
    expect(past).toHaveLength(HISTORY_LIMIT)
    expect(traces).toHaveLength(HISTORY_LIMIT + 5)
  })
})
