"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { canCommit, isWire, sameHole, type Hole, type Trace } from "@/lib/board"
import { assignNets, displayNetColor } from "@/lib/nets"
import {
  buttonLabelTop,
  componentHitRadius,
  componentSilhouette,
  drawButton,
  drawComponent,
  drawCrystal,
  drawHeader,
  drawIc,
  drawPot,
  fixedLabelTop,
  headerLabelTop,
  icLabelTop,
} from "@/lib/part-art"
import {
  BUTTON_ACROSS,
  BUTTON_ALONG,
  buttonBodyContains,
  buttonFits,
  buttonLocal,
  canPlaceHeader,
  canPlacePart,
  crystalBodyContains,
  crystalFits,
  crystalPins,
  CRYSTAL_BODY,
  holeOccupied,
  icBodyContains,
  icDirections,
  icFits,
  icPins,
  PART_REACH,
  partFits,
  potBodyContains,
  potFits,
  potPins,
  POT_BODY,
  readIcConfig,
  translatePart,
  type PlacedPart,
} from "@/lib/parts"
import { isAxialTool, isHeaderTool, isPartTool, type Selection, type ToolName } from "@/lib/selection"

const PITCH = 28
const MARGIN = 36
const PAD_R = 5.6
const HOLE_R = 3.15
const LANE = 22
const WIRE = 2.5
const HOVER_R = 14
const SELECT_PIN = 11

type View = {
  panX: number
  panY: number
  zoom: number
}

type ProtoboardCanvasProps = {
  cols: number
  rows: number
  traces: Trace[]
  colorKeys: number[]
  parts: PlacedPart[]
  tool: ToolName
  draftStart: Hole | null
  selectedTraceId: string | null
  selectedPartId: string | null
  selectedHole: Hole | null
  heldButtonId: string | null
  onHoleClick: (hole: Hole) => void
  onSelect: (selection: Selection | null) => void
  onHoldButton: (id: string | null) => void
  onMovePart: (id: string, a: Hole, b: Hole) => void
}

type MoveGesture = {
  pointerId: number
  partId: string
  originHole: Hole
  moved: boolean
}

type PanGesture = {
  id: number
  lastX: number
  lastY: number
  originX: number
  originY: number
  moved: boolean
  hole: Hole | null
}

