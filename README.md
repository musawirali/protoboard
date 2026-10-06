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
2. **PCB Trace** is selected once the board exists. Click a pin hole, then a hole on the same row or column, to commit a trace. The hovered hole is highlighted. A diagonal hole highlights but does not commit.
3. Escape, or **Cancel trace**, drops an in-progress start. After the first click, a preview as thick as a committed trace follows a hole on that row or column.
4. Drag empty board to pan. Use the wheel, pinch, or the zoom buttons to zoom.
5. **Change size** starts a new grid. If traces exist, confirm before they are cleared.
