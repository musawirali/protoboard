import { describe, expect, it } from "vitest"
import { assignNets, type Segment } from "./nets"

function seg(x1: number, y1: number, x2: number, y2: number): Segment {
  return { a: { x: x1, y: y1 }, b: { x: x2, y: y2 } }
}

describe("assignNets", () => {
  it("merges segments that share an endpoint", () => {
    const result = assignNets([seg(0, 0, 2, 0), seg(2, 0, 2, 3)])
    expect(result.netCount).toBe(1)
    expect(result.labels).toEqual([1, 1])
  })

  it("merges segments that properly cross", () => {
    const result = assignNets([seg(0, 0, 4, 2), seg(0, 2, 4, 0)])
    expect(result.netCount).toBe(1)
    expect(result.labels[0]).toBe(result.labels[1])
  })

  it("keeps disjoint segments in different nets", () => {
    const result = assignNets([seg(0, 0, 2, 0), seg(0, 2, 2, 2)])
    expect(result.netCount).toBe(2)
    expect(result.labels[0]).not.toBe(result.labels[1])
  })

  it("merges colinear overlapping segments", () => {
    const partial = assignNets([seg(0, 0, 4, 0), seg(2, 0, 6, 0)])
    expect(partial.netCount).toBe(1)

    const contained = assignNets([seg(0, 0, 6, 0), seg(2, 0, 3, 0)])
    expect(contained.netCount).toBe(1)

    const diagonal = assignNets([seg(0, 0, 6, 3), seg(2, 1, 8, 4)])
    expect(diagonal.netCount).toBe(1)
  })

  it("merges a chain of three segments into one net", () => {
    const result = assignNets([
      seg(0, 0, 2, 0),
      seg(4, 0, 6, 0),
      seg(2, 0, 4, 0),
    ])
    expect(result.netCount).toBe(1)
    expect(result.labels).toEqual([1, 1, 1])
    expect(result.colorKeys).toEqual([0, 0, 0])
  })

  it("merges a T-junction into the same net", () => {
    const result = assignNets([seg(0, 0, 4, 0), seg(2, 0, 2, 3)])
    expect(result.netCount).toBe(1)
  })

  it("does not merge colinear segments separated by a gap", () => {
    const result = assignNets([seg(0, 0, 2, 0), seg(3, 0, 5, 0)])
    expect(result.netCount).toBe(2)
  })
})
