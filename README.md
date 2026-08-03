# SOMA GUI Designer

Visual builder for **SOMA / HPL3** ImGui terminal & HUD screens, delivered as a
**VS Code extension**. Drag-and-drop GUI widgets on a canvas; the extension generates
the AngelScript (`.hps`) that maps drop into their `OnGui` callbacks — eliminating most
of the hand-coding for in-game terminals. No Node.js or local server to run — install
the `.vsix` and edit inside VS Code.

Built with React + TypeScript + Vite (the UI runs in a webview) plus a small VS Code
extension host. A project is a `*.somagui.json` file edited through a custom editor, so
open/save/dirty/undo/hot-exit are native VS Code behaviors.

## Install & use

1. Build the `.vsix` (below) or obtain a prebuilt one.
2. Install it: `code --install-extension soma-gui-designer-<version>.vsix`, or in VS Code
   → Extensions → "…" → **Install from VSIX…**.
3. Run **"SOMA GUI: New Project"** from the Command Palette to create and open a
   `*.somagui.json`, or open any existing `*.somagui.json` — it launches in the designer.
4. Design your screen, then **Copy Code** (clipboard) or **Write .hps** (save the
   generated AngelScript to a file). Paste/point it into your SOMA mod.

## Build

```bash
npm install
npm run build     # webview (Vite) -> dist/webview + host (esbuild) -> dist/extension.js
npm run package   # -> soma-gui-designer-<version>.vsix   (via @vscode/vsce)
npm test          # Vitest suite (core model + codegen)
```

Press **F5** in VS Code to launch an Extension Development Host with the extension loaded
(runs the build first). `npm run extract` regenerates `src/data/api-schema.json` from the
bundled SOMA source; it runs automatically before builds.

## Architecture

```
src/
  core/        framework-agnostic (no React, no DOM, no vscode) — shared by BOTH the
               webview UI and the extension host
    model/     typed node model, defaults, tree, geometry, hit-testing
    codegen/   HPS generator (data-driven emitter registry)
    schema/    typed accessors over the extracted API schema
    validate/  document + schema-aware validation
    protocol.ts  host <-> webview message contract
  extension/   VS Code host (Node): activate, CustomTextEditorProvider, webview HTML
  ui/          React webview (Zustand store, canvas, panels); vscodeApi.ts bridge
  data/        api-schema.json (generated, committed)
scripts/       extract-api-schema.ts (build-time source parser)
test/          codegen parity, geometry/reparent, validation, extraction, serialize
```

- **Two build targets, one shared core** — the webview UI (Vite → `dist/webview/`) and
  the extension host (esbuild → `dist/extension.js`) both import the pure `src/core/`
  library. An ESLint rule forbids React/DOM/vscode imports inside `core/`.
- **Data model** — a discriminated union of widget nodes over a shared base;
  coordinates normalized 0..1 relative to the parent (root = `"screen"`); `z` is draw depth.
- **Code generation** — a data-driven emitter registry (one entry per widget type)
  produces the include block, function header, `ImGui_SetTransCategory`, z-sorted widget
  calls, and `StationGui_*`/`ImGui_*` API calls. Locked by a golden-fixture parity test.
- **API grounding** — a build-time parser extracts widget data-struct fields, enums,
  StationGui factories, wrapper signatures, and the Station palette from
  `soma_scripts/` into `api-schema.json`. This powers typed property
  editors (color pickers with palette swatches, enum dropdowns, ...) and schema-aware
  validation. The build fails if the widget catalog references an API that no longer
  exists. On a checkout without `soma_scripts/`, the committed schema is used as-is.

## Persistence

A project is a `*.somagui.json` file (schema v4) edited via a VS Code **custom text
editor**. The file is the single source of truth: the webview posts edits to the host,
which applies them to the `TextDocument` — so **save (Ctrl+S), dirty state, undo/redo,
and hot-exit are native VS Code behaviors**. Every widget's layout, properties, and
overrides live in that file, independent of the game scripts. There is **no migration
between schema versions**: a document whose `schemaVersion` differs from the current one
is rejected on load (bump `CURRENT_SCHEMA_VERSION` when the shape changes).

## Features

- Palette of containers (window, group), elements (button, toggle, label, text frame,
  image, gauge, fill), helpers (numpad, text reader), and an advanced raw-HPS block.
- Canvas with move/resize, grid snap, and **drag-to-reparent** into windows/groups
  (cycle-safe, coordinates renormalized to the new parent).
- Hierarchy tree with drag-and-drop reparenting.
- **Per-widget typed property panels** driven by the extracted struct schema, with a
  raw-expression / method-call escape hatch.
- Live HPS + preload code preview; **Copy Code** (clipboard) and **Write .hps** (save
  generated AngelScript to a file) via native VS Code dialogs.
- Undo/redo (in-canvas), with native VS Code save/undo at the file level.
- Resolution presets and normalized layout that survives resolution changes.

## Notes

Generated code still needs manual gameplay logic (button handlers, sounds, state
transitions) — the generator emits `// TODO` scaffolding at those points, matching how
SOMA terminals are wired. Paste the generated function into a map or helper `.hps`.
