import { useState, type ReactNode } from "react"
import type { ToolName } from "@/lib/selection"

type ToolStripProps = {
  tool: ToolName
  onTool: (tool: ToolName) => void
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
          className="pointer-events-none absolute top-1/2 left-full z-30 ml-2 -translate-y-1/2 rounded-md bg-black px-2 py-1 text-xs whitespace-nowrap text-white shadow-md"
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        className={
          pressed
            ? "flex size-10 items-center justify-center rounded-md bg-white text-zinc-900 shadow-sm"
            : "flex size-10 items-center justify-center rounded-md text-white hover:bg-white/15"
        }
        onClick={onClick}
      >
        {children}
      </button>
    </Tip>
  )
}

export function ToolStrip({ tool, onTool }: ToolStripProps) {
  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 rounded-lg border border-white/15 bg-black/75 p-1 shadow-lg">
      <ToolButton label="Select" pressed={tool === "select"} onClick={() => onTool("select")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M3.2 1.8 13 7.6 7.6 8.8 6.2 14.2Z" fill="currentColor" />
        </svg>
      </ToolButton>
      <ToolButton label="PCB Trace" pressed={tool === "trace"} onClick={() => onTool("trace")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <circle cx="3" cy="8" r="1.7" fill="currentColor" />
          <circle cx="13" cy="8" r="1.7" fill="currentColor" />
          <path d="M3.4 8h9.2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </ToolButton>
    </div>
  )
}
