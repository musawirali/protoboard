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

export function ProjectList({ projects, onOpen, onCreate, onDelete }: ProjectListProps) {
  const [pending, setPending] = useState<SavedProject | null>(null)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Protoboard</h1>
        <Button type="button" className="h-11" onClick={onCreate}>
          New project
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-card px-4 py-8 text-center shadow-sm">
          <p className="text-base font-medium">No boards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a project to draw the first one.</p>
          <Button type="button" className="mt-4 h-11" onClick={onCreate}>
            New project
          </Button>
        </div>
      ) : (
        <ul aria-label="Saved projects" className="mt-8 flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="flex items-stretch gap-2 rounded-xl border bg-card p-3 shadow-sm">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(project)}>
                <span className="block truncate text-base font-medium">{project.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {project.cols} × {project.rows}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Updated {formatUpdated(project.updatedAt)}
                </span>
              </button>
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0 self-center"
                aria-label={`Delete ${project.name}`}
                onClick={() => setPending(project)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
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
