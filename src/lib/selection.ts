import type { Hole } from "./board"
import { isAxialKind, isHeaderKind, type AxialKind, type ComponentKind } from "./parts"

export type ToolName = "select" | "trace" | "wire" | ComponentKind

export function isAxialTool(tool: ToolName): tool is AxialKind {
  return tool !== "select" && tool !== "trace" && tool !== "wire" && isAxialKind(tool)
}

export function isHeaderTool(tool: ToolName): tool is "male-header" | "female-header" {
  return tool !== "select" && tool !== "trace" && tool !== "wire" && isHeaderKind(tool)
}

export function isPartTool(tool: ToolName): tool is ComponentKind {
  return (
    isAxialTool(tool) ||
    isHeaderTool(tool) ||
    tool === "ic" ||
    tool === "button" ||
    tool === "potentiometer" ||
    tool === "crystal"
  )
}

export type Selection =
  | { type: "trace"; id: string }
  | { type: "hole"; hole: Hole }
  | { type: "component"; id: string }
