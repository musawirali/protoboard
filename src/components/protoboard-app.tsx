"use client"

import { useEffect, useMemo, useState } from "react"
import { BoardSetup } from "@/components/board-setup"
import { ChangeSizeDialog } from "@/components/change-size-dialog"
import { ProtoboardCanvas } from "@/components/protoboard-canvas"
import { TraceToolbar, type NetLegendItem } from "@/components/trace-toolbar"
import { sameHole, traceToSegment, type Hole, type Trace } from "@/lib/board"
import { assignNets, netColor } from "@/lib/nets"

export function ProtoboardApp() {
  const [board, setBoard] = useState<{ cols: number; rows: number } | null>(null)
  const [traces, setTraces] = useState<Trace[]>([])
  const [draft, setDraft] = useState<Hole | null>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDraft(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const assignment = useMemo(
    () => assignNets(traces.map(traceToSegment)),
    [traces],
  )

  const legend = useMemo(() => {
    const items = new Map<number, NetLegendItem>()
    assignment.colorKeys.forEach((colorKey, index) => {
      if (items.has(colorKey)) return
      items.set(colorKey, {
        colorKey,
        label: assignment.labels[index],
        color: netColor(colorKey),
      })
    })
    return [...items.values()]
  }, [assignment])

  function createBoard(cols: number, rows: number) {
    setBoard({ cols, rows })
    setTraces([])
    setDraft(null)
  }

  function handleHoleClick(hole: Hole) {
    if (!draft) {
      setDraft(hole)
      return
    }
    if (sameHole(draft, hole)) return
    setTraces((current) => [...current, { a: draft, b: hole }])
    setDraft(null)
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
            draftStart={draft}
            onHoleClick={handleHoleClick}
          />
        </div>
        <aside className="max-h-[42vh] shrink-0 overflow-auto border-t px-3 py-3 md:max-h-none md:w-72 md:border-t-0 md:border-l">
          <TraceToolbar
            draft={draft}
            netCount={assignment.netCount}
            legend={legend}
            onCancel={() => setDraft(null)}
          />
        </aside>
      </div>
    </div>
  )
}
