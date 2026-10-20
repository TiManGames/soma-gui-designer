// Helpers to convert between AngelScript expressions and editor values for the
// structured override system. An override on a struct field is stored as
// { kind: "expr", path: <field>, expr: <angelscript expr> }.

import type { PaletteColor } from "@core/schema/api-schema.types";
import { parseNumberLiteral, floatLiteral } from "@core/model/literals";
export { parseNumberLiteral as parseFloatExpr, floatLiteral as floatExpr } from "@core/model/literals";

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Well-known named cColor constants that aren't in the station palette list. */
const NAMED_COLORS: Record<string, Rgba> = {
  cColor_White: { r: 1, g: 1, b: 1, a: 1 },
  cColor_Black: { r: 0, g: 0, b: 0, a: 1 },
  cColor_Red: { r: 1, g: 0, b: 0, a: 1 },
  cColor_Green: { r: 0, g: 1, b: 0, a: 1 },
  cColor_Blue: { r: 0, g: 0, b: 1, a: 1 }
};

/**
 * Parse `cColor(r, g, b[, a])`, a station palette name, or a known cColor_*
 * constant into rgba; returns null if not a recognizable literal color.
 */
export function parseColorExpr(expr: string, palette: PaletteColor[]): Rgba | null {
  const trimmed = expr.trim();
  const named = palette.find((c) => c.name === trimmed);
  if (named) return { r: named.r, g: named.g, b: named.b, a: named.a };
  if (NAMED_COLORS[trimmed]) return NAMED_COLORS[trimmed];

  const m = /^cColor\s*\(([^)]*)\)$/.exec(trimmed);
  if (!m) return null;
  const parsed = m[1].split(",").map(parseNumberLiteral);
  if (parsed.some((n) => n === null)) return null;
  const nums = parsed as number[];
  // HPL3 supports several cColor constructors:
  //   cColor(grey)              -> r=g=b=grey, a=1
  //   cColor(grey, alpha)       -> r=g=b=grey, a=alpha
  //   cColor(r, g, b[, a])
  if (nums.length === 1) return { r: nums[0], g: nums[0], b: nums[0], a: 1 };
  if (nums.length === 2) return { r: nums[0], g: nums[0], b: nums[0], a: nums[1] };
  if (nums.length === 3 || nums.length === 4) return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] ?? 1 };
  return null;
}

export function colorExpr(c: Rgba): string {
  const f = (n: number) => {
    const s = Number(n.toFixed(3)).toString();
    return (s.includes(".") ? s : s + ".0") + "f";
  };
  return `cColor(${f(c.r)}, ${f(c.g)}, ${f(c.b)}, ${f(c.a)})`;
}

export function rgbaToHex(c: Rgba): string {
  const h = (n: number) =>
    Math.round(Math.max(0, Math.min(1, n)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return { r: 1, g: 1, b: 1 };
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255
  };
}

/**
 * Parse the components of a `cVector2f(x, y)` / `cVector3f(x, y, z)` literal.
 * Returns an array of numbers, or null if the expression isn't a plain vector
 * literal (e.g. a helper-function call the user hand-wrote).
 */
export function parseVec(expr: string): number[] | null {
  const m = /^cVector([23])f\s*\(([^)]*)\)$/.exec(expr.trim());
  if (!m) return null;
  const nums = m[2].split(",").map(parseNumberLiteral);
  if (nums.some((n) => n === null)) return null;
  const dims = Number(m[1]);
  if (nums.length === 1) return Array(dims).fill(nums[0]) as number[];
  return nums.length === dims ? nums as number[] : null;
}

export function vec2Expr(x: number, y: number): string {
  const f = floatLiteral;
  return `cVector2f(${f(x)}, ${f(y)})`;
}

export function vec3Expr(x: number, y: number, z: number): string {
  const f = floatLiteral;
  return `cVector3f(${f(x)}, ${f(y)}, ${f(z)})`;
}

/** Parse `ImGui_NrmSizeKeepRatio(n)` -> n. Returns null if not that call. */
export function parseSizeKeepRatio(expr: string): number | null {
  const m = /^ImGui_NrmSizeKeepRatio\s*\(([^)]*)\)$/.exec(expr.trim());
  if (!m) return null;
  return parseNumberLiteral(m[1]);
}

export function sizeKeepRatioExpr(n: number): string {
  return `ImGui_NrmSizeKeepRatio(${floatLiteral(n)})`;
}
