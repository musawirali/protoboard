import { Button } from "@/components/ui/button"
import type { Hole } from "@/lib/board"
import type { ToolName } from "@/lib/selection"

export type NetLegendItem = {
  name: string
  colorKey: number
  color: string
}

type TraceToolbarProps = {
  tool: ToolName
  draft: Hole | null
  netCount: number
  legend: NetLegendItem[]
  onCancel: () => void
}

export function TraceToolbar({ tool, draft, netCount, legend, onCancel }: TraceToolbarProps) {
  const netLabel = netCount === 1 ? "1 net" : `${netCount} nets`

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm leading-5 text-muted-foreground">
          {tool === "select"
            ? "Click a trace or a pin hole. Click empty board to clear the selection."
            : draft
              ? `Start is column ${draft.c + 1}, row ${draft.r + 1}. Click a hole on this row or column. A diagonal hole highlights, but it does not commit.`
              : "Click a pin hole to start. Click a hole on the same row or column to lay a straight trace."}
        </p>
        {tool === "trace" && draft ? (
          <Button type="button" variant="outline" className="mt-3 h-11 w-full" onClick={onCancel}>
            Cancel trace
          </Button>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-medium">{netCount === 0 ? "No nets yet" : netLabel}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          A trace takes the color of its net. Spans that share a hole, including a crossing, connect.
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
                {item.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
