# Protoboard

Place straight PCB traces on a through-hole protoboard and see which traces belong to the same net.

A trace runs from the center of one pin hole to another, at any angle. Traces join a net when they share a hole or their segments cross, meet at a T, or overlap along the same line. Each net keeps a stable color.

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

Unit tests cover net merging: a shared endpoint, a proper crossing, disjoint segments, colinear overlap, and a chain of three segments that becomes one net.

## Usage

1. Choose a grid before the board is drawn. Presets are 20×100 and 50×50. Custom sizes are whole numbers from 1 to 120 on each side.
2. **PCB Trace** is selected once the board exists. Click a pin hole, then a second hole, to commit a trace. Clicking the start hole again does not commit.
3. Escape, or **Cancel trace**, drops an in-progress start. After the first click, a preview follows the hovered hole.
4. Drag empty board to pan. Use the wheel, pinch, or the zoom buttons to zoom.
5. **Change size** starts a new grid. If traces exist, confirm before they are cleared.
