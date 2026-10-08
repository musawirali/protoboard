"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { BoardSetup } from "@/components/board-setup"
import { ChangeSizeDialog } from "@/components/change-size-dialog"
import { ProjectList } from "@/components/project-list"
import { PropertiesPanel } from "@/components/properties-panel"
import { ProtoboardCanvas } from "@/components/protoboard-canvas"
import { ToolStrip } from "@/components/tool-strip"
import { TraceToolbar, type NetLegendItem } from "@/components/trace-toolbar"
import { UndoBar } from "@/components/undo-bar"
import { canCommit, sameHole, type Hole, type Trace } from "@/lib/board"
import { applyBoardEdit, pushEdit, type BoardEdit } from "@/lib/history"
import { assignNets, displayNetName, netColor, traceIndexAtHole } from "@/lib/nets"
import {
  buttonFits,
  buttonNetLinks,
  buttonPins,
  canPlaceHeader,
  canPlacePart,
  componentNameTaken,
  holeOccupied,
  IC_DEFAULT_DISTANCE,
  IC_DEFAULT_PINS,
  icFits,
  nextComponentName,
  readIcConfig,
  validPinCount,
  validRailDistance,
  type IcConfig,
  type IcRotation,
  type PlacedPart,
} from "@/lib/parts"
import {
  getProjectSnapshot,
  getServerProjectSnapshot,
  replaceProjects,
  sameBoard,
  subscribeProjects,
  type SavedProject,
} from "@/lib/projects"
import { isAxialTool, isHeaderTool, type Selection, type ToolName } from "@/lib/selection"

function selectionStillThere(
  selection: Selection | null,
  traces: readonly Trace[],
  parts: readonly PlacedPart[],
): Selection | null {
  if (!selection) return null
  if (selection.type === "trace") {
    return traces.some((trace) => trace.id === selection.id) ? selection : null
  }
  if (selection.type === "component") {
    return parts.some((part) => part.id === selection.id) ? selection : null
  }
  return selection
}

