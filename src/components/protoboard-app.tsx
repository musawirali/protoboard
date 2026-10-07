"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { BoardSetup } from "@/components/board-setup"
import { ChangeSizeDialog } from "@/components/change-size-dialog"
import { PropertiesPanel } from "@/components/properties-panel"
import { ProtoboardCanvas } from "@/components/protoboard-canvas"
import { ToolStrip } from "@/components/tool-strip"
import { TraceToolbar, type NetLegendItem } from "@/components/trace-toolbar"
import { UndoBar } from "@/components/undo-bar"
import { canCommit, holesOnSpan, sameHole, type Hole, type Trace } from "@/lib/board"
import { applyEdit, pushEdit, type TraceEdit } from "@/lib/history"
import { assignNets, displayNetName, netColor } from "@/lib/nets"
import type { Selection, ToolName } from "@/lib/selection"

function selectionStillThere(selection: Selection | null, traces: readonly Trace[]): Selection | null {
  if (!selection) return null
  if (selection.type === "trace") {
    return traces.some((trace) => trace.id === selection.id) ? selection : null
  }
  if (selection.type === "component") return selection
  return selection
}

export function ProtoboardApp() {
  const [board, setBoard] = useState<{ cols: number; rows: number } | null>(null)
  const [traces, setTraces] = useState<Trace[]>([])
  const [draft, setDraft] = useState<Hole | null>(null)
  const [tool, setTool] = useState<ToolName>("select")
  const [selection, setSelection] = useState<Selection | null>(null)
  const [past, setPast] = useState<TraceEdit[]>([])
  const [future, setFuture] = useState<TraceEdit[]>([])
  const historyRef = useRef({ traces, past, future, selection })

  useLayoutEffect(() => {
    historyRef.current = { traces, past, future, selection }
  }, [traces, past, future, selection])

  const undo = useCallback(() => {
    const { traces: current, past: done, future: ahead } = historyRef.current
    const edit = done[done.length - 1]
    if (!edit) return
    const next = applyEdit(current, edit, "undo")
    setTraces(next)
    setPast(done.slice(0, -1))
    setFuture([...ahead, edit])
    setDraft(null)
    setSelection((selected) => selectionStillThere(selected, next))
  }, [])

  const redo = useCallback(() => {
    const { traces: current, past: done, future: ahead } = historyRef.current
    const edit = ahead[ahead.length - 1]
    if (!edit) return
    const next = applyEdit(current, edit, "redo")
    setTraces(next)
    setFuture(ahead.slice(0, -1))
    setPast([...done, edit])
    setDraft(null)
    setSelection((selected) => selectionStillThere(selected, next))
  }, [])

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

  const assignment = useMemo(() => assignNets(traces), [traces])

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
    const index = traces.findIndex((trace) =>
      holesOnSpan(trace.a, trace.b).some((pin) => sameHole(pin, hole)),
    )
    return netAt(index)
  }

  function createBoard(cols: number, rows: number) {
    setBoard({ cols, rows })
    setTraces([])
    setDraft(null)
    setTool("select")
    setSelection(null)
    setPast([])
    setFuture([])
  }

  function chooseTool(next: ToolName) {
    setTool(next)
    setDraft(null)
  }

  function commitTrace(trace: Trace) {
    const edit: TraceEdit = { type: "add", index: traces.length, trace }
    setTraces(applyEdit(traces, edit, "redo"))
    setPast(pushEdit(past, edit))
    setFuture([])
    setDraft(null)
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
    const edit: TraceEdit = { type: "rename", changes }
    setTraces(applyEdit(traces, edit, "redo"))
    setPast(pushEdit(past, edit))
    setFuture([])
  }

  function removeTrace(id: string) {
    const index = traces.findIndex((trace) => trace.id === id)
    if (index < 0) return
    const edit: TraceEdit = { type: "remove", index, trace: traces[index] }
    const next = applyEdit(traces, edit, "redo")
    setTraces(next)
    setPast(pushEdit(past, edit))
    setFuture([])
    setSelection((selected) => selectionStillThere(selected, next))
  }

  function handleHoleClick(hole: Hole) {
    if (tool !== "trace") return
    if (!draft) {
      setDraft(hole)
      return
    }
    if (!canCommit(draft, hole)) return
    commitTrace({
      id: crypto.randomUUID(),
      a: draft,
      b: hole,
    })
  }

  if (!board) {
    return <BoardSetup onCreate={createBoard} />
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight">Protoboard</h1>
          <p className="text-xs text-muted-foreground">
            {board.cols} × {board.rows} pin holes
          </p>
        </div>
        <ChangeSizeDialog
          cols={board.cols}
          rows={board.rows}
          traceCount={traces.length}
          onResize={createBoard}
        />
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1">
          <ProtoboardCanvas
            cols={board.cols}
            rows={board.rows}
            traces={traces}
            colorKeys={assignment.colorKeys}
            tool={tool}
            draftStart={tool === "trace" ? draft : null}
            selectedTraceId={selection?.type === "trace" ? selection.id : null}
            selectedHole={selection?.type === "hole" ? selection.hole : null}
            onHoleClick={handleHoleClick}
            onSelect={setSelection}
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
              onRemoveTrace={removeTrace}
            />
          </div>
        </aside>
      </div>
      <UndoBar canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo} />
    </div>
  )
}
