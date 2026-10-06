import type { Segment } from "@/lib/nets"

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

export function traceToSegment(trace: Trace): Segment {
  return {
    a: { x: trace.a.c, y: trace.a.r },
    b: { x: trace.b.c, y: trace.b.r },
  }
}
