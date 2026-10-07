import type { ComponentKind } from "./parts"

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
  if (span < 1) return
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
