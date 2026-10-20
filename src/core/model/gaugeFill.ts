import { parseNumberLiteral } from "./literals";

export const DEFAULT_GAUGE_FILL = 0.5;

/**
 * Convert the persisted gauge value into the normalized 0..1 amount used by
 * the canvas. Older documents may include the AngelScript `f` suffix, while
 * the numeric editor stores the browser's plain numeric string.
 */
export function gaugeFillAmount(value: string | number | undefined): number {
  const raw = typeof value === "string" ? value.trim().replace(/f$/i, "") : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_GAUGE_FILL;
  return Math.max(0, Math.min(1, parsed));
}

/** Format literal amounts; runtime expressions pass through to AngelScript intact. */
export function gaugeFillExpr(value: string | number | undefined): string {
  if (typeof value === "string" && value.trim() && parseNumberLiteral(value) === null) return value;
  const amount = Number(gaugeFillAmount(value).toFixed(6));
  const text = amount.toString();
  return `${text.includes(".") ? text : `${text}.0`}f`;
}
