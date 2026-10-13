import { useCallback, useRef, useState } from "react"
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
  onRecolorNet: (index: number, color: string) => void
}

function pickerHex(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : "#ffe14a"
}

function NetColorDot({
  name,
  color,
  onPick,
}: {
  name: string
  color: string
  onPick: (color: string) => void
}) {
  const hex = pickerHex(color)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const commitRef = useRef<(() => void) | null>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const setInput = useCallback((input: HTMLInputElement | null) => {
    if (inputRef.current && commitRef.current) {
      inputRef.current.removeEventListener("change", commitRef.current)
    }
    inputRef.current = input
    if (!input) {
      commitRef.current = null
      return
    }
    const commit = () => onPickRef.current(input.value)
    commitRef.current = commit
    input.addEventListener("change", commit)
  }, [])
  return (
    <span className="relative size-5 shrink-0">
      <button
        type="button"
        aria-label={`Color for ${name}`}
        className="size-5 cursor-pointer rounded-full ring-1 ring-white/30"
        style={{ backgroundColor: color }}
        onClick={() => {
          const input = inputRef.current
          if (!input) return
          try {
            if (typeof input.showPicker === "function") input.showPicker()
            else input.click()
          } catch {
            // The picker only opens from a real click.
          }
        }}
      />
      <input
        key={hex}
        ref={setInput}
        type="color"
        tabIndex={-1}
        aria-hidden
        defaultValue={hex}
        className="sr-only"
      />
    </span>
  )
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

export function TraceToolbar({ tool, draft, legend, onCancel, onRenameNet, onRecolorNet }: TraceToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      {tool === "trace" && draft ? (
        <Button type="button" variant="outline" className="h-11 w-full" onClick={onCancel}>
          Cancel trace
        </Button>
      ) : null}
      {tool === "wire" && draft ? (
        <Button type="button" variant="outline" className="h-11 w-full" onClick={onCancel}>
          Cancel wire
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
                <NetColorDot
                  name={item.name}
                  color={item.color}
                  onPick={(color) => onRecolorNet(item.index, color)}
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
