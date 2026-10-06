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
import { GridSizeFields } from "@/components/grid-size-fields"
import { parseDimension } from "@/lib/grid"

type ChangeSizeDialogProps = {
  cols: number
  rows: number
  traceCount: number
  onResize: (cols: number, rows: number) => void
}

type FieldErrors = {
  cols?: string
  rows?: string
}

export function ChangeSizeDialog({
  cols,
  rows,
  traceCount,
  onResize,
}: ChangeSizeDialogProps) {
  const [open, setOpen] = useState(false)
  const [colText, setColText] = useState(String(cols))
  const [rowText, setRowText] = useState(String(rows))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState<{ cols: number; rows: number } | null>(null)

  function close() {
    setOpen(false)
    setColText(String(cols))
    setRowText(String(rows))
    setErrors({})
    setPending(null)
  }

  function openDialog() {
    setColText(String(cols))
    setRowText(String(rows))
    setErrors({})
    setPending(null)
    setOpen(true)
  }

  function stage(nextCols: number, nextRows: number) {
    if (traceCount > 0) {
      setPending({ cols: nextCols, rows: nextRows })
      return
    }
    onResize(nextCols, nextRows)
    close()
  }

  function submitCustom() {
    const parsedCols = parseDimension(colText, "Columns")
    const parsedRows = parseDimension(rowText, "Rows")
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
    stage(parsedCols.value, parsedRows.value)
  }

  return (
    <>
      <Button type="button" variant="outline" className="h-11 shrink-0" onClick={openDialog}>
        Change size
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent className="sm:max-w-md">
          {pending ? (
            <>
              <DialogHeader>
                <DialogTitle>Clear traces and resize?</DialogTitle>
                <DialogDescription>
                  A {pending.cols} × {pending.rows} grid replaces this board and
                  removes {traceCount} {traceCount === 1 ? "trace" : "traces"}.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPending(null)}>
                  Go back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onResize(pending.cols, pending.rows)
                    close()
                  }}
                >
                  Clear and resize
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Change board size</DialogTitle>
                <DialogDescription>
                  {traceCount > 0
                    ? "Pick a new pin grid. Resizing clears every trace on this board."
                    : "Pick a new pin grid. This board has no traces yet."}
                </DialogDescription>
              </DialogHeader>
              <GridSizeFields
                idPrefix="resize"
                cols={colText}
                rows={rowText}
                errors={errors}
                onColsChange={setColText}
                onRowsChange={setRowText}
                onPreset={(presetCols, presetRows) => {
                  setColText(String(presetCols))
                  setRowText(String(presetRows))
                  setErrors({})
                  stage(presetCols, presetRows)
                }}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Keep this board
                </Button>
                <Button type="button" onClick={submitCustom}>
                  {traceCount > 0 ? "Review resize" : "Resize board"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
