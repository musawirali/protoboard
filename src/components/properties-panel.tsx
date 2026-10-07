import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
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

function NetName({ net }: { net: NetInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: net.color }} aria-hidden />
      {net.name}
    </span>
  )
}

export function PropertiesPanel({
  selection,
  traces,
  netForTrace,
  netForHole,
  onRemoveTrace,
}: PropertiesPanelProps) {
  const selectedTrace =
    selection?.type === "trace" ? traces.find((trace) => trace.id === selection.id) : undefined
  const traceIndex =
    selection?.type === "trace" ? traces.findIndex((trace) => trace.id === selection.id) : -1

  if (selection?.type === "component") {
    return (
      <section className="rounded-lg border bg-card p-3">
        <p className="text-sm text-muted-foreground">
          Component {selection.id} is selected. Placement properties are not available yet.
        </p>
      </section>
    )
  }

  if (selection?.type === "trace" && selectedTrace && traceIndex >= 0) {
    const holes = holesOnSpan(selectedTrace.a, selectedTrace.b)
    const net = netForTrace(traceIndex)
    return (
      <section aria-label="Selected trace" className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Selected trace</h2>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <Row label="Direction">{selectedTrace.a.r === selectedTrace.b.r ? "Horizontal" : "Vertical"}</Row>
          <Row label="Start">{holeLabel(selectedTrace.a)}</Row>
          <Row label="End">{holeLabel(selectedTrace.b)}</Row>
          <Row label="Holes">{holes.length}</Row>
          <Row label="Net">{net ? <NetName net={net} /> : "On no net"}</Row>
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
      </section>
    )
  }

  if (selection?.type === "hole") {
    const net = netForHole(selection.hole)
    return (
      <section aria-label="Selected pin hole" className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Selected pin hole</h2>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <Row label="Column">{selection.hole.c + 1}</Row>
          <Row label="Row">{selection.hole.r + 1}</Row>
          <Row label="Net">{net ? <NetName net={net} /> : "On no net"}</Row>
        </dl>
      </section>
    )
  }

  return null
}
