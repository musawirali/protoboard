import { holesOnSpan, sameHole, type Hole } from "./board"

export type AxialKind = "resistor" | "capacitor" | "diode" | "led"
export type HeaderKind = "male-header" | "female-header"
export type ComponentKind = AxialKind | HeaderKind | "ic"

export type IcRotation = 0 | 90 | 180 | 270

export type IcConfig = {
  readonly pinCount: number
  readonly railDistance: number
  readonly rotation: IcRotation
  readonly pinLabels: readonly string[]
}

export type PlacedPart = {
  readonly id: string
  readonly kind: ComponentKind
  /** Start hole, or pin 1 for an IC. */
  readonly a: Hole
  /** End hole. Unused for an IC, where it matches the anchor. */
  readonly b: Hole
  readonly name: string
  /** Empty when the part has no value text. Headers and ICs stay empty. */
  readonly value: string
  /** Capacitors only. Off unless the user turns it on. */
  readonly polarized?: boolean
  /** IC only. Even, from 2 to 64. */
  readonly pinCount?: number
  /** IC only. Pin holes between the rails, not counting the rail holes. */
  readonly railDistance?: number
  readonly rotation?: IcRotation
  /** IC only. Index 0 is the label for pin 1. */
  readonly pinLabels?: readonly string[]
}

const NAME_PREFIX: Record<ComponentKind, string> = {
  resistor: "R",
  capacitor: "C",
  diode: "D",
  led: "L",
  "male-header": "M",
  "female-header": "F",
  ic: "I",
}

export const IC_DEFAULT_PINS = 8
export const IC_DEFAULT_DISTANCE = 0

export function isAxialKind(kind: ComponentKind): kind is AxialKind {
  return kind === "resistor" || kind === "capacitor" || kind === "diode" || kind === "led"
}

export function isHeaderKind(kind: ComponentKind): kind is HeaderKind {
  return kind === "male-header" || kind === "female-header"
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

export function validPinCount(pinCount: number) {
  return Number.isInteger(pinCount) && pinCount >= 2 && pinCount <= 64 && pinCount % 2 === 0
}

export function validRailDistance(distance: number) {
  return Number.isInteger(distance) && distance >= 0
}

/** Unit steps: first rail, then the direction from pin 1 toward pin n. */
export function icDirections(rotation: IcRotation) {
  let rail = { dc: 0, dr: 1 }
  let across = { dc: 1, dr: 0 }
  const steps = rotation / 90
  for (let index = 0; index < steps; index++) {
    rail = { dc: -rail.dr, dr: rail.dc }
    across = { dc: -across.dr, dr: across.dc }
  }
  return { rail, across }
}

export function readIcConfig(part: Pick<PlacedPart, "pinCount" | "railDistance" | "rotation" | "pinLabels">): IcConfig {
  const pinCount = part.pinCount ?? IC_DEFAULT_PINS
  const railDistance = part.railDistance ?? IC_DEFAULT_DISTANCE
  const rotation = part.rotation ?? 0
  const pinLabels = Array.from({ length: pinCount }, (_, index) => part.pinLabels?.[index] ?? "")
  return { pinCount, railDistance, rotation, pinLabels }
}

export type IcPin = {
  readonly number: number
  readonly hole: Hole
}

/** Standard DIP pins. Pin 1 is the anchor. Null when the numbers are not a legal DIP. */
export function icPins(anchor: Hole, pinCount: number, railDistance: number, rotation: IcRotation): IcPin[] | null {
  if (!validPinCount(pinCount) || !validRailDistance(railDistance)) return null
  const { rail, across } = icDirections(rotation)
  const perRail = pinCount / 2
  const gap = 1 + railDistance
  const pins: IcPin[] = []
  for (let index = 0; index < perRail; index++) {
    pins.push({
      number: index + 1,
      hole: { c: anchor.c + rail.dc * index, r: anchor.r + rail.dr * index },
    })
    pins.push({
      number: pinCount - index,
      hole: {
        c: anchor.c + across.dc * gap + rail.dc * index,
        r: anchor.r + across.dr * gap + rail.dr * index,
      },
    })
  }
  pins.sort((left, right) => left.number - right.number)
  return pins
}

export function icFits(
  cols: number,
  rows: number,
  parts: readonly PlacedPart[],
  anchor: Hole,
  config: Pick<IcConfig, "pinCount" | "railDistance" | "rotation">,
  exceptId?: string,
) {
  const pins = icPins(anchor, config.pinCount, config.railDistance, config.rotation)
  if (!pins) return false
  return pins.every(
    (pin) =>
      pin.hole.c >= 0 &&
      pin.hole.r >= 0 &&
      pin.hole.c < cols &&
      pin.hole.r < rows &&
      !holeOccupied(parts, pin.hole, exceptId),
  )
}

/** True when the point, in hole steps from the anchor, lands on the DIP body rather than a pin hole. */
export function icBodyContains(
  anchor: Hole,
  pinCount: number,
  railDistance: number,
  rotation: IcRotation,
  dc: number,
  dr: number,
) {
  if (!validPinCount(pinCount) || !validRailDistance(railDistance)) return false
  const { rail, across } = icDirections(rotation)
  const perRail = pinCount / 2
  const gap = 1 + railDistance
  const along = dc * rail.dc + dr * rail.dr
  const cross = dc * across.dc + dr * across.dr
  const midAlong = (perRail - 1) / 2
  const midCross = gap / 2
  const halfAlong = (perRail - 1) / 2 + 0.32
  const halfCross = Math.max(0.22, gap / 2 - 0.2)
  return Math.abs(along - midAlong) <= halfAlong && Math.abs(cross - midCross) <= halfCross
}

/** Every hole on a header, or nothing when the pair is diagonal or a single hole. */
export function headerHoles(a: Hole, b: Hole) {
  return holesOnSpan(a, b)
}

export function canPlaceHeader(parts: readonly PlacedPart[], a: Hole, b: Hole) {
  const holes = headerHoles(a, b)
  return holes.length >= 2 && holes.every((hole) => !holeOccupied(parts, hole))
}

export function partHoles(part: PlacedPart): Hole[] {
  if (isHeaderKind(part.kind)) return headerHoles(part.a, part.b)
  if (part.kind === "ic") {
    const config = readIcConfig(part)
    return icPins(part.a, config.pinCount, config.railDistance, config.rotation)?.map((pin) => pin.hole) ?? []
  }
  return [part.a, part.b]
}

export function holeOccupied(parts: readonly PlacedPart[], hole: Hole, exceptId?: string) {
  return parts.some(
    (part) => part.id !== exceptId && partHoles(part).some((pin) => sameHole(pin, hole)),
  )
}
