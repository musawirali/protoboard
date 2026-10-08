import { describe, expect, it } from "vitest"
import { loadProjects, parseProjects, PROJECTS_KEY, saveProjects, sortProjects, type SavedProject } from "./projects"

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function project(name: string, updatedAt: number, extra?: Partial<SavedProject>): SavedProject {
  return {
    id: name,
    name,
    cols: 12,
    rows: 10,
    updatedAt,
    traces: [],
    parts: [],
    ...extra,
  }
}

describe("saved projects", () => {
  it("sorts newest first", () => {
    expect(sortProjects([project("Older", 10), project("Newer", 20)]).map((item) => item.name)).toEqual([
      "Newer",
      "Older",
    ])
  })

  it("round-trips traces, wires, parts, and net names", () => {
    const storage = memory()
    const saved = project("Bench", 50, {
      cols: 20,
      rows: 100,
      traces: [
        { id: "t", a: { c: 1, r: 2 }, b: { c: 4, r: 2 }, name: "Power" },
        { id: "w", a: { c: 1, r: 2 }, b: { c: 3, r: 5 }, kind: "wire" },
      ],
      parts: [
        {
          id: "r",
          kind: "resistor",
          name: "R1",
          value: "1k Ohms",
          a: { c: 0, r: 1 },
          b: { c: 3, r: 1 },
        },
        {
          id: "s",
          kind: "button",
          name: "S1",
          value: "",
          a: { c: 1, r: 6 },
          b: { c: 3, r: 8 },
        },
        {
          id: "c",
          kind: "capacitor",
          name: "C1",
          value: "",
          a: { c: 0, r: 4 },
          b: { c: 2, r: 4 },
          polarized: true,
        },
        {
          id: "u",
          kind: "ic",
          name: "I1",
          value: "",
          a: { c: 2, r: 2 },
          b: { c: 2, r: 2 },
          pinCount: 8,
          railDistance: 1,
          rotation: 90,
          pinLabels: ["VCC", ""],
        },
      ],
    })
    saveProjects(storage, [saved])
    const loaded = loadProjects(storage)
    expect(loaded).toEqual([saved])
    expect(storage.getItem(PROJECTS_KEY)).toContain("Power")
  })

  it("drops a corrupt entry and keeps the valid project", () => {
    const parsed = parseProjects([
      project("Kept", 5),
      { id: "bad", name: "", cols: 12, rows: 10, updatedAt: 9, traces: [], parts: [] },
      { name: "missing id" },
    ])
    expect(parsed.map((item) => item.name)).toEqual(["Kept"])
  })

  it("returns an empty list when storage is empty or unreadable", () => {
    expect(loadProjects(memory())).toEqual([])
    expect(loadProjects({ getItem: () => "{" })).toEqual([])
  })
})
