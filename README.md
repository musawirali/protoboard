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
4. **Resistor**, **Capacitor**, **Diode**, and **LED** place the physical part between two pin holes. The holes can be horizontal, vertical, or diagonal, up to 4 steps apart. A hole can hold one component pin. A capacitor is a ceramic disc until Polarized is turned on, which draws a round electrolytic can with the stripe toward the second pin. An LED is a round dome with the flat side toward the cathode. Escape or switching tools cancels an in-progress pin.
5. **Male header** and **Female header** place one strip along a row or a column, with no length limit and no diagonals. Every hole from the first click through the second belongs to that header. **IC** places a DIP with one click: that hole is pin 1. Pin count is an even number from 2 to 64, rail distance is the holes between the two rows, and rotation steps by 90°. A change that would leave the board or land on another component pin is ignored.
6. Escape, or **Cancel trace**, drops an in-progress trace. After the first click, a preview as thick as a committed trace follows a hole on that row or column. A header previews only when the end hole is on the same row or column and every hole in between is free.
7. **Nets** lists every net. Edit a name there and press Enter or click away. An empty name is ignored. The name shows on every trace and pin hole in that net. Component pins do not merge nets. **Remove** deletes only the selected trace or component.
8. **Undo** and **Redo** sit at the bottom of the screen. They step through trace edits, component placement, component names and values, IC pin count, rail distance, rotation, pin labels, and net renames, up to 20 moves. Ctrl/Cmd+Z undoes. Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes. A new part is named R1, C1, D1, L1, M1, F1, or I1, using the lowest free number. Headers and ICs have a name and no value. Other parts also have an optional value. An empty or duplicate name is ignored.
9. Drag empty board to pan. Use the wheel, pinch, or the zoom buttons to zoom.
10. **Change size** starts a new grid and clears undo history. If traces or components exist, confirm before they are cleared.
