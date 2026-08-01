# SOMA GUI Designer

Visual builder for **SOMA / HPL3** ImGui terminal & HUD screens. Drag-and-drop GUI
widgets on a canvas; the app generates the AngelScript (`.hps`) that maps drop into
their `OnGui` callbacks — eliminating most of the hand-coding for in-game terminals.

This is a ground-up rebuild (React + TypeScript + Vite) of the original vanilla-JS
prototype, which is preserved under [`legacy/`](legacy/) for reference. The generated
code is byte-for-byte compatible with the prototype's proven output and is grounded in
the real SOMA API (see "API grounding").

## Run

```bash
npm install
npm run dev      # Vite dev server (regenerates the API schema first)
npm run build    # static bundle -> dist/  (deployable anywhere)
npm test         # Vitest suite
```

`npm run extract` regenerates [`src/data/api-schema.json`](src/data/api-schema.json)
from the bundled SOMA source; it runs automatically before `dev` and `build`.

## Architecture

```
src/
  core/        framework-agnostic (no React) — reusable by a future VS Code webview
    model/     typed node model, defaults, tree, geometry, hit-testing, migration
    codegen/   HPS generator (data-driven emitter registry)
    schema/    typed accessors over the extracted API schema
    validate/  document + schema-aware validation
  ui/          React app (Zustand store, canvas, palette, property panels, code output)
  data/        api-schema.json (generated, committed)
scripts/       extract-api-schema.ts (build-time source parser)
test/          codegen parity, geometry/reparent, validation, extraction, migration
```

- **Data model** — a discriminated union of widget nodes over a shared base;
  coordinates normalized 0..1 relative to the parent (root = `"screen"`); `z` is draw depth.
- **Code generation** — a data-driven emitter registry (one entry per widget type)
  produces the same include block, function header, `ImGui_SetTransCategory`, z-sorted
  widget calls, and `StationGui_*`/`ImGui_*` API calls the prototype emitted. Locked by a
  byte-for-byte parity test.
- **API grounding** — a build-time parser extracts widget data-struct fields, enums,
  StationGui factories, wrapper signatures, and the Station palette from
  [`soma_scripts/`](soma_scripts/) into `api-schema.json`. This powers typed property
  editors (color pickers with palette swatches, enum dropdowns, ...) and schema-aware
  validation. The build fails if the widget catalog references an API that no longer exists.

## Features

- Palette of containers (window, group), elements (button, toggle, label, text frame,
  image, gauge, fill), helpers (numpad, text reader), and an advanced raw-HPS block.
- Canvas with move/resize, grid snap, and **drag-to-reparent** into windows/groups
  (cycle-safe, coordinates renormalized to the new parent).
- Hierarchy tree with drag-and-drop reparenting.
- **Per-widget typed property panels** driven by the extracted struct schema, with a
  raw-expression / method-call escape hatch.
- Live HPS + preload code preview; copy to clipboard.
- Undo/redo, localStorage autosave, JSON import/export, and **v3→v4 import migration**
  (prototype `settingsText` → structured overrides).
- Resolution presets and normalized layout that survives resolution changes.

## Notes

Generated code still needs manual gameplay logic (button handlers, sounds, state
transitions) — the generator emits `// TODO` scaffolding at those points, matching how
SOMA terminals are wired. Paste the generated function into a map or helper `.hps`.
