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
    <div className="absolute top-3 left-3 z-20 flex max-h-[calc(100%-1.5rem)] flex-col gap-1 overflow-y-auto rounded-lg border border-white/15 bg-black/75 p-1 shadow-lg">
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
      <ToolButton label="Wire" pressed={tool === "wire"} onClick={() => onTool("wire")}>
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <circle cx="3.2" cy="12.2" r="1.25" fill="currentColor" />
          <circle cx="12.8" cy="3.8" r="1.25" fill="currentColor" />
          <path d="M4.3 11.1 11.7 4.9" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        </svg>
      </ToolButton>
      <ToolButton label="Resistor" pressed={tool === "resistor"} onClick={() => onTool("resistor")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <path
            d="M1.5 12h2.4l2.1-6.4 3.1 12.8 3.1-12.8 3.1 12.8 2.1-6.4H22.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolButton>
      <ToolButton label="Capacitor" pressed={tool === "capacitor"} onClick={() => onTool("capacitor")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <path
            d="M1.5 12h6.4M16.1 12H22.5M9.2 5.2v13.6M14.6 5.2v13.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>
      <ToolButton label="Diode" pressed={tool === "diode"} onClick={() => onTool("diode")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <path d="M1.5 12h3.2M17.4 12H22.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M5.2 6.4 16.2 12 5.2 17.6Z" fill="currentColor" />
          <path d="M16.8 6.4v11.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </ToolButton>
      <ToolButton label="LED" pressed={tool === "led"} onClick={() => onTool("led")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <path d="M1.2 15h2.6M14.6 15H18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 10.2 13.4 15 4 19.8Z" fill="currentColor" />
          <path d="M14 10.4v9.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M13.2 8.2 16.6 4.8M16.6 4.8h-2.8M16.6 4.8v2.8M16.4 9.6l3.4-3.4M19.8 6.2h-2.8M19.8 6.2v2.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ToolButton>
      <ToolButton label="Potentiometer" pressed={tool === "potentiometer"} onClick={() => onTool("potentiometer")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <rect x="3.2" y="2.4" width="17.6" height="8.4" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M6.4 10.8v4.2M12 10.8v4.2M17.6 10.8v4.2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M12 15v6.2" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      </ToolButton>
      <ToolButton label="Crystal" pressed={tool === "crystal"} onClick={() => onTool("crystal")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <rect x="6.2" y="2.2" width="11.6" height="13.2" rx="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9.2 15.4v6M14.8 15.4v6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      </ToolButton>
      <ToolButton label="Button" pressed={tool === "button"} onClick={() => onTool("button")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <path
            d="M1.4 7.2h4.2M1.4 16.8h4.2M18.4 7.2H22.6M18.4 16.8H22.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <rect x="6.4" y="4.4" width="11.2" height="15.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
      </ToolButton>
      <ToolButton label="Male header" pressed={tool === "male-header"} onClick={() => onTool("male-header")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <rect x="1.4" y="3.2" width="21.2" height="7.2" rx="1.2" fill="currentColor" />
          <path
            d="M5 10.2v8.2M9.7 10.2v8.2M14.3 10.2v8.2M19 10.2v8.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>
      <ToolButton label="Female header" pressed={tool === "female-header"} onClick={() => onTool("female-header")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <rect x="2" y="2.4" width="20" height="19.2" rx="2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <rect x="4.3" y="5.2" width="3" height="13.6" rx="1.1" fill="currentColor" />
          <rect x="8.8" y="5.2" width="3" height="13.6" rx="1.1" fill="currentColor" />
          <rect x="13.2" y="5.2" width="3" height="13.6" rx="1.1" fill="currentColor" />
          <rect x="17.7" y="5.2" width="3" height="13.6" rx="1.1" fill="currentColor" />
        </svg>
      </ToolButton>
      <ToolButton label="IC" pressed={tool === "ic"} onClick={() => onTool("ic")}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-8">
          <rect x="6.2" y="3.2" width="11.6" height="17.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9 3.2c0 2.8 6 2.8 6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M6.2 7.2H2.4M6.2 12H2.4M6.2 16.8H2.4M17.8 7.2H21.6M17.8 12H21.6M17.8 16.8H21.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </ToolButton>
    </div>
  )
}
