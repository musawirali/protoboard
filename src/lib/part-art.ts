import { icDirections, type ComponentKind, type IcRotation } from "./parts"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function fitAlong(wanted: number, span: number) {
  return Math.min(wanted, Math.max(12, span - 8))
}

export type ResistorBand = {
  x: number
  color: string
}

export type ResistorMetrics = {
  length: number
  radius: number
  bandW: number
  bands: ResistorBand[]
}

const BAND_COLORS = ["#6b3412", "#141414", "#e2231a", "#f2c84a"]

export type DiodeMetrics = {
  length: number
  radius: number
  bandX: number
  bandW: number
}

export type CeramicMetrics = {
  rx: number
  ry: number
}

export type ElectrolyticMetrics = {
  radius: number
  metalRadius: number
  stripeHalfAngle: number
}

export type LedMetrics = {
  radius: number
  flatX: number
}

export function resistorMetrics(span: number, avoidCenter = false): ResistorMetrics {
  const length = fitAlong(clamp(span * 0.7, 20, 42), span)
  const radius = clamp(length * 0.26, 5.2, 7.4)
  const left = -length / 2 + Math.max(1.8, length * 0.1)
  const right = avoidCenter ? -6.6 : left + length * 0.62
  const room = Math.max(8, right - left)
  const bandW = clamp(room / 6.2, 1.8, 3.4)
  const gap = bandW * 0.55
  let cursor = left
  const bands = BAND_COLORS.map((color) => {
    const x = cursor + bandW / 2
    cursor += bandW + gap
    return { x, color }
  })
  return { length, radius, bandW, bands }
}

export function diodeMetrics(span: number): DiodeMetrics {
  const length = fitAlong(clamp(span * 0.5, 17, 30), span)
  const radius = clamp(length * 0.26, 4.4, 6.4)
  const bandW = Math.max(4.2, length * 0.22)
  const bandX = length / 2 - bandW - 1.6
  return { length, radius, bandW, bandX }
}

export function ceramicMetrics(span: number): CeramicMetrics {
  const rx = Math.min(clamp(span * 0.46, 12, 20), Math.max(9, (span - 6) / 2))
  return { rx, ry: rx * 0.48 }
}

export function electrolyticMetrics(span: number): ElectrolyticMetrics {
  const radius = Math.min(clamp(span * 0.36, 10, 15.5), Math.max(7, (span - 8) / 2))
  return { radius, metalRadius: radius * 0.52, stripeHalfAngle: 0.9 }
}

export function ledMetrics(span: number): LedMetrics {
  const radius = Math.min(clamp(span * 0.38, 10, 16), Math.max(7, (span - 8) / 2))
  return { radius, flatX: radius * 0.55 }
}

/** Half-size of the body along the leads and across them, in board pixels. */
export function componentSilhouette(kind: ComponentKind, polarized: boolean | undefined, span: number) {
  if (kind === "male-header" || kind === "female-header") return { along: span / 2, across: 12 }
  if (kind === "ic") return { along: span / 2, across: 12 }
  if (kind === "resistor") {
    const body = resistorMetrics(span)
    return { along: body.length / 2, across: body.radius }
  }
  if (kind === "diode") {
    const body = diodeMetrics(span)
    return { along: body.length / 2, across: body.radius }
  }
  if (kind === "led") {
    const body = ledMetrics(span)
    return { along: body.radius, across: body.radius }
  }
  if (kind === "capacitor" && polarized) {
    const body = electrolyticMetrics(span)
    return { along: body.radius, across: body.radius }
  }
  const disc = ceramicMetrics(span)
  return { along: disc.rx, across: disc.ry }
}

