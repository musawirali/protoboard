import { describe, expect, it } from "vitest"
import {
  buttonBodyContains,
  buttonFits,
  buttonNetLinks,
  buttonPins,
  canPlaceHeader,
  canPlacePart,
  componentNameTaken,
  headerHoles,
  holeOccupied,
  icFits,
  icPins,
  nextComponentName,
  type PlacedPart,
} from "./parts"

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
    expect(nextComponentName(placed, "button")).toBe("S1")
    expect(
      nextComponentName([...placed, { ...part("s", 5, 5, 6, 5, "S1"), kind: "button" }], "button"),
    ).toBe("S2")
    expect(nextComponentName(placed.filter((item) => item.name !== "R1"), "resistor")).toBe("R1")
    expect(componentNameTaken(placed, "C1")).toBe(true)
    expect(componentNameTaken(placed, "C1", "c")).toBe(false)
    expect(componentNameTaken(placed, "D1")).toBe(false)
  })

  it("places a 6x6 switch as four pins, two on each side", () => {
    const pins = buttonPins({ c: 1, r: 4 })
    expect(pins.map((pin) => `${pin.number}:${pin.side}:${pin.hole.c},${pin.hole.r}`)).toEqual([
      "1:1:1,4",
      "2:1:1,6",
      "3:2:3,6",
      "4:2:3,4",
    ])
    expect(buttonBodyContains(1, 1)).toBe(true)
    expect(buttonBodyContains(0, 0)).toBe(false)
    expect(buttonBodyContains(2, 2)).toBe(false)
    expect(buttonBodyContains(0, 1)).toBe(false)
    const placed = [{ ...part("s", 1, 4, 3, 6, "S1"), kind: "button" as const }]
    expect(holeOccupied(placed, { c: 1, r: 4 })).toBe(true)
    expect(holeOccupied(placed, { c: 3, r: 6 })).toBe(true)
    expect(holeOccupied(placed, { c: 2, r: 5 })).toBe(false)
    expect(buttonFits(8, 8, [], { c: 1, r: 4 })).toBe(true)
    expect(buttonFits(8, 8, placed, { c: 1, r: 4 })).toBe(false)
    expect(buttonFits(6, 8, [], { c: 4, r: 6 })).toBe(false)
    const open = buttonNetLinks({ c: 1, r: 4 }, false)
    expect(open).toEqual([
      { a: { c: 1, r: 4 }, b: { c: 1, r: 6 } },
      { a: { c: 3, r: 6 }, b: { c: 3, r: 4 } },
    ])
    expect(buttonNetLinks({ c: 1, r: 4 }, true)).toHaveLength(6)
  })

  it("treats either pin as occupying the hole", () => {
    const parts = [part("a", 1, 1, 4, 3)]
    expect(holeOccupied(parts, { c: 1, r: 1 })).toBe(true)
    expect(holeOccupied(parts, { c: 4, r: 3 })).toBe(true)
    expect(holeOccupied(parts, { c: 2, r: 2 })).toBe(false)
  })

  it("names headers and ICs with the lowest free designator", () => {
    const placed = [
      part("a", 0, 0, 1, 0, "M1"),
      { ...part("b", 2, 0, 2, 3, "F2"), kind: "female-header" as const },
      { ...part("c", 4, 0, 4, 0, "I1"), kind: "ic" as const },
    ]
    expect(nextComponentName(placed, "male-header")).toBe("M2")
    expect(nextComponentName(placed, "female-header")).toBe("F1")
    expect(nextComponentName(placed, "ic")).toBe("I2")
    expect(nextComponentName(placed.filter((item) => item.name !== "M1"), "male-header")).toBe("M1")
  })

  it("keeps a header on one row or column and occupies every hole on that span", () => {
    expect(headerHoles({ c: 1, r: 2 }, { c: 4, r: 2 }).map((hole) => `${hole.c},${hole.r}`)).toEqual([
      "1,2",
      "2,2",
      "3,2",
      "4,2",
    ])
    expect(headerHoles({ c: 3, r: 0 }, { c: 3, r: 2 })).toHaveLength(3)
    expect(headerHoles({ c: 1, r: 1 }, { c: 2, r: 3 })).toEqual([])
    expect(headerHoles({ c: 2, r: 2 }, { c: 2, r: 2 })).toEqual([])
    const header = { ...part("h", 0, 1, 0, 3), kind: "male-header" as const }
    expect(canPlaceHeader([header], { c: 2, r: 0 }, { c: 5, r: 0 })).toBe(true)
    expect(canPlaceHeader([header], { c: 0, r: 0 }, { c: 0, r: 4 })).toBe(false)
    expect(holeOccupied([header], { c: 0, r: 2 })).toBe(true)
    expect(holeOccupied([header], { c: 1, r: 2 })).toBe(false)
  })

  it("numbers an IC like a DIP and keeps pin 1 on the anchor", () => {
    const anchor = { c: 4, r: 2 }
    const pins = icPins(anchor, 8, 0, 0)
    expect(pins?.map((pin) => [pin.number, pin.hole.c, pin.hole.r])).toEqual([
      [1, 4, 2],
      [2, 4, 3],
      [3, 4, 4],
      [4, 4, 5],
      [5, 5, 5],
      [6, 5, 4],
      [7, 5, 3],
      [8, 5, 2],
    ])
    expect(icPins(anchor, 8, 1, 0)?.find((pin) => pin.number === 8)?.hole).toEqual({ c: 6, r: 2 })
    const turned = icPins(anchor, 8, 0, 90)
    expect(turned?.find((pin) => pin.number === 1)?.hole).toEqual(anchor)
    expect(turned?.find((pin) => pin.number === 2)?.hole).toEqual({ c: 3, r: 2 })
    expect(turned?.find((pin) => pin.number === 8)?.hole).toEqual({ c: 4, r: 3 })
    expect(icPins(anchor, 7, 0, 0)).toBeNull()
    expect(icFits(8, 8, [], { c: 0, r: 0 }, { pinCount: 8, railDistance: 0, rotation: 0 })).toBe(true)
    expect(icFits(8, 8, [], { c: 0, r: 0 }, { pinCount: 8, railDistance: 0, rotation: 90 })).toBe(false)
    const blocker = part("r", 5, 2, 7, 2)
    expect(icFits(12, 12, [blocker], anchor, { pinCount: 8, railDistance: 0, rotation: 0 })).toBe(false)
    expect(icFits(12, 12, [blocker], anchor, { pinCount: 8, railDistance: 0, rotation: 0 }, "r")).toBe(true)
  })
})
