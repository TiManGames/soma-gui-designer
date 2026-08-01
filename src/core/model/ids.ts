// String / identifier helpers. Ported from legacy/app.js:365-400.

export function escapeString(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

export function validIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

export function safeId(value: string | undefined, fallback = "Item"): string {
  const clean = String(value || fallback).replace(/[^A-Za-z0-9_]/g, "");
  return validIdentifier(clean) ? clean : fallback;
}

/** Generate an id unique among `existingIds`, avoiding the "screen" sentinel. */
export function uniqueId(base: string, existingIds: Iterable<string>): string {
  const set = new Set(existingIds);
  const cleanBase = safeId(base, "Item");
  let id = cleanBase;
  let i = 1;
  while (set.has(id) || id === "screen") {
    id = `${cleanBase}${i++}`;
  }
  return id;
}

/** Format a normalized value to at most 4 decimals, trailing zeros trimmed. Ported from app.js:398-400. */
export function nrm(value: number): string {
  return Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") || "0";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
