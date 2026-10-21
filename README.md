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

WYSIWYG uses a shared WebGL2 renderer with local SOMA bitmap fonts, native material
blending, independent frame corners, and editor-only widget state controls.
Configure your game `graphics` directory; fonts are found alongside it or through
the optional font-path settings. See [rendering fidelity and validation](docs/GUI-RENDERING.md)
for source findings, coverage, local visual checks, and remaining limits.

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

## Workspace controls

- **Insert** opens a searchable widget picker while keeping Layers visible. Use
  Down Arrow to focus its first result, Enter to insert, and Escape to close.
- **Design / Style / Advanced** organize the inspector. Style shows inherited
  factory values without creating overrides; **fx** switches a field to an
  AngelScript expression. Hover a field label for its exact API name. Property
  groups remember whether you left them expanded or collapsed.
- **Project settings** is always available in the top toolbar. It contains the
  callback, function name, translation category, custom resolution, and reset
  action, and preserves the current widget selection.
- **Fit** uses the available width and height. Choose **100%** for actual pixels,
  or zoom from **10–400%**. **Ctrl/Cmd + scroll** zooms around the pointer;
  **Space + drag** or middle-mouse drag pans. **Grid** visibility and **Snap** are
  separate controls. **Game textures / Wireframe** changes canvas rendering.
- Top-bar panel buttons collapse either sidebar. **Focus canvas** temporarily
  hides both sidebars and the bottom dock; Escape restores the previous layout.
- The code dock starts collapsed for new users. Click a **Problem** to reveal
  its widget in Layers and the canvas, or open Project settings for screen issues.
  Export contains **Copy HPS**, **Copy preload**, and **Write .hps file**.

Panel sizes, collapsed groups, and inspector preferences stay in editor storage.
Zoom, panning, and focus mode never modify project JSON or generated code. The
existing schema v4 project format and game rendering remain unchanged.

## Notes

Generated code still needs manual gameplay logic (button handlers, sounds, state
transitions) — the generator emits `// TODO` scaffolding at those points, matching how
SOMA terminals are wired. Paste the generated function into a map or helper `.hps`.