export function ProtoboardApp() {
  const projects = useSyncExternalStore(subscribeProjects, getProjectSnapshot, getServerProjectSnapshot)
  const [screen, setScreen] = useState<"list" | "create" | "editor">("list")
  const [openId, setOpenId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [board, setBoard] = useState<{ cols: number; rows: number } | null>(null)
  const [traces, setTraces] = useState<Trace[]>([])
  const [parts, setParts] = useState<PlacedPart[]>([])
  const [draft, setDraft] = useState<Hole | null>(null)
  const [tool, setTool] = useState<ToolName>("select")
  const [selection, setSelection] = useState<Selection | null>(null)
  const [heldButtonId, setHeldButtonId] = useState<string | null>(null)
  const [past, setPast] = useState<BoardEdit[]>([])
  const [future, setFuture] = useState<BoardEdit[]>([])
  const historyRef = useRef({ traces, parts, past, future, selection })

  useLayoutEffect(() => {
    historyRef.current = { traces, parts, past, future, selection }
  }, [traces, parts, past, future, selection])

  const undo = useCallback(() => {
    const { traces: current, parts: placed, past: done, future: ahead } = historyRef.current
    const edit = done[done.length - 1]
    if (!edit) return
    const next = applyBoardEdit({ traces: current, components: placed }, edit, "undo")
    setTraces(next.traces)
    setParts(next.components)
    setPast(done.slice(0, -1))
    setFuture([...ahead, edit])
    setDraft(null)
    setSelection((selected) => selectionStillThere(selected, next.traces, next.components))
  }, [])

  const redo = useCallback(() => {
    const { traces: current, parts: placed, past: done, future: ahead } = historyRef.current
    const edit = ahead[ahead.length - 1]
    if (!edit) return
    const next = applyBoardEdit({ traces: current, components: placed }, edit, "redo")
    setTraces(next.traces)
    setParts(next.components)
    setFuture(ahead.slice(0, -1))
    setPast([...done, edit])
    setDraft(null)
    setSelection((selected) => selectionStillThere(selected, next.traces, next.components))
  }, [])

  const storeOpen = useCallback(
    (projectName: string, nextBoard: { cols: number; rows: number }, nextTraces: Trace[], nextParts: PlacedPart[]) => {
      if (!openId) return
      const body = { name: projectName, cols: nextBoard.cols, rows: nextBoard.rows, traces: nextTraces, parts: nextParts }
      const existing = getProjectSnapshot().find((item) => item.id === openId)
      if (existing && sameBoard(existing, body)) return
      const updated: SavedProject = { id: openId, ...body, updatedAt: Date.now() }
      replaceProjects([updated, ...getProjectSnapshot().filter((item) => item.id !== openId)])
    },
    [openId],
  )

  useEffect(() => {
    if (screen !== "editor" || !board) return
    storeOpen(name, board, traces, parts)
  }, [screen, name, board, traces, parts, storeOpen])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.key === "Escape") {
        setDraft(null)
        return
      }
      const meta = event.metaKey || event.ctrlKey
      if (!meta) return
      const key = event.key.toLowerCase()
      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  const heldButton = parts.find((part) => part.id === heldButtonId && part.kind === "button")
  const buttonLinks = useMemo(
    () => parts.flatMap((part) => (part.kind === "button" ? buttonNetLinks(part.a, part.id === heldButton?.id) : [])),
    [parts, heldButton],
  )
  const assignment = useMemo(() => assignNets(traces, buttonLinks), [traces, buttonLinks])

  const legend = useMemo(() => {
    const items = new Map<number, NetLegendItem>()
    assignment.colorKeys.forEach((colorKey, index) => {
      if (items.has(colorKey)) return
      items.set(colorKey, {
        colorKey,
        name: displayNetName(traces, assignment.colorKeys, assignment.labels, index),
        color: netColor(colorKey),
        index,
      })
    })
    return [...items.values()]
  }, [assignment, traces])

  function netAt(index: number) {
    if (index < 0 || index >= traces.length) return null
    return {
      label: assignment.labels[index],
      color: netColor(assignment.colorKeys[index]),
      name: displayNetName(traces, assignment.colorKeys, assignment.labels, index),
      index,
    }
  }

  function netForHole(hole: Hole) {
    return netAt(traceIndexAtHole(traces, hole, buttonLinks))
  }

  function resetEditor(cols: number, rows: number) {
    setBoard({ cols, rows })
    setTraces([])
    setParts([])
    setDraft(null)
    setTool("select")
    setSelection(null)
    setPast([])
    setFuture([])
    setHeldButtonId(null)
  }

  function openProject(project: SavedProject) {
    setOpenId(project.id)
    setName(project.name)
    setBoard({ cols: project.cols, rows: project.rows })
    setTraces(project.traces.map((trace) => ({ ...trace, a: { ...trace.a }, b: { ...trace.b } })))
    setParts(
      project.parts.map((part) => ({
        ...part,
        a: { ...part.a },
        b: { ...part.b },
        pinLabels: part.pinLabels ? [...part.pinLabels] : undefined,
      })),
    )
    setDraft(null)
    setTool("select")
    setSelection(null)
    setPast([])
    setFuture([])
    setHeldButtonId(null)
    setScreen("editor")
  }

  function createProject(projectName: string, cols: number, rows: number) {
    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: projectName.trim(),
      cols,
      rows,
      updatedAt: Date.now(),
      traces: [],
      parts: [],
    }
    replaceProjects([project, ...getProjectSnapshot()])
    openProject(project)
  }

  function leaveEditor() {
    if (openId && board) storeOpen(name, board, traces, parts)
    setHeldButtonId(null)
    setScreen("list")
    setOpenId(null)
    setBoard(null)
  }

  function deleteProject(id: string) {
    replaceProjects(getProjectSnapshot().filter((item) => item.id !== id))
  }

  function chooseTool(next: ToolName) {
    setTool(next)
    setDraft(null)
  }

  function commit(edit: BoardEdit) {
    const next = applyBoardEdit({ traces, components: parts }, edit, "redo")
    setTraces(next.traces)
    setParts(next.components)
    setPast(pushEdit(past, edit))
    setFuture([])
    setDraft(null)
    setSelection((selected) => selectionStillThere(selected, next.traces, next.components))
  }

  function commitTrace(trace: Trace) {
    commit({ type: "add", index: traces.length, trace })
  }

  function renameNet(index: number, name: string) {
    const trimmed = name.trim()
    if (!trimmed || index < 0 || index >= traces.length) return
    const current = displayNetName(traces, assignment.colorKeys, assignment.labels, index)
    if (current === trimmed) return
    const colorKey = assignment.colorKeys[index]
    const changes = traces.flatMap((trace, member) => {
      if (assignment.colorKeys[member] !== colorKey || !trace.id) return []
      return [{ id: trace.id, from: trace.name, to: trimmed }]
    })
    if (changes.length === 0) return
    commit({ type: "rename", changes })
  }

  function removeTrace(id: string) {
    const index = traces.findIndex((trace) => trace.id === id)
    if (index < 0) return
    commit({ type: "remove", index, trace: traces[index] })
  }

  function removePart(id: string) {
    const index = parts.findIndex((part) => part.id === id)
    if (index < 0) return
    commit({ type: "unplace", index, component: parts[index] })
  }

  function renamePart(id: string, name: string) {
    const trimmed = name.trim()
    const part = parts.find((item) => item.id === id)
    if (!trimmed || !part || part.name === trimmed || componentNameTaken(parts, trimmed, id)) return false
    commit({ type: "partName", id, from: part.name, to: trimmed })
    return true
  }

  function setPartValue(id: string, value: string) {
    const trimmed = value.trim()
    const part = parts.find((item) => item.id === id)
    if (!part || part.value === trimmed) return
    commit({ type: "partValue", id, from: part.value, to: trimmed })
  }

  function commitIcConfig(id: string, next: IcConfig) {
    if (!board) return false
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "ic") return false
    const current = readIcConfig(part)
    const same =
      current.pinCount === next.pinCount &&
      current.railDistance === next.railDistance &&
      current.rotation === next.rotation &&
      current.pinLabels.every((label, index) => label === next.pinLabels[index])
    if (same) return true
    if (!icFits(board.cols, board.rows, parts, part.a, next, id)) return false
    commit({ type: "icConfig", id, from: current, to: next })
    return true
  }

  function setIcPinCount(id: string, raw: string) {
    const pinCount = Number(raw)
    if (!validPinCount(pinCount)) return false
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "ic") return false
    const current = readIcConfig(part)
    if (pinCount === current.pinCount) return false
    const pinLabels = Array.from({ length: pinCount }, (_, index) => current.pinLabels[index] ?? "")
    return commitIcConfig(id, { ...current, pinCount, pinLabels })
  }

  function setIcDistance(id: string, raw: string) {
    const railDistance = Number(raw)
    if (!validRailDistance(railDistance)) return false
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "ic") return false
    const current = readIcConfig(part)
    if (railDistance === current.railDistance) return false
    return commitIcConfig(id, { ...current, railDistance })
  }

  function rotateIc(id: string) {
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "ic") return false
    const current = readIcConfig(part)
    const rotation = ((current.rotation + 90) % 360) as IcRotation
    return commitIcConfig(id, { ...current, rotation })
  }

  function setIcPinLabel(id: string, pinNumber: number, label: string) {
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "ic") return
    const current = readIcConfig(part)
    const pinLabels = [...current.pinLabels]
    const index = pinNumber - 1
    if (index < 0 || index >= pinLabels.length || pinLabels[index] === label) return
    pinLabels[index] = label
    commitIcConfig(id, { ...current, pinLabels })
  }

  function setPolarized(id: string, polarized: boolean) {
    const part = parts.find((item) => item.id === id)
    if (!part || part.kind !== "capacitor") return
    const from = part.polarized === true
    if (from === polarized) return
    commit({ type: "polarize", id, from, to: polarized })
  }

  function handleHoleClick(hole: Hole) {
    if (tool === "trace" || tool === "wire") {
      if (!draft) {
        setDraft(hole)
        return
      }
      if (tool === "trace" ? !canCommit(draft, hole) : sameHole(draft, hole)) return
      commitTrace({
        id: crypto.randomUUID(),
        a: draft,
        b: hole,
        ...(tool === "wire" ? { kind: "wire" as const } : {}),
      })
      return
    }
    if (tool === "button") {
      if (!board || !buttonFits(board.cols, board.rows, parts, hole)) return
      const opposite = buttonPins(hole)[2]
      commit({
        type: "place",
        index: parts.length,
        component: {
          id: crypto.randomUUID(),
          kind: "button",
          name: nextComponentName(parts, "button"),
          value: "",
          a: hole,
          b: opposite.hole,
        },
      })
      return
    }
    if (tool === "ic") {
      if (!board) return
      const config = { pinCount: IC_DEFAULT_PINS, railDistance: IC_DEFAULT_DISTANCE, rotation: 0 as const }
      if (!icFits(board.cols, board.rows, parts, hole, config)) return
      commit({
        type: "place",
        index: parts.length,
        component: {
          id: crypto.randomUUID(),
          kind: "ic",
          name: nextComponentName(parts, "ic"),
          value: "",
          a: hole,
          b: hole,
          pinCount: config.pinCount,
          railDistance: config.railDistance,
          rotation: config.rotation,
          pinLabels: Array.from({ length: config.pinCount }, () => ""),
        },
      })
      return
    }
    if (!isAxialTool(tool) && !isHeaderTool(tool)) return
    if (!draft) {
      if (holeOccupied(parts, hole)) return
      setDraft(hole)
      return
    }
    if (isHeaderTool(tool)) {
      if (!canPlaceHeader(parts, draft, hole)) return
    } else if (!canPlacePart(draft, hole) || holeOccupied(parts, hole)) {
      return
    }
    commit({
      type: "place",
      index: parts.length,
      component: {
        id: crypto.randomUUID(),
        kind: tool,
        name: nextComponentName(parts, tool),
        value: "",
        a: draft,
        b: hole,
      },
    })
  }

  if (screen === "create") {
    return <BoardSetup onBack={() => setScreen("list")} onCreate={createProject} />
  }

  if (screen !== "editor" || !board) {
    return (
      <ProjectList
        projects={projects}
        onOpen={openProject}
        onCreate={() => setScreen("create")}
        onDelete={deleteProject}
      />
    )
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Projects"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-white/10"
            onClick={leaveEditor}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
              <path
                d="M2.2 7.1 8 2.3l5.8 4.8V13a.8.8 0 0 1-.8.8H10v-3.4H6V13.8H3a.8.8 0 0 1-.8-.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">{name}</h1>
            <p className="text-xs text-muted-foreground">
              {board.cols} × {board.rows} pin holes
            </p>
          </div>
        </div>
        <ChangeSizeDialog
          cols={board.cols}
          rows={board.rows}
          traceCount={traces.length}
          partCount={parts.length}
          onResize={resetEditor}
        />
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1">
          <ProtoboardCanvas
            cols={board.cols}
            rows={board.rows}
            traces={traces}
            colorKeys={assignment.colorKeys}
            parts={parts}
            tool={tool}
            draftStart={tool === "trace" || tool === "wire" || isAxialTool(tool) || isHeaderTool(tool) ? draft : null}
            selectedTraceId={selection?.type === "trace" ? selection.id : null}
            selectedPartId={selection?.type === "component" ? selection.id : null}
            selectedHole={selection?.type === "hole" ? selection.hole : null}
            heldButtonId={heldButton?.id ?? null}
            onHoleClick={handleHoleClick}
            onSelect={setSelection}
            onHoldButton={setHeldButtonId}
          />
          <ToolStrip tool={tool} onTool={chooseTool} />
        </div>
        <aside className="max-h-[48vh] shrink-0 overflow-auto border-t px-3 pt-3 pb-16 md:max-h-none md:w-80 md:border-t-0 md:border-l md:pb-3">
          <TraceToolbar
            tool={tool}
            draft={draft}
            legend={legend}
            onCancel={() => setDraft(null)}
            onRenameNet={renameNet}
          />
          <div className="mt-4">
            <PropertiesPanel
              selection={selection}
              traces={traces}
              netForTrace={netAt}
              netForHole={netForHole}
              parts={parts}
              onRemoveTrace={removeTrace}
              onRemovePart={removePart}
              onPolarize={setPolarized}
              onRenamePart={renamePart}
              onValuePart={setPartValue}
              onIcPinCount={setIcPinCount}
              onIcDistance={setIcDistance}
              onIcRotate={rotateIc}
              onIcPinLabel={setIcPinLabel}
            />
          </div>
        </aside>
      </div>
      <UndoBar canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo} />
    </div>
  )
}
