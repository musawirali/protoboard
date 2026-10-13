import { holesOnSpan, sameHole, type Hole } from "./board"

export type AxialKind = "resistor" | "capacitor" | "diode" | "led"
export type HeaderKind = "male-header" | "female-header"
export type ComponentKind = AxialKind | HeaderKind | "ic" | "button" | "potentiometer" | "crystal"

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
  button: "S",
  potentiometer: "RV",
  crystal: "Y",
  "male-header": "M",
  "female-header": "F",
  ic: "I",
}

export const IC_DEFAULT_PINS = 8
export const IC_DEFAULT_DISTANCE = 0

export function isAxialKind(kind: ComponentKind): kind is AxialKind {
  return kind === "resistor" || kind === "capacitor" || kind === "diode" || kind === "led"
}

/**
 * Both lead pairs are two holes apart, so one empty hole sits between the
 * pins on an edge and between the two edges.
 */
export const BUTTON_ALONG = 2
export const BUTTON_ACROSS = 2
/**
 * Housing in board pixels. Pins sit 28px from the center. A short horizontal
 * lead keeps each hole outside the shell, and the shell extends past the pin
 * rows so those leads meet the sides.
 */
export const BUTTON_LEAD = 10
export const BUTTON_BODY_HALF_ACROSS = 18
export const BUTTON_BODY_HALF_ALONG = 38

/** One empty hole between pins. Three pins then cover five holes: pin, gap, pin, gap, pin. */
export const POT_STEP = 2
/** Body above the pin row, in pixels from pin 1. The pin holes stay outside it. */
export const POT_SHELL = { left: -16, right: 122, top: -70, bottom: -12 }
/** Shaft from the body edge, through the center pin, and out past the pin row. */
export const POT_SHAFT = { left: 48, right: 64, top: -12, bottom: 50 }
/** Bounds of the body plus the shaft, used to park the name. */
export const POT_BODY = {
  left: POT_SHELL.left,
  right: POT_SHELL.right,
  top: POT_SHELL.top,
  bottom: POT_SHAFT.bottom,
}

/** One empty hole between the two leads of an HC-49 can. */
export const CRYSTAL_SPAN = 2
/** Body in pixels from pin 1, before rotation. The pin row is y = 0. */
export const CRYSTAL_BODY = { left: -14, right: 70, top: -82, bottom: -12 }

export type ButtonPin = {
  readonly number: number
  readonly side: 1 | 2
  readonly hole: Hole
}

/** One clockwise quarter-turn. Screen rows increase downward, matching the IC. */
export function turnOffset(dc: number, dr: number, rotation: IcRotation = 90) {
  let x = dc
  let y = dr
  const steps = ((rotation / 90) % 4 + 4) % 4
  for (let index = 0; index < steps; index++) {
    const nextX = -y
    y = x
    x = nextX
  }
  return { dc: x, dr: y }
}

function unturnOffset(dc: number, dr: number, rotation: IcRotation) {
  let x = dc
  let y = dr
  const steps = ((rotation / 90) % 4 + 4) % 4
  for (let index = 0; index < steps; index++) {
    const nextX = y
    y = -x
    x = nextX
  }
  return { dc: x, dr: y }
}

/** Pin 1 is the anchor. Side 1 is that edge; side 2 is the opposite edge. */
export function buttonPins(anchor: Hole, rotation: IcRotation = 0): ButtonPin[] {
  const offsets: { number: number; side: 1 | 2; dc: number; dr: number }[] = [
    { number: 1, side: 1, dc: 0, dr: 0 },
    { number: 2, side: 1, dc: 0, dr: BUTTON_ALONG },
    { number: 3, side: 2, dc: BUTTON_ACROSS, dr: BUTTON_ALONG },
    { number: 4, side: 2, dc: BUTTON_ACROSS, dr: 0 },
  ]
  return offsets.map((pin) => {
    const turned = turnOffset(pin.dc, pin.dr, rotation)
    return {
      number: pin.number,
      side: pin.side,
      hole: { c: anchor.c + turned.dc, r: anchor.r + turned.dr },
    }
  })
}

