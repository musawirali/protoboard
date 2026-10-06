"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { GridSizeFields } from "@/components/grid-size-fields"
import { parseDimension } from "@/lib/grid"

type BoardSetupProps = {
  onCreate: (cols: number, rows: number) => void
}

type FieldErrors = {
  cols?: string
  rows?: string
}

export function BoardSetup({ onCreate }: BoardSetupProps) {
  const [cols, setCols] = useState("20")
  const [rows, setRows] = useState("100")
  const [errors, setErrors] = useState<FieldErrors>({})

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
        cols: parsedCols.error ?? undefined,
        rows: parsedRows.error ?? undefined,
      })
      return
    }
    setErrors({})
    onCreate(parsedCols.value, parsedRows.value)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Through-hole
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Protoboard</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Choose the pin grid before the board is drawn. A PCB trace runs along
        one row or one column of holes. Traces that share a hole, including
        where a row and column cross, join into one net.
      </p>
      <form
        className="mt-8 flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault()
          apply(cols, rows)
        }}
      >
        <div>
          <h2 className="text-sm font-medium">Grid size</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Presets are columns × rows. Custom sizes are whole numbers from 1 to
            120.
          </p>
        </div>
        <GridSizeFields
          idPrefix="setup"
          cols={cols}
          rows={rows}
          errors={errors}
          onColsChange={setCols}
          onRowsChange={setRows}
          onPreset={(presetCols, presetRows) => onCreate(presetCols, presetRows)}
        />
        <Button type="submit" className="h-11">
          Draw board
        </Button>
      </form>
    </main>
  )
}
