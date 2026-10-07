"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GridSizeFields } from "@/components/grid-size-fields"
import { parseDimension } from "@/lib/grid"

type BoardSetupProps = {
  onCreate: (name: string, cols: number, rows: number) => void
  onBack: () => void
}

type FieldErrors = {
  name?: string
  cols?: string
  rows?: string
}

export function BoardSetup({ onCreate, onBack }: BoardSetupProps) {
  const [name, setName] = useState("")
  const [cols, setCols] = useState("20")
  const [rows, setRows] = useState("100")
  const [errors, setErrors] = useState<FieldErrors>({})

  function create(nextName: string, nextCols: number, nextRows: number) {
    const trimmed = nextName.trim()
    if (!trimmed) {
      setErrors((current) => ({ ...current, name: "Enter a project name." }))
      return
    }
    setErrors({})
    onCreate(trimmed, nextCols, nextRows)
  }

  function apply(nextCols: string, nextRows: string) {
    const parsedCols = parseDimension(nextCols, "Columns")
    const parsedRows = parseDimension(nextRows, "Rows")
    if (
      parsedCols.error ||
      parsedRows.error ||
      parsedCols.value == null ||
      parsedRows.value == null
    ) {
      setErrors({
        name: name.trim() ? undefined : "Enter a project name.",
        cols: parsedCols.error ?? undefined,
        rows: parsedRows.error ?? undefined,
      })
      return
    }
    create(name, parsedCols.value, parsedRows.value)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <button type="button" className="w-fit text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
        All projects
      </button>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">New project</h1>
      <form
        className="mt-8 flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          apply(cols, rows)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="text-sm font-medium">
            Project name
          </label>
          <Input
            id="project-name"
            value={name}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.name ? true : undefined}
            className="h-11"
            onChange={(event) => {
              setName(event.target.value)
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }))
            }}
          />
          {errors.name ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Required</p>
          )}
        </div>
        <div>
          <h2 className="text-sm font-medium">Grid size</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Presets are columns × rows. Custom sizes are whole numbers from 1 to 120.
          </p>
        </div>
        <GridSizeFields
          idPrefix="setup"
          cols={cols}
          rows={rows}
          errors={errors}
          onColsChange={setCols}
          onRowsChange={setRows}
          onPreset={(presetCols, presetRows) => {
            setCols(String(presetCols))
            setRows(String(presetRows))
            create(name, presetCols, presetRows)
          }}
        />
        <Button type="submit" className="h-11">
          Create project
        </Button>
      </form>
    </main>
  )
}
