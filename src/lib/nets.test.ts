import { describe, expect, it } from "vitest"
import { canCommit, holesOnSpan, wireJunctions, type Trace } from "./board"
import { assignNets, displayNetColor, netColor, traceIndexAtHole } from "./nets"
import { buttonNetLinks } from "./parts"

function trace(c1: number, r1: number, c2: number, r2: number): Trace {
  return { a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
}

function wire(c1: number, r1: number, c2: number, r2: number): Trace {
  return { kind: "wire", a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
}

describe("axis-aligned spans", () => {
  it("includes every hole between the ends", () => {
    expect(holesOnSpan({ c: 1, r: 4 }, { c: 5, r: 4 })).toEqual([
      { c: 1, r: 4 },
      { c: 2, r: 4 },
      { c: 3, r: 4 },
      { c: 4, r: 4 },
      { c: 5, r: 4 },
    ])
    expect(holesOnSpan({ c: 2, r: 3 }, { c: 2, r: 0 })).toEqual([
      { c: 2, r: 0 },
      { c: 2, r: 1 },
      { c: 2, r: 2 },
      { c: 2, r: 3 },
    ])
  })

  it("commits only a different hole on the same row or column", () => {
    expect(canCommit({ c: 0, r: 1 }, { c: 4, r: 1 })).toBe(true)
    expect(canCommit({ c: 2, r: 0 }, { c: 2, r: 5 })).toBe(true)
    expect(canCommit({ c: 1, r: 1 }, { c: 1, r: 1 })).toBe(false)
  })
})

describe("assignNets", () => {
  it("uses a custom color on the net and otherwise the palette", () => {
    const traces = [trace(0, 0, 3, 0), { ...trace(0, 2, 3, 2), color: "#112233" }]
    const separate = assignNets(traces)
    expect(displayNetColor(traces, separate.colorKeys, 0)).toBe(netColor(0))
    expect(displayNetColor(traces, separate.colorKeys, 1)).toBe("#112233")
    const joined = [{ ...traces[0], color: "#abcdef" }, { ...traces[1], a: { c: 3, r: 0 }, b: { c: 3, r: 2 } }]
    const shared = assignNets(joined)
    expect(displayNetColor(joined, shared.colorKeys, 1)).toBe("#abcdef")
  })

  it("merges traces that meet at an intermediate hole", () => {
    const result = assignNets([
      trace(0, 0, 4, 0),
      trace(2, 0, 2, 3),
    ])
    expect(holesOnSpan({ c: 0, r: 0 }, { c: 4, r: 0 }).some((hole) => hole.c === 2)).toBe(true)
    expect(result.netCount).toBe(1)
    expect(result.labels).toEqual([1, 1])
    expect(result.colorKeys).toEqual([0, 0])
  })

  it("merges a crossing through the shared intersection hole", () => {
    const result = assignNets([
      trace(0, 2, 6, 2),
      trace(3, 0, 3, 5),
    ])
    expect(result.netCount).toBe(1)
    expect(result.labels).toEqual([1, 1])
  })

  it("merges overlapping holes on the same row and keeps a gap apart", () => {
    expect(assignNets([trace(0, 0, 4, 0), trace(2, 0, 6, 0)]).netCount).toBe(1)
    expect(assignNets([trace(0, 0, 2, 0), trace(4, 0, 6, 0)]).netCount).toBe(2)
  })

  it("keeps disjoint traces in different nets", () => {
    const result = assignNets([trace(0, 0, 2, 0), trace(0, 3, 2, 3)])
    expect(result.netCount).toBe(2)
    expect(result.labels[0]).not.toBe(result.labels[1])
  })

  it("rejects diagonal pairs", () => {
    expect(canCommit({ c: 0, r: 0 }, { c: 4, r: 2 })).toBe(false)
    expect(holesOnSpan({ c: 0, r: 0 }, { c: 4, r: 2 })).toEqual([])

    const crossingDiagonals = assignNets([
      trace(0, 0, 4, 2),
      trace(0, 2, 4, 0),
    ])
    expect(crossingDiagonals.netCount).toBe(2)
    expect(crossingDiagonals.labels[0]).not.toBe(crossingDiagonals.labels[1])

    const diagonalAcrossARow = assignNets([
      trace(0, 0, 4, 4),
      trace(0, 2, 4, 2),
    ])
    expect(diagonalAcrossARow.netCount).toBe(2)
  })

  it("joins a wire at a shared end or where an end lands on a trace span", () => {
    const sharedEnd = assignNets([trace(0, 0, 4, 0), wire(4, 0, 4, 3)])
    expect(sharedEnd.netCount).toBe(1)
    expect(sharedEnd.labels).toEqual([1, 1])
    expect(sharedEnd.colorKeys).toEqual([0, 0])

    const onSpan = assignNets([trace(0, 2, 6, 2), wire(3, 2, 3, 5)])
    expect(onSpan.netCount).toBe(1)
  })

  it("does not connect a hole strictly between a wire's ends", () => {
    const traces = [wire(0, 0, 4, 0)]
    expect(traceIndexAtHole(traces, { c: 2, r: 0 })).toBe(-1)

    const crossed = [wire(0, 0, 4, 0), trace(2, 0, 2, 3)]
    const crossedNets = assignNets(crossed)
    expect(crossedNets.netCount).toBe(2)
    expect(traceIndexAtHole(crossed, { c: 2, r: 0 })).toBe(1)
    expect(crossedNets.labels[0]).not.toBe(crossedNets.labels[1])
  })

  it("still connects a hole a PCB trace spans", () => {
    const traces = [trace(0, 0, 4, 0)]
    expect(traceIndexAtHole(traces, { c: 0, r: 0 })).toBe(0)
    expect(traceIndexAtHole(traces, { c: 2, r: 0 })).toBe(0)
    expect(traceIndexAtHole(traces, { c: 4, r: 0 })).toBe(0)

    const branched = assignNets([trace(0, 0, 4, 0), trace(2, 0, 2, 3)])
    expect(branched.netCount).toBe(1)
    expect(branched.labels).toEqual([1, 1])
  })

  it("puts the start and end of a wire on the same net", () => {
    const traces = [trace(0, 0, 0, 2), wire(0, 0, 4, 0), trace(4, 0, 4, 2)]
    const nets = assignNets(traces)
    const start = traceIndexAtHole(traces, { c: 0, r: 0 })
    const end = traceIndexAtHole(traces, { c: 4, r: 0 })
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThanOrEqual(0)
    expect(nets.labels[start]).toBe(nets.labels[end])
    expect(nets.labels).toEqual([1, 1, 1])
  })

  it("marks a shared wire end and ignores a crossing", () => {
    expect(wireJunctions([wire(0, 0, 4, 0), wire(4, 0, 4, 3)])).toEqual([{ c: 4, r: 0 }])
    expect(wireJunctions([wire(0, 0, 4, 4), wire(0, 4, 4, 0)])).toEqual([])
    expect(wireJunctions([wire(0, 0, 4, 0), wire(2, 0, 2, 3)])).toEqual([])
    expect(wireJunctions([wire(0, 1, 3, 1), trace(3, 1, 3, 4)])).toEqual([])
    const meeting = wireJunctions([wire(0, 0, 2, 0), wire(2, 0, 2, 3), wire(2, 0, 5, 0)])
    expect(meeting).toEqual([{ c: 2, r: 0 }])
  })

  it("does not join segments that only cross away from a wire end", () => {
    expect(assignNets([trace(1, 0, 1, 4), wire(0, 0, 2, 1)]).netCount).toBe(2)

    const crossingWires = [wire(0, 0, 4, 4), wire(0, 4, 4, 0)]
    expect(assignNets(crossingWires).netCount).toBe(2)
    expect(traceIndexAtHole(crossingWires, { c: 2, r: 2 })).toBe(-1)

    const diagonalOverTrace = [trace(0, 2, 6, 2), wire(1, 0, 5, 4)]
    expect(assignNets(diagonalOverTrace).netCount).toBe(2)
    expect(traceIndexAtHole(diagonalOverTrace, { c: 3, r: 2 })).toBe(0)
  })

  it("joins a closed switch at its pins and leaves the span between them open", () => {
    const traces = [trace(0, 0, 3, 0), trace(0, 3, 3, 3), trace(0, 1, 4, 1)]
    const open = assignNets(traces)
    expect(open.netCount).toBe(3)
    const link = [{ a: { c: 0, r: 0 }, b: { c: 0, r: 3 } }]
    const closed = assignNets(traces, link)
    expect(closed.netCount).toBe(2)
    expect(closed.labels[0]).toBe(closed.labels[1])
    expect(closed.labels[2]).not.toBe(closed.labels[0])
    expect(closed.colorKeys[1]).toBe(0)
    expect(traceIndexAtHole(traces, { c: 0, r: 2 }, [{ a: { c: 0, r: 0 }, b: { c: 0, r: 2 } }])).toBe(0)
    expect(traceIndexAtHole(traces, { c: 0, r: 2 })).toBe(-1)
    expect(traceIndexAtHole(traces, { c: 2, r: 2 }, link)).toBe(-1)
  })

  it("shorts each side of a tactile switch, and bridges the sides only while held", () => {
    const traces = [trace(0, 0, 1, 0), trace(0, 2, 1, 2), trace(0, 1, 4, 1), trace(2, 0, 4, 0)]
    const open = assignNets(traces, buttonNetLinks({ c: 0, r: 0 }, false))
    expect(open.labels[0]).toBe(open.labels[1])
    expect(open.labels[2]).not.toBe(open.labels[0])
    expect(open.labels[3]).not.toBe(open.labels[0])
    const closed = assignNets(traces, buttonNetLinks({ c: 0, r: 0 }, true))
    expect(closed.labels[0]).toBe(closed.labels[3])
    expect(closed.labels[2]).not.toBe(closed.labels[0])
    expect(traceIndexAtHole(traces, { c: 0, r: 2 }, buttonNetLinks({ c: 0, r: 0 }, false))).toBe(1)
    expect(traceIndexAtHole(traces, { c: 2, r: 2 }, buttonNetLinks({ c: 0, r: 0 }, true))).toBe(3)
    expect(closed.labels[traceIndexAtHole(traces, { c: 2, r: 2 }, buttonNetLinks({ c: 0, r: 0 }, true))]).toBe(
      closed.labels[0],
    )
  })

  it("keeps a disjoint wire on its own net", () => {
    const result = assignNets([trace(0, 0, 3, 0), wire(0, 4, 3, 6)])
    expect(result.netCount).toBe(2)
    expect(result.labels[0]).not.toBe(result.labels[1])
  })
})
