import { spansShareHole, type Trace } from "./board"

export type NetAssignment = {
  /** 1-based label per trace. Traces in one connected net share a label. */
  labels: number[]
  /** Oldest trace index in that trace's net. Stable key for the net color. */
  colorKeys: number[]
  netCount: number
}

/**
 * Connected components of axis-aligned traces. Two traces are one net when
 * their hole spans share any pin, including a crossing's intersection hole
 * and overlapping holes on the same row or column. Diagonal pairs cover no
 * holes, so they never join a net. The earliest trace stays the root so the
 * color does not move when a later trace joins.
 */
export function assignNets(traces: readonly Trace[]): NetAssignment {
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
      if (spansShareHole(traces[i], traces[j])) union(i, j)
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
