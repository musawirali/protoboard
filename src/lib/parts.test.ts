import { describe, expect, it } from "vitest"
import { canPlacePart, holeOccupied, type PlacedPart } from "./parts"

function part(id: string, c1: number, r1: number, c2: number, r2: number): PlacedPart {
  return { id, kind: "resistor", a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
}

describe("component placement", () => {
  it("accepts orthogonal and diagonal spans from 1 to 4 steps", () => {
    expect(canPlacePart({ c: 2, r: 2 }, { c: 6, r: 2 })).toBe(true)
    expect(canPlacePart({ c: 2, r: 2 }, { c: 2, r: 3 })).toBe(true)
    expect(canPlacePart({ c: 1, r: 1 }, { c: 4, r: 4 })).toBe(true)
    expect(canPlacePart({ c: 0, r: 4 }, { c: 4, r: 0 })).toBe(true)
  })

  it("rejects the same hole and anything 5 or more steps away", () => {
    expect(canPlacePart({ c: 3, r: 3 }, { c: 3, r: 3 })).toBe(false)
    expect(canPlacePart({ c: 1, r: 1 }, { c: 6, r: 1 })).toBe(false)
    expect(canPlacePart({ c: 0, r: 0 }, { c: 5, r: 4 })).toBe(false)
    expect(canPlacePart({ c: 2, r: 2 }, { c: 2, r: 7 })).toBe(false)
  })

  it("treats either pin as occupying the hole", () => {
    const parts = [part("a", 1, 1, 4, 3)]
    expect(holeOccupied(parts, { c: 1, r: 1 })).toBe(true)
    expect(holeOccupied(parts, { c: 4, r: 3 })).toBe(true)
    expect(holeOccupied(parts, { c: 2, r: 2 })).toBe(false)
  })
})
