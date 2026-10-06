import { describe, expect, it } from "vitest"
import { canCommit, holesOnSpan, type Trace } from "./board"
import { assignNets } from "./nets"

function trace(c1: number, r1: number, c2: number, r2: number): Trace {
  return { a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
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
})
