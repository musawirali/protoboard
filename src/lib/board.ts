export type Hole = {
  readonly c: number
  readonly r: number
}

export type Trace = {
  readonly id?: string
  readonly a: Hole
  readonly b: Hole
  /** Custom name for this trace's net. Unset traces use the generated "Net N" label. */
  readonly name?: string
  /** A jumper wire. Omitted on a PCB trace. */
  readonly kind?: "wire"
}

export function sameHole(a: Hole, b: Hole) {
  return a.c === b.c && a.r === b.r
}

/** True when both holes sit on one row or one column, including the same hole. */
export function isAxisAligned(a: Hole, b: Hole) {
  return a.c === b.c || a.r === b.r
}

/** A second click commits only a horizontal or vertical run to a different hole. */
export function canCommit(a: Hole, b: Hole) {
  return isAxisAligned(a, b) && !sameHole(a, b)
}

/** Every pin hole on the straight span, including both ends. Empty for diagonals and zero-length pairs. */
export function holesOnSpan(a: Hole, b: Hole): Hole[] {
  if (!canCommit(a, b)) return []
  const holes: Hole[] = []
  if (a.r === b.r) {
    const start = Math.min(a.c, b.c)
    const end = Math.max(a.c, b.c)
    for (let c = start; c <= end; c++) holes.push({ c, r: a.r })
  } else {
    const start = Math.min(a.r, b.r)
    const end = Math.max(a.r, b.r)
    for (let r = start; r <= end; r++) holes.push({ c: a.c, r })
  }
  return holes
}

function holeKey(hole: Hole) {
  return `${hole.c},${hole.r}`
}

/** True when the two spans share any hole, including a crossing or an overlap. */
export function spansShareHole(left: Trace, right: Trace) {
  const covered = new Set(holesOnSpan(left.a, left.b).map(holeKey))
  return holesOnSpan(right.a, right.b).some((hole) => covered.has(holeKey(hole)))
}

export function isWire(trace: Trace) {
  return trace.kind === "wire"
}

function cross(ax: number, ay: number, bx: number, by: number) {
  return ax * by - ay * bx
}

/** True when p lies on the segment ab, including both ends. Grid coordinates are integers. */
export function pointOnSegment(a: Hole, b: Hole, p: Hole) {
  if (cross(b.c - a.c, b.r - a.r, p.c - a.c, p.r - a.r) !== 0) return false
  return (
    p.c >= Math.min(a.c, b.c) &&
    p.c <= Math.max(a.c, b.c) &&
    p.r >= Math.min(a.r, b.r) &&
    p.r <= Math.max(a.r, b.r)
  )
}

/** True when the two segments cross, overlap, or touch, including a diagonal. */
export function segmentsIntersect(a: Hole, b: Hole, c: Hole, d: Hole) {
  const abx = b.c - a.c
  const aby = b.r - a.r
  const cdx = d.c - c.c
  const cdy = d.r - c.r
  const s1 = cross(abx, aby, c.c - a.c, c.r - a.r)
  const s2 = cross(abx, aby, d.c - a.c, d.r - a.r)
  const s3 = cross(cdx, cdy, a.c - c.c, a.r - c.r)
  const s4 = cross(cdx, cdy, b.c - c.c, b.r - c.r)
  if (s1 === 0 && s2 === 0 && s3 === 0 && s4 === 0) {
    return (
      pointOnSegment(a, b, c) ||
      pointOnSegment(a, b, d) ||
      pointOnSegment(c, d, a) ||
      pointOnSegment(c, d, b)
    )
  }
  if ((s1 > 0 && s2 > 0) || (s1 < 0 && s2 < 0)) return false
  if ((s3 > 0 && s4 > 0) || (s3 < 0 && s4 < 0)) return false
  if (s1 === 0 && !pointOnSegment(a, b, c)) return false
  if (s2 === 0 && !pointOnSegment(a, b, d)) return false
  if (s3 === 0 && !pointOnSegment(c, d, a)) return false
  if (s4 === 0 && !pointOnSegment(c, d, b)) return false
  return true
}

/**
 * PCB traces join through shared holes on their spans.
 * A wire also joins a trace or another wire when the segments share an end,
 * a wire ends on a hole in a trace span, or the segments cross or overlap.
 */
export function segmentsConnect(left: Trace, right: Trace) {
  if (!isWire(left) && !isWire(right)) return spansShareHole(left, right)
  return segmentsIntersect(left.a, left.b, right.a, right.b)
}

/** True when this hole is an end of the segment or lies on its span. */
export function holeOnSegment(trace: Trace, hole: Hole) {
  if (isWire(trace)) return pointOnSegment(trace.a, trace.b, hole)
  return holesOnSpan(trace.a, trace.b).some((pin) => sameHole(pin, hole))
}
