import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { holesOnSpan, type Hole, type Trace } from "@/lib/board"
import {
  buttonPins,
  crystalPins,
  icPins,
  isAxialKind,
  isHeaderKind,
  potPins,
  readIcConfig,
  type PlacedPart,
} from "@/lib/parts"
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
  onRenamePart: (id: string, name: string) => boolean
  onValuePart: (id: string, value: string) => void
  onIcPinCount: (id: string, raw: string) => boolean
  onIcDistance: (id: string, raw: string) => boolean
  onIcRotate: (id: string) => boolean
  onIcPinLabel: (id: string, pinNumber: number, label: string) => void
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

function PartTextField({
  label,
  committed,
  rejectEmpty,
  onCommit,
}: {
  label: string
  committed: string
  rejectEmpty: boolean
  onCommit: (next: string) => boolean
}) {
  const [text, setText] = useState(committed)
  function commit() {
    const next = text.trim()
    if ((rejectEmpty && !next) || next === committed) {
      setText(committed)
      return
    }
    if (!onCommit(next)) setText(committed)
  }
  return (
    <Input
      aria-label={label}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function partHeading(kind: PlacedPart["kind"]) {
  if (kind === "resistor") return "Selected resistor"
  if (kind === "capacitor") return "Selected capacitor"
  if (kind === "led") return "Selected LED"
  if (kind === "button") return "Selected button"
  if (kind === "potentiometer") return "Selected potentiometer"
  if (kind === "crystal") return "Selected crystal"
  if (kind === "male-header") return "Selected male header"
  if (kind === "female-header") return "Selected female header"
  if (kind === "ic") return "Selected IC"
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
  onRenamePart,
  onValuePart,
  onIcPinCount,
  onIcDistance,
  onIcRotate,
  onIcPinLabel,
}: PropertiesPanelProps) {
  const selectedTrace =
    selection?.type === "trace" ? traces.find((trace) => trace.id === selection.id) : undefined
  const traceIndex =
    selection?.type === "trace" ? traces.findIndex((trace) => trace.id === selection.id) : -1

  if (selection?.type === "component") {
    const part = parts.find((item) => item.id === selection.id)
    if (!part) return null
    const heading = partHeading(part.kind)
    if (isHeaderKind(part.kind)) {
      const holes = holesOnSpan(part.a, part.b)
      return (
        <section aria-label={heading} className="rounded-lg border bg-card p-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <Row label="Direction">{part.a.r === part.b.r ? "Horizontal" : "Vertical"}</Row>
            <Row label="Start">{holeLabel(part.a)}</Row>
            <Row label="End">{holeLabel(part.b)}</Row>
            <Row label="Holes">{holes.length}</Row>
          </dl>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <PartTextField
              key={`${part.id}:name:${part.name}`}
              label="Name"
              committed={part.name}
              rejectEmpty
              onCommit={(next) => onRenamePart(part.id, next)}
            />
          </label>
          <Button type="button" variant="destructive" className="mt-3 h-11 w-full" onClick={() => onRemovePart(part.id)}>
            Remove
          </Button>
        </section>
      )
    }
    if (part.kind === "ic") {
      const config = readIcConfig(part)
      const pins = icPins(part.a, config.pinCount, config.railDistance, config.rotation) ?? []
      return (
        <section aria-label={heading} className="rounded-lg border bg-card p-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <PartTextField
              key={`${part.id}:name:${part.name}`}
              label="Name"
              committed={part.name}
              rejectEmpty
              onCommit={(next) => onRenamePart(part.id, next)}
            />
          </label>
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Pin count</span>
              <PartTextField
                key={`${part.id}:pins:${config.pinCount}`}
                label="Pin count"
                committed={String(config.pinCount)}
                rejectEmpty
                onCommit={(next) => onIcPinCount(part.id, next)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Rail distance</span>
              <PartTextField
                key={`${part.id}:distance:${config.railDistance}`}
                label="Rail distance"
                committed={String(config.railDistance)}
                rejectEmpty
                onCommit={(next) => onIcDistance(part.id, next)}
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span>Rotation {config.rotation}°</span>
            <Button type="button" variant="outline" className="h-9" aria-label="Rotate 90 degrees" onClick={() => onIcRotate(part.id)}>
              Rotate 90°
            </Button>
          </div>
          <div className="mt-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pins</h3>
            <ul className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
              {pins.map((pin) => {
                const label = config.pinLabels[pin.number - 1] ?? ""
                const net = netForHole(pin.hole)
                return (
                  <li key={pin.number} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-sm tabular-nums">{pin.number}</span>
                    <div className="min-w-0 flex-1">
                      <PartTextField
                        key={`${part.id}:pin:${pin.number}:${label}`}
                        label={`Pin ${pin.number} label`}
                        committed={label}
                        rejectEmpty={false}
                        onCommit={(next) => {
                          onIcPinLabel(part.id, pin.number, next)
                          return true
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 truncate text-xs text-muted-foreground">
                      {net ? net.name : "On no net"}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
          <Button type="button" variant="destructive" className="mt-3 h-11 w-full" onClick={() => onRemovePart(part.id)}>
            Remove
          </Button>
        </section>
      )
    }
    if (part.kind === "potentiometer" || part.kind === "crystal") {
      const pins = part.kind === "potentiometer" ? potPins(part.a, part.rotation ?? 0) : crystalPins(part.a, part.rotation ?? 0)
      return (
        <section aria-label={heading} className="rounded-lg border bg-card p-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <PartTextField
              key={`${part.id}:name:${part.name}`}
              label="Name"
              committed={part.name}
              rejectEmpty
              onCommit={(next) => onRenamePart(part.id, next)}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Value</span>
            <PartTextField
              key={`${part.id}:value:${part.value}`}
              label="Value"
              committed={part.value}
              rejectEmpty={false}
              onCommit={(next) => {
                onValuePart(part.id, next)
                return true
              }}
            />
          </label>
          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            {pins.map((pin) => {
              const net = netForHole(pin.hole)
              const role = part.kind === "potentiometer" && pin.number === 2 ? "Wiper" : null
              return (
                <Row key={pin.number} label={role ? `Pin ${pin.number}, ${role}` : `Pin ${pin.number}`}>
                  <span className="block">{holeLabel(pin.hole)}</span>
                  <span className="block text-xs text-muted-foreground">{net ? <NetName net={net} /> : "On no net"}</span>
                </Row>
              )
            })}
          </dl>
          <Button type="button" variant="destructive" className="mt-3 h-11 w-full" onClick={() => onRemovePart(part.id)}>
            Remove
          </Button>
        </section>
      )
    }
    if (part.kind === "button") {
      const pins = buttonPins(part.a, part.rotation ?? 0)
      return (
        <section aria-label={heading} className="rounded-lg border bg-card p-3">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <PartTextField
              key={`${part.id}:name:${part.name}`}
              label="Name"
              committed={part.name}
              rejectEmpty
              onCommit={(next) => onRenamePart(part.id, next)}
            />
          </label>
          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            {pins.map((pin) => {
              const net = netForHole(pin.hole)
              return (
                <Row key={pin.number} label={`Pin ${pin.number}`}>
                  <span className="block">{holeLabel(pin.hole)}</span>
                  <span className="block text-xs text-muted-foreground">
                    Side {pin.side === 1 ? "A" : "B"} · {net ? <NetName net={net} /> : "On no net"}
                  </span>
                </Row>
              )
            })}
          </dl>
          <Button type="button" variant="destructive" className="mt-3 h-11 w-full" onClick={() => onRemovePart(part.id)}>
            Remove
          </Button>
        </section>
      )
    }
    return (
      <section aria-label={heading} className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{heading}</h2>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          {part.kind === "diode" || part.kind === "led" ? (
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
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <PartTextField
              key={`${part.id}:name:${part.name}`}
              label="Name"
              committed={part.name}
              rejectEmpty
              onCommit={(next) => onRenamePart(part.id, next)}
            />
          </label>
          {isAxialKind(part.kind) ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Value</span>
              <PartTextField
                key={`${part.id}:value:${part.value}`}
                label="Value"
                committed={part.value}
                rejectEmpty={false}
                onCommit={(next) => {
                  onValuePart(part.id, next)
                  return true
                }}
              />
            </label>
          ) : null}
        </div>
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

  if (selection?.type === "trace" && selectedTrace?.kind === "wire" && traceIndex >= 0) {
    const net = netForTrace(traceIndex)
    return (
      <section aria-label="Selected wire" className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Selected wire</h2>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <Row label="Start">{holeLabel(selectedTrace.a)}</Row>
          <Row label="End">{holeLabel(selectedTrace.b)}</Row>
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
