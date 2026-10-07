import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { holesOnSpan, type Hole, type Trace } from "@/lib/board"
import type { Selection } from "@/lib/selection"

type NetInfo = {
  label: number
  color: string
  name: string
  index: number
}

type PropertiesPanelProps = {
  selection: Selection | null
  traces: Trace[]
  netForTrace: (index: number) => NetInfo | null
  netForHole: (hole: Hole) => NetInfo | null
  onRemoveTrace: (id: string) => void
  onRenameNet: (index: number, name: string) => void
}

function NetNameField({
  net,
  onRenameNet,
}: {
  net: NetInfo
  onRenameNet: (index: number, name: string) => void
}) {
  const [value, setValue] = useState(net.name)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: net.color }} aria-hidden />
      <Input
        aria-label="Net name"
        value={value}
        className="h-8 w-28 text-right sm:w-36"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value.trim()
          if (!next || next === net.name) {
            setValue(net.name)
            return
          }
          onRenameNet(net.index, next)
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            event.currentTarget.blur()
          }
        }}
      />
    </span>
  )
}

function holeLabel(hole: Hole) {
  return `Column ${hole.c + 1}, row ${hole.r + 1}`
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

export function PropertiesPanel({
  selection,
  traces,
  netForTrace,
  netForHole,
  onRemoveTrace,
  onRenameNet,
}: PropertiesPanelProps) {
  const selectedTrace =
    selection?.type === "trace" ? traces.find((trace) => trace.id === selection.id) : undefined
  const traceIndex =
    selection?.type === "trace" ? traces.findIndex((trace) => trace.id === selection.id) : -1

  let body: ReactNode
  if (selection?.type === "trace" && selectedTrace && traceIndex >= 0) {
    const holes = holesOnSpan(selectedTrace.a, selectedTrace.b)
    const net = netForTrace(traceIndex)
    body = (
      <>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="Direction">{selectedTrace.a.r === selectedTrace.b.r ? "Horizontal" : "Vertical"}</Row>
          <Row label="Start">{holeLabel(selectedTrace.a)}</Row>
          <Row label="End">{holeLabel(selectedTrace.b)}</Row>
          <Row label="Holes">{holes.length}</Row>
          <Row label="Net">
            {net ? <NetNameField key={net.name} net={net} onRenameNet={onRenameNet} /> : "On no net"}
          </Row>
        </dl>
        <Button
          type="button"
          variant="destructive"
          className="mt-3 h-11 w-full"
          onClick={() => {
            if (selectedTrace.id) onRemoveTrace(selectedTrace.id)
          }}
        >
          Remove
        </Button>
      </>
    )
  } else if (selection?.type === "hole") {
    const net = netForHole(selection.hole)
    body = (
      <dl className="flex flex-col gap-1.5 text-sm">
        <Row label="Column">{selection.hole.c + 1}</Row>
        <Row label="Row">{selection.hole.r + 1}</Row>
        <Row label="Net">
          {net ? <NetNameField key={net.name} net={net} onRenameNet={onRenameNet} /> : "On no net"}
        </Row>
      </dl>
    )
  } else if (selection?.type === "component") {
    body = (
      <p className="text-sm text-muted-foreground">
        Component {selection.id} is selected. Placement properties are not available yet.
      </p>
    )
  } else {
    body = (
      <p className="text-sm text-muted-foreground">
        Nothing selected. Click a trace or a pin hole.
      </p>
    )
  }

  return (
    <section aria-label="Properties" className="rounded-lg border bg-card p-3">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Properties</h2>
      <div className="mt-2">{body}</div>
    </section>
  )
}