type PinchGesture = {
  startDist: number
  startZoom: number
  worldX: number
  worldY: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function boardSize(cols: number, rows: number) {
  return {
    width: MARGIN * 2 + Math.max(0, cols - 1) * PITCH,
    height: MARGIN * 2 + Math.max(0, rows - 1) * PITCH,
  }
}

function holeXY(c: number, r: number) {
  return { x: MARGIN + c * PITCH, y: MARGIN + r * PITCH }
}

function canvasLabel(tool: ToolName) {
  if (tool === "select") {
    return "Protoboard pin grid. Select is active. Click a trace, component, or pin hole. Drag a selected component to move it. Press Space to rotate it around pin 1. Click empty board to clear the selection. Drag empty board to pan."
  }
  if (tool === "trace") {
    return "Protoboard pin grid. PCB Trace is selected. Click a hole to start, then a hole on the same row or column to commit a trace. Drag empty board to pan."
  }
  if (tool === "wire") {
    return "Protoboard pin grid. Wire is selected. Click a hole to start, then any other hole to commit a thin wire. Drag empty board to pan."
  }
  if (tool === "ic") {
    return "Protoboard pin grid. IC is selected. Click a pin hole to place pin 1. Drag empty board to pan."
  }
  if (tool === "button") {
    return "Protoboard pin grid. Button is selected. Click a pin hole to place the four-pin switch. Drag empty board to pan."
  }
  if (tool === "potentiometer") {
    return "Protoboard pin grid. Potentiometer is selected. Click a pin hole to place pin 1. The three pins span five holes. Drag empty board to pan."
  }
  if (tool === "crystal") {
    return "Protoboard pin grid. Crystal is selected. Click a pin hole to place pin 1. One empty hole sits between the leads. Drag empty board to pan."
  }
  const name =
    tool === "led"
      ? "LED"
      : tool === "male-header"
        ? "Male header"
        : tool === "female-header"
          ? "Female header"
          : `${tool[0].toUpperCase()}${tool.slice(1)}`
  if (isHeaderTool(tool)) {
    return `Protoboard pin grid. ${name} is selected. Click two pin holes on the same row or column. Drag empty board to pan.`
  }
  return `Protoboard pin grid. ${name} is selected. Click two pin holes within 4 steps. Drag empty board to pan.`
}

function roundRect(
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

function strokeSegment(
  ctx: CanvasRenderingContext2D,
  start: Hole,
  end: Hole,
  color: string,
  width: number,
) {
  const from = holeXY(start.c, start.r)
  const to = holeXY(end.c, end.r)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()
}

function strokeLane(ctx: CanvasRenderingContext2D, start: Hole, end: Hole, color: string) {
  strokeSegment(ctx, start, end, color, LANE)
}

function strokeWire(ctx: CanvasRenderingContext2D, start: Hole, end: Hole, color: string) {
  strokeSegment(ctx, start, end, color, WIRE)
}

function drawPartSymbol(ctx: CanvasRenderingContext2D, part: PlacedPart, halo: string | null, pressed: boolean) {
  const from = holeXY(part.a.c, part.a.r)
  const to = holeXY(part.b.c, part.b.r)
  if (part.kind === "male-header" || part.kind === "female-header") {
    drawHeader(ctx, part.kind === "male-header", from.x, from.y, to.x, to.y, halo)
    return
  }
  if (part.kind === "ic") {
    const config = readIcConfig(part)
    drawIc(ctx, from.x, from.y, config.pinCount, config.railDistance, config.rotation, halo)
    return
  }
  if (part.kind === "button") {
    drawButton(ctx, from.x, from.y, halo, pressed, part.rotation ?? 0)
    return
  }
  if (part.kind === "potentiometer") {
    drawPot(ctx, from.x, from.y, halo, part.rotation ?? 0)
    return
  }
  if (part.kind === "crystal") {
    drawCrystal(ctx, from.x, from.y, halo, part.rotation ?? 0)
    return
  }
  drawComponent(ctx, part.kind, part.polarized, from.x, from.y, to.x, to.y, halo)
}

function paintUprightText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  baseline: CanvasTextBaseline,
  align: CanvasTextAlign,
) {
  ctx.font = `600 ${size}px var(--font-geist-sans), sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.lineJoin = "round"
  ctx.lineWidth = 3
  ctx.strokeStyle = "rgba(7, 32, 18, 0.92)"
  ctx.strokeText(text, x, y)
  ctx.fillStyle = "#f6f1e2"
  ctx.fillText(text, x, y)
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay)
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function hitSegmentIndex(
  worldX: number,
  worldY: number,
  traces: readonly Trace[],
  wires: boolean,
) {
  let best: { index: number; distance: number } | null = null
  const limit = wires ? 8 : LANE / 2 + 1
  for (let index = 0; index < traces.length; index++) {
    const trace = traces[index]
    if (isWire(trace) !== wires) continue
    const from = holeXY(trace.a.c, trace.a.r)
    const to = holeXY(trace.b.c, trace.b.r)
    const distance = distanceToSegment(worldX, worldY, from.x, from.y, to.x, to.y)
    if (distance <= limit && (best == null || distance < best.distance)) {
      best = { index, distance }
    }
  }
  return best
}

function hitPart(worldX: number, worldY: number, parts: readonly PlacedPart[]) {
  let best: { part: PlacedPart; distance: number } | null = null
  for (const part of parts) {
    if (part.kind === "potentiometer" || part.kind === "crystal") {
      const anchor = holeXY(part.a.c, part.a.r)
      const inside =
        part.kind === "potentiometer"
          ? potBodyContains((worldX - anchor.x) / PITCH, (worldY - anchor.y) / PITCH, part.rotation ?? 0)
          : crystalBodyContains((worldX - anchor.x) / PITCH, (worldY - anchor.y) / PITCH, part.rotation ?? 0)
      if (inside && (best == null || 0 < best.distance)) best = { part, distance: 0 }
      continue
    }
    if (part.kind === "button") {
      const anchor = holeXY(part.a.c, part.a.r)
      const inside = buttonBodyContains(
        (worldX - anchor.x) / PITCH,
        (worldY - anchor.y) / PITCH,
        part.rotation ?? 0,
      )
      if (inside && (best == null || 0 < best.distance)) best = { part, distance: 0 }
      continue
    }
    if (part.kind === "ic") {
      const config = readIcConfig(part)
      const anchor = holeXY(part.a.c, part.a.r)
      const inside = icBodyContains(
        part.a,
        config.pinCount,
        config.railDistance,
        config.rotation,
        (worldX - anchor.x) / PITCH,
        (worldY - anchor.y) / PITCH,
      )
      if (inside && (best == null || 0 < best.distance)) best = { part, distance: 0 }
      continue
    }
    const from = holeXY(part.a.c, part.a.r)
    const to = holeXY(part.b.c, part.b.r)
    const span = Math.hypot(to.x - from.x, to.y - from.y)
    const distance = distanceToSegment(worldX, worldY, from.x, from.y, to.x, to.y)
    const limit =
      part.kind === "male-header" || part.kind === "female-header"
        ? 14
        : componentHitRadius(part.kind, part.polarized, span)
    if (distance <= limit && (best == null || distance < best.distance)) best = { part, distance }
  }
  return best?.part
}

/** Housing of a placed button. The four pin holes sit outside this rectangle. */
function hitButton(worldX: number, worldY: number, parts: readonly PlacedPart[]) {
  let best: { id: string; distance: number } | null = null
  for (const part of parts) {
    if (part.kind !== "button") continue
    const anchor = holeXY(part.a.c, part.a.r)
    const rotation = part.rotation ?? 0
    const dc = (worldX - anchor.x) / PITCH
    const dr = (worldY - anchor.y) / PITCH
    if (!buttonBodyContains(dc, dr, rotation)) continue
    const local = buttonLocal(dc, dr, rotation)
    const distance = Math.hypot(local.dc - BUTTON_ACROSS / 2, local.dr - BUTTON_ALONG / 2)
    if (best == null || distance < best.distance) best = { id: part.id, distance }
  }
  return best?.id ?? null
}

function resolveSelect(
  localX: number,
  localY: number,
  view: View,
  cols: number,
  rows: number,
  traces: readonly Trace[],
  parts: readonly PlacedPart[],
): Selection | null {
  const worldX = (localX - view.panX) / view.zoom
  const worldY = (localY - view.panY) / view.zoom
  const pin = hitHole(localX, localY, view, cols, rows, SELECT_PIN)
  if (pin) return { type: "hole", hole: pin }
  const part = hitPart(worldX, worldY, parts)
  if (part) return { type: "component", id: part.id }
  const wireHit = hitSegmentIndex(worldX, worldY, traces, true)
  const traceHit = hitSegmentIndex(worldX, worldY, traces, false)
  const picked =
    wireHit && traceHit
      ? wireHit.distance <= traceHit.distance
        ? wireHit.index
        : traceHit.index
      : (wireHit?.index ?? traceHit?.index ?? null)
  const trace = picked == null ? undefined : traces[picked]
  if (trace?.id) return { type: "trace", id: trace.id }
  const loose = hitHole(localX, localY, view, cols, rows)
  if (loose) return { type: "hole", hole: loose }
  return null
}

function hitHole(
  localX: number,
  localY: number,
  view: View,
  cols: number,
  rows: number,
  reach = PITCH * 0.72,
): Hole | null {
  const worldX = (localX - view.panX) / view.zoom
  const worldY = (localY - view.panY) / view.zoom
  const c = Math.round((worldX - MARGIN) / PITCH)
  const r = Math.round((worldY - MARGIN) / PITCH)
  if (c < 0 || r < 0 || c >= cols || r >= rows) return null
  const hole = holeXY(c, r)
  const dx = worldX - hole.x
  const dy = worldY - hole.y
  if (dx * dx + dy * dy > reach * reach) return null
  return { c, r }
}

export function ProtoboardCanvas({
  cols,
  rows,
  traces,
  colorKeys,
  parts,
  tool,
  draftStart,
  selectedTraceId,
  selectedPartId,
  selectedHole,
  heldButtonId,
  onHoleClick,
  onSelect,
  onHoldButton,
  onMovePart,
}: ProtoboardCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<View>({ panX: 0, panY: 0, zoom: 1 })
  const fitRef = useRef<View>({ panX: 0, panY: 0, zoom: 1 })
  const boundsRef = useRef({ min: 0.08, max: 12 })
  const fittedFor = useRef("")
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const hoverRef = useRef<Hole | null>(null)
  const hoverTraceRef = useRef<string | null>(null)
  const hoverPartRef = useRef<string | null>(null)
  const movePreviewRef = useRef<{ part: PlacedPart; valid: boolean } | null>(null)
  const modelRef = useRef({
    cols,
    rows,
    traces,
    colorKeys,
    parts,
    tool,
    draftStart,
    selectedTraceId,
    selectedPartId,
    selectedHole,
    heldButtonId,
    onHoleClick,
    onSelect,
    onHoldButton,
    onMovePart,
  })
  const [status, setStatus] = useState("Drag empty board to pan. Scroll or pinch to zoom.")

  const ensureFit = useCallback((nextCols: number, nextRows: number, width: number, height: number) => {
    const board = boardSize(nextCols, nextRows)
    const fitZoom = Math.min(width / board.width, height / board.height) * 0.92
    boundsRef.current = {
      min: Math.min(0.08, fitZoom * 0.35),
      max: Math.max(12, fitZoom),
    }
    fitRef.current = {
      zoom: fitZoom,
      panX: (width - board.width * fitZoom) / 2,
      panY: (height - board.height * fitZoom) / 2,
    }
    const key = `${nextCols}x${nextRows}`
    if (fittedFor.current !== key) {
      viewRef.current = { ...fitRef.current }
      fittedFor.current = key
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { w, h, dpr } = sizeRef.current
    if (w <= 0 || h <= 0) return

    const model = modelRef.current
    ensureFit(model.cols, model.rows, w, h)
    const view = viewRef.current
    const board = boardSize(model.cols, model.rows)
    const hover = hoverRef.current

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, view.panX * dpr, view.panY * dpr)

    roundRect(ctx, 0, 0, board.width, board.height, 12)
    const gradient = ctx.createLinearGradient(0, 0, board.width, board.height)
    gradient.addColorStop(0, "#1c7d4d")
    gradient.addColorStop(0.55, "#14653c")
    gradient.addColorStop(1, "#0d4a2c")
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = "#072818"
    ctx.stroke()

    const minX = (0 - view.panX) / view.zoom
    const minY = (0 - view.panY) / view.zoom
    const maxX = (w - view.panX) / view.zoom
    const maxY = (h - view.panY) / view.zoom
    const c0 = clamp(Math.floor((Math.min(minX, maxX) - MARGIN) / PITCH) - 1, 0, model.cols - 1)
    const c1 = clamp(Math.ceil((Math.max(minX, maxX) - MARGIN) / PITCH) + 1, 0, model.cols - 1)
    const r0 = clamp(Math.floor((Math.min(minY, maxY) - MARGIN) / PITCH) - 1, 0, model.rows - 1)
    const r1 = clamp(Math.ceil((Math.max(minY, maxY) - MARGIN) / PITCH) + 1, 0, model.rows - 1)

    const visitHoles = (drawHole: (x: number, y: number) => void) => {
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const { x, y } = holeXY(col, row)
          drawHole(x, y)
        }
      }
    }

    ctx.beginPath()
    visitHoles((x, y) => {
      ctx.moveTo(x + PAD_R, y)
      ctx.arc(x, y, PAD_R, 0, Math.PI * 2)
    })
    ctx.fillStyle = "#c6a56e"
    ctx.fill()
    ctx.lineWidth = 0.7
    ctx.strokeStyle = "#7d5a38"
    ctx.stroke()

    ctx.beginPath()
    visitHoles((x, y) => {
      ctx.moveTo(x + HOLE_R, y)
      ctx.arc(x, y, HOLE_R, 0, Math.PI * 2)
    })
    ctx.fillStyle = "#070808"
    ctx.fill()

    ctx.beginPath()
    visitHoles((x, y) => {
      ctx.moveTo(x - 0.2, y - 0.4)
      ctx.arc(x - 0.75, y - 0.85, HOLE_R * 0.36, 0, Math.PI * 2)
    })
    ctx.fillStyle = "rgba(255,255,255,0.28)"
    ctx.fill()

    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    const halo = (trace: Trace, width: number, color: string) => {
      ctx.beginPath()
      const from = holeXY(trace.a.c, trace.a.r)
      const to = holeXY(trace.b.c, trace.b.r)
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.stroke()
    }
    if (model.tool === "select" && hoverTraceRef.current && hoverTraceRef.current !== model.selectedTraceId) {
      const hovered = model.traces.find((trace) => trace.id === hoverTraceRef.current)
      if (hovered) halo(hovered, isWire(hovered) ? WIRE + 3 : LANE + 6, "rgba(255,255,255,0.55)")
    }
    for (let index = 0; index < model.traces.length; index++) {
      const trace = model.traces[index]
      if (isWire(trace)) continue
      if (trace.id && trace.id === model.selectedTraceId) halo(trace, LANE + 8, "#fffef6")
      strokeLane(ctx, trace.a, trace.b, displayNetColor(model.traces, model.colorKeys, index))
    }
    for (let index = 0; index < model.traces.length; index++) {
      const trace = model.traces[index]
      if (!isWire(trace)) continue
      if (trace.id && trace.id === model.selectedTraceId) halo(trace, WIRE + 4, "#fffef6")
      strokeWire(ctx, trace.a, trace.b, displayNetColor(model.traces, model.colorKeys, index))
    }

    if (model.tool === "trace" && model.draftStart && hover && canCommit(model.draftStart, hover)) {
      const previewTraces = [...model.traces, { a: model.draftStart, b: hover }]
      const previewKeys = assignNets(previewTraces).colorKeys
      strokeLane(ctx, model.draftStart, hover, displayNetColor(previewTraces, previewKeys, previewTraces.length - 1))
    }
    if (model.tool === "wire" && model.draftStart && hover && !sameHole(model.draftStart, hover)) {
      const previewTraces = [...model.traces, { a: model.draftStart, b: hover, kind: "wire" as const }]
      const previewKeys = assignNets(previewTraces).colorKeys
      strokeWire(ctx, model.draftStart, hover, displayNetColor(previewTraces, previewKeys, previewTraces.length - 1))
    }

    const preview = movePreviewRef.current
    const displayPart = (part: PlacedPart) => (preview && part.id === preview.part.id ? preview.part : part)
    for (const part of model.parts) {
      const shown = displayPart(part)
      const dragging = preview?.part.id === part.id
      const selected = part.id === model.selectedPartId
      const hovered =
        model.tool === "select" && hoverPartRef.current === part.id && !selected && !dragging
      const halo = dragging
        ? preview?.valid
          ? "#fffef6"
          : "#e8a0a0"
        : selected
          ? "#fffef6"
          : hovered
            ? "rgba(255,255,255,0.72)"
            : null
      drawPartSymbol(ctx, shown, halo, !dragging && part.id === model.heldButtonId)
    }
    const axialPreview =
      isAxialTool(model.tool) &&
      model.draftStart != null &&
      hover != null &&
      canPlacePart(model.draftStart, hover) &&
      !holeOccupied(model.parts, hover)
    const headerPreview =
      isHeaderTool(model.tool) && model.draftStart != null && hover != null && canPlaceHeader(model.parts, model.draftStart, hover)
    if ((axialPreview || headerPreview) && model.draftStart && hover && model.tool !== "select" && model.tool !== "trace" && model.tool !== "wire") {
      drawPartSymbol(
        ctx,
        { id: "preview", kind: model.tool, name: "", value: "", a: model.draftStart, b: hover },
        null,
        false,
      )
    }
    if (model.tool === "potentiometer" && hover && potFits(model.cols, model.rows, model.parts, hover)) {
      drawPartSymbol(
        ctx,
        { id: "preview", kind: "potentiometer", name: "", value: "", a: hover, b: potPins(hover)[2].hole },
        null,
        false,
      )
    }
    if (model.tool === "crystal" && hover && crystalFits(model.cols, model.rows, model.parts, hover)) {
      drawPartSymbol(
        ctx,
        { id: "preview", kind: "crystal", name: "", value: "", a: hover, b: crystalPins(hover)[1].hole },
        null,
        false,
      )
    }
    if (model.tool === "button" && hover && buttonFits(model.cols, model.rows, model.parts, hover)) {
      drawPartSymbol(
        ctx,
        { id: "preview", kind: "button", name: "", value: "", a: hover, b: hover },
        null,
        false,
      )
    }
    if (model.tool === "ic" && hover && icFits(model.cols, model.rows, model.parts, hover, { pinCount: 8, railDistance: 0, rotation: 0 })) {
      drawPartSymbol(
        ctx,
        {
          id: "preview",
          kind: "ic",
          name: "",
          value: "",
          a: hover,
          b: hover,
          pinCount: 8,
          railDistance: 0,
          rotation: 0,
        },
        null,
        false,
      )
    }

    const punchHoles = () => {
      ctx.beginPath()
      visitHoles((x, y) => {
        ctx.moveTo(x + HOLE_R, y)
        ctx.arc(x, y, HOLE_R, 0, Math.PI * 2)
      })
      ctx.fillStyle = "#070808"
      ctx.fill()
    }
    punchHoles()

    const markHole = (hole: Hole, fill: string, ring: string, radius: number, width: number) => {
      const { x, y } = holeXY(hole.c, hole.r)
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = width
      ctx.strokeStyle = ring
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, HOLE_R, 0, Math.PI * 2)
      ctx.fillStyle = "#070808"
      ctx.fill()
    }

    if (model.tool === "wire") {
      if (model.draftStart && (!hover || !sameHole(hover, model.draftStart))) {
        markHole(model.draftStart, "rgba(255, 244, 204, 0.55)", "#fff4cc", HOVER_R, 4)
      }
      if (hover) {
        const legal = model.draftStart == null || !sameHole(model.draftStart, hover)
        markHole(
          hover,
          legal ? "rgba(255, 228, 64, 0.96)" : "rgba(255, 255, 255, 0.94)",
          "#fffef6",
          legal ? HOVER_R : 11,
          legal ? 4 : 2.5,
        )
      }
    } else if (model.tool === "trace") {
      if (model.draftStart && (!hover || !sameHole(hover, model.draftStart))) {
        markHole(model.draftStart, "rgba(255, 244, 204, 0.55)", "#fff4cc", HOVER_R, 4)
      }
      if (hover) {
        const offAxis =
          model.draftStart != null &&
          !sameHole(model.draftStart, hover) &&
          !canCommit(model.draftStart, hover)
        markHole(
          hover,
          offAxis ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 228, 64, 0.96)",
          "#fffef6",
          HOVER_R,
          4,
        )
      }
    } else if (
      isAxialTool(model.tool) ||
      isHeaderTool(model.tool) ||
      model.tool === "ic" ||
      model.tool === "button" ||
      model.tool === "potentiometer" ||
      model.tool === "crystal"
    ) {
      if (model.draftStart && isAxialTool(model.tool)) {
        const start = model.draftStart
        for (let row = Math.max(0, start.r - PART_REACH); row <= Math.min(model.rows - 1, start.r + PART_REACH); row++) {
          for (let col = Math.max(0, start.c - PART_REACH); col <= Math.min(model.cols - 1, start.c + PART_REACH); col++) {
            const hole = { c: col, r: row }
            if (!canPlacePart(start, hole) || holeOccupied(model.parts, hole)) continue
            if (hover && sameHole(hover, hole)) continue
            markHole(hole, "rgba(186, 230, 253, 0.28)", "rgba(224, 242, 254, 0.8)", 8, 1.5)
          }
        }
      }
      if (model.draftStart && (isAxialTool(model.tool) || isHeaderTool(model.tool)) && (!hover || !sameHole(hover, model.draftStart))) {
        markHole(model.draftStart, "rgba(255, 244, 204, 0.55)", "#fff4cc", HOVER_R, 4)
      }
      if (hover) {
        const legal = model.tool === "button"
          ? buttonFits(model.cols, model.rows, model.parts, hover)
          : model.tool === "potentiometer"
            ? potFits(model.cols, model.rows, model.parts, hover)
            : model.tool === "crystal"
              ? crystalFits(model.cols, model.rows, model.parts, hover)
              : isHeaderTool(model.tool)
            ? model.draftStart != null && canPlaceHeader(model.parts, model.draftStart, hover)
            : model.tool === "ic"
              ? icFits(model.cols, model.rows, model.parts, hover, { pinCount: 8, railDistance: 0, rotation: 0 })
              : model.draftStart != null && canPlacePart(model.draftStart, hover) && !holeOccupied(model.parts, hover)
        markHole(
          hover,
          legal ? "rgba(255, 228, 64, 0.96)" : "rgba(255,255,255,0.45)",
          "#fffef8",
          legal ? HOVER_R : 11,
          legal ? 4 : 2.5,
        )
      }
    } else {
      if (model.selectedHole && (!hover || !sameHole(hover, model.selectedHole))) {
        markHole(model.selectedHole, "rgba(255, 236, 170, 0.72)", "#fff4cc", 12, 3)
      }
      if (hover) markHole(hover, "rgba(255,255,255,0.38)", "#fffef8", 11, 2.5)
    }

    ctx.save()
    for (const part of model.parts.map((item) => (preview && item.id === preview.part.id ? preview.part : item))) {
      if (part.kind === "ic") {
        const config = readIcConfig(part)
        const anchor = holeXY(part.a.c, part.a.r)
        const pins = icPins(part.a, config.pinCount, config.railDistance, config.rotation) ?? []
        const perRail = config.pinCount / 2
        const { across } = icDirections(config.rotation)
        for (const pin of pins) {
          const at = holeXY(pin.hole.c, pin.hole.r)
          const sign = pin.number > perRail ? 1 : -1
          const ox = across.dc * sign
          const oy = across.dr * sign
          const align: CanvasTextAlign = ox < 0 ? "right" : ox > 0 ? "left" : "center"
          const baseline: CanvasTextBaseline = oy < 0 ? "bottom" : oy > 0 ? "top" : "middle"
          paintUprightText(ctx, String(pin.number), at.x + ox * 12, at.y + oy * 12, 10, baseline, align)
          const pinLabel = config.pinLabels[pin.number - 1]
          if (pinLabel) {
            paintUprightText(ctx, pinLabel, at.x + ox * 26, at.y + oy * 26, 10, baseline, align)
          }
        }
        if (part.name) {
          const top = icLabelTop(anchor.x, anchor.y, config.pinCount, config.railDistance, config.rotation)
          paintUprightText(ctx, part.name, top.x, top.y - 8, 12, "bottom", "center")
        }
        continue
      }
      if (part.kind === "button") {
        if (part.name) {
          const anchor = holeXY(part.a.c, part.a.r)
          const top = buttonLabelTop(anchor.x, anchor.y, part.rotation ?? 0)
          paintUprightText(ctx, part.name, top.x, top.y - 8, 12, "bottom", "center")
        }
        continue
      }
      if (part.kind === "potentiometer" || part.kind === "crystal") {
        if (part.name || part.value) {
          const anchor = holeXY(part.a.c, part.a.r)
          const box = part.kind === "potentiometer" ? POT_BODY : CRYSTAL_BODY
          const top = fixedLabelTop(anchor.x, anchor.y, part.rotation ?? 0, box)
          const lines = part.value ? [part.name, part.value] : [part.name]
          let baseline = top.y - 8
          for (let index = lines.length - 1; index >= 0; index -= 1) {
            if (!lines[index]) continue
            paintUprightText(ctx, lines[index], top.x, baseline, 12, "bottom", "center")
            baseline -= 13
          }
        }
        continue
      }
      if (!part.name) continue
      const from = holeXY(part.a.c, part.a.r)
      const to = holeXY(part.b.c, part.b.r)
      let midX = (from.x + to.x) / 2
      let topY = Math.min(from.y, to.y)
      if (part.kind === "male-header" || part.kind === "female-header") {
        const top = headerLabelTop(from.x, from.y, to.x, to.y, part.kind === "male-header")
        if (!top) continue
        midX = top.x
        topY = top.y
      } else {
        const span = Math.hypot(to.x - from.x, to.y - from.y)
        const midY = (from.y + to.y) / 2
        const { along, across } = componentSilhouette(part.kind, part.polarized, span)
        const angle = Math.atan2(to.y - from.y, to.x - from.x)
        const bodyTop = midY - Math.hypot(along * Math.sin(angle), across * Math.cos(angle))
        topY = Math.min(bodyTop, from.y, to.y)
      }
      const lines = part.value ? [part.name, part.value] : [part.name]
      const lineHeight = 13
      let baseline = topY - 8
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        paintUprightText(ctx, lines[index], midX, baseline, 12, "bottom", "center")
        baseline -= lineHeight
      }
    }
    ctx.restore()

    if (PITCH * view.zoom >= 16) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.font = "11px var(--font-geist-sans), sans-serif"
      ctx.fillStyle = "rgba(255,255,255,0.78)"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      for (let col = c0; col <= c1; col++) {
        const hole = holeXY(col, 0)
        const sx = view.panX + hole.x * view.zoom
        const sy = view.panY + hole.y * view.zoom - (PAD_R * view.zoom + 11)
        if (sy < 8 || sy > h - 8 || sx < 8 || sx > w - 8) continue
        ctx.fillText(String(col + 1), sx, sy)
      }
      ctx.textAlign = "right"
      for (let row = r0; row <= r1; row++) {
        const hole = holeXY(0, row)
        const sx = view.panX + hole.x * view.zoom - (PAD_R * view.zoom + 12)
        const sy = view.panY + hole.y * view.zoom
        if (sx < 10 || sy < 8 || sy > h - 8) continue
        ctx.fillText(String(row + 1), sx, sy)
      }
    }
  }, [ensureFit])

  const drawRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    modelRef.current = {
      cols,
      rows,
      traces,
      colorKeys,
      parts,
      tool,
      draftStart,
      selectedTraceId,
      selectedPartId,
      selectedHole,
      heldButtonId,
      onHoleClick,
      onSelect,
      onHoldButton,
      onMovePart,
    }
    drawRef.current = draw
    draw()
  }, [cols, rows, traces, colorKeys, parts, tool, draftStart, selectedTraceId, selectedPartId, selectedHole, heldButtonId, onHoleClick, onSelect, onHoldButton, onMovePart, draw])

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    const resize = () => {
      const width = frame.clientWidth
      const height = frame.clientHeight
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = { w: width, h: height, dpr }
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      drawRef.current()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(frame)
    resize()

    const localFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    }

    const pointers = new Map<number, { x: number; y: number }>()
    let pan: PanGesture | null = null
    let pinch: PinchGesture | null = null
    let swallowClick = false
    let pressingId: string | null = null
    let moving: MoveGesture | null = null

    const gridHole = (worldX: number, worldY: number): Hole => ({
      c: Math.round((worldX - MARGIN) / PITCH),
      r: Math.round((worldY - MARGIN) / PITCH),
    })

    const buttonAt = (localX: number, localY: number) => {
      const view = viewRef.current
      const worldX = (localX - view.panX) / view.zoom
      const worldY = (localY - view.panY) / view.zoom
      return hitButton(worldX, worldY, modelRef.current.parts)
    }

    const releaseHold = () => {
      if (pressingId == null) return
      pressingId = null
      modelRef.current.onHoldButton(null)
    }

    const publishHover = (hole: Hole | null) => {
      const previous = hoverRef.current
      const unchanged =
        (previous == null && hole == null) ||
        (previous != null && hole != null && sameHole(previous, hole))
      if (unchanged) return
      hoverRef.current = hole
      const model = modelRef.current
      const draft = model.draftStart
      const offAxis =
        hole != null &&
        draft != null &&
        !sameHole(draft, hole) &&
        !canCommit(draft, hole) &&
        (model.tool === "trace" || isHeaderTool(model.tool))
      let partNote = ""
      if (isAxialTool(model.tool) && hole != null && draft != null && !sameHole(draft, hole)) {
        partNote = holeOccupied(model.parts, hole)
          ? " — pin in use"
          : canPlacePart(draft, hole)
            ? ""
            : " — out of reach"
      } else if (isHeaderTool(model.tool) && hole != null && draft != null && !sameHole(draft, hole) && canCommit(draft, hole)) {
        partNote = canPlaceHeader(model.parts, draft, hole) ? "" : " — pin in use"
      } else if (model.tool === "ic" && hole != null && !icFits(model.cols, model.rows, model.parts, hole, { pinCount: 8, railDistance: 0, rotation: 0 })) {
        partNote = " — does not fit"
      } else if (model.tool === "button" && hole != null && !buttonFits(model.cols, model.rows, model.parts, hole)) {
        partNote = " — does not fit"
      }
      setStatus(
        hole
          ? offAxis
            ? `Column ${hole.c + 1}, row ${hole.r + 1} — not on this row or column`
            : `Column ${hole.c + 1}, row ${hole.r + 1}${partNote}`
          : "Drag empty board to pan. Scroll or pinch to zoom.",
      )
    }

    const syncHover = (localX: number, localY: number) => {
      const model = modelRef.current
      const view = viewRef.current
      if (model.tool === "select") {
        const pick = resolveSelect(localX, localY, view, model.cols, model.rows, model.traces, model.parts)
        const hole = pick?.type === "hole" ? pick.hole : null
        const traceId = pick?.type === "trace" ? pick.id : null
        const partId = pick?.type === "component" ? pick.id : null
        const previous = hoverRef.current
        const holeChanged =
          (previous == null) !== (hole == null) ||
          (previous != null && hole != null && !sameHole(previous, hole))
        const traceChanged = hoverTraceRef.current !== traceId
        const partChanged = hoverPartRef.current !== partId
        hoverRef.current = hole
        hoverTraceRef.current = traceId
        hoverPartRef.current = partId
        if (holeChanged) {
          setStatus(
            hole
              ? `Column ${hole.c + 1}, row ${hole.r + 1}`
              : "Drag empty board to pan. Scroll or pinch to zoom.",
          )
        }
        if (holeChanged || traceChanged || partChanged) drawRef.current()
        return
      }

      const traceWasHovered = hoverTraceRef.current != null || hoverPartRef.current != null
      hoverTraceRef.current = null
      hoverPartRef.current = null
      const hole = hitHole(localX, localY, view, model.cols, model.rows)
      const previous = hoverRef.current
      publishHover(hole)
      const changed =
        (previous == null && hole != null) ||
        (previous != null && hole == null) ||
        (previous != null && hole != null && !sameHole(previous, hole))
      if (changed || traceWasHovered || model.draftStart) drawRef.current()
    }

    const startPinch = () => {
      const points = [...pointers.values()]
      if (points.length < 2) return
      const [a, b] = points
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance < 1) return
      const mid = localFromClient((a.x + b.x) / 2, (a.y + b.y) / 2)
      const view = viewRef.current
      pinch = {
        startDist: distance,
        startZoom: view.zoom,
        worldX: (mid.x - view.panX) / view.zoom,
        worldY: (mid.y - view.panY) / view.zoom,
      }
      pan = null
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      canvas.setPointerCapture(event.pointerId)
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size >= 2) {
        swallowClick = false
        releaseHold()
        moving = null
        movePreviewRef.current = null
        startPinch()
        return
      }
      const local = localFromClient(event.clientX, event.clientY)
      const view = viewRef.current
      const worldX = (local.x - view.panX) / view.zoom
      const worldY = (local.y - view.panY) / view.zoom
      const model = modelRef.current
      const grabbed = hitPart(worldX, worldY, model.parts)
      if (model.tool === "select" && grabbed && grabbed.id === model.selectedPartId) {
        moving = {
          pointerId: event.pointerId,
          partId: grabbed.id,
          originHole: gridHole(worldX, worldY),
          moved: false,
        }
        canvas.style.cursor = "grabbing"
        if (grabbed.kind === "button") {
          swallowClick = true
          pressingId = grabbed.id
          model.onHoldButton(grabbed.id)
          pan = {
            id: event.pointerId,
            lastX: event.clientX,
            lastY: event.clientY,
            originX: event.clientX,
            originY: event.clientY,
            moved: false,
            hole: null,
          }
        }
        return
      }
      const buttonId = buttonAt(local.x, local.y)
      if (buttonId) {
        swallowClick = true
        pressingId = buttonId
        modelRef.current.onHoldButton(buttonId)
        pan = {
          id: event.pointerId,
          lastX: event.clientX,
          lastY: event.clientY,
          originX: event.clientX,
          originY: event.clientY,
          moved: false,
          hole: null,
        }
        return
      }
      pan = {
        id: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
        originX: event.clientX,
        originY: event.clientY,
        moved: false,
        hole: hitHole(local.x, local.y, viewRef.current, modelRef.current.cols, modelRef.current.rows),
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const tracked = pointers.has(event.pointerId)
      if (tracked) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (tracked && pointers.size >= 2 && pinch) {
        const points = [...pointers.values()]
        const [a, b] = points
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = localFromClient((a.x + b.x) / 2, (a.y + b.y) / 2)
        const nextZoom = clamp(
          pinch.startZoom * (distance / pinch.startDist),
          boundsRef.current.min,
          boundsRef.current.max,
        )
        viewRef.current = {
          zoom: nextZoom,
          panX: mid.x - pinch.worldX * nextZoom,
          panY: mid.y - pinch.worldY * nextZoom,
        }
        drawRef.current()
        return
      }

      if (moving && tracked && moving.pointerId === event.pointerId && pointers.size < 2) {
        const local = localFromClient(event.clientX, event.clientY)
        const view = viewRef.current
        const worldX = (local.x - view.panX) / view.zoom
        const worldY = (local.y - view.panY) / view.zoom
        const hole = gridHole(worldX, worldY)
        const dc = hole.c - moving.originHole.c
        const dr = hole.r - moving.originHole.r
        if (dc === 0 && dr === 0) {
          if (moving.moved) {
            movePreviewRef.current = null
            drawRef.current()
          } else if (pressingId && buttonAt(local.x, local.y) !== pressingId) {
            releaseHold()
          }
          return
        }
        if (!moving.moved) {
          moving.moved = true
          releaseHold()
        }
        const partId = moving.partId
        const original = modelRef.current.parts.find((part) => part.id === partId)
        if (!original) return
        const next = translatePart(original, dc, dr)
        const valid = partFits(modelRef.current.cols, modelRef.current.rows, modelRef.current.parts, next)
        movePreviewRef.current = { part: next, valid }
        setStatus(valid ? `Column ${next.a.c + 1}, row ${next.a.r + 1}` : "Does not fit")
        drawRef.current()
        return
      }

      if (swallowClick && tracked && pan && pan.id === event.pointerId) {
        if (pressingId) {
          const local = localFromClient(event.clientX, event.clientY)
          if (buttonAt(local.x, local.y) !== pressingId) releaseHold()
        }
        return
      }

      if (tracked && pan && pan.id === event.pointerId) {
        const dx = event.clientX - pan.originX
        const dy = event.clientY - pan.originY
        if (!pan.moved && dx * dx + dy * dy > 36) {
          pan.moved = true
          canvas.style.cursor = "grabbing"
        }
        if (pan.moved) {
          viewRef.current = {
            ...viewRef.current,
            panX: viewRef.current.panX + (event.clientX - pan.lastX),
            panY: viewRef.current.panY + (event.clientY - pan.lastY),
          }
          pan.lastX = event.clientX
          pan.lastY = event.clientY
          drawRef.current()
          return
        }
      }

      const local = localFromClient(event.clientX, event.clientY)
      syncHover(local.x, local.y)
    }

    const endPointer = (event: PointerEvent, commitClick: boolean) => {
      pointers.delete(event.pointerId)
      if (moving && moving.pointerId === event.pointerId) {
        const gesture = moving
        const preview = movePreviewRef.current
        moving = null
        movePreviewRef.current = null
        if (gesture.moved) {
          swallowClick = false
          releaseHold()
          if (pan?.id === event.pointerId) pan = null
          const model = modelRef.current
          if (commitClick && preview?.valid) model.onMovePart(gesture.partId, preview.part.a, preview.part.b)
          canvas.style.cursor = model.tool === "select" ? "default" : "crosshair"
          drawRef.current()
        } else if (!swallowClick && commitClick) {
          const local = localFromClient(event.clientX, event.clientY)
          const model = modelRef.current
          model.onSelect(
            resolveSelect(local.x, local.y, viewRef.current, model.cols, model.rows, model.traces, model.parts),
          )
          canvas.style.cursor = "default"
        }
      }
      const activePan = pan
      if (activePan && activePan.id === event.pointerId) {
        const model = modelRef.current
        if (swallowClick) {
          const selectIt = commitClick && !activePan.moved && model.tool === "select"
          swallowClick = false
          pressingId = null
          model.onHoldButton(null)
          if (selectIt) {
            const local = localFromClient(event.clientX, event.clientY)
            model.onSelect(
              resolveSelect(local.x, local.y, viewRef.current, model.cols, model.rows, model.traces, model.parts),
            )
          }
        } else if (commitClick && !activePan.moved) {
          const local = localFromClient(event.clientX, event.clientY)
          if (model.tool === "trace" || model.tool === "wire" || isPartTool(model.tool)) {
            const hole =
              hitHole(local.x, local.y, viewRef.current, model.cols, model.rows) ?? activePan.hole
            if (hole) model.onHoleClick(hole)
          } else {
            model.onSelect(
              resolveSelect(
                local.x,
                local.y,
                viewRef.current,
                model.cols,
                model.rows,
                model.traces,
                model.parts,
              ),
            )
          }
        }
        pan = null
        canvas.style.cursor = modelRef.current.tool === "select" ? "default" : "crosshair"
      }
      if (pointers.size < 2) pinch = null
      if (pointers.size === 1) {
        const [id, point] = [...pointers.entries()][0]
        pan = {
          id,
          lastX: point.x,
          lastY: point.y,
          originX: point.x,
          originY: point.y,
          moved: true,
          hole: null,
        }
      }
      const local = localFromClient(event.clientX, event.clientY)
      syncHover(local.x, local.y)
    }

    const onPointerUp = (event: PointerEvent) => endPointer(event, true)
    const onPointerCancel = (event: PointerEvent) => endPointer(event, false)

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      let delta = event.deltaY
      if (event.deltaMode === 1) delta *= 16
      if (event.deltaMode === 2) delta *= 400
      const local = localFromClient(event.clientX, event.clientY)
      const view = viewRef.current
      const nextZoom = clamp(
        view.zoom * Math.exp(-delta * 0.0015),
        boundsRef.current.min,
        boundsRef.current.max,
      )
      const worldX = (local.x - view.panX) / view.zoom
      const worldY = (local.y - view.panY) / view.zoom
      viewRef.current = {
        zoom: nextZoom,
        panX: local.x - worldX * nextZoom,
        panY: local.y - worldY * nextZoom,
      }
      drawRef.current()
    }

    const onPointerLeave = () => {
      if (moving?.moved) return
      releaseHold()
      if (pan?.moved || pinch) return
      hoverTraceRef.current = null
      hoverPartRef.current = null
      publishHover(null)
      drawRef.current()
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("pointercancel", onPointerCancel)
    canvas.addEventListener("pointerleave", onPointerLeave)
    canvas.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      observer.disconnect()
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointercancel", onPointerCancel)
      canvas.removeEventListener("pointerleave", onPointerLeave)
      canvas.removeEventListener("wheel", onWheel)
    }
  }, [])

  function zoomBy(factor: number) {
    const { w, h } = sizeRef.current
    const view = viewRef.current
    const nextZoom = clamp(view.zoom * factor, boundsRef.current.min, boundsRef.current.max)
    const localX = w / 2
    const localY = h / 2
    const worldX = (localX - view.panX) / view.zoom
    const worldY = (localY - view.panY) / view.zoom
    viewRef.current = {
      zoom: nextZoom,
      panX: localX - worldX * nextZoom,
      panY: localY - worldY * nextZoom,
    }
    drawRef.current()
  }

  return (
    <div ref={frameRef} className="absolute inset-0 bg-[#14120f]">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        aria-label={canvasLabel(tool)}
      />
      <div className="pointer-events-none absolute inset-0">
        <p className="absolute bottom-3 left-3 max-w-[calc(50%-4.5rem)] rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          {status}
        </p>
        <div className="pointer-events-auto absolute right-3 bottom-3 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-w-11"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / 1.2)}
          >
            −
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 min-w-11"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.2)}
          >
            +
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            onClick={() => {
              viewRef.current = { ...fitRef.current }
              drawRef.current()
            }}
          >
            Fit
          </Button>
        </div>
      </div>
    </div>
  )
}
