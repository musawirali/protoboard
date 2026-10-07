import { describe, expect, it } from "vitest"
import { canPlacePart, componentNameTaken, holeOccupied, nextComponentName, type PlacedPart } from "./parts"

function part(id: string, c1: number, r1: number, c2: number, r2: number, name = id): PlacedPart {
  return { id, kind: "resistor", name, value: "", a: { c: c1, r: r1 }, b: { c: c2, r: r2 } }
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

  it("assigns the lowest free designator and keeps names unique", () => {
    const placed = [
      part("a", 0, 0, 1, 0, "R1"),
      part("b", 0, 1, 1, 1, "R3"),
      { ...part("c", 2, 0, 3, 0, "C1"), kind: "capacitor" as const },
      { ...part("d", 2, 2, 3, 2, "L2"), kind: "led" as const },
    ]
    expect(nextComponentName(placed, "resistor")).toBe("R2")
    expect(nextComponentName(placed, "capacitor")).toBe("C2")
    expect(nextComponentName(placed, "diode")).toBe("D1")
    expect(nextComponentName(placed, "led")).toBe("L1")
    expect(nextComponentName(placed.filter((item) => item.name !== "R1"), "resistor")).toBe("R1")
    expect(componentNameTaken(placed, "C1")).toBe(true)
    expect(componentNameTaken(placed, "C1", "c")).toBe(false)
    expect(componentNameTaken(placed, "D1")).toBe(false)
  })

  it("treats either pin as occupying the hole", () => {
    const parts = [part("a", 1, 1, 4, 3)]
    expect(holeOccupied(parts, { c: 1, r: 1 })).toBe(true)
    expect(holeOccupied(parts, { c: 4, r: 3 })).toBe(true)
    expect(holeOccupied(parts, { c: 2, r: 2 })).toBe(false)
  })
})