/** Side pairs are always shorted. A closed switch also bridges the two sides. */
export function buttonNetLinks(anchor: Hole, closed: boolean, rotation: IcRotation = 0): { a: Hole; b: Hole }[] {
  const pins = buttonPins(anchor, rotation)
  const side1 = pins.filter((pin) => pin.side === 1)
  const side2 = pins.filter((pin) => pin.side === 2)
  const links = [
    { a: side1[0].hole, b: side1[1].hole },
    { a: side2[0].hole, b: side2[1].hole },
  ]
  if (closed) {
    for (const left of side1) {
      for (const right of side2) links.push({ a: left.hole, b: right.hole })
    }
  }
  return links
}

export function buttonFits(
  cols: number,
  rows: number,
  parts: readonly PlacedPart[],
  anchor: Hole,
  exceptId?: string,
  rotation: IcRotation = 0,
) {
  return buttonPins(anchor, rotation).every(
    (pin) =>
      pin.hole.c >= 0 &&
      pin.hole.r >= 0 &&
      pin.hole.c < cols &&
      pin.hole.r < rows &&
      !holeOccupied(parts, pin.hole, exceptId),
  )
}

/** Hole steps from the anchor, in the button's unrotated frame. */
export function buttonLocal(dc: number, dr: number, rotation: IcRotation = 0) {
  return unturnOffset(dc, dr, rotation)
}

/** True when a point, in hole steps from the anchor, lands on the housing. Pin holes stay outside. */
export function buttonBodyContains(dc: number, dr: number, rotation: IcRotation = 0) {
  const local = buttonLocal(dc, dr, rotation)
  const across = local.dc - BUTTON_ACROSS / 2
  const along = local.dr - BUTTON_ALONG / 2
  return Math.abs(across) * 28 <= BUTTON_BODY_HALF_ACROSS && Math.abs(along) * 28 <= BUTTON_BODY_HALF_ALONG
}

export type PotPin = {
  readonly number: number
  readonly hole: Hole
}

/** Pin 1 is the anchor. Pin 2 is the wiper, one empty hole from either end. */
export function potPins(anchor: Hole, rotation: IcRotation = 0): PotPin[] {
  return [0, 1, 2].map((index) => {
    const turned = turnOffset(index * POT_STEP, 0, rotation)
    return { number: index + 1, hole: { c: anchor.c + turned.dc, r: anchor.r + turned.dr } }
  })
}

export function potFits(
  cols: number,
  rows: number,
  parts: readonly PlacedPart[],
  anchor: Hole,
  exceptId?: string,
  rotation: IcRotation = 0,
) {
  return potPins(anchor, rotation).every(
    (pin) => holeOnBoard(cols, rows, pin.hole) && !holeOccupied(parts, pin.hole, exceptId),
  )
}

function inPixelBox(
  x: number,
  y: number,
  box: { left: number; right: number; top: number; bottom: number },
) {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
}

/** True when a point, in hole steps from the anchor, lands on the body or the shaft. Pin holes stay outside. */
export function potBodyContains(dc: number, dr: number, rotation: IcRotation = 0) {
  const local = unturnOffset(dc, dr, rotation)
  const x = local.dc * 28
  const y = local.dr * 28
  return inPixelBox(x, y, POT_SHELL) || inPixelBox(x, y, POT_SHAFT)
}

export type CrystalPin = {
  readonly number: number
  readonly hole: Hole
}

/** Pin 1 is the anchor. Pin 2 is one empty hole away. */
export function crystalPins(anchor: Hole, rotation: IcRotation = 0): CrystalPin[] {
  return [0, CRYSTAL_SPAN].map((step, index) => {
    const turned = turnOffset(step, 0, rotation)
    return { number: index + 1, hole: { c: anchor.c + turned.dc, r: anchor.r + turned.dr } }
  })
}

