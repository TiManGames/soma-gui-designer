import { safeId } from "../model/ids";

export { nrm, escapeString } from "../model/ids";

/** Data variable name for a node id, e.g. "ConfirmButton" -> "confirmButtonData". Ported from app.js:891. */
export function dataVarName(id: string): string {
  const s = safeId(id, "item");
  return `${s.charAt(0).toLowerCase()}${s.slice(1)}Data`;
}

/**
 * AngelScript float literals require a decimal point before the `f` suffix.
 * Normalize whole-number literals (`0f`, `1f`, `-2f`) without touching quoted
 * strings, existing decimal literals, identifiers, or hexadecimal values.
 */
export function normalizeHpsFloatLiterals(source: string): string {
  let out = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (quote) {
      out += char;
      if (char === "\\" && i + 1 < source.length) {
        out += source[++i];
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      out += char;
      continue;
    }

    const previous = i > 0 ? source[i - 1] : "";
    if ((char === "-" || /\d/.test(char)) && !/[\w.]/.test(previous)) {
      const match = /^-?\d+f\b/.exec(source.slice(i));
      if (match) {
        out += `${match[0].slice(0, -1)}.0f`;
        i += match[0].length - 1;
        continue;
      }
    }

    out += char;
  }

  return out;
}
