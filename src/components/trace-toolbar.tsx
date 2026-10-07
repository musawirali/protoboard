import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Hole } from "@/lib/board"
import type { ToolName } from "@/lib/selection"

export type NetLegendItem = {
  name: string
  colorKey: number
  color: string
  index: number
}

type TraceToolbarProps = {
  tool: ToolName
  draft: Hole | null
  legend: NetLegendItem[]
  onCancel: () => void
  onRenameNet: (index: number, name: string) => void
}

function NetNameField({
  item,
  onRenameNet,
}: {
  item: NetLegendItem
  onRenameNet: (index: number, name: string) => void
}) {
  const [value, setValue] = useState(item.name)
  return (
    <Input
      aria-label={`Net name ${item.name}`}
      value={value}
      className="h-8 min-w-0 flex-1"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        const next = value.trim()
        if (!next || next === item.name) {
          setValue(item.name)
          return
        }
        onRenameNet(item.index, next)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export function TraceToolbar({ tool, draft, legend, onCancel, onRenameNet }: TraceToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      {tool === "trace" && draft ? (
        <Button type="button" variant="outline" className="h-11 w-full" onClick={onCancel}>
          Cancel trace
        </Button>
      ) : null}
      <section aria-label="Nets" className="rounded-lg border bg-card p-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nets</h2>
        {legend.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No nets yet</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {legend.map((item) => (
              <li key={item.colorKey} className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <NetNameField key={item.name} item={item} onRenameNet={onRenameNet} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
