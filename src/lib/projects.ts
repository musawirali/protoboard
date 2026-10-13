import type { Hole, Trace } from "./board"
import { MAX_DIMENSION, MIN_DIMENSION } from "./grid"
import type { ComponentKind, IcRotation, PlacedPart } from "./parts"

export const PROJECTS_KEY = "protoboard.projects"

export type SavedProject = {
  id: string
  name: string
  cols: number
  rows: number
  updatedAt: number
  traces: Trace[]
  parts: PlacedPart[]
}

const COMPONENT_KINDS = new Set<ComponentKind>([
  "resistor",
  "capacitor",
  "diode",
  "led",
  "button",
  "potentiometer",
  "crystal",
  "male-header",
  "female-header",
  "ic",
])

const ROTATIONS = new Set<IcRotation>([0, 90, 180, 270])

export function sortProjects(projects: readonly SavedProject[]) {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
}

export function formatUpdated(ms: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isHole(value: unknown): value is Hole {
  if (!isRecord(value)) return false
  return Number.isInteger(value.c) && Number.isInteger(value.r) && Number(value.c) >= 0 && Number(value.r) >= 0
}

function isDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_DIMENSION && value <= MAX_DIMENSION
}

function parseTrace(value: unknown): Trace | null {
  if (!isRecord(value) || !isHole(value.a) || !isHole(value.b)) return null
  const trace: Trace = { a: { c: value.a.c, r: value.a.r }, b: { c: value.b.c, r: value.b.r } }
  if (typeof value.id === "string") return withTraceExtras({ ...trace, id: value.id }, value)
  return withTraceExtras(trace, value)
}

function withTraceExtras(trace: Trace, value: Record<string, unknown>): Trace | null {
  let next = trace
  if (value.kind !== undefined) {
    if (value.kind !== "wire") return null
    next = { ...next, kind: "wire" }
  }
  if (value.name !== undefined) {
    if (typeof value.name !== "string") return null
    next = { ...next, name: value.name }
  }
  if (value.color !== undefined) {
    if (typeof value.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.color)) return null
    next = { ...next, color: value.color.toLowerCase() }
  }
  return next
}

function parsePart(value: unknown): PlacedPart | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) return null
  if (typeof value.kind !== "string" || !COMPONENT_KINDS.has(value.kind as ComponentKind)) return null
  if (!isHole(value.a) || !isHole(value.b)) return null
  if (typeof value.name !== "string" || typeof value.value !== "string") return null
  if (value.polarized !== undefined && typeof value.polarized !== "boolean") return null
  if (value.pinCount !== undefined && typeof value.pinCount !== "number") return null
  if (value.railDistance !== undefined && typeof value.railDistance !== "number") return null
  if (value.rotation !== undefined && !ROTATIONS.has(value.rotation as IcRotation)) return null
  if (
    value.pinLabels !== undefined &&
    (!Array.isArray(value.pinLabels) || value.pinLabels.some((label) => typeof label !== "string"))
  ) {
    return null
  }
  return {
    id: value.id,
    kind: value.kind as ComponentKind,
    a: { c: value.a.c, r: value.a.r },
    b: { c: value.b.c, r: value.b.r },
    name: value.name,
    value: value.value,
    ...(typeof value.polarized === "boolean" ? { polarized: value.polarized } : {}),
    ...(typeof value.pinCount === "number" ? { pinCount: value.pinCount } : {}),
    ...(typeof value.railDistance === "number" ? { railDistance: value.railDistance } : {}),
    ...(value.rotation !== undefined ? { rotation: value.rotation as IcRotation } : {}),
    ...(Array.isArray(value.pinLabels) ? { pinLabels: value.pinLabels.filter((label) => typeof label === "string") } : {}),
  }
}

function parseProject(value: unknown): SavedProject | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || !value.id) return null
  if (typeof value.name !== "string" || !value.name.trim()) return null
  if (!isDimension(value.cols) || !isDimension(value.rows)) return null
  if (typeof value.updatedAt !== "number" || !Number.isFinite(value.updatedAt)) return null
  if (!Array.isArray(value.traces) || !Array.isArray(value.parts)) return null
  const traces: Trace[] = []
  for (const trace of value.traces) {
    const parsed = parseTrace(trace)
    if (!parsed) return null
    traces.push(parsed)
  }
  const parts: PlacedPart[] = []
  for (const part of value.parts) {
    const parsed = parsePart(part)
    if (!parsed) return null
    parts.push(parsed)
  }
  return {
    id: value.id,
    name: value.name.trim(),
    cols: value.cols,
    rows: value.rows,
    updatedAt: value.updatedAt,
    traces,
    parts,
  }
}

export function parseProjects(value: unknown): SavedProject[] {
  if (!Array.isArray(value)) return []
  const projects: SavedProject[] = []
  for (const item of value) {
    const parsed = parseProject(item)
    if (parsed) projects.push(parsed)
  }
  return sortProjects(projects)
}

export function loadProjects(storage: Pick<Storage, "getItem">): SavedProject[] {
  try {
    const raw = storage.getItem(PROJECTS_KEY)
    if (!raw) return []
    return parseProjects(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveProjects(storage: Pick<Storage, "setItem">, projects: readonly SavedProject[]) {
  storage.setItem(PROJECTS_KEY, JSON.stringify(sortProjects(projects)))
}

const EMPTY_PROJECTS: SavedProject[] = []
const listeners = new Set<() => void>()
let cached: SavedProject[] | null = null

export function subscribeProjects(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProjectSnapshot() {
  if (!cached) cached = loadProjects(localStorage)
  return cached
}

export function getServerProjectSnapshot() {
  return EMPTY_PROJECTS
}

export function replaceProjects(projects: readonly SavedProject[]) {
  cached = sortProjects(projects)
  saveProjects(localStorage, cached)
  listeners.forEach((listener) => listener())
}

export function sameBoard(left: SavedProject, right: Pick<SavedProject, "name" | "cols" | "rows" | "traces" | "parts">) {
  return (
    left.name === right.name &&
    left.cols === right.cols &&
    left.rows === right.rows &&
    JSON.stringify(left.traces) === JSON.stringify(right.traces) &&
    JSON.stringify(left.parts) === JSON.stringify(right.parts)
  )
}
