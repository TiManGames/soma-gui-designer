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

/** Parse `cColor(r, g, b[, a])` into rgba; returns null if not a literal cColor. */
export function parseColorExpr(expr: string, palette: PaletteColor[]): Rgba | null {
  const named = palette.find((c) => c.name === expr.trim());
  if (named) return { r: named.r, g: named.g, b: named.b, a: named.a };

  const m = /cColor\s*\(([^)]*)\)/.exec(expr);
  if (!m) return null;
  const nums = m[1].split(",").map((s) => parseFloat(s.replace(/f/g, "").trim()));
  if (nums.length < 3 || nums.some((n) => !Number.isFinite(n))) return null;
  return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] ?? 1 };
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
