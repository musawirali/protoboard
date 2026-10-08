import { holeOnSegment, sameHole, segmentsConnect, type Hole, type Trace } from "./board"

/** Two holes shorted while a switch is held. Not stored on the board. */
export type NetLink = {
  readonly a: Hole
  readonly b: Hole
}

export type NetAssignment = {
  /** 1-based label per trace. Traces in one connected net share a label. */
  labels: number[]
  /** Oldest trace index in that trace's net. Stable key for the net color. */
  colorKeys: number[]
  netCount: number
}

/**
 * Connected components of PCB traces and wires. Two PCB traces are one net
 * when their hole spans share any pin. A wire joins only at its two ends:
 * a shared end, or an end that lies on a hole another segment already joins.
 * A hole the wire merely crosses stays off that net. A bare diagonal trace
 * still covers no holes. The earliest segment stays
 * the root so the color does not move when a later segment joins.
 * A link joins only the traces that already cover its two holes. It does
 * not short holes the switch body crosses or spans between those pins.
 */
export function assignNets(traces: readonly Trace[], links: readonly NetLink[] = []): NetAssignment {
  const count = traces.length
  const parent = Array.from({ length: count }, (_, index) => index)

  const find = (index: number) => {
    let root = index
    while (parent[root] !== root) root = parent[root]
    let cursor = index
    while (parent[cursor] !== root) {
      const next = parent[cursor]
      parent[cursor] = root
      cursor = next
    }
    return root
  }

  const union = (left: number, right: number) => {
    const rootLeft = find(left)
    const rootRight = find(right)
    if (rootLeft === rootRight) return
    if (rootLeft < rootRight) parent[rootRight] = rootLeft
    else parent[rootLeft] = rootRight
  }

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (segmentsConnect(traces[i], traces[j])) union(i, j)
    }
  }

  for (const link of links) {
    let anchor = -1
    for (let index = 0; index < count; index++) {
      if (!holeOnSegment(traces[index], link.a) && !holeOnSegment(traces[index], link.b)) continue
      if (anchor < 0) anchor = index
      else union(anchor, index)
    }
  }

  const labels = new Array<number>(count)
  const colorKeys = new Array<number>(count)
  const labelByRoot = new Map<number, number>()
  let netCount = 0

  for (let i = 0; i < count; i++) {
    const root = find(i)
    let label = labelByRoot.get(root)
    if (label === undefined) {
      netCount += 1
      label = netCount
      labelByRoot.set(root, label)
    }
    labels[i] = label
    colorKeys[i] = root
  }

  return { labels, colorKeys, netCount }
}

/** Trace whose net this hole is on. A closed link lets a bare pin read the other pin's net. */
export function traceIndexAtHole(traces: readonly Trace[], hole: Hole, links: readonly NetLink[] = []) {
  const direct = traces.findIndex((trace) => holeOnSegment(trace, hole))
  if (direct >= 0) return direct
  for (const link of links) {
    const other = sameHole(hole, link.a) ? link.b : sameHole(hole, link.b) ? link.a : null
    if (!other) continue
    const via = traces.findIndex((trace) => holeOnSegment(trace, other))
    if (via >= 0) return via
  }
  return -1
}

const NET_PALETTE = [
  "#ffe14a",
  "#ff4d6d",
  "#3ee0e0",
  "#ff9f1c",
  "#e599f7",
  "#f8f9fa",
  "#d6ff4a",
  "#ff7b54",
  "#74c0fc",
  "#f06595",
  "#ffd43b",
  "#63e6be",
]

/** Name shown for a trace's net: a custom name on that net, or "Net N". */
export function displayNetName(
  traces: readonly Trace[],
  colorKeys: readonly number[],
  labels: readonly number[],
  index: number,
) {
  const colorKey = colorKeys[index]
  const label = labels[index]
  if (colorKey == null || label == null) return "Net"
  const rootName = traces[colorKey]?.name?.trim()
  if (rootName) return rootName
  for (let member = 0; member < traces.length; member++) {
    if (colorKeys[member] !== colorKey) continue
    const named = traces[member]?.name?.trim()
    if (named) return named
  }
  return `Net ${label}`
}

export function netColor(colorKey: number) {
  if (colorKey >= 0 && colorKey < NET_PALETTE.length) return NET_PALETTE[colorKey]
  const hue = (colorKey * 137.508) % 360
  return `hsl(${hue} 90% 64%)`
}
