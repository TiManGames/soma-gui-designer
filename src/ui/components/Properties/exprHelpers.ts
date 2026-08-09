// Helpers to convert between AngelScript expressions and editor values for the
// structured override system. An override on a struct field is stored as
// { kind: "expr", path: <field>, expr: <angelscript expr> }.

import type { PaletteColor } from "@core/schema/api-schema.types";

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

  const m = /cColor\s*\(([^)]*)\)/.exec(expr);
  if (!m) return null;
  const nums = m[1].split(",").map((s) => parseFloat(s.replace(/f/g, "").trim()));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  // HPL3 supports several cColor constructors:
  //   cColor(grey)              -> r=g=b=grey, a=1
  //   cColor(grey, alpha)       -> r=g=b=grey, a=alpha
  //   cColor(r, g, b[, a])
  if (nums.length === 1) return { r: nums[0], g: nums[0], b: nums[0], a: 1 };
  if (nums.length === 2) return { r: nums[0], g: nums[0], b: nums[0], a: nums[1] };
  if (nums.length >= 3) return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] ?? 1 };
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

/** Parse a float expr like "0.5f" -> 0.5. Returns null if not a plain number. */
export function parseFloatExpr(expr: string): number | null {
  const cleaned = expr.replace(/f\b/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && /^[-\d.]+$/.test(cleaned) ? n : null;
}

export function floatExpr(n: number): string {
  const s = Number(n).toString();
  return (s.includes(".") ? s : s + ".0") + "f";
}

/**
 * Parse the components of a `cVector2f(x, y)` / `cVector3f(x, y, z)` literal.
 * Returns an array of numbers, or null if the expression isn't a plain vector
 * literal (e.g. a helper-function call the user hand-wrote).
 */
export function parseVec(expr: string): number[] | null {
  const m = /cVector[23]f\s*\(([^)]*)\)/.exec(expr);
  if (!m) return null;
  const parts = m[1].split(",");
  const nums = parts.map((s) => parseFloat(s.replace(/f/g, "").trim()));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

export function vec2Expr(x: number, y: number): string {
  const f = (n: number) => floatExpr(n);
  return `cVector2f(${f(x)}, ${f(y)})`;
}

export function vec3Expr(x: number, y: number, z: number): string {
  const f = (n: number) => floatExpr(n);
  return `cVector3f(${f(x)}, ${f(y)}, ${f(z)})`;
}

/** Parse `ImGui_NrmSizeKeepRatio(n)` -> n. Returns null if not that call. */
export function parseSizeKeepRatio(expr: string): number | null {
  const m = /ImGui_NrmSizeKeepRatio\s*\(([^)]*)\)/.exec(expr);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/f/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function sizeKeepRatioExpr(n: number): string {
  return `ImGui_NrmSizeKeepRatio(${floatExpr(n)})`;
}
