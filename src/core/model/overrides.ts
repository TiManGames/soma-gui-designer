import type { Override } from "./nodes";
import { parseGfxLiteral, stringLiteral } from "./literals";

function isFileCall(override: Override, path: string): boolean {
  return override.kind === "call" && override.call.trim().startsWith(`${path}.SetFile(`);
}

/** Read the last assignment or SetFile call in emission order, including formulas. */
export function getGfxFieldValue(overrides: Override[], path: string): string | undefined {
  for (const o of [...overrides].reverse()) {
    if (o.kind === "expr" && o.path === path) return o.expr;
    if (isFileCall(o, path) && o.kind === "call") {
      const args = o.call.trim().slice(`${path}.SetFile(`.length).replace(/\)\s*;?$/, "");
      return `cImGuiGfx(${args})`;
    }
  }
  return undefined;
}

export function clearFieldOverride(overrides: Override[], path: string): Override[] {
  return overrides.filter(o => !(o.kind === "expr" && o.path === path) && !isFileCall(o, path));
}

export function setFieldExpression(overrides: Override[], path: string, expr: string, gfx = false): Override[] {
  const file = gfx ? parseGfxLiteral(expr) : null;
  const next: Override = file === null ? { kind: "expr", path, expr }
    : { kind: "call", call: `${path}.SetFile(${stringLiteral(file)})` };
  return [...clearFieldOverride(overrides, path), next];
}

/**
 * Read a named `expr`-kind parameter from a node's overrides, falling back to a
 * default when the path is not present. Shared by the codegen emitters and the
 * WYSIWYG canvas so both interpret override values identically.
 */
export function getParam(overrides: Override[], path: string, def: string): string {
  const found = [...overrides].reverse().find((o) => o.kind === "expr" && o.path === path);
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
  const value = getGfxFieldValue(overrides, path);
  return value === undefined ? def : parseGfxLiteral(value) ?? def;
}
