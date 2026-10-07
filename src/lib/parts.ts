import { sameHole, type Hole } from "./board"

export type ComponentKind = "resistor" | "capacitor" | "diode" | "led"

export type PlacedPart = {
  readonly id: string
  readonly kind: ComponentKind
  readonly a: Hole
  readonly b: Hole
  /** Capacitors only. Off unless the user turns it on. */
  readonly polarized?: boolean
}

/** Farthest Chebyshev steps between the two pins of a component. */
export const PART_REACH = 4

export function chebyshev(a: Hole, b: Hole) {
  return Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r))
}

/** A second pin commits when it is a different hole at most 4 steps away, including diagonals. */
export function canPlacePart(a: Hole, b: Hole) {
  const distance = chebyshev(a, b)
  return distance >= 1 && distance <= PART_REACH
}

export function holeOccupied(parts: readonly PlacedPart[], hole: Hole) {
  return parts.some((part) => sameHole(part.a, hole) || sameHole(part.b, hole))
}
