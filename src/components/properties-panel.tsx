import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { holesOnSpan, type Hole, type Trace } from "@/lib/board"
import type { PlacedPart } from "@/lib/parts"
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
  parts: PlacedPart[]
  onRemoveTrace: (id: string) => void
  onRemovePart: (id: string) => void
  onPolarize: (id: string, polarized: boolean) => void
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

function NetName({ net }: { net: NetInfo | null }) {
  if (!net) return "On no net"
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: net.color }} aria-hidden />
      {net.name}
    </span>
  )
}

function partHeading(kind: PlacedPart["kind"]) {
  if (kind === "resistor") return "Selected resistor"
  if (kind === "capacitor") return "Selected capacitor"
  return "Selected diode"
}

export function PropertiesPanel({
  selection,
  traces,
  netForTrace,
  netForHole,
  parts,
  onRemoveTrace,
  onRemovePart,
  onPolarize,
}: PropertiesPanelProps) {
  const selectedTrace =
    selection?.type === "trace" ? traces.find((trace) => trace.id === selection.id) : undefined
  const traceIndex =
    selection?.type === "trace" ? traces.findIndex((trace) => trace.id === selection.id) : -1

  if (selection?.type === "component") {
    const part = parts.find((item) => item.id === selection.id)
    if (!part) return null
    const heading = partHeading(part.kind)
    return (
      <section aria-label={heading} className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          {part.kind === "diode" ? (
            <>
              <Row label="Anode">{holeLabel(part.a)}</Row>
              <Row label="Anode net"><NetName net={netForHole(part.a)} /></Row>
              <Row label="Cathode">{holeLabel(part.b)}</Row>
              <Row label="Cathode net"><NetName net={netForHole(part.b)} /></Row>
            </>
          ) : (
            <>
              <Row label="Pin 1">{holeLabel(part.a)}</Row>
              <Row label="Pin 1 net"><NetName net={netForHole(part.a)} /></Row>
              <Row label="Pin 2">{holeLabel(part.b)}</Row>
              <Row label="Pin 2 net"><NetName net={netForHole(part.b)} /></Row>
            </>
          )}
        </dl>
        {part.kind === "capacitor" ? (
          <label className="mt-3 flex items-center justify-between gap-3 text-sm">
            Polarized
            <input
              type="checkbox"
              aria-label="Polarized"
              checked={part.polarized === true}
              onChange={(event) => onPolarize(part.id, event.target.checked)}
              className="size-4 accent-white"
            />
          </label>
        ) : null}
        <Button type="button" variant="destructive" className="mt-3 h-11 w-full" onClick={() => onRemovePart(part.id)}>
          Remove
        </Button>
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
