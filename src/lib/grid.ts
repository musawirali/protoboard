export const MIN_DIMENSION = 1
export const MAX_DIMENSION = 120

export type DimensionAxis = "Columns" | "Rows"

export type ParsedDimension = {
  value: number | null
  error: string | null
}

export function parseDimension(raw: string, axis: DimensionAxis): ParsedDimension {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return { value: null, error: `Enter the number of ${axis.toLowerCase()}.` }
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      value: null,
      error: `${axis} must be a whole number from ${MIN_DIMENSION} to ${MAX_DIMENSION}.`,
    }
  }
  const value = Number(trimmed)
  if (value < MIN_DIMENSION) {
    return { value: null, error: `${axis} must be at least ${MIN_DIMENSION}.` }
  }
  if (value > MAX_DIMENSION) {
    return {
      value: null,
      error: `${axis} are limited to ${MAX_DIMENSION} so the board stays usable.`,
    }
  }
  return { value, error: null }
}
