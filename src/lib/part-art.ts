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
  radius: number
}

export type ElectrolyticMetrics = {
  length: number
  height: number
  lip: number
  stripeX: number
  stripeW: number
  plusX: number
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
  const radius = Math.min(clamp(span * 0.34, 9.2, 13.5), Math.max(6, (span - 8) / 2))
  return { radius }
}

export function electrolyticMetrics(span: number): ElectrolyticMetrics {
  const length = fitAlong(clamp(span * 0.58, 20, 36), span)
  const height = clamp(length * 0.68, 13, 17)
  const lip = Math.min(8, Math.max(6.2, length * 0.2))
  const stripeW = Math.max(6.4, length * 0.24)
  const stripeX = length / 2 - stripeW - 0.6
  const plusX = -length / 2 + lip / 2
  return { length, height, lip, stripeW, stripeX, plusX }
}

export function componentHitRadius(kind: ComponentKind, polarized: boolean | undefined, span: number) {
  if (kind === "resistor") return resistorMetrics(span).radius + 2
  if (kind === "diode") return diodeMetrics(span).radius + 2
  if (kind === "capacitor" && polarized) return electrolyticMetrics(span).height / 2 + 2
  return ceramicMetrics(span).radius + 1.5
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

function glyphPlus(ctx: CanvasRenderingContext2D, x: number, y: number, arm: number) {
  ctx.beginPath()
  ctx.moveTo(x - arm, y)
  ctx.lineTo(x + arm, y)
  ctx.moveTo(x, y - arm)
  ctx.lineTo(x, y + arm)
  ctx.lineWidth = Math.max(1.5, arm * 0.7)
  ctx.stroke()
}

function glyphMinus(ctx: CanvasRenderingContext2D, x: number, y: number, arm: number) {
  ctx.beginPath()
  ctx.moveTo(x - arm, y)
  ctx.lineTo(x + arm, y)
  ctx.lineWidth = Math.max(1.8, arm * 0.85)
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
  const { radius } = ceramicMetrics(span)
  if (halo) {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, radius)
  const disc = ctx.createRadialGradient(-radius * 0.25, -radius * 0.3, radius * 0.15, 0, 0, radius)
  disc.addColorStop(0, "#f8e7c4")
  disc.addColorStop(0.72, "#e4c48a")
  disc.addColorStop(1, "#b8884c")
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = disc
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = "#7a5a32"
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(92, 64, 32, 0.45)"
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.fillStyle = "#6a4c2c"
  const mark = Math.max(2.4, radius * 0.42)
  ctx.fillRect(-mark / 2, -0.9, mark, 1.5)
}

function drawElectrolytic(ctx: CanvasRenderingContext2D, span: number, halo: string | null) {
  const { length, height, lip, stripeX, stripeW, plusX } = electrolyticMetrics(span)
  const x = -length / 2
  const y = -height / 2
  if (halo) {
    roundBody(ctx, x, y, length, height, 2.4)
    ctx.strokeStyle = halo
    ctx.lineWidth = 5
    ctx.stroke()
  }
  drawLeads(ctx, span, length / 2)
  const shell = ctx.createLinearGradient(0, y, 0, y + height)
  shell.addColorStop(0, "#f5f6f7")
  shell.addColorStop(0.45, "#c5cacf")
  shell.addColorStop(1, "#8d949c")
  roundBody(ctx, x, y, length, height, 2.4)
  ctx.fillStyle = shell
  ctx.fill()
  ctx.strokeStyle = "#5e666e"
  ctx.lineWidth = 0.9
  ctx.stroke()
  roundBody(ctx, x + lip, y + 0.45, length - lip - 0.35, height - 0.9, 1.8)
  ctx.fillStyle = "#171a1f"
  ctx.fill()
  ctx.save()
  roundBody(ctx, x, y, length, height, 2.4)
  ctx.clip()
  ctx.fillStyle = "#f7f7f4"
  ctx.fillRect(stripeX, y, stripeW, height)
  ctx.restore()
  ctx.strokeStyle = "#121418"
  ctx.lineCap = "round"
  glyphMinus(ctx, stripeX + stripeW / 2, 0, Math.min(stripeW * 0.32, height * 0.28))
  glyphPlus(ctx, plusX, 0, Math.min(2.3, lip * 0.32))
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
  else if (polarized) drawElectrolytic(ctx, span, halo)
  else drawCeramic(ctx, span, halo)
  ctx.restore()
}
