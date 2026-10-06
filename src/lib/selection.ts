import type { Hole } from "./board"

export type ToolName = "select" | "trace"

/** A component entry is reserved so parts can be selected later without a new selection shape. */
export type Selection =
  | { type: "trace"; id: string }
  | { type: "hole"; hole: Hole }
  | { type: "component"; id: string }
