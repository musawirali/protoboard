"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatUpdated, type SavedProject } from "@/lib/projects"

type ProjectListProps = {
  projects: readonly SavedProject[]
  onOpen: (project: SavedProject) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      className={
        hot
          ? "inline-flex h-10 shrink-0 items-center rounded-lg bg-zinc-300 px-3.5 text-sm font-medium text-zinc-950 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          : "inline-flex h-10 shrink-0 items-center rounded-lg bg-white px-3.5 text-sm font-medium text-zinc-950 shadow-sm transition-colors hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      }
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onClick={onClick}
    >
      New project
    </button>
  )
}

export function ProjectList({ projects, onOpen, onCreate, onDelete }: ProjectListProps) {
  const [pending, setPending] = useState<SavedProject | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <main className="min-h-dvh bg-[#14120f] text-zinc-100">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Protoboard</h1>
          <NewProjectButton onClick={onCreate} />
        </header>
        {projects.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-200">No boards yet</p>
            <p className="mt-1 text-sm text-zinc-500">Create a project to draw the first one.</p>
          </div>
        ) : (
          <ul aria-label="Saved projects" className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            {projects.map((project) => (
              <li
                key={project.id}
                className={
                  hoveredId === project.id
                    ? "group flex items-center border-b border-white/10 bg-white/[0.06] transition-colors last:border-b-0"
                    : "group flex items-center border-b border-white/10 transition-colors last:border-b-0 hover:bg-white/[0.06]"
                }
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                  onClick={() => onOpen(project)}
                >
                  <span className="block truncate text-[15px] font-semibold text-white">{project.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <span>
                      {project.cols} × {project.rows}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatUpdated(project.updatedAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${project.name}`}
                  className="mr-3 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
                  onClick={() => setPending(project)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pending?.name}?</DialogTitle>
            <DialogDescription>This removes the saved board from this browser.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pending) return
                onDelete(pending.id)
                setPending(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
