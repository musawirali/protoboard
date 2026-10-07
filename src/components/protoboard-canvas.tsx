"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { canCommit, sameHole, type Hole, type Trace } from "@/lib/board"
import { assignNets, netColor } from "@/lib/nets"
import { componentHitRadius, drawComponent } from "@/lib/part-art"
import { canPlacePart, holeOccupied, PART_REACH, type PlacedPart } from "@/lib/parts"
import { isPartTool, type Selection, type ToolName } from "@/lib/selection"

const PITCH = 28
const MARGIN = 36
const PAD_R = 5.6
const HOLE_R = 3.15
const LANE = 22
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
  onHoleClick: (hole: Hole) => void
  onSelect: (selection: Selection | null) => void
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

function strokeLane(
  ctx: CanvasRenderingContext2D,
  start: Hole,
  end: Hole,
  color: string,
) {
  const from = holeXY(start.c, start.r)
  const to = holeXY(end.c, end.r)
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = color
  ctx.lineWidth = LANE
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.stroke()
}

function drawPartSymbol(ctx: CanvasRenderingContext2D, part: PlacedPart, halo: string | null) {
  const from = holeXY(part.a.c, part.a.r)
  const to = holeXY(part.b.c, part.b.r)
  drawComponent(ctx, part.kind, part.polarized, from.x, from.y, to.x, to.y, halo)
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

function hitTraceIndex(worldX: number, worldY: number, traces: readonly Trace[]) {
  let best: { index: number; distance: number } | null = null
  const limit = LANE / 2 + 1
  for (let index = 0; index < traces.length; index++) {
    const trace = traces[index]
    const from = holeXY(trace.a.c, trace.a.r)
    const to = holeXY(trace.b.c, trace.b.r)
    const distance = distanceToSegment(worldX, worldY, from.x, from.y, to.x, to.y)
    if (distance <= limit && (best == null || distance < best.distance)) {
      best = { index, distance }
    }
  }
  return best?.index ?? null
}

function hitPart(worldX: number, worldY: number, parts: readonly PlacedPart[]) {
  let best: { part: PlacedPart; distance: number } | null = null
  for (const part of parts) {
    const from = holeXY(part.a.c, part.a.r)
    const to = holeXY(part.b.c, part.b.r)
    const span = Math.hypot(to.x - from.x, to.y - from.y)
    const distance = distanceToSegment(worldX, worldY, from.x, from.y, to.x, to.y)
    const limit = componentHitRadius(part.kind, part.polarized, span)
    if (distance <= limit && (best == null || distance < best.distance)) best = { part, distance }
  }
  return best?.part
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
  const traceIndex = hitTraceIndex(worldX, worldY, traces)
  const trace = traceIndex == null ? undefined : traces[traceIndex]
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
  onHoleClick,
  onSelect,
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
    onHoleClick,
    onSelect,
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
      if (hovered) halo(hovered, LANE + 6, "rgba(255,255,255,0.55)")
    }
    for (let index = 0; index < model.traces.length; index++) {
      const trace = model.traces[index]
      if (trace.id && trace.id === model.selectedTraceId) halo(trace, LANE + 8, "#fffef6")
      strokeLane(ctx, trace.a, trace.b, netColor(model.colorKeys[index] ?? index))
    }

    if (model.tool === "trace" && model.draftStart && hover && canCommit(model.draftStart, hover)) {
      const previewTraces = [...model.traces, { a: model.draftStart, b: hover }]
      const previewKey = assignNets(previewTraces).colorKeys[previewTraces.length - 1] ?? 0
      strokeLane(ctx, model.draftStart, hover, netColor(previewKey))
    }

    for (const part of model.parts) {
      const selected = part.id === model.selectedPartId
      const hovered =
        model.tool === "select" && hoverPartRef.current === part.id && !selected
      const halo = selected ? "#fffef6" : hovered ? "rgba(255,255,255,0.72)" : null
      drawPartSymbol(ctx, part, halo)
    }
    const previewLegal =
      isPartTool(model.tool) &&
      model.draftStart != null &&
      hover != null &&
      canPlacePart(model.draftStart, hover) &&
      !holeOccupied(model.parts, hover)
    if (previewLegal && model.draftStart && hover && isPartTool(model.tool)) {
      drawPartSymbol(ctx, { id: "preview", kind: model.tool, a: model.draftStart, b: hover }, null)
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

    if (model.tool === "trace") {
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
    } else if (isPartTool(model.tool)) {
      if (model.draftStart) {
        const start = model.draftStart
        for (let row = Math.max(0, start.r - PART_REACH); row <= Math.min(model.rows - 1, start.r + PART_REACH); row++) {
          for (let col = Math.max(0, start.c - PART_REACH); col <= Math.min(model.cols - 1, start.c + PART_REACH); col++) {
            const hole = { c: col, r: row }
            if (!canPlacePart(start, hole) || holeOccupied(model.parts, hole)) continue
            if (hover && sameHole(hover, hole)) continue
            markHole(hole, "rgba(186, 230, 253, 0.28)", "rgba(224, 242, 254, 0.8)", 8, 1.5)
          }
        }
        if (!hover || !sameHole(hover, start)) {
          markHole(start, "rgba(255, 244, 204, 0.55)", "#fff4cc", HOVER_R, 4)
        }
      }
      if (hover) {
        const legal =
          model.draftStart != null &&
          canPlacePart(model.draftStart, hover) &&
          !holeOccupied(model.parts, hover)
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
      onHoleClick,
      onSelect,
    }
    drawRef.current = draw
    draw()
  }, [cols, rows, traces, colorKeys, parts, tool, draftStart, selectedTraceId, selectedPartId, selectedHole, onHoleClick, onSelect, draw])

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
        model.tool === "trace" &&
        hole != null &&
        draft != null &&
        !sameHole(draft, hole) &&
        !canCommit(draft, hole)
      const partNote =
        isPartTool(model.tool) && hole != null && draft != null && !sameHole(draft, hole)
          ? holeOccupied(model.parts, hole)
            ? " — pin in use"
            : canPlacePart(draft, hole)
              ? ""
              : " — out of reach"
          : ""
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
        startPinch()
        return
      }
      const local = localFromClient(event.clientX, event.clientY)
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
      const activePan = pan
      if (activePan && activePan.id === event.pointerId) {
        if (commitClick && !activePan.moved) {
          const local = localFromClient(event.clientX, event.clientY)
          const model = modelRef.current
          if (model.tool === "trace" || isPartTool(model.tool)) {
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
        aria-label={
          tool === "trace"
            ? "Protoboard pin grid. PCB Trace is selected. Click a hole to start, then a hole on the same row or column to commit a trace. Drag empty board to pan."
            : isPartTool(tool)
              ? `Protoboard pin grid. ${tool === "led" ? "LED" : `${tool[0].toUpperCase()}${tool.slice(1)}`} is selected. Click two pin holes within 4 steps. Drag empty board to pan.`
              : "Protoboard pin grid. Select is active. Click a trace, component, or pin hole. Click empty board to clear the selection. Drag empty board to pan."
        }
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
