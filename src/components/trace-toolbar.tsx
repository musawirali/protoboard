import { Button } from "@/components/ui/button"
import type { Hole } from "@/lib/board"

export type NetLegendItem = {
  label: number
  colorKey: number
  color: string
}

type TraceToolbarProps = {
  draft: Hole | null
  netCount: number
  legend: NetLegendItem[]
  onCancel: () => void
}

export function TraceToolbar({ draft, netCount, legend, onCancel }: TraceToolbarProps) {
  const netLabel = netCount === 1 ? "1 net" : `${netCount} nets`

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Tools
        </p>
        <Button type="button" aria-pressed="true" className="mt-2 h-11 w-full">
          PCB Trace
        </Button>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {draft
            ? `Start is column ${draft.c + 1}, row ${draft.r + 1}. Click a second hole to commit. The same hole does not draw a trace.`
            : "Click a pin hole to start. Click a second hole to commit a straight trace at any angle."}
        </p>
        {draft ? (
          <Button type="button" variant="outline" className="mt-3 h-11 w-full" onClick={onCancel}>
            Cancel trace
          </Button>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-medium">{netCount === 0 ? "No nets yet" : netLabel}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          A trace takes the color of its net. Shared holes, crossings, and overlaps connect.
        </p>
        {legend.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {legend.map((item) => (
              <li
                key={item.colorKey}
                className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-xs"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                Net {item.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
