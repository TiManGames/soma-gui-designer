# SOMA GUI rendering fidelity

Version 0.5 uses one WebGL2 render surface. Selection, resizing, snapping, and
dragging remain editor overlays. The target is the GUI before a terminal's 3D
surface, camera, lighting, color grading, distortion, and noise.

## Sources and confirmed corrections

The local copies of `helper_imgui.hps`, `helper_font.hps`, the station basics and
station helpers, the numpad, and station apps common helper were compared with
the installed game. All six files matched. Native behavior was inspected through
the script registration index and recovered GUI routines in
`C:\Projects\SOMA-HPL3-Reconstruction`. These findings describe engine behavior;
they do not imply that a decompiler listing is original source.

| Behavior | Evidence | Correction |
| --- | --- | --- |
| Texture tint and transparency | Native DrawGfx multiplies RGBA channels; window border TGAs contain black pixels with alpha 191/255 | Texture × vertex color in a shader, followed by the material blend. Black stays black. |
| Short gauge corners | All four station gauge TGAs are 16×16; lower TGAs use a different origin flag | Preserve both TGA origin bits. Anchor corners to the widget's actual bottom/right even below 32 pixels. |
| Frame geometry | Native DrawFrame reads each corner and border's dimensions separately, with a two-pixel fallback for solid graphics | Independent pieces and interior fills; no CSS grid, uniform corner size, or synthetic slanted polygon. |
| Window captions | Factory uses Sansation additive bitmap font and fit-caption header; helper shrinks oversized captions | BMFont advances, offsets, native alignment and caption fitting. |
| Window content | DoWindowStart subtracts header height and content padding from its child group | Shared resolved content frames for drawing, hit boxes, and dragging. |
| Font blending | Alpha/FontNormal use source-alpha blending; Additive uses ONE/ONE; PremulAlpha uses ONE/ONE_MINUS_SRC_ALPHA | Explicit GPU material state. No browser font substitution or fake text shadows. |
| Texture sampling | cFrameSubImage applies a .001 atlas UV inset; the native probe confirms 1024×1024 image atlases. Font glyphs use the same inset against their own pages | Match the image and glyph UV crop, including thin outlines. |
| Generic font size | cImGuiFont constructor keeps size 16 even when its empty face falls back to GuiHandler's font | Use the default face with the widget's constructor size; normalize BMFont metrics by line height and outline. |
| Layout and depth | Layout positioning adds child offsets to a running cursor. Group depth accumulates | Shared cursor geometry including XY wrapping and zero-spacing X_Tabbed; stable depth sorting. |
| Generic control defaults | `base/GuiHandler.hps` supplies default sliders, checkboxes and multi-selects | Use those resources and exported default getters, separately from station factories. |
| Data-bearing exports | Widgets without station factories previously emitted blank arguments | Native getters or frame constructor followed by ordered overrides. |
| Frame export | The retail compiler rejects the nonexistent ImGui_DoFrame helper | Call cLux_GetCurrentImGui().DoFrame with the frame data. |
| Text reader positioning | Text-reader helper normalizes its own position/size arguments | Export normalized vectors directly, avoiding double normalization. |
| Overrides and resources | HPS executes assignments and setters in order; mod resource paths may differ from base paths | Last applicable override wins. Resolve mod resources before base, retaining extensions. |

## Widget coverage

All 26 built-in types have render behavior. `advanced-imgui` stays a labeled
editor block: its custom HPS is exported and must run in SOMA.

| Types | Rendering and state coverage |
| --- | --- |
| Station window | Separate outer/header frames, font, padding, optional ornaments, nested child coordinates |
| Group, layout | Invisible coordinate containers; native flow and accumulated depth |
| Station button, toggle, repeat button | Frame and background flags, additive captions, clipping/scroll time, focus/trigger/disabled colors |
| Checkbox | Generic box, check overlay, focus overlay, caption and disabled tint |
| Horizontal/vertical slider | Generic track and thumb, value/range, focus and trigger overlays |
| Multi-toggle | Button grid, column count and selected item |
| Multi-select | Current item, arrows, caption and focus graphics |
| Label, text frame | Bitmap glyphs, alignment, wrapping and text-frame clipping/scroll rows |
| Image, fill, frame | Image aspect correction, native solid graphics and frame parts |
| Flat color, scanlines, backdrop | Parent/screen geometry, actual tint/opacity, additive scanlines and UV repetition |
| Four corner ornaments | Alignment, natural aspect, local resource and color overrides |
| Numpad | Composed display window, digit/action buttons and preview input |
| Single text reader | Nested window, wrapped body, margins and preview scroll position |

