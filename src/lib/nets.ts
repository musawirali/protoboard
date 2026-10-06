export type Point = {
  readonly x: number
  readonly y: number
}

export type Segment = {
  readonly a: Point
  readonly b: Point
}

export type NetAssignment = {
  /** 1-based label per segment. Segments in one connected net share a label. */
  labels: number[]
  /** Oldest segment index in that segment's net. Stable key for the net color. */
  colorKeys: number[]
  netCount: number
}

function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

function onSegment(a: Point, b: Point, c: Point) {
  return (
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y)
  )
}

/**
 * True when two traces share connectivity: a shared endpoint, a proper
 * crossing, a T-junction, or a colinear overlap. Grid coordinates are
 * integers, so the orientation test is exact.
 */
export function segmentsIntersect(p: Segment, q: Segment) {
  const o1 = cross(p.a.x, p.a.y, p.b.x, p.b.y, q.a.x, q.a.y)
  const o2 = cross(p.a.x, p.a.y, p.b.x, p.b.y, q.b.x, q.b.y)
  const o3 = cross(q.a.x, q.a.y, q.b.x, q.b.y, p.a.x, p.a.y)
  const o4 = cross(q.a.x, q.a.y, q.b.x, q.b.y, p.b.x, p.b.y)

  if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
    return (
      onSegment(p.a, q.a, p.b) ||
      onSegment(p.a, q.b, p.b) ||
      onSegment(q.a, p.a, q.b) ||
      onSegment(q.a, p.b, q.b)
    )
  }

  const opposite = (left: number, right: number) =>
    (left > 0 && right < 0) || (left < 0 && right > 0)

  if (opposite(o1, o2) && opposite(o3, o4)) return true
  if (o1 === 0 && onSegment(p.a, q.a, p.b)) return true
  if (o2 === 0 && onSegment(p.a, q.b, p.b)) return true
  if (o3 === 0 && onSegment(q.a, p.a, q.b)) return true
  if (o4 === 0 && onSegment(q.a, p.b, q.b)) return true
  return false
}

/**
 * Connected components of traces. Two segments are in the same net when they
 * intersect or overlap, including a shared endpoint. The union keeps the
 * earliest segment as the root so a net's color stays put as later traces join.
 */
export function assignNets(segments: readonly Segment[]): NetAssignment {
  const count = segments.length
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
      if (segmentsIntersect(segments[i], segments[j])) union(i, j)
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

export function netColor(colorKey: number) {
  if (colorKey >= 0 && colorKey < NET_PALETTE.length) return NET_PALETTE[colorKey]
  const hue = (colorKey * 137.508) % 360
  return `hsl(${hue} 90% 64%)`
}