export function crystalFits(
  cols: number,
  rows: number,
  parts: readonly PlacedPart[],
  anchor: Hole,
  exceptId?: string,
  rotation: IcRotation = 0,
) {
  return crystalPins(anchor, rotation).every(
    (pin) => holeOnBoard(cols, rows, pin.hole) && !holeOccupied(parts, pin.hole, exceptId),
  )
}

/** True when a point, in hole steps from the anchor, lands on the can. Pin holes stay outside. */
export function crystalBodyContains(dc: number, dr: number, rotation: IcRotation = 0) {
  const local = unturnOffset(dc, dr, rotation)
  const x = local.dc * 28
  const y = local.dr * 28
  return x >= CRYSTAL_BODY.left && x <= CRYSTAL_BODY.right && y >= CRYSTAL_BODY.top && y <= CRYSTAL_BODY.bottom
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
  if (part.kind === "button") return buttonPins(part.a, part.rotation ?? 0).map((pin) => pin.hole)
  if (part.kind === "potentiometer") return potPins(part.a, part.rotation ?? 0).map((pin) => pin.hole)
  if (part.kind === "crystal") return crystalPins(part.a, part.rotation ?? 0).map((pin) => pin.hole)
  return [part.a, part.b]
}

export function holeOccupied(parts: readonly PlacedPart[], hole: Hole, exceptId?: string) {
  return parts.some(
    (part) => part.id !== exceptId && partHoles(part).some((pin) => sameHole(pin, hole)),
  )
}

/** Same part, shifted by whole holes. The span and rotation stay put. */
export function translatePart(part: PlacedPart, dc: number, dr: number): PlacedPart {
  if (dc === 0 && dr === 0) return part
  return {
    ...part,
    a: { c: part.a.c + dc, r: part.a.r + dr },
    b: { c: part.b.c + dc, r: part.b.r + dr },
  }
}

function holeOnBoard(cols: number, rows: number, hole: Hole) {
  return hole.c >= 0 && hole.r >= 0 && hole.c < cols && hole.r < rows
}

/** True when every pin of this part lands on a free hole. The part does not block itself. */
export function partFits(cols: number, rows: number, parts: readonly PlacedPart[], part: PlacedPart) {
  if (part.kind === "button") return buttonFits(cols, rows, parts, part.a, part.id, part.rotation ?? 0)
  if (part.kind === "potentiometer") return potFits(cols, rows, parts, part.a, part.id, part.rotation ?? 0)
  if (part.kind === "crystal") return crystalFits(cols, rows, parts, part.a, part.id, part.rotation ?? 0)
  if (part.kind === "ic") {
    const config = readIcConfig(part)
    return icFits(cols, rows, parts, part.a, config, part.id)
  }
  const holes = partHoles(part)
  if (isHeaderKind(part.kind)) {
    if (holes.length < 2) return false
  } else if (!canPlacePart(part.a, part.b)) {
    return false
  }
  return holes.every((hole) => holeOnBoard(cols, rows, hole) && !holeOccupied(parts, hole, part.id))
}

/** Clockwise quarter-turn around pin 1. The anchor stays. */
export function turnPart(part: PlacedPart): PlacedPart {
  if (part.kind === "button" || part.kind === "ic" || part.kind === "potentiometer" || part.kind === "crystal") {
    const rotation = (((part.rotation ?? 0) + 90) % 360) as IcRotation
    const next = { ...part, rotation }
    if (part.kind === "button") return { ...next, b: buttonPins(part.a, rotation)[2].hole }
    if (part.kind === "potentiometer") return { ...next, b: potPins(part.a, rotation)[2].hole }
    if (part.kind === "crystal") return { ...next, b: crystalPins(part.a, rotation)[1].hole }
    return next
  }
  const turned = turnOffset(part.b.c - part.a.c, part.b.r - part.a.r, 90)
  return { ...part, b: { c: part.a.c + turned.dc, r: part.a.r + turned.dr } }
}