Preview state is transient and never saved into schema-v4 documents or generated
HPS. The document's existing Enabled flag controls exported input modifiers;
disabling a container also disables input in its descendants.
Preview coordinates follow the four decimal values emitted into HPS, preventing
subpixel rounding from changing which pixels a gauge edge covers.

## Local resources

Configure `somaGui.baseGameGraphicsPath` and optionally `somaGui.modGraphicsPath`.
Font roots default to the adjacent `fonts` directories. Use
`somaGui.baseGameFontsPath` or `somaGui.modFontsPath` for nonstandard layouts.
Fonts and textures remain in the user's installation; they are not in the VSIX.

TGA decoding supports uncompressed/RLE true color and grayscale, RGBA, and both
origin bits. DDS supports alpha-only font atlases, masked RGB/RGBA and BC1/2/3.
PNG/JPEG use browser image decoding. Unsupported/missing resources, unknown
expressions, animated graphics types, and custom HPS produce preview notices.
The safe expression evaluator supports literals, palette colors, vectors,
component assignments, normalized size helpers, arithmetic, SetFile and padding
setters; it never executes arbitrary HPS or JavaScript.

## Reproducing validation

Run `npm test`, both TypeScript checks, `npm run lint`, `npm run build`, and
`npm run package`. Extract against a retail tree with
`npm run extract -- --game-root "<SOMA directory>"` or `SOMA_ROOT`.
Portable extraction tests use an authored syntax fixture rather than game data.

For visual checks, run:

```powershell
node --import tsx scripts/preview-lab.mts --game-root "<SOMA directory>"
```

Open `http://127.0.0.1:5197`. The lab uses the production scene builder and GPU
renderer, loads real local resources for every built-in type, checks blend
equations through framebuffer readback, and writes `.cache/preview-lab/editor.png`
and `results.json`. The frozen document is `test/fixtures/parity-document.json`;
the corresponding VS Code document is `test/fixtures/parity.somagui.json`.
Generated `.cache/preview-lab/parity.hps` is the native comparison input.
The lab also exports all 26 built-ins to `catalog.hps` for native compilation.

`scripts/vscode-smoke.cjs` runs in a separate extension test host and waits for
the actual webview to finish loading resources. Its development-only diagnostic
command is unavailable in a production installation.

`scripts/native-parity.py` requires Frida/Pillow and the specified local
reconstruction directory. It copies sample-map files to a private test fixture,
redirects the test profile, reads GPU pixels, then stops only its own process.
Native assets and captures stay in `.cache`, outside the package. SOMA's CLI
truncates hyphenated arguments, so its CLI inputs use a temporary safe path.
The fixture explicitly matches the document's GUI virtual size and shipped
default font. An 800×600 OS viewport alone leaves the map GUI at a different
virtual size, changing fixed-size corners and generic fonts.

Run `python scripts/compare-parity.py` with Pillow after both captures. It saves
`comparison.png`, a four-times amplified difference, and `comparison.json`.

## Validation limits

99 tests, both TypeScript checks, lint, production build, real-asset browser
readback and the real VS Code webview smoke test passed. The retail SOMA compiler
accepted all 26 built-in exports. The frozen 800×600 native comparison matched
99.9983% of pixels within two RGB byte values; all 445,500 flat interior pixels
matched exactly. Eight edge/overlay pixels exceeded that tolerance. This is
measured parity for this fixture, not proof of every possible override or state.
The supplied in-game screenshot includes monitor effects, and its test script
differs from the saved document, so it cannot serve as an exact pixel baseline.

Translation categories are shown as their authored entry keys unless text is
literal. Raw custom code, arbitrary runtime expressions, externally changed
engine defaults, animations/video, and terminal post-processing require SOMA.
PNG/JPEG browser decoding may round semitransparent RGB; the shipped TGA/DDS path
uses raw, unpremultiplied bytes. Missing preview data is reported, never silently
treated as proof of in-game accuracy.

