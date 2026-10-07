import { sameHole, type Hole } from "./board"

export type ComponentKind = "resistor" | "capacitor" | "diode" | "led"

export type PlacedPart = {
  readonly id: string
  readonly kind: ComponentKind
  readonly a: Hole
  readonly b: Hole
  readonly name: string
  /** Empty when the part has no value text. */
  readonly value: string
  /** Capacitors only. Off unless the user turns it on. */
  readonly polarized?: boolean
}

const NAME_PREFIX: Record<ComponentKind, string> = {
  resistor: "R",
  capacitor: "C",
  diode: "D",
  led: "L",
}

/** Lowest unused designator for this kind, unique across every component name. */
export function nextComponentName(parts: readonly PlacedPart[], kind: ComponentKind) {
  const prefix = NAME_PREFIX[kind]
  const used = new Set(parts.map((part) => part.name))
  let index = 1
  while (used.has(`${prefix}${index}`)) index += 1
  return `${prefix}${index}`
}

export function componentNameTaken(parts: readonly PlacedPart[], name: string, exceptId?: string) {
  return parts.some((part) => part.id !== exceptId && part.name === name)
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
