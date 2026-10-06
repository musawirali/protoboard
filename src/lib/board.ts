export type Hole = {
  readonly c: number
  readonly r: number
}

export type Trace = {
  readonly a: Hole
  readonly b: Hole
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