export function componentHitRadius(kind: ComponentKind, polarized: boolean | undefined, span: number) {
  if (kind === "male-header" || kind === "female-header" || kind === "ic") return 14
  if (kind === "resistor") return resistorMetrics(span).radius + 2
  if (kind === "diode") return diodeMetrics(span).radius + 2
  if (kind === "led") return ledMetrics(span).radius + 1.5
  if (kind === "capacitor" && polarized) return electrolyticMetrics(span).radius + 1.5
  return ceramicMetrics(span).ry + 2
}

function roundBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawLeads(ctx: CanvasRenderingContext2D, span: number, inset: number) {
  ctx.beginPath()
  ctx.moveTo(-span / 2, 0)
  ctx.lineTo(-inset, 0)
  ctx.moveTo(inset, 0)
  ctx.lineTo(span / 2, 0)
  ctx.strokeStyle = "#d5cfc3"
  ctx.lineWidth = 1.8
  ctx.stroke()
}

function drawResistor(ctx: CanvasRenderingContext2D, span: number, halo: string | null, avoidCenter: boolean) {
  const { length, radius, bandW, bands } = resistorMetrics(span, avoidCenter)
  const x = -length / 2
  const y = -radius
  const height = radius * 2
  if (halo) {
    roundBody(ctx, x, y, length, height, radius)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, length / 2)
  const body = ctx.createLinearGradient(0, y, 0, y + height)
  body.addColorStop(0, "#f6e2bf")
  body.addColorStop(0.38, "#e0b56e")
  body.addColorStop(1, "#8f5c2e")
  roundBody(ctx, x, y, length, height, radius)
  ctx.fillStyle = body
  ctx.fill()
  ctx.strokeStyle = "#6d4a28"
  ctx.lineWidth = 0.9
  ctx.stroke()
  ctx.save()
  roundBody(ctx, x, y, length, height, radius)
  ctx.clip()
  for (const band of bands) {
    ctx.fillStyle = band.color
    ctx.fillRect(band.x - bandW / 2, y, bandW, height)
  }
  ctx.fillStyle = "rgba(255,255,255,0.34)"
  ctx.fillRect(x + 1, y + height * 0.14, length - 2, Math.max(1.2, height * 0.14))
  ctx.restore()
}

