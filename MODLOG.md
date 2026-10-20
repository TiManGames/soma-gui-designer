# GUI renderer work log

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

