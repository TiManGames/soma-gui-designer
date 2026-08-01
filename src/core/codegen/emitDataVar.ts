import type { WidgetNode } from "../model/nodes";
import { WIDGETS } from "../model/defaults";
import { dataVarName } from "./format";

/**
 * Emit the data-variable declaration and its override lines for a node, and
 * return the variable name (or "" if the widget takes no data arg).
 *
 * Ported from legacy/app.js:887-909. The override-only strategy: emit the
 * factory call, then one line per structured override:
 *   { kind:"expr", path, expr } -> `<var>.<path> = <expr>;`
 *   { kind:"call", call }       -> `<var>.<call>;`
 */
export function emitDataVar(lines: string[], node: WidgetNode, indent: string): string {
  const meta = WIDGETS[node.type];
  if (!meta.dataClass || !meta.factory) return "";

  const varName = dataVarName(node.id);
  lines.push(`${indent}${meta.dataClass} ${varName} = ${meta.factory};`);

  for (const ov of node.overrides) {
    if (ov.kind === "expr") {
      if (!ov.path.trim()) continue;
      lines.push(`${indent}${varName}.${ov.path.trim()} = ${ov.expr.trim()};`);
    } else {
      if (!ov.call.trim()) continue;
      lines.push(`${indent}${varName}.${ov.call.trim()};`);
    }
  }

  return varName;
}
