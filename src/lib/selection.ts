import type { Hole } from "./board"
import type { ComponentKind } from "./parts"

export type ToolName = "select" | "trace" | ComponentKind

export function isPartTool(tool: ToolName): tool is ComponentKind {
  return tool === "resistor" || tool === "capacitor" || tool === "diode" || tool === "led"
}

export type Selection =
  | { type: "trace"; id: string }
  | { type: "hole"; hole: Hole }
  | { type: "component"; id: string }
