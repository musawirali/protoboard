import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const GRID_PRESETS = [
  { cols: 20, rows: 100, label: "20 × 100" },
  { cols: 50, rows: 50, label: "50 × 50" },
] as const

type FieldErrors = {
  cols?: string
  rows?: string
}

type GridSizeFieldsProps = {
  idPrefix: string
  cols: string
  rows: string
  errors: FieldErrors
  onColsChange: (value: string) => void
  onRowsChange: (value: string) => void
  onPreset: (cols: number, rows: number) => void
}

export function GridSizeFields({
  idPrefix,
  cols,
  rows,
  errors,
  onColsChange,
  onRowsChange,
  onPreset,
}: GridSizeFieldsProps) {
  const colsId = `${idPrefix}-columns`
  const rowsId = `${idPrefix}-rows`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {GRID_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => onPreset(preset.cols, preset.rows)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={colsId} className="text-sm font-medium">
            Columns
          </label>
          <Input
            id={colsId}
            value={cols}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.cols ? true : undefined}
            className="h-11"
            onChange={(event) => onColsChange(event.target.value)}
          />
          {errors.cols ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.cols}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Pin holes across</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={rowsId} className="text-sm font-medium">
            Rows
          </label>
          <Input
            id={rowsId}
            value={rows}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.rows ? true : undefined}
            className="h-11"
            onChange={(event) => onRowsChange(event.target.value)}
          />
          {errors.rows ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.rows}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Pin holes down</p>
          )}
        </div>
      </div>
    </div>
  )
}
