import { describe, expect, it } from "vitest"
import {
  ceramicMetrics,
  diodeMetrics,
  electrolyticMetrics,
  resistorMetrics,
} from "./part-art"

describe("physical part metrics", () => {
  const spans = [28, 28 * Math.SQRT2, 112]

  it("keeps a readable body with leads at one step and at four", () => {
    for (const span of spans) {
      const resistor = resistorMetrics(span)
      const diode = diodeMetrics(span)
      const ceramic = ceramicMetrics(span)
      const can = electrolyticMetrics(span)
      expect(resistor.length).toBeGreaterThanOrEqual(16)
      expect(resistor.length).toBeLessThan(span - 4)
      expect(resistor.bands).toHaveLength(4)
      for (const band of resistor.bands) {
        expect(Math.abs(band.x)).toBeLessThan(resistor.length / 2)
      }
      expect(diode.length).toBeGreaterThanOrEqual(14)
      expect(diode.length).toBeLessThan(span - 4)
      expect(ceramic.radius).toBeGreaterThanOrEqual(8)
      expect(ceramic.radius * 2).toBeLessThan(span - 4)
      expect(can.length).toBeGreaterThanOrEqual(16)
      expect(can.height).toBeGreaterThan(can.length * 0.4)
      expect(can.length).toBeLessThan(span - 4)
    }
  })

  it("keeps resistor bands off a hole in the middle of an even span", () => {
    const resistor = resistorMetrics(112, true)
    for (const band of resistor.bands) {
      expect(band.x).toBeLessThan(-5)
      expect(band.x).toBeGreaterThan(-resistor.length / 2)
    }
    expect(resistor.bands[2]?.color).toBe("#e2231a")
  })

  it("puts the diode cathode band toward the second pin", () => {
    for (const span of spans) {
      const diode = diodeMetrics(span)
      const center = diode.bandX + diode.bandW / 2
      expect(diode.bandX).toBeGreaterThan(0)
      expect(center).toBeGreaterThan(diode.length * 0.15)
      expect(diode.bandX + diode.bandW).toBeLessThanOrEqual(diode.length / 2 + 0.01)
    }
  })

  it("puts the electrolytic stripe toward the second pin and the plus toward the first", () => {
    for (const span of spans) {
      const can = electrolyticMetrics(span)
      expect(can.plusX).toBeLessThan(-1)
      expect(can.stripeX).toBeGreaterThan(0)
      expect(can.stripeX + can.stripeW).toBeGreaterThan(can.length / 2 - 1.2)
      expect(can.plusX).toBeLessThan(-can.length / 2 + can.lip)
    }
  })
})
