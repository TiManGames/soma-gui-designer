/** Literal readers deliberately reject formulas instead of partially parsing them. */
export function parseNumberLiteral(expr: string): number | null {
  const text = expr.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[fF]?$/.test(text)) return null;
  const n = Number(text.replace(/[fF]$/, ""));
  return Number.isFinite(n) ? n : null;
}

export function floatLiteral(n: number): string {
  const [mantissa, exponent] = String(n).split(/e/i);
  return `${mantissa.includes(".") ? mantissa : mantissa + ".0"}${exponent === undefined ? "" : "e" + exponent}f`;
}

export function stringLiteral(value: string): string {
  return JSON.stringify(value);
}

export function parseStringLiteral(expr: string): string | null {
  const text = expr.trim();
  // Preserve support for existing AngelScript strings with either quote style.
  if (!/^(?:"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*')$/.test(text)) return null;
  const body = text.slice(1, -1).replace(/\\.|"/g, token => token === '"' ? '\\"' : token === "\\'" ? "'" : token);
  try {
    const value: unknown = JSON.parse(`"${body}"`);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function parseGfxLiteral(expr: string): string | null {
  const constructor = /^cImGuiGfx\s*\((.*)\)$/.exec(expr.trim());
  return parseStringLiteral(constructor ? constructor[1] : expr);
}
