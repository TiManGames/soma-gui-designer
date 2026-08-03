import type { Override } from "./nodes";

/**
 * Read a named `expr`-kind parameter from a node's overrides, falling back to a
 * default when the path is not present. Shared by the codegen emitters and the
 * WYSIWYG canvas so both interpret override values identically.
 */
export function getParam(overrides: Override[], path: string, def: string): string {
  const found = overrides.find((o) => o.kind === "expr" && o.path === path);
  return found && found.kind === "expr" ? found.expr : def;
}

/**
 * Extract a texture file path from a cImGuiFrameGfx sub-field override.
 * Handles both:
 *   kind:"expr"  path="mGfxFrame.mGfxCornerTopLeft"  expr='cImGuiGfx("path/to/tex")'
 *   kind:"call"  call="mGfxFrame.mGfxCornerTopLeft.SetFile(\"path/to/tex\")"
 * Falls back to `def` if neither form is found.
 */
export function getFileParam(overrides: Override[], path: string, def: string): string {
  const expr = overrides.find((o) => o.kind === "expr" && o.path === path);
  if (expr && expr.kind === "expr") {
    const m = expr.expr.match(/["']([^"']+)["']/);
    if (m) return m[1];
  }
  const call = overrides.find(
    (o) => o.kind === "call" && o.call.startsWith(path + ".SetFile(")
  );
  if (call && call.kind === "call") {
    const m = call.call.match(/SetFile\(["']([^"']+)["']\)/);
    if (m) return m[1];
  }
  return def;
}
