# Protoboard

Place straight PCB traces on a through-hole protoboard and see which traces belong to the same net.

A trace runs along a single row or column and covers every pin hole on that span. A diagonal pair does not commit. Traces join a net when their spans share a hole, including the intersection of a crossing and overlapping holes on the same line. Each net keeps a stable color.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on port **4317** and host `0.0.0.0`. Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

## Tests

```bash
npm test
```

Unit tests cover axis-aligned spans, joins through an intermediate hole, crossings at the shared intersection hole, and rejection of diagonal pairs.

## Usage

1. Choose a grid before the board is drawn. Presets are 20×100 and 50×50. Custom sizes are whole numbers from 1 to 120 on each side.
2. **Select** is the arrow at the left of the board, and it is the default. Click one trace, component, or pin hole. Click empty board to clear the selection. Moving the pointer does not start a trace or a component.
3. **PCB Trace** is the lane icon under Select. It draws only after you choose it. Click a pin hole, then a hole on the same row or column, to commit a trace. The hovered hole is highlighted. A diagonal hole highlights but does not commit. Switching tools cancels an in-progress start.
4. **Resistor**, **Capacitor**, and **Diode** place a symbol between two pin holes. The holes can be horizontal, vertical, or diagonal, up to 4 steps apart. A hole can hold one component pin. Capacitors can be marked polarized. Escape or switching tools cancels an in-progress pin.
5. Escape, or **Cancel trace**, drops an in-progress trace. After the first click, a preview as thick as a committed trace follows a hole on that row or column.
6. **Nets** lists every net. Edit a name there and press Enter or click away. An empty name is ignored. The name shows on every trace and pin hole in that net. Component pins do not merge nets. **Remove** deletes only the selected trace or component.
7. **Undo** and **Redo** sit at the bottom of the screen. They step through trace edits, component placement, and net renames, up to 20 moves. Ctrl/Cmd+Z undoes. Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes.
8. Drag empty board to pan. Use the wheel, pinch, or the zoom buttons to zoom.
9. **Change size** starts a new grid and clears undo history. If traces or components exist, confirm before they are cleared.
