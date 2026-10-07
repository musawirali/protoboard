import { useState, type ReactNode } from "react"
import { Redo2, Undo2 } from "lucide-react"

type UndoBarProps = {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

function Tip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white shadow-md"
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}

export function UndoBar({ canUndo, canRedo, onUndo, onRedo }: UndoBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center">
      <div
        aria-label="History"
        className="pointer-events-auto flex gap-1 rounded-lg border border-white/15 bg-black/75 p-1 shadow-lg"
      >
        <Tip label="Undo">
          <button
            type="button"
            aria-label="Undo"
            disabled={!canUndo}
            className="flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:text-white/35"
            onClick={onUndo}
          >
            <Undo2 aria-hidden className="size-4" />
          </button>
        </Tip>
        <Tip label="Redo">
          <button
            type="button"
            aria-label="Redo"
            disabled={!canRedo}
            className="flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15 disabled:text-white/35"
            onClick={onRedo}
          >
            <Redo2 aria-hidden className="size-4" />
          </button>
        </Tip>
      </div>
    </div>
  )
}
