import { describe, expect, it } from "vitest"
import {
  buttonMetrics,
  ceramicMetrics,
  diodeMetrics,
  electrolyticMetrics,
  ledMetrics,
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
      expect(ceramic.rx).toBeGreaterThanOrEqual(10)
      expect(ceramic.rx * 2).toBeLessThan(span - 4)
      expect(ceramic.ry).toBeLessThan(ceramic.rx * 0.6)
      expect(ceramic.ry).toBeGreaterThan(ceramic.rx * 0.4)
      expect(can.radius).toBeGreaterThanOrEqual(9)
      expect(can.radius * 2).toBeLessThan(span - 4)
      expect(can.metalRadius).toBeLessThan(can.radius * 0.7)
      const led = ledMetrics(span)
      expect(led.radius).toBeGreaterThanOrEqual(9)
      expect(led.radius * 2).toBeLessThan(span - 4)
      expect(led.flatX).toBeGreaterThan(0)
      expect(led.flatX).toBeLessThan(led.radius)
    }
  })

  it("keeps the button shell still and shrinks the cap while pressed", () => {
    const open = buttonMetrics()
    const held = buttonMetrics(true)
    expect(open.halfAcross).toBe(held.halfAcross)
    expect(open.halfAlong).toBe(held.halfAlong)
    expect(open.lead).toBe(10)
    expect(open.halfAcross).toBe(18)
    expect(open.halfAlong).toBe(38)
    expect(open.halfAcross + open.lead).toBe(28)
    expect(open.halfAlong - open.lead).toBe(28)
    expect(open.cap).toBeCloseTo(open.halfAcross * (2 / 3))
    expect(held.cap).toBeCloseTo(held.halfAcross * 0.5)
    expect(open.cap).toBeLessThan(open.halfAcross)
    expect(held.cap).toBeLessThan(open.cap)
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

  it("puts the electrolytic stripe on the rim toward the second pin", () => {
    for (const span of spans) {
      const can = electrolyticMetrics(span)
      expect(can.stripeHalfAngle).toBeGreaterThan(0.4)
      expect(can.stripeHalfAngle).toBeLessThan(Math.PI / 2)
      expect(can.metalRadius).toBeGreaterThan(0)
      const stripeAtRim = can.radius * Math.cos(can.stripeHalfAngle * 0.5)
      expect(stripeAtRim).toBeGreaterThan(can.metalRadius)
    }
  })
})