function drawDiode(ctx: CanvasRenderingContext2D, span: number, halo: string | null) {
  const { length, radius, bandX, bandW } = diodeMetrics(span)
  const x = -length / 2
  const y = -radius
  const height = radius * 2
  if (halo) {
    roundBody(ctx, x, y, length, height, radius)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, length / 2)
  const body = ctx.createLinearGradient(0, y, 0, y + height)
  body.addColorStop(0, "#5a5a5a")
  body.addColorStop(0.38, "#1c1c1c")
  body.addColorStop(1, "#070707")
  roundBody(ctx, x, y, length, height, radius)
  ctx.fillStyle = body
  ctx.fill()
  ctx.save()
  roundBody(ctx, x, y, length, height, radius)
  ctx.clip()
  ctx.fillStyle = "#f4f1e8"
  ctx.fillRect(bandX, y, bandW, height)
  ctx.fillStyle = "rgba(255,255,255,0.55)"
  ctx.fillRect(bandX, y + height * 0.18, bandW, Math.max(1, height * 0.14))
  ctx.restore()
  roundBody(ctx, x, y, length, height, radius)
  ctx.strokeStyle = "#050505"
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function drawCeramic(ctx: CanvasRenderingContext2D, span: number, halo: string | null) {
  const { rx, ry } = ceramicMetrics(span)
  if (halo) {
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, rx)
  const disc = ctx.createRadialGradient(-rx * 0.22, -ry * 0.35, Math.min(rx, ry) * 0.2, 0, 0, rx)
  disc.addColorStop(0, "#f8e7c4")
  disc.addColorStop(0.72, "#e4c48a")
  disc.addColorStop(1, "#b8884c")
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = disc
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = "#7a5a32"
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 0.78, ry * 0.7, 0, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(92, 64, 32, 0.45)"
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function drawElectrolytic(ctx: CanvasRenderingContext2D, span: number, halo: string | null) {
  const { radius, metalRadius, stripeHalfAngle } = electrolyticMetrics(span)
  if (halo) {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, radius)
  const sleeve = ctx.createRadialGradient(-radius * 0.2, -radius * 0.28, radius * 0.15, 0, 0, radius)
  sleeve.addColorStop(0, "#3a4252")
  sleeve.addColorStop(1, "#141820")
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = sleeve
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = "#0c0e14"
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, radius, -stripeHalfAngle, stripeHalfAngle)
  ctx.closePath()
  ctx.fillStyle = "#f4f6f8"
  ctx.fill()
  const metal = ctx.createRadialGradient(-metalRadius * 0.28, -metalRadius * 0.34, metalRadius * 0.08, 0, 0, metalRadius)
  metal.addColorStop(0, "#fbfcfc")
  metal.addColorStop(0.55, "#c5ccd3")
  metal.addColorStop(1, "#8e969e")
  ctx.beginPath()
  ctx.arc(0, 0, metalRadius, 0, Math.PI * 2)
  ctx.fillStyle = metal
  ctx.fill()
  ctx.strokeStyle = "#667078"
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function traceLed(ctx: CanvasRenderingContext2D, radius: number, flatX: number) {
  const angle = Math.acos(clamp(flatX / radius, -1, 1))
  ctx.beginPath()
  ctx.arc(0, 0, radius, angle, Math.PI * 2 - angle)
  ctx.closePath()
}

function drawLed(ctx: CanvasRenderingContext2D, span: number, halo: string | null) {
  const { radius, flatX } = ledMetrics(span)
  if (halo) {
    traceLed(ctx, radius, flatX)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  const flatY = Math.sin(Math.acos(clamp(flatX / radius, -1, 1))) * radius
  ctx.beginPath()
  ctx.moveTo(-span / 2, 0)
  ctx.lineTo(-radius, 0)
  ctx.moveTo(flatX, 0)
  ctx.lineTo(span / 2, 0)
  ctx.strokeStyle = "#d5cfc3"
  ctx.lineWidth = 1.8
  ctx.stroke()
  const dome = ctx.createRadialGradient(-radius * 0.28, -radius * 0.32, radius * 0.08, 0, 0, radius)
  dome.addColorStop(0, "#ffb1aa")
  dome.addColorStop(0.42, "#ef3a2e")
  dome.addColorStop(1, "#8d140f")
  traceLed(ctx, radius, flatX)
  ctx.fillStyle = dome
  ctx.fill()
  ctx.strokeStyle = "#6a100d"
  ctx.lineWidth = 1.1
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(flatX, -flatY)
  ctx.lineTo(flatX, flatY)
  ctx.strokeStyle = "#4a0c0a"
  ctx.lineWidth = 2.4
  ctx.stroke()
}

export function drawComponent(
  ctx: CanvasRenderingContext2D,
  kind: ComponentKind,
  polarized: boolean | undefined,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  halo: string | null,
) {
  const dx = bx - ax
  const dy = by - ay
  const span = Math.hypot(dx, dy)
  if (span < 1 || kind === "male-header" || kind === "female-header" || kind === "ic") return
  ctx.save()
  ctx.translate((ax + bx) / 2, (ay + by) / 2)
  ctx.rotate(Math.atan2(dy, dx))
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  const stepsX = Math.round((bx - ax) / 28)
  const stepsY = Math.round((by - ay) / 28)
  const avoidCenter = stepsX % 2 === 0 && stepsY % 2 === 0
  if (kind === "resistor") drawResistor(ctx, span, halo, avoidCenter)
  else if (kind === "diode") drawDiode(ctx, span, halo)
  else if (kind === "led") drawLed(ctx, span, halo)
  else if (polarized) drawElectrolytic(ctx, span, halo)
  else drawCeramic(ctx, span, halo)
  ctx.restore()
}

const PITCH = 28

export type HeaderFrame = {
  ux: number
  uy: number
  px: number
  py: number
  span: number
  midX: number
  midY: number
}

/** +x runs from the start hole to the end hole. +y is the pin side, biased downward on screen. */
export function headerFrame(ax: number, ay: number, bx: number, by: number): HeaderFrame | null {
  const dx = bx - ax
  const dy = by - ay
  const span = Math.hypot(dx, dy)
  if (span < 1) return null
  const ux = dx / span
  const uy = dy / span
  let px = -uy
  let py = ux
  if (py < 0 || (py === 0 && px < 0)) {
    px = -px
    py = -py
  }
  return { ux, uy, px, py, span, midX: (ax + bx) / 2, midY: (ay + by) / 2 }
}

function worldOf(frame: HeaderFrame, lx: number, ly: number) {
  return {
    x: frame.midX + lx * frame.ux + ly * frame.px,
    y: frame.midY + lx * frame.uy + ly * frame.py,
  }
}

/** Top edge of the strip in screen space, used to park the name above the body. */
export function headerLabelTop(ax: number, ay: number, bx: number, by: number, male: boolean) {
  const frame = headerFrame(ax, ay, bx, by)
  if (!frame) return null
  const overhang = 8
  const half = frame.span / 2 + overhang
  const y0 = male ? -16 : -8
  const y1 = male ? -6 : 8
  let top = Infinity
  for (const lx of [-half, half]) {
    for (const ly of [y0, y1]) top = Math.min(top, worldOf(frame, lx, ly).y)
  }
  return { x: frame.midX, y: Math.min(top, ay, by) }
}

export function drawHeader(
  ctx: CanvasRenderingContext2D,
  male: boolean,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  halo: string | null,
) {
  const frame = headerFrame(ax, ay, bx, by)
  if (!frame) return
  const { ux, uy, px, py, span, midX, midY } = frame
  const count = Math.round(span / PITCH) + 1
  ctx.save()
  ctx.translate(midX, midY)
  ctx.transform(ux, uy, px, py, 0, 0)
  ctx.lineJoin = "round"
  const overhang = 8
  const length = span + overhang * 2
  const x0 = -length / 2
  if (male) {
    const bodyY = -16
    const bodyH = 10
    if (halo) {
      roundBody(ctx, x0 - 2, bodyY - 3, length + 4, bodyH + 14, 3)
      ctx.strokeStyle = halo
      ctx.lineWidth = 4
      ctx.stroke()
    }
    roundBody(ctx, x0, bodyY, length, bodyH, 1.6)
    const plastic = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH)
    plastic.addColorStop(0, "#3a3d44")
    plastic.addColorStop(0.45, "#1c1e24")
    plastic.addColorStop(1, "#0c0d10")
    ctx.fillStyle = plastic
    ctx.fill()
    for (let index = 0; index < count; index++) {
      const x = -span / 2 + index * PITCH
      ctx.fillStyle = "#c9862a"
      ctx.fillRect(x - 2.1, bodyY + bodyH - 1, 4.2, 8)
      ctx.fillStyle = "#f2d48a"
      ctx.fillRect(x - 2.7, 2.4, 5.4, 5.6)
    }
  } else {
    const bodyH = 18
    const bodyY = -bodyH / 2
    if (halo) {
      roundBody(ctx, x0 - 2, bodyY - 2, length + 4, bodyH + 4, 3)
      ctx.strokeStyle = halo
      ctx.lineWidth = 4
      ctx.stroke()
    }
    roundBody(ctx, x0, bodyY, length, bodyH, 2)
    const housing = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH)
    housing.addColorStop(0, "#2c3138")
    housing.addColorStop(0.4, "#16191e")
    housing.addColorStop(1, "#0a0c10")
    ctx.fillStyle = housing
    ctx.fill()
    ctx.strokeStyle = "#4d5560"
    ctx.lineWidth = 1
    ctx.stroke()
    for (let index = 0; index < count; index++) {
      const x = -span / 2 + index * PITCH
      roundBody(ctx, x - 6.4, -7.4, 12.8, 14.8, 1.8)
      ctx.fillStyle = "#f4f7fb"
      ctx.fill()
      ctx.strokeStyle = "#8b97a6"
      ctx.lineWidth = 1
      ctx.stroke()
      roundBody(ctx, x - 3.4, -4.6, 6.8, 9.2, 1.2)
      ctx.fillStyle = "#12161c"
      ctx.fill()
    }
  }
  ctx.restore()
}

function icLocal(rotation: IcRotation, lx: number, ly: number) {
  const { rail, across } = icDirections(rotation)
  return { x: lx * rail.dc + ly * across.dc, y: lx * rail.dr + ly * across.dr }
}

export function icLabelTop(ax: number, ay: number, pinCount: number, railDistance: number, rotation: IcRotation) {
  const perRail = pinCount / 2
  const gap = 1 + railDistance
  const center = icLocal(rotation, ((perRail - 1) * PITCH) / 2, (gap * PITCH) / 2)
  const cx = ax + center.x
  const cy = ay + center.y
  const halfAlong = ((perRail - 1) * PITCH + 16) / 2
  const halfAcross = Math.max(12, gap * PITCH - 14) / 2
  let top = Infinity
  for (const lx of [-halfAlong, halfAlong]) {
    for (const ly of [-halfAcross, halfAcross]) {
      top = Math.min(top, cy + icLocal(rotation, lx, ly).y)
    }
  }
  return { x: cx, y: top }
}

export function drawIc(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  pinCount: number,
  railDistance: number,
  rotation: IcRotation,
  halo: string | null,
) {
  const perRail = pinCount / 2
  const gap = 1 + railDistance
  const center = icLocal(rotation, ((perRail - 1) * PITCH) / 2, (gap * PITCH) / 2)
  const { rail, across } = icDirections(rotation)
  const bodyLength = (perRail - 1) * PITCH + 16
  const bodyWidth = Math.max(12, gap * PITCH - 14)
  ctx.save()
  ctx.translate(ax + center.x, ay + center.y)
  ctx.transform(rail.dc, rail.dr, across.dc, across.dr, 0, 0)
  ctx.lineJoin = "round"
  const x0 = -bodyLength / 2
  const y0 = -bodyWidth / 2
  const notch = Math.min(6.5, bodyWidth * 0.34)
  if (halo) {
    roundBody(ctx, x0 - 3, y0 - 3, bodyLength + 6, bodyWidth + 6, 3)
    ctx.strokeStyle = halo
    ctx.lineWidth = 4
    ctx.stroke()
  }
  roundBody(ctx, x0, y0, bodyLength, bodyWidth, 2)
  const body = ctx.createLinearGradient(0, y0, 0, y0 + bodyWidth)
  body.addColorStop(0, "#3c4148")
  body.addColorStop(0.35, "#1a1d22")
  body.addColorStop(1, "#0b0d11")
  ctx.fillStyle = body
  ctx.fill()
  ctx.strokeStyle = "#5c656f"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x0, 0, notch, -Math.PI / 2, Math.PI / 2)
  ctx.fillStyle = "#14653c"
  ctx.fill()
  ctx.strokeStyle = "#d5dbe3"
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.strokeStyle = "#c5ccd4"
  ctx.lineWidth = 1.7
  const lead = (gap * PITCH) / 2
  for (let index = 0; index < perRail; index++) {
    const x = (-(perRail - 1) / 2 + index) * PITCH
    ctx.beginPath()
    ctx.moveTo(x, -bodyWidth / 2)
    ctx.lineTo(x, -lead)
    ctx.moveTo(x, bodyWidth / 2)
    ctx.lineTo(x, lead)
    ctx.stroke()
  }
  ctx.restore()
}
