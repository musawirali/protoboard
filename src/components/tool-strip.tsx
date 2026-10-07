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
      <ToolButton label="Resistor" pressed={tool === "resistor"} onClick={() => onTool("resistor")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M1 8h2.2M12.8 8H15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="3.1" y="5.1" width="9.8" height="5.8" rx="2.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.1 5.2v5.6M6.9 5.2v5.6M8.7 5.2v5.6M10.7 5.2v5.6" stroke="currentColor" strokeWidth="1.15" />
        </svg>
      </ToolButton>
      <ToolButton label="Capacitor" pressed={tool === "capacitor"} onClick={() => onTool("capacitor")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M1.2 8h3.1M11.7 8H14.8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="8" r="3.35" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </ToolButton>
      <ToolButton label="Diode" pressed={tool === "diode"} onClick={() => onTool("diode")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M1 8h2.2M12.6 8H15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="3.1" y="5.2" width="9.4" height="5.6" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="8.7" y="5.35" width="2.35" height="5.3" fill="currentColor" />
        </svg>
      </ToolButton>
      <ToolButton label="LED" pressed={tool === "led"} onClick={() => onTool("led")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M1.2 8h2.6M11.1 8H14.7" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="7.2" cy="8" r="3.35" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.15 5.15v5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </ToolButton>
    </div>
  )
}
