import { describe, expect, it } from "vitest"
import { parseDimension } from "./grid"

describe("parseDimension", () => {
  it("accepts positive integers up to 120", () => {
    expect(parseDimension("20", "Columns")).toEqual({ value: 20, error: null })
    expect(parseDimension("120", "Rows")).toEqual({ value: 120, error: null })
    expect(parseDimension(" 50 ", "Columns")).toEqual({ value: 50, error: null })
  })

  it("rejects empty, non-integers, zero, and oversized values", () => {
    expect(parseDimension("", "Columns").error).toBe("Enter the number of columns.")
    expect(parseDimension("1.5", "Rows").error).toMatch(/whole number/)
    expect(parseDimension("-3", "Columns").error).toMatch(/whole number/)
    expect(parseDimension("0", "Rows").error).toMatch(/at least 1/)
    expect(parseDimension("121", "Columns").error).toMatch(/limited to 120/)
  })
})
