# GUI renderer work log

## 2026-10-21 — SOMA GUI Designer 0.6.2

- Fixed automatic Fit oscillating when selection labels or other canvas content
  caused scrollbars to appear and disappear. Fit now measures and observes the
  assigned outer viewport; manual zoom keeps using its visible client area.
- Let the Fit scroll surface follow the client area so temporary overflow does
  not leave unnecessary scrollbars behind. Actual panel and resolution changes
  still recalculate Fit.
- Verified the previously failing 832 × 677 viewport with a 768 × 613 canvas and
  a selected label at the right edge, using normal scrollbar gutters. All 84
  browser cases passed across interface scaling, pixel densities, resizing,
  selection changes, and manual zoom transitions, without ResizeObserver errors.
- Verified resizing and reparenting at 25/100/200% zoom, 127 automated tests,
  lint, both TypeScript targets, and the packaged production build.

## 2026-10-20 — SOMA GUI Designer 0.6.1

- Removed the redundant Insert button from the top toolbar.
- Applied explicit dark colors to select popups and the zoom selector.
- Made locked-layer icons red, including on hover, while leaving visibility
  indicators unchanged.

## 2026-10-20 — SOMA GUI Designer 0.6.0

- Added a compact charcoal workspace with consistent SVG controls, collapsible
  sidebars, a focus mode, and a dock that starts collapsed for new installations.
- Added viewport-aware Fit, 10–400% manual zoom, pointer-centered wheel zoom,
  Space-drag panning, and shared scaling for move, resize, and drop targeting.
- Split the inspector into Design, Style, and Advanced. Property groups remember
  their state, and Style previews inherited factory values without saving them.
- Added a searchable Insert popover, permanent Project settings, keyboard tab and
  menu navigation, and validation links that reveal affected widgets.
- Kept schema v4, generated HPS, renderer behavior, and existing preferences.
  Moved starter-layout reset into Project settings and removed the empty Output tab.
- Verified browser layout at 900/1280/1920px and 125% scaling; pointer resize and
  reparent at 25/100/200% zoom; insertion, focus restoration, export, and validation
  navigation. The automated suite covers unchanged HPS and UI-only navigation.

## 2026-10-20 — SOMA GUI Designer 0.5.1

- Matched widget controls to their data types, including numeric slider fields,
  boolean checkboxes, enum dropdowns, and graphics file pickers.
- Added explicit Value / Expression editing while preserving AngelScript formulas.
- Added Text Reader settings metadata, integer count handling, and consistent
  graphics override selection and clearing.
- Added the 768 × 613 (Default Station Terminal) resolution preset.
- Verified 117 tests, headless input interactions, lint, both TypeScript targets,
  and the production build. Desktop automation is not used for further validation.

## 2026-10-20 — SOMA GUI Designer 0.5

- Compared six local GUI helper files with the installed SOMA scripts; hashes matched.
- Inspected reconstructed DrawGfx, DrawFrame, DoWindowStart, DoGauge, label,
  text-frame, layout cursor, GUI data constructors, and material blend behavior.
- Confirmed black alpha-191 window pixels were being colored by the old CSS
  overlay. Confirmed 16×16 corners overflowed the old 30-pixel gauge grid.
- Added shared rendering, raw TGA/DDS decoding, bitmap fonts, native-style frame
  geometry, state controls, resource precedence and missing codegen initializers.
- Found and corrected text-reader double normalization and layout child offsets.
- Browser framebuffer checks passed for black alpha, transparent colored texels,
  multiplication before blending, and ONE/ONE additive composition.
- VS Code 0.5 smoke test settled at 177 quads and 40 ready resources without
  diagnostics, using a separate test host and profile.
- Native capture found SOMA's CLI truncates hyphenated paths and SDL's dynamic
  API bypasses export hooks. A private temporary CLI path and verified native
  swap wrapper produced raw GPU captures without sending mouse or keyboard input.
- Matched the GUI virtual resolution separately from the OS viewport. Confirmed
  1024px image atlas UV insets, glyph page insets, and constructor font size.
- Compiled exports for all 26 built-in types in retail SOMA. This caught the
  nonexistent frame helper, corrected to the engine's DoFrame method.
- The 800×600 fixture matched 99.9983% of pixels within two RGB bytes. All
  445,500 flat interior pixels matched exactly; eight edge/overlay pixels exceeded
  tolerance. 99 portable tests passed. Other runtime states remain bounded by
  the documented coverage rather than a universal pixel-perfect claim.
- Detailed source mapping, supported behavior, test commands and limits are in
  `docs/GUI-RENDERING.md`. No extracted game assets or decompiled code are shipped.

